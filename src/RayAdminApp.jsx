import { useState, useEffect } from "react"
import { api } from "./api/api"
import { TOKEN as T } from "./theme"

// ─── 共用 Status pill（與 RideApp.jsx 共用相同設計語言）───
const STATUS_CONFIG = {
  pending:         { label: "pending",         bg: T.amberLight,  color: "#ba9482" },
  matching:        { label: "matching",         bg: T.blueLight,   color: "#1e40af" },
  driver_assigned: { label: "driver_assigned",  bg: T.orangeLight,  color: "#9c5b1a" },
  on_trip:         { label: "on_trip",          bg: T.purpleLight, color: "#5b21b6" },
  running:         { label: "running",          bg: T.blueLight,   color: "#60c9e9" },
  completed:       { label: "completed",        bg: T.greenLight,  color: "#166534" },
  failed:          { label: "failed",           bg: T.redLight,    color: "#cf2b2b" },
  cancelled:       { label: "cancelled",        bg: T.gray100,     color: "#626262" },
}

function StatusPill({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  )
}

function mergeOrders(previous, incoming) {
  const merged = new Map(previous.map(order => [order.id, order]))

  incoming.forEach(order => {
    const existing = merged.get(order.id)
    const createdAt = order.createdAt || existing?.createdAt
    const sortAt = createdAt || existing?.sortAt || order.sortAt
    merged.set(order.id, existing ? {
      ...existing,
      ...order,
      createdAt,
      sortAt,
      type: order.type || existing.type,
      worker: order.worker === "—" ? existing.worker : order.worker,
      ts: order.createdAt ? order.ts : existing.ts || order.ts,
    } : { ...order, createdAt, sortAt })
  })

  return [...merged.values()].sort((a, b) =>
    new Date(b.sortAt || 0).getTime() - new Date(a.sortAt || 0).getTime()
  )
}

