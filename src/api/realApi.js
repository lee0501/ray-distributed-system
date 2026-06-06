// Real API implementation — based on uber-api-v3.md
// Activated when REACT_APP_USE_MOCK_API=false
//先讀環境檔看有沒有預設後端網址，沒有就用我預設的8000 
const BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000"
const SSE  = process.env.REACT_APP_SSE_URL      || `${BASE}/sse` // 連動PR7結論，websocked改sse做單向資料傳輸即可

const ORDER_PROGRESS = {
  pending: 0,
  matching: 20,
  driver_assigned: 45,
  on_trip: 70,
  completed: 100,
  failed: 100,
  cancelled: 100,
}

function parseApiTimestamp(timestamp) {
  if (!timestamp) return null
  const normalized = typeof timestamp === "string" &&
    !/[zZ]|[+-]\d{2}:\d{2}$/.test(timestamp)
    ? `${timestamp}Z`
    : timestamp
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTaipeiTime(timestamp) {
  const date = parseApiTimestamp(timestamp)
  if (!date) return "—"
  return date.toLocaleTimeString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function formatOrderTime(timestamp) {
  return formatTaipeiTime(timestamp)
}

function formatEventTime(timestamp) {
  return formatTaipeiTime(timestamp)
}

function mapWorker(worker) {
  const cpuTotal = Number(worker.cpu_total) || 0
  const cpuUsed = Number(worker.cpu_used) || 0
  return {
    id: worker.node_id ?? worker.ip ?? "unknown",
    role: worker.ip === "ray-head" ? "head" : "worker",
    status: worker.status ?? "alive",
    cpu: cpuTotal > 0 ? cpuUsed / cpuTotal : 0,
  }
}

function mapScalingEvent(event) {
  return {
    time: formatEventTime(event.timestamp),
    action: event.action ?? "none",
    worker: event.worker_id ?? "—",
    reason: event.trigger_reason ?? "—",
  }
}

// Convert the backend OrderManager contract into the shape used by RayAdminApp.
function mapAdminOrder(order, previous = {}) {
  const status = order.status ?? previous.status ?? "pending"
  return {
    ...previous,
    id: order.order_id ?? previous.id,
    type: order.order_type ?? previous.type ?? "ride",
    status,
    worker: order.worker_node ?? previous.worker ?? "—",
    elapsed: ORDER_PROGRESS[status] ?? previous.elapsed ?? 0,
    total: 100,
    ts: formatOrderTime(
      order.updated_at ??
      order.completed_at ??
      order.started_at ??
      order.created_at ??
      previous.updated_at ??
      previous.completed_at ??
      previous.started_at ??
      previous.created_at
    ),
    ...order,
  }
}

// GET /cluster/eta
export async function getEta() {
  const res = await fetch(`${BASE}/cluster/eta`)
  if (!res.ok) throw new Error(`GET /cluster/eta failed: ${res.status}`)
  const data = await res.json()
  const seconds = Number(data.estimated_wait_seconds)
  return {
    waitMin: Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds / 60)) : 0,
    surge: Boolean(data.surge),
  }
}

// POST /orders
export async function createRideOrder(payload) {
  const res = await fetch(`${BASE}/orders`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" }, //告知傳送的資料格式方便解析
    body: JSON.stringify({
      order_type: "ride",
      payload: {
        origin:      payload.origin,
        destination: payload.dest, //destination 是API文件（檔名：v3)訂的名稱
        ride_type:   payload.rideType,
      },
    }),
  })
  return res.json()  // { order_id, status: "pending", ... }
}

// GET /sse → order_updated events
// callback receives: { status, trip?, result? }
export function subscribeRideOrder(orderId, callback) {
  const source = new EventSource(SSE)
  source.onmessage = (e) => {
    const { event, data } = JSON.parse(e.data)
    if (event === "order_updated" && data.order_id === orderId) {
      callback(data)
    }
  }
  return () => source.close()
}

// Admin pages load orders, cluster status, and scaling history in parallel.
export async function getAdminSnapshot() {
  const [ordersRes, statusRes, historyRes] = await Promise.all([
    fetch(`${BASE}/orders`),
    fetch(`${BASE}/cluster/status`),
    fetch(`${BASE}/cluster/scaling-history`),
  ])
  if (!ordersRes.ok || !statusRes.ok || !historyRes.ok) {
    throw new Error("Failed to load admin snapshot")
  }
  const ordersData = await ordersRes.json()
  const status = await statusRes.json()
  const historyData = await historyRes.json()

  return {
    orders: (ordersData.orders ?? ordersData).map(order => mapAdminOrder(order)),
    workers: (status.workers ?? []).map(mapWorker),
    logs: (historyData.history ?? historyData ?? []).map(mapScalingEvent),
    metrics: {
      workers: status.worker_count ?? status.metrics?.workers ?? 0,
      pending: status.pending_tasks ?? status.metrics?.pending ?? 0,
      cpu: Math.round((status.cpu_usage?.percent ?? status.metrics?.cpu ?? 0) * (
        status.cpu_usage?.percent != null && status.cpu_usage.percent <= 1 ? 100 : 1
      )),
      cooldown: status.autoscaler?.cooldown_remaining ?? 0,
      cooldownTotal: 15,
      lastAction: status.autoscaler?.last_action ?? "none",
      minWorkers: status.autoscaler?.min_workers ?? 0,
      maxWorkers: status.autoscaler?.max_workers ?? 5,
    },
  }
}

// GET /sse → 監聽 heartbeat + order_updated events
// callback receives: { orderUpdate?, metrics? }
export function subscribeAdminUpdates(callback) {
  const source = new EventSource(SSE)
  source.onmessage = (e) => {
    const { event, data } = JSON.parse(e.data)
    if (event === "order_updated") {
      callback({ orderUpdate: mapAdminOrder(data) })
    }
    if (event === "cluster_updated") {
      callback({
        scalingEvent: mapScalingEvent(data),
        metrics: {
          workers: data.worker_count,
          pending: data.pending_tasks,
          lastAction: data.action,
        },
      })
    }

    if (
      event === "heartbeat" &&
      data.worker_count != null &&
      data.pending_tasks != null &&
      data.cpu_percent != null
    ) {
      callback({
        metrics: {
          workers:    data.worker_count,
          pending:    data.pending_tasks,
          cpu:        Math.round(data.cpu_percent * 100),
        },
      })
    }
  }
  return () => source.close()
}
