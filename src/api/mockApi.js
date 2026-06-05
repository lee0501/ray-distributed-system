// ─── RideApp mock data （user端用的）───────────────────────────────────────────────────────

const mockOrderRegistry = {} //這裡用來記訂單的資料 key會是訂單的ID value會是訂單的內容（因為後面我設計有不同function都需要用到訂單的資料資訊）

export async function getEta() { //這個用來做叫車頁面「尖峰時段或是其他狀態的設定」這樣比較跟真實的很像
  const waitMin = Math.max(1, Math.round(Math.random() * 3 + 1))
  return { waitMin, surge: waitMin > 4 }
} 

export async function createRideOrder(payload) { //這裡資料從訂單頁傳進來（包含上下車地點、車型選擇、價格）
  const orderId = "mock-" + Date.now() // 產訂單ID(這個是唯一)
  mockOrderRegistry[orderId] = { price: payload.price || 260 } //這個價錢我在使用者端的前端檔案有寫兩個車種的預設價格（寫死因為只是模擬就不討論動態定價）
  return { //這裡模擬後端完成接單之後回傳到USER介面的info內容要呈現的（這裡開了api規格給後端 是POST /orders response）
    order_id: orderId,
    order_type: "ride",
    status: "pending",
    created_at: new Date().toISOString(),
  }
}

// callback receives: { status, trip?, result? } 元件傳回來要長的樣態定義 每有一次的狀他變更就要呼叫一次做回傳
// returns unsub function
export function subscribeRideOrder(orderId, callback) {
  const order = mockOrderRegistry[orderId] || {}
  const TRIP_TOTAL = 20
//這裡'setTimeout'用了四個去模擬叫車派單的過程，第一個狀態是有在配對司機
  const state_1 = setTimeout(() => callback({ status: "matching" }), 1000)
// 模擬配對到司機然後回傳司機資訊
  const state_2 = setTimeout(() => callback({
    status: "driver_assigned",
    trip: { driver_name: "李平頭", driver_rating: 4.8, license_plate: "ABC-1234", estimated_arrival: 4 },
  }), 3500)
//這裡切換到行程開始的狀態
  const state_3 = setTimeout(() => callback({ status: "on_trip" }), 6000)
//這裡切換成行程結束，完成模擬一次用Uber叫車的下單到司機接待到行程完成的過程
  const state_4 = setTimeout(() => callback({
    status: "completed",
    result: { fare: (order.price || 260) + 8, duration_minutes: 18, distance_km: 8.3 }, //260是寫死的原價 +8模擬下單跟實收會有一點價格差異用
  }), 6000 + TRIP_TOTAL * 1000)

  return () => { clearTimeout(state_1); clearTimeout(state_2); clearTimeout(state_3); clearTimeout(state_4) }
}

// ─── RayAdminApp mock data (dashboard用的）────────────────────────────────────────────────────
//dashboard 目前用的假資料 backend api finish mock data will disappear
const INITIAL_ORDERS = [
  { id: "a1b2", type: "ride",          status: "on_trip",   worker: "ray-worker-1", elapsed: 8,  total: 20, ts: "14:23" },
  { id: "c3d4", type: "ride",          status: "completed", worker: "ray-worker-2", elapsed: 15, total: 15, ts: "14:21" },
  { id: "e5f6", type: "heavy_compute", status: "pending",   worker: "—",            elapsed: 0,  total: 12, ts: "14:23" },
  { id: "g7h8", type: "image_resize",  status: "failed",    worker: "ray-worker-1", elapsed: 5,  total: 20, ts: "14:20" },
  { id: "i9j0", type: "ride",          status: "completed", worker: "ray-worker-2", elapsed: 8,  total: 8,  ts: "14:19" },
]

const INITIAL_WORKERS = [
  { id: "ray-head",     role: "head",   status: "alive", cpu: 0.30 },
  { id: "ray-worker-1", role: "worker", status: "alive", cpu: 0.82 },
  { id: "ray-worker-2", role: "worker", status: "alive", cpu: 0.58 },
]

// Scaling logs are disabled because infra does not persist scale events. 
// const INITIAL_LOGS = [
//   { time: "14:20", action: "scale_up",   worker: "ray-worker-2", reason: "pending=5, polls=3" },
//   { time: "14:10", action: "scale_down", worker:"ray-worker-3", reason: "cpu=4% < 10%"       },
//   { time: "13:55", action: "scale_up",   worker: "ray-worker-2", reason: "pending=4, polls=3" },
// ]

const INITIAL_METRICS = {
  workers: 2,
  pending: 5,
  cpu: 72,
  // cooldown: 8,
  // lastAction: "scale_up",
}

export async function getAdminSnapshot() {
  return {
    orders:  INITIAL_ORDERS.map(o => ({ ...o })), //每一筆資料都做一次copy,用來避開修改的話會改到原始資料確保資料獨立
    workers: INITIAL_WORKERS.map(w => ({ ...w })),
    // logs: INITIAL_LOGS.map(l => ({ ...l })),
    metrics: { ...INITIAL_METRICS },
  }
}

// callback receives: { orders?, metrics? }
// returns unsub function
export function subscribeAdminUpdates(callback) { //自己維護一份的order & metrics的內部狀態
  let orders  = INITIAL_ORDERS.map(o => ({ ...o }))
  let metrics = { ...INITIAL_METRICS }

  const id = setInterval(() => { // after api finish will become read data of our team real ray-infra data , setInterval都是模擬這之後都會替換成真的
    orders = orders.map(o => {
      if (o.status === "on_trip" || o.status === "running") {
        const next = Math.min(o.elapsed + 1, o.total)
        return { ...o, elapsed: next, status: next >= o.total ? "completed" : o.status } //把進行中的訂單 elapsed + 1，如果跑完（elapsed >= total）就改成 completed
      }
      return o
    })

    metrics = {
      ...metrics,
      // cooldown: Math.max(0, metrics.cooldown - 1),
      pending:  Math.max(0, metrics.pending + (Math.random() > 0.6 ? 1 : -1)), //隨機做加減先模擬任務數量的變動來試新增、砍掉的效果
    }

    callback({ orders, metrics }) //回傳最新的狀態接收後更新
  }, 1000) //每一秒做一次 模擬heartbeat(但不算non-function)

  return () => clearInterval(id)
}
