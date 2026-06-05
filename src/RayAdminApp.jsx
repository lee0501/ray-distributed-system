import { useState, useEffect } from "react"
import { api } from "./api/api"

// ─── Design Tokens（與 RideApp.jsx 共用）───
const T = {
  black: "#0a0a0a", white: "#ffffff",
  gray50: "#f8f8f6", gray100: "#f0efe9", gray200: "#dddcd6",
  gray400: "#9c9a92", gray600: "#5c5b56", gray800: "#2a2a28",
  green: "#1db954", greenLight: "#e8f5ee",
  amber: "#f59e0b", amberLight: "#fffbeb",
  red: "#ef4444", redLight: "#fee2e2",
  blue: "#3b82f6", blueLight: "#dbeafe",
  purple: "#7c3aed", purpleLight: "#ede9fe",
  teal200: "#5DCAA5", amber200: "#EF9F27", red200: "#F09595",
  blue200: "#85B7EB", purple200: "#AFA9EC", gray300: "#B4B2A9",
}

// ─── 共用 Status pill（與 RideApp.jsx 共用相同設計語言）───
const STATUS_CONFIG = {
  pending:         { label: "pending",         bg: T.amberLight,  color: "#92400e" },
  matching:        { label: "matching",         bg: T.blueLight,   color: "#1e40af" },
  driver_assigned: { label: "driver_assigned",  bg: T.greenLight,  color: "#166534" },
  on_trip:         { label: "on_trip",          bg: T.purpleLight, color: "#5b21b6" },
  running:         { label: "running",          bg: T.blueLight,   color: "#1e40af" },
  completed:       { label: "completed",        bg: T.greenLight,  color: "#166534" },
  failed:          { label: "failed",           bg: T.redLight,    color: "#991b1b" },
  cancelled:       { label: "cancelled",        bg: T.gray100,     color: T.gray600 },
}

function StatusPill({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  )
}

// ─── Metric Card ───
function MetricCard({ label, value, sub, fillPct, fillColor }) {
  return (
    <div style={{ background: T.white, border: `0.5px solid ${T.gray200}`, borderRadius: 12, padding: "14px 16px" }}>
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
function OrderRow({ order }) {
  const pct = order.total > 0 ? Math.round((order.elapsed / order.total) * 100) : 0
  const statusColor = {
    running: T.blue200, pending: T.amber200, completed: T.teal200, failed: T.red200,
    matching: T.blue200, driver_assigned: T.teal200, on_trip: T.purple200,
  }[order.status] || T.gray300

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "50px 140px 110px 130px 1fr 80px",
      alignItems: "center", gap: 8,
      background: T.white, border: `0.5px solid ${T.gray200}`,
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      cursor: "pointer", transition: "border-color .15s",
    }}>
      <span style={{ fontFamily: "monospace", fontSize: 11, color: T.gray400 }}>{order.id}</span>
      <span style={{ fontWeight: 500, color: T.black }}>{order.type}</span>
      <StatusPill status={order.status} />
      <span style={{ fontSize: 11, color: T.gray600 }}>{order.worker}</span>
      <div style={{ height: 4, background: T.gray200, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: statusColor, width: `${pct}%`, transition: "width 0.5s" }} />
      </div>
      <span style={{ textAlign: "right", color: T.gray400 }}>{order.ts}</span>
    </div>
  )
}

// ─── Worker Card ───
// WorkerCard is disabled with the Cluster page because per-node CPU data is unavailable.
// function WorkerCard({ worker }) { ... }

// Scale Log Row is hidden because infra does not persist scale events.
// function LogRow({ log }) { ... }

