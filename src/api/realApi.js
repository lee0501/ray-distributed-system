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

function formatOrderTime(timestamp) {
  if (!timestamp) return "—"
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
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
      order.updated_at ?? order.created_at ?? previous.updated_at ?? previous.created_at
    ),
    ...order,
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

// Admin Overview currently uses GET /orders + GET /cluster/status.
// GET /cluster/scaling-history is disabled because infra does not persist scale events.
export async function getAdminSnapshot() {
  const [ordersRes, statusRes] = await Promise.all([
    fetch(`${BASE}/orders`),
    fetch(`${BASE}/cluster/status`).catch(() => null),
    // fetch(`${BASE}/cluster/scaling-history`),
  ])
  const ordersData = await ordersRes.json()
  const status = statusRes?.ok ? await statusRes.json() : null

  return {
    orders: (ordersData.orders ?? ordersData).map(order => mapAdminOrder(order)),
    workers: status?.workers ?? [],
    // logs: history,
    metrics: status ? {
      workers: status.worker_count ?? status.metrics?.workers ?? 0,
      pending: status.pending_tasks ?? status.metrics?.pending ?? 0,
      cpu: Math.round((status.cpu_usage?.percent ?? status.metrics?.cpu ?? 0) * (
        status.cpu_usage?.percent != null && status.cpu_usage.percent <= 1 ? 100 : 1
      )),
    } : { workers: 0, pending: 0, cpu: 0 },
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

    // PR #7 currently sends heartbeat with empty data. Only update Overview
    // metrics after the backend provides all required cluster fields.
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
          // cooldown: 0,
          // lastAction: "—",
        },
      })
    }
  }
  return () => source.close()
}