// ─── Metric Card ───
function MetricCard({ label, value, sub, fillPct, fillColor }) {
  return (
    <div className="admin-metric-card" style={{ background: T.white, border: `0.5px solid ${T.gray200}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: T.gray400, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 500, color: T.black, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.gray400, marginTop: 4 }}>{sub}</div>
      <div style={{ height: 3, background: T.gray200, borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: fillColor, width: `${Math.min(100, fillPct)}%`, transition: "width 0.6s ease" }} />
      </div>
    </div>
  )
}

// ─── Order Row ───
function OrderRow({ order, compact = false }) {
  return (
    <div className={`admin-order-row${compact ? " admin-order-row--compact" : ""}`} style={{
      display: "grid",
      gridTemplateColumns: compact
        ? "minmax(72px,1fr) minmax(58px,0.8fr) minmax(110px,1fr) 48px"
        : "150px 140px 140px minmax(90px,1fr)",
      alignItems: "center", gap: 8,
      background: T.white, border: `0.5px solid ${T.gray200}`,
      borderRadius: 10, padding: "10px 14px", fontSize: 14,
      cursor: "pointer", transition: "border-color .15s",
    }}>
      <span
        title={order.id}
        style={{ fontFamily: "monospace", fontSize: 14, color: T.gray400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {order.id}
      </span>
      <span style={{ fontWeight: 500, color: T.black }}>{order.type}</span>
      <StatusPill status={order.status} />
      <span style={{ textAlign: "right", color: T.gray400 }}>{order.ts}</span>
    </div>
  )
}

// ─── Worker Card ───
function WorkerCard({ worker }) {
  const cpuPct = Math.round(worker.cpu * 100)
  const barColor = worker.cpu > 0.8 ? T.red200 : worker.cpu > 0.6 ? T.amber200 : T.teal200
  const pillMap = {
    head:     { label: "head",     bg: T.blueLight,  color: "#1e40af" },
    alive:    { label: "alive",    bg: T.greenLight, color: "#166534" },
    scaling:  { label: "scaling",  bg: T.amberLight, color: "#92400e" },
    stopping: { label: "stopping", bg: T.redLight,   color: "#991b1b" },
  }
  const pill = worker.role === "head" ? pillMap.head : pillMap[worker.status] || pillMap.alive
  return (
    <div style={{
      background: worker.role === "head" ? T.blueLight : T.white,
      border: `0.5px solid ${worker.role === "head" ? T.blue200 : T.gray200}`,
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: T.black }}>{worker.id}</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: pill.bg, color: pill.color }}>{pill.label}</span>
      </div>
      <div style={{ fontSize: 11, color: T.gray400, marginBottom: 5 }}>CPU {cpuPct}%</div>
      <div style={{ height: 3, background: T.gray200, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: barColor, width: `${cpuPct}%`, transition: "width 0.5s" }} />
      </div>
    </div>
  )
}

// ─── Scale Log Row ───
function LogRow({ log }) {
  const isUp = log.action === "scale_up"
  return (
    <div className="admin-log-row" style={{
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 11, padding: "6px 12px", borderRadius: 10,
      background: T.white, border: `0.5px solid ${T.gray200}`,
    }}>
      <span style={{ color: T.gray400, minWidth: 38, fontFamily: "monospace" }}>{log.time}</span>
      <span style={{ color: isUp ? "#1e40af" : "#993C1D", fontSize: 13 }}>{isUp ? "↑" : "↓"}</span>
      <span className="admin-log-action" style={{ color: T.gray600, flex: 1 }}>{log.action} → {log.worker}</span>
      <span className="admin-log-reason" style={{ color: T.gray400, fontSize: 10 }}>{log.reason}</span>
    </div>
  )
}

// ─── Sidebar Nav ───
function Sidebar({ page, setPage }) {
  const mainItems = [
    { key: "overview", label: "Overview",      icon: "⊞" },
    { key: "orders",   label: "Orders",        icon: "☰" },
  ]
  const infraItems = [
    { key: "cluster", label: "Cluster nodes", icon: "◫" },
  ]
  const navBtn = (n) => (
    <button className="admin-nav-button" key={n.key} onClick={() => setPage(n.key)}
      style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 18px", fontSize:13, cursor:"pointer", border:"none", background: page===n.key ? T.gray100 : "none", width:"100%", textAlign:"left", color: page===n.key ? T.black : T.gray600, fontWeight: page===n.key ? 500 : 400, transition:"background .12s" }}>
      <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
    </button>
  )
  return (
    <div className="admin-sidebar" style={{ width: 200, flexShrink: 0, background: T.white, borderRight: `0.5px solid ${T.gray200}`, display: "flex", flexDirection: "column" }}>
      <div className="admin-sidebar-brand" style={{ padding: "20px 18px 16px", borderBottom: `0.5px solid ${T.gray200}` }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.black }}>Ray Admin</div>
        <div style={{ fontSize: 11, color: T.gray400, marginTop: 2 }}>Distributed cluster UI</div>
      </div>
      <div className="admin-sidebar-nav" style={{ padding: "10px 0", flex: 1 }}>
        <div className="admin-nav-label" style={{ fontSize: 10, color: T.gray400, padding: "4px 18px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Main</div>
        {mainItems.map(navBtn)}
        <div className="admin-nav-label" style={{ fontSize: 10, color: T.gray400, padding: "12px 18px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Infrastructure</div>
        {infraItems.map(navBtn)}
      </div>
      <div className="admin-sidebar-footer" style={{ padding: "12px 18px", borderTop: `0.5px solid ${T.gray200}`, fontSize: 11, color: T.gray400 }}>
        Ray local autoscaler v0.1
      </div>
    </div>
  )
}

// ─── Topbar ───
function Topbar({ title, sseConnected, onToggleSSE }) {
  return (
    <div className="admin-topbar" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 24px", background:T.white, borderBottom:`0.5px solid ${T.gray200}`, flexShrink:0 }}>
      <span style={{ fontSize: 15, fontWeight: 500, color: T.black }}>{title}</span>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div className="admin-sse-pill" style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.gray600, background:T.gray100, padding:"5px 12px", borderRadius:999, border:`0.5px solid ${T.gray200}` }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background: sseConnected ? T.green : T.gray300, animation: sseConnected ? "blink 1.8s ease-in-out infinite" : "none" }}/>
          <span className="admin-sse-label">{sseConnected ? "SSE connected" : "Disconnected"}</span>
        </div>
        <button onClick={onToggleSSE} style={{ border:`0.5px solid ${T.gray200}`, background:T.white, borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:13, color:T.black }}>↻</button>
      </div>
    </div>
  )
}

// ─── Page: Overview ───
function OverviewPage({ metrics, orders, logs, setPage }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div className="admin-metrics-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <MetricCard label="Workers alive"  value={metrics.workers}  sub={`max ${metrics.maxWorkers} nodes`}  fillPct={metrics.workers/metrics.maxWorkers*100}   fillColor={T.blue200}   />
        <MetricCard label="Pending resource demands"  value={metrics.pending}  sub="in queue"     fillPct={metrics.pending/10*100}  fillColor={T.amber200}  />
        <MetricCard label="CPU usage"      value={`${metrics.cpu}%`} sub={`${(metrics.cpu/100*2).toFixed(2)} / 2.0 cores`} fillPct={metrics.cpu} fillColor={T.teal200} />
        <MetricCard label="Cooldown"       value={`${metrics.cooldown}s`} sub={`last: ${metrics.lastAction}`} fillPct={metrics.cooldown/metrics.cooldownTotal*100} fillColor={T.purple200} />
      </div>
      <div className="admin-overview-grid" style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:16 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:500, color:T.gray600 }}>Recent orders</span>
            <button onClick={() => setPage("orders")} style={{ fontSize:12, padding:"5px 12px", border:`0.5px solid ${T.gray200}`, background:T.white, borderRadius:8, cursor:"pointer", color:T.black }}>View all →</button>
          </div>
          <div className="admin-order-header admin-order-header--compact" style={{ display:"grid", gridTemplateColumns:"minmax(72px,1fr) minmax(58px,0.8fr) minmax(110px,1fr) 48px", gap:8, padding:"4px 14px", fontSize:11, color:T.gray400 }}>
            <span>#</span><span>type</span><span>status</span><span style={{textAlign:"right"}}>time</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {orders.slice(0,5).map(o => <OrderRow key={o.id} order={o} compact />)}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <span style={{ fontSize:13, fontWeight:500, color:T.gray600 }}>Scaling log</span>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {logs.length > 0
              ? logs.slice(0,4).map((l,i) => <LogRow key={i} log={l} />)
              : <span style={{ fontSize:11, color:T.gray400 }}>No scaling events yet</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page: Orders ───
function OrdersPage({ orders }) {
  const [filter, setFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const tabs = ["all","pending","matching","driver_assigned","on_trip","completed","cancelled","failed"]
  const pageSize = 20
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageOrders = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setCurrentPage(page => Math.min(page, pageCount))
  }, [pageCount])

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div className="admin-order-tabs" style={{ display:"flex", gap:0, borderBottom:`0.5px solid ${T.gray200}`, marginBottom:2 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => { setFilter(t); setCurrentPage(1) }} style={{ padding:"9px 16px", fontSize:12, cursor:"pointer", border:"none", background:"none", color: filter===t ? T.black : T.gray400, borderBottom: filter===t ? `2px solid ${T.blue}` : "2px solid transparent", fontWeight: filter===t ? 500 : 400, marginBottom:-0.5 }}>{t}</button>
        ))}
      </div>
      <div className="admin-order-header" style={{ display:"grid", gridTemplateColumns:"150px 140px 140px minmax(90px,1fr)", gap:8, padding:"4px 14px", fontSize:11, color:T.gray400 }}>
        <span>#</span><span>type</span><span>status</span><span style={{textAlign:"right"}}>time</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {pageOrders.map(o => <OrderRow key={o.id} order={o} />)}
        {pageOrders.length === 0 && <span style={{ fontSize:12, color:T.gray400, padding:"12px 14px" }}>No orders</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4, fontSize:12, color:T.gray400 }}>
        <span>{filtered.length} orders · page {currentPage} of {pageCount}</span>
        <div style={{ display:"flex", gap:6 }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(page => page - 1)} style={{ border:`0.5px solid ${T.gray200}`, background:T.white, borderRadius:8, padding:"6px 12px", cursor:currentPage === 1 ? "default" : "pointer", color:currentPage === 1 ? T.gray300 : T.black }}>Previous</button>
          <button disabled={currentPage === pageCount} onClick={() => setCurrentPage(page => page + 1)} style={{ border:`0.5px solid ${T.gray200}`, background:T.white, borderRadius:8, padding:"6px 12px", cursor:currentPage === pageCount ? "default" : "pointer", color:currentPage === pageCount ? T.gray300 : T.black }}>Next</button>
        </div>
      </div>
    </div>
  )
}

// ─── Page: Cluster ───
function ClusterPage({ workers, logs, metrics }) {
  const alive = workers.filter(w => w.status !== "stopping").length
  const policyItems = [
    ["min_workers", metrics.minWorkers, "minimum workers"],
    ["max_workers", metrics.maxWorkers, "maximum workers"],
    ["cooldown", `${metrics.cooldown}s`, "remaining"],
    ["last_action", metrics.lastAction, "latest scale action"],
  ]
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, fontWeight:500, color:T.gray600 }}>
            Nodes <span style={{ color:T.gray400, fontWeight:400 }}>({alive} alive)</span>
          </span>
          <span style={{ fontSize:11, color:T.gray400, background:T.gray50, padding:"4px 10px", borderRadius:999 }}>
            Auto-managed by Autoscaler
          </span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10 }}>
          {workers.length > 0
            ? workers.map(w => <WorkerCard key={w.id} worker={w} />)
            : <span style={{ fontSize:12, color:T.gray400 }}>No node data available</span>}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <span style={{ fontSize:13, fontWeight:500, color:T.gray600 }}>Scale policy</span>
        <div className="admin-policy-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          {policyItems.map(([key,value,description]) => (
            <div key={key} style={{ background:T.white, border:`0.5px solid ${T.gray200}`, borderRadius:8, padding:14 }}>
              <div style={{ fontSize:11, color:T.gray400, marginBottom:4 }}>{key}</div>
              <div style={{ fontSize:18, fontWeight:500, color:T.black }}>{value}</div>
              <div style={{ fontSize:11, color:T.gray400, marginTop:3 }}>{description}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <span style={{ fontSize:13, fontWeight:500, color:T.gray600 }}>Scaling history</span>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {logs.length > 0
            ? logs.map((log,index) => <LogRow key={`${log.time}-${index}`} log={log} />)
            : <span style={{ fontSize:11, color:T.gray400 }}>No scaling events yet</span>}
        </div>
      </div>
    </div>
  )
}



// ─── 主元件 RayAdminApp ───
export default function RayAdminApp() {
  const [page, setPage] = useState("overview")
  const [sseConnected, setSseConnected] = useState(true)

  const [orders,  setOrders]  = useState([])
  const [workers, setWorkers] = useState([])
  const [logs,    setLogs]    = useState([])
  const [metrics, setMetrics] = useState({
    workers: 0, pending: 0, cpu: 0, cooldown: 0, cooldownTotal: 15,
    lastAction: "none", minWorkers: 0, maxWorkers: 5,
  })

  // ── Initial data load and cluster polling
  useEffect(() => {
    const refreshSnapshot = () => api.getAdminSnapshot().then(({ orders, workers, logs, metrics }) => {
      setOrders(previous => mergeOrders(previous, orders))
      setWorkers(workers)
      setLogs(logs)
      setMetrics(metrics)
    }).catch(() => {})
    refreshSnapshot()
    const id = setInterval(refreshSnapshot, 5000)
    return () => clearInterval(id)
  }, [])

  // ── Live updates via SSE / mock heartbeat
  useEffect(() => {
    if (!sseConnected) return
    const unsub = api.subscribeAdminUpdates(({ orders: o, orderUpdate, scalingEvent, metrics: m }) => {
      if (o) setOrders(previous => mergeOrders(previous, o))
      if (orderUpdate) {
        setOrders(previous => mergeOrders(previous, [orderUpdate]))
      }
      if (scalingEvent) setLogs(previous => [scalingEvent, ...previous])
      if (m) setMetrics(prev => ({ ...prev, ...m }))
    })
    return unsub
  }, [sseConnected])

  const pageTitle = { overview:"Overview", orders:"Orders", cluster:"Cluster nodes" }

  return (
    <>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @media (max-width: 900px) {
          .admin-root { flex-direction: column; }
          .admin-sidebar {
            width: 100% !important; flex-direction: row !important; border-right: none !important;
            border-bottom: 0.5px solid ${T.gray200}; flex-shrink: 0;
          }
          .admin-sidebar-brand, .admin-sidebar-footer, .admin-nav-label { display: none !important; }
          .admin-sidebar-nav { display: flex !important; padding: 0 !important; overflow-x: auto; }
          .admin-nav-button { width: auto !important; padding: 10px 14px !important; white-space: nowrap; }
          .admin-content { padding: 16px !important; }
          .admin-metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .admin-overview-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .admin-policy-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .admin-order-tabs { overflow-x: auto; }
          .admin-log-row { flex-wrap: wrap; }
          .admin-log-action { min-width: 150px; }
          .admin-log-reason { width: 100%; padding-left: 59px; overflow-wrap: anywhere; }
        }
        @media (max-width: 560px) {
          .admin-topbar { padding: 12px 14px !important; }
          .admin-content { padding: 12px !important; }
          .admin-metrics-grid, .admin-policy-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .admin-order-row, .admin-order-header {
            grid-template-columns: minmax(0, 1fr) minmax(96px, auto) !important;
          }
          .admin-order-row > :nth-child(4), .admin-order-header > :nth-child(4) { text-align: left !important; }
          .admin-log-action { min-width: 0; }
        }
        @media (max-width: 380px) {
          .admin-sse-label { display: none; }
          .admin-sse-pill { padding: 8px !important; }
        }
      `}</style>
      <div className="admin-root" style={{ display:"flex", height:"100vh", maxWidth:"100vw", overflow:"hidden", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background:T.gray100, color:T.black }}>
        <Sidebar page={page} setPage={setPage} />
        <div style={{ flex:1, minWidth:0, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <Topbar title={pageTitle[page]} sseConnected={sseConnected} onToggleSSE={() => setSseConnected(p => !p)} />
          <div className="admin-content" style={{ flex:1, minWidth:0, overflowY:"auto", overflowX:"hidden", padding:"20px 24px" }}>
            {page === "overview" && <OverviewPage metrics={metrics} orders={orders} logs={logs} setPage={setPage} />}
            {page === "orders"   && <OrdersPage orders={orders} />}
            {page === "cluster" && <ClusterPage workers={workers} logs={logs} metrics={metrics} />}
          </div>
        </div>
      </div>
    </>
  )
}