// ─── Sidebar Nav ───
function Sidebar({ page, setPage }) {
  const mainItems = [
    { key: "overview", label: "Overview",      icon: "⊞" },
    { key: "orders",   label: "Orders",        icon: "☰" },
  ]
  // Cluster navigation is disabled until reliable cluster detail APIs exist.
  // const infraItems = [
  //   { key: "cluster",  label: "Cluster nodes", icon: "◫" },
  // ]
  const navBtn = (n) => (
    <button key={n.key} onClick={() => setPage(n.key)}
      style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 18px", fontSize:13, cursor:"pointer", border:"none", background: page===n.key ? T.gray100 : "none", width:"100%", textAlign:"left", color: page===n.key ? T.black : T.gray600, fontWeight: page===n.key ? 500 : 400, transition:"background .12s" }}>
      <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
    </button>
  )
  return (
    <div style={{ width: 200, flexShrink: 0, background: T.white, borderRight: `0.5px solid ${T.gray200}`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 18px 16px", borderBottom: `0.5px solid ${T.gray200}` }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.black }}>Ray Admin</div>
        <div style={{ fontSize: 11, color: T.gray400, marginTop: 2 }}>Distributed cluster UI</div>
      </div>
      <div style={{ padding: "10px 0", flex: 1 }}>
        <div style={{ fontSize: 10, color: T.gray400, padding: "4px 18px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Main</div>
        {mainItems.map(navBtn)}
        {/* Infrastructure navigation disabled with the Cluster page. */}
        {/* <div style={{ fontSize: 10, color: T.gray400, padding: "12px 18px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Infrastructure</div>
        {infraItems.map(navBtn)} */}
      </div>
      <div style={{ padding: "12px 18px", borderTop: `0.5px solid ${T.gray200}`, fontSize: 11, color: T.gray400 }}>
        Ray local autoscaler v0.1
      </div>
    </div>
  )
}

// ─── Topbar ───
function Topbar({ title, sseConnected, onToggleSSE }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 24px", background:T.white, borderBottom:`0.5px solid ${T.gray200}`, flexShrink:0 }}>
      <span style={{ fontSize: 15, fontWeight: 500, color: T.black }}>{title}</span>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.gray600, background:T.gray100, padding:"5px 12px", borderRadius:999, border:`0.5px solid ${T.gray200}` }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background: sseConnected ? T.green : T.gray300, animation: sseConnected ? "blink 1.8s ease-in-out infinite" : "none" }}/>
          {sseConnected ? "SSE connected" : "Disconnected"}
        </div>
        <button onClick={onToggleSSE} style={{ border:`0.5px solid ${T.gray200}`, background:T.white, borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:13, color:T.black }}>↻</button>
      </div>
    </div>
  )
}

// ─── Page: Overview ───
function OverviewPage({ metrics, orders, setPage }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <MetricCard label="Workers alive"  value={metrics.workers}  sub="max 5 nodes"  fillPct={metrics.workers/5*100}   fillColor={T.blue200}   />
        <MetricCard label="Pending resource demands"  value={metrics.pending}  sub="in queue"     fillPct={metrics.pending/10*100}  fillColor={T.amber200}  />
        <MetricCard label="CPU usage"      value={`${metrics.cpu}%`} sub={`${(metrics.cpu/100*2).toFixed(2)} / 2.0 cores`} fillPct={metrics.cpu} fillColor={T.teal200} />
        {/* <MetricCard label="Cooldown"       value={`${metrics.cooldown}s`} sub={`last: ${metrics.lastAction}`} fillPct={metrics.cooldown/15*100} fillColor={T.purple200} /> */}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:16 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:500, color:T.gray600 }}>Recent orders</span>
            <button onClick={() => setPage("orders")} style={{ fontSize:12, padding:"5px 12px", border:`0.5px solid ${T.gray200}`, background:T.white, borderRadius:8, cursor:"pointer", color:T.black }}>View all →</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {orders.slice(0,3).map(o => <OrderRow key={o.id} order={o} />)}
          </div>
        </div>
        {/* Scaling log is hidden because infra does not persist scale events. */}
      </div>
    </div>
  )
}

// ─── Page: Orders ───
function OrdersPage({ orders }) {
  const [filter, setFilter] = useState("all")
  const tabs = ["all","pending","running","completed","failed"]
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter)

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", gap:0, borderBottom:`0.5px solid ${T.gray200}`, marginBottom:2 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ padding:"9px 16px", fontSize:12, cursor:"pointer", border:"none", background:"none", color: filter===t ? T.black : T.gray400, borderBottom: filter===t ? `2px solid ${T.blue}` : "2px solid transparent", fontWeight: filter===t ? 500 : 400, marginBottom:-0.5 }}>{t}</button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"50px 140px 110px 130px 1fr 80px", gap:8, padding:"4px 14px", fontSize:11, color:T.gray400 }}>
        <span>#</span><span>type</span><span>status</span><span>worker</span><span>progress</span><span style={{textAlign:"right"}}>time</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {filtered.map(o => <OrderRow key={o.id} order={o} />)}
      </div>
    </div>
  )
}

