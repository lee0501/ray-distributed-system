# Frontend ↔ Backend API Specification v2.2
# 使用者叫車介面 + Ray 儀表板整合版

> v2.2 更新：即時推送由 WebSocket 改為 SSE，前端使用 `EventSource` 連線 `GET /sse`。

---

## 系統串接全景

```
[使用者介面]                    [Ray Admin 儀表板]
     │                                │
     ├─ POST /orders                  ├─ GET /orders
     ├─ GET /orders/{id}              ├─ GET /cluster/status
     └─ GET /sse                      └─ GET /sse
          └─ order_updated                 └─ cluster_updated / heartbeat

兩個前端共用同一個後端 SSE endpoint，前端使用 `EventSource` 建立連線，並用 payload 內的 event type 區分事件。
使用者介面不直接呼叫 `/cluster/status`，也不顯示由 cluster 狀態推估的等待時間。
```

---

## 使用者叫車介面 API

### POST /orders（建立叫車訂單）

```json
{
  "order_type": "ride",
  "payload": {
    "origin": "台北車站",
    "destination": "松山機場",
    "origin_lat": 25.0478,
    "origin_lng": 121.5170,
    "destination_lat": 25.0630,
    "destination_lng": 121.5530,
    "ride_type": "standard"
  }
}
```

Response 201：
```json
{
  "order_id": "order-uuid-1234",
  "order_type": "ride",
  "status": "pending",
  "created_at": "2025-05-30T14:23:00Z"
}
```

> 後端立即回傳 order_id，不等 Actor 執行完。前端收到後顯示「配對中」畫面，後續狀態靠 SSE 推送。

---

### GET /orders/{order_id}（取得訂單詳情）

Response 200：
```json
{
  "order_id": "order-uuid-1234",
  "order_type": "ride",
  "status": "driver_assigned",
  "created_at": "2025-05-30T14:23:00Z",
  "started_at": "2025-05-30T14:23:02Z",
  "completed_at": null,
  "worker_node": "ray-worker-1",
  "payload": {
    "origin": "台北車站",
    "destination": "松山機場"
  },
  "trip": {
    "driver_id": "driver-007",
    "driver_name": "王大明",
    "driver_rating": 4.8,
    "license_plate": "ABC-1234",
    "estimated_arrival": 5,
    "estimated_duration": 18,
    "fare_estimate": 320
  }
}
```

---

## 叫車狀態表

| Status | 對應 Ray Actor 狀態 | 使用者看到的文字 | 前端畫面 |
|---|---|---|---|
| `pending` | Actor 等待排程 | 配對中... | 配對中畫面（spinner）|
| `matching` | Actor 開始執行，尋找司機 | 正在尋找司機 | 配對中畫面 |
| `driver_assigned` | Actor 已配對司機 | 司機前往中 | 司機前往中畫面 |
| `on_trip` | Actor 追蹤行程中 | 行程中 | 行程中畫面（進度條）|
| `completed` | Actor 執行完成 | 行程完成 | 行程完成畫面 |
| `failed` | Actor 失敗 | 叫車失敗 | 錯誤提示 |
| `cancelled` | Actor 被中止 | 已取消 | 返回首頁 |

> `driver_arrived`（司機已抵達）需要 GPS 偵測，**暫不實作**，demo 階段跳過此狀態。

---

## SSE：Server → Client 推送格式

所有狀態變更都透過同一個 `order_updated` event 推送，前端根據 `status` 決定切換哪個畫面。

前端透過以下方式建立 SSE 連線：

```js
const source = new EventSource("http://localhost:8000/sse")

source.onmessage = (message) => {
  const { event, data } = JSON.parse(message.data)
}
```

後端 SSE response 的每一筆 `data:` 內容，仍維持既有的 `{ "event", "data" }` JSON 格式：

```text
data: {"event":"order_updated","data":{"order_id":"order-uuid-1234","status":"matching"}}
```

> 目前 order channel 已完成。Heartbeat 已接入 SSE，但後端暫時可能傳送空的 `data`；前端應在必要欄位存在時才更新 Admin metrics。

### A. pending → matching
```json
{
  "event": "order_updated",
  "data": {
    "order_id": "order-uuid-1234",
    "status": "matching",
    "updated_at": "2025-05-30T14:23:01Z"
  }
}
```

### B. matching → driver_assigned（含司機資訊）
```json
{
  "event": "order_updated",
  "data": {
    "order_id": "order-uuid-1234",
    "status": "driver_assigned",
    "trip": {
      "driver_name": "王大明",
      "driver_rating": 4.8,
      "license_plate": "ABC-1234",
      "estimated_arrival": 4
    },
    "updated_at": "2025-05-30T14:23:05Z"
  }
}
```

### C. driver_assigned → on_trip
```json
{
  "event": "order_updated",
  "data": {
    "order_id": "order-uuid-1234",
    "status": "on_trip",
    "updated_at": "2025-05-30T14:27:00Z"
  }
}
```

### D. on_trip → completed（含行程結果）
```json
{
  "event": "order_updated",
  "data": {
    "order_id": "order-uuid-1234",
    "status": "completed",
    "result": {
      "fare": 268,
      "duration_minutes": 18,
      "distance_km": 8.3
    },
    "updated_at": "2025-05-30T14:45:00Z"
  }
}
```

### E. Cluster 狀態變更（Admin 儀表板用）
```json
{
  "event": "cluster_updated",
  "data": {
    "action": "scale_up",
    "worker_id": "ray-worker-2",
    "worker_count": 3,
    "pending_tasks": 2,
    "timestamp": "2025-05-30T14:23:10Z"
  }
}
```

### F. Heartbeat（每 5 秒，Admin 儀表板用）
```json
{
  "event": "heartbeat",
  "data": {
    "pending_tasks": 3,
    "worker_count": 2,
    "cpu_percent": 0.65
  }
}
```

---

## Admin 儀表板 API

| API | 用途 | 更新方式 |
|---|---|---|
| `GET /orders` | 所有訂單列表 | SSE `order_updated` |
| `GET /cluster/status` | Worker 節點狀態、CPU、autoscaler | SSE `heartbeat` |

> Infra 目前不會持久化 scale up/down events，因此前端停用 Scaling history，
> 也不呼叫 `GET /cluster/scaling-history`。

---

## 前端頁面與 API 對照

| 介面 | 頁面/區塊 | API | 更新方式 |
|---|---|---|---|
| 使用者 | 確認叫車 | `POST /orders` | 一次性 REST |
| 使用者 | 配對中畫面 | `SSE order_updated` (matching) | SSE push |
| 使用者 | 司機前往中畫面 | `SSE order_updated` (driver_assigned + trip{}) | SSE push |
| 使用者 | 行程中畫面 | `SSE order_updated` (on_trip) | SSE push |
| 使用者 | 行程完成畫面 | `SSE order_updated` (completed + result{}) | SSE push |
| Admin | 訂單列表 | `GET /orders` | SSE push |
| Admin | Cluster 節點狀態 | `GET /cluster/status` | SSE heartbeat |

---

## CORS 設定（後端需要）

```python
# FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

*文件版本：v2.2 | 最後更新：2026-06-05*