// ─── Page: Cluster ───
// function ClusterPage({ workers, logs }) {
//   const alive = workers.filter(w => w.status !== "stopping").length
//   const policyItems = [
//     ["min_workers","0","minimum alive"],
//     ["max_workers","5","maximum alive"],
//     ["cooldown","15s","between actions"],
//     ["scale_up_threshold","3 polls","consecutive checks"],
//     ["cpu_scale_down","< 10%","CPU threshold"],
//     ["poll_interval","5s","monitor frequency"],
//   ]
//   return (
//     <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
//       <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
//         <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
//           <span style={{ fontSize:13, fontWeight:500, color:T.gray600 }}>
//             Nodes <span style={{ color:T.gray400, fontWeight:400 }}>({alive} alive)</span>
//           </span>
//           <span style={{ fontSize:11, color:T.gray400, background:T.gray100, padding:"4px 10px", borderRadius:999 }}>
//             Auto-managed by Autoscaler
//           </span>
//         </div>
//         <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
//           {workers.map(w => <WorkerCard key={w.id} worker={w} />)}
//         </div>
//       </div>

//       <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
//         <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
//           <span style={{ fontSize:13, fontWeight:500, color:T.gray600 }}>Scale policy</span>
//           <button style={{ fontSize:12, padding:"5px 12px", border:`0.5px solid ${T.gray200}`, background:T.white, borderRadius:8, cursor:"pointer", color:T.black }}>scale_policy.yaml</button>
//         </div>
//         <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
//           {policyItems.map(([k,v,d]) => (
//             <div key={k} style={{ background:T.white, border:`0.5px solid ${T.gray200}`, borderRadius:10, padding:14 }}>
//               <div style={{ fontSize:11, color:T.gray400, marginBottom:4 }}>{k}</div>
//               <div style={{ fontSize:18, fontWeight:500, color:T.black }}>{v}</div>
//               <div style={{ fontSize:11, color:T.gray400, marginTop:3 }}>{d}</div>
//             </div>
//           ))}
//         </div>
//       </div>

//       <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
//         <span style={{ fontSize:13, fontWeight:500, color:T.gray600 }}>Scaling history</span>
//         <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
//           {logs.map((l,i) => <LogRow key={i} log={l} />)}
//         </div>
//       </div>
//     </div>
//   )
// }



// ─── 主元件 RayAdminApp ───
export default function RayAdminApp() {
  const [page, setPage] = useState("overview")
  const [sseConnected, setSseConnected] = useState(true)

  const [orders,  setOrders]  = useState([])
  // Cluster page state remains disabled while the Cluster page is hidden.
  // const [workers, setWorkers] = useState([])
  // Scaling log state is hidden with the Overview scaling log.
  // const [logs,    setLogs]    = useState([])
  const [metrics, setMetrics] = useState({ workers: 0, pending: 0, cpu: 0, cooldown: 0, lastAction: "—" })

  // ── Initial data load
  useEffect(() => {
    api.getAdminSnapshot().then(({ orders, metrics }) => {
      setOrders(orders)
      // setWorkers(workers)
      // setLogs(logs)
      setMetrics(metrics)
    })
  }, [])

  // ── Live updates via SSE / mock heartbeat
  useEffect(() => {
    if (!sseConnected) return
    const unsub = api.subscribeAdminUpdates(({ orders: o, metrics: m }) => {
      if (o) setOrders(o)
      if (m) setMetrics(prev => ({ ...prev, ...m }))
    })
    return unsub
  }, [sseConnected])

  const pageTitle = { overview:"Overview", orders:"Orders" }

  return (
    <>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ display:"flex", height:"100vh", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background:T.gray100, color:T.black }}>
        <Sidebar page={page} setPage={setPage} />
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <Topbar title={pageTitle[page]} sseConnected={sseConnected} onToggleSSE={() => setSseConnected(p => !p)} />
          <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
            {page === "overview" && <OverviewPage metrics={metrics} orders={orders} setPage={setPage} />}
            {page === "orders"   && <OrdersPage orders={orders} />}
            {/* Cluster page disabled because its backing APIs are unavailable. */}
            {/* {page === "cluster" && <ClusterPage workers={workers} logs={logs} />} */}
          </div>
        </div>
      </div>
    </>
  )
}
