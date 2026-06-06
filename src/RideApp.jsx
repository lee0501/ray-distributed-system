import { useState, useEffect, useRef } from "react"
import { api } from "./api/api"
import { TOKEN } from "./theme"

// ─── 共用 style helpers ───
const S = {
  card: {
    background: TOKEN.white,
    borderRadius: 16,
    border: `1px solid ${TOKEN.gray200}`,
    padding: "14px 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: TOKEN.gray400,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 4,
  },
  btnPrimary: {
    width: "100%",
    padding: "15px 0",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    background: TOKEN.black,
    color: TOKEN.white,
    transition: "opacity .15s",
  },
  btnOutline: {
    width: "100%",
    padding: "13px 0",
    borderRadius: 12,
    border: `1.5px solid ${TOKEN.gray200}`,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    background: TOKEN.white,
    color: TOKEN.black,
    transition: "background .15s",
  },
}

// ─── StatusPill（與 Admin dashboard 共用相同設計語言）───
const STATUS_CONFIG = {
  pending:         { label: "等待排程",   bg: "#fef3c7", color: "#92400e" },
  matching:        { label: "配對中",     bg: "#dbeafe", color: "#1e40af" },
  driver_assigned: { label: "司機前往中", bg: "#dcfce7", color: "#166534" },
  driver_arrived:  { label: "司機已抵達", bg: "#dcfce7", color: "#166534" },
  on_trip:         { label: "行程中",     bg: "#ede9fe", color: "#5b21b6" },
  completed:       { label: "行程完成",   bg: "#dcfce7", color: "#166534" },
  failed:          { label: "叫車失敗",   bg: "#fee2e2", color: "#991b1b" },
  cancelled:       { label: "已取消",     bg: TOKEN.gray100, color: TOKEN.gray600 },
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px",
      borderRadius: 999, background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

// ─── EtaBadge（資料來自 GET /cluster/eta）───
function EtaBadge({ waitMin, surge }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: surge ? TOKEN.amberLight : TOKEN.greenLight,
      color: surge ? "#92400e" : "#166534",
      padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: surge ? TOKEN.amber : TOKEN.green,
        animation: "blink 1.5s ease-in-out infinite",
      }} />
      {surge ? "⚡ 尖峰" : `約 ${waitMin} 分鐘`}
    </div>
  )
}

// ─── LocationInput ───
function LocationInput({ icon, label, placeholder, value, onChange, autoFocus }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 14px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        minWidth: label ? 58 : "auto",
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: icon === "circle" ? "50%" : 2,
          background: TOKEN.black, flexShrink: 0,
        }} />
        {label && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: TOKEN.gray500,
            whiteSpace: "nowrap",
          }}>
            {label}
          </span>
        )}
      </div>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: "none", outline: "none", fontSize: 14,
          color: TOKEN.black, background: "transparent", flex: 1,
          caretColor: TOKEN.black,
        }}
      />
    </div>
  )
}

// ─── RideTypeCard ───
function RideTypeCard({ name, sub, price, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      style={{
        border: `1.5px solid ${selected ? TOKEN.black : TOKEN.gray200}`,
        borderRadius: 12, padding: 12, cursor: "pointer",
        textAlign: "left", background: selected ? TOKEN.gray50 : TOKEN.white,
        transition: "all .15s", flex: 1,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: TOKEN.black }}>{name}</div>
      <div style={{ fontSize: 11, color: TOKEN.gray400, marginTop: 2 }}>{sub}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: TOKEN.black, marginTop: 8 }}>約 ${price}</div>
    </button>
  )
}

// ─── ProgressStep ───
function ProgressStep({ label, state, time }) {
  // state: "done" | "active" | "idle"
  const dotStyle = {
    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
    background: state === "done" ? TOKEN.green : state === "active" ? TOKEN.black : TOKEN.gray200,
    transition: "background .3s",
    animation: state === "active" ? "stepPulse 1s ease-in-out infinite" : "none",
  }
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 0", borderTop: `1px solid ${TOKEN.gray100}`,
    }}>
      <div style={dotStyle} />
      <span style={{
        fontSize: 13,
        color: state === "active" ? TOKEN.black : TOKEN.gray400,
        fontWeight: state === "active" ? 500 : 400,
        textDecoration: state === "done" ? "line-through" : "none",
      }}>
        {label}
      </span>
      {time && <span style={{ fontSize: 12, color: TOKEN.gray400, marginLeft: "auto" }}>{time}</span>}
    </div>
  )
}

// ─── MapPlaceholder ───
function MapPlaceholder({ height = 200, showCar = false }) {
  return (
    <div style={{
      height, flexShrink: 0, position: "relative", overflow: "hidden",
      background: "linear-gradient(155deg,#eef2f6 0%,#dde6ec 45%,#cdd9e0 100%)",
    }}>
      {/* grid lines */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.15 }}>
        {[50,100,150].map(y => <line key={y} x1={0} y1={y} x2={360} y2={y} stroke="#666" strokeWidth={0.5}/>)}
        {[60,120,180,240,300].map(x => <line key={x} x1={x} y1={0} x2={x} y2={height} stroke="#666" strokeWidth={0.5}/>)}
      </svg>
      {!showCar ? (
        <>
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            width:60, height:60, borderRadius:"50%",
            background:"rgba(26,26,26,0.08)",
            transform:"translate(-50%,-50%)",
            animation:"pulse 2s ease-out infinite",
          }}/>
          {/* pin */}
          <div style={{
            position:"absolute", top:"40%", left:"50%",
            transform:"translate(-50%,-100%) rotate(-45deg)",
            width:24, height:24, background:TOKEN.black,
            borderRadius:"50% 50% 50% 0",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <div style={{ width:9, height:9, background:"white", borderRadius:"50%", transform:"rotate(45deg)" }}/>
          </div>
        </>
      ) : (
        <>
          {/* SVG: 路徑虛線 + 起點圓 + 終點方塊 */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", overflow:"visible" }}>
            {/* 虛線路徑：從起點(80,height*0.6) 到終點(300,height*0.32) */}
            <path
              d={`M 80 ${height * 0.60} C 140 ${height * 0.60} 200 ${height * 0.32} 300 ${height * 0.32}`}
              fill="none" stroke="rgba(26,26,26,0.25)" strokeWidth={2}
              strokeDasharray="6 5"
            />
            {/* 起點圓（出發地）*/}
            <circle cx={80} cy={height * 0.60} r={6} fill={TOKEN.black} />
            <circle cx={80} cy={height * 0.60} r={10} fill="none" stroke={TOKEN.black} strokeWidth={1.5} opacity={0.3} />
            {/* 終點方塊（目的地）*/}
            <rect x={293} y={height * 0.32 - 7} width={14} height={14} rx={2} fill={TOKEN.black} />
            {/* 終點光暈 */}
            <circle cx={300} cy={height * 0.32} r={18} fill="none" stroke={TOKEN.black} strokeWidth={1} opacity={0.15} />
          </svg>

          {/* 車點：沿路徑從起點單向移動到終點，抵達後重置 */}
          <div style={{
            position:"absolute",
            top: height * 0.60,
            left: 80,
            width: 16, height: 16,
            borderRadius: "50%",
            background: TOKEN.black,
            transform: "translate(-50%, -50%)",
            animation: "carDrive 3.5s cubic-bezier(0.4,0,0.6,1) infinite",
          }}/>
          {/* 車點光環 */}
          <div style={{
            position:"absolute",
            top: height * 0.60,
            left: 80,
            width: 36, height: 36,
            borderRadius: "50%",
            border: `1.5px solid rgba(26,26,26,0.18)`,
            transform: "translate(-50%, -50%)",
            animation: "carDrive 3.5s cubic-bezier(0.4,0,0.6,1) infinite, ringFade 3.5s ease-out infinite",
          }}/>
        </>
      )}
    </div>
  )
}

// ─── Screen: 叫車頁 ───
function HomeScreen({ onNext, etaData }) {
  const [origin, setOrigin] = useState("台北車站")
  const [dest, setDest] = useState("松山機場")
  const [rideType, setRideType] = useState("standard")

  const priceMap = { standard: 260, premium: 420 }

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <MapPlaceholder height={190} />
      {/* bottom panel */}
      <div style={{
        background: TOKEN.white, borderRadius:"20px 20px 0 0",
        padding: 20, flex: 1, display:"flex", flexDirection:"column", gap:14,
        marginTop: -20, position:"relative", zIndex:1,
      }}>
        <div style={{ width:36, height:3, borderRadius:999, background:TOKEN.gray200, margin:"0 auto 2px" }}/>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:15, fontWeight:600, color:TOKEN.black }}>你要去哪裡？</span>
          <EtaBadge waitMin={etaData.waitMin} surge={etaData.surge} />
        </div>

        {/* location inputs */}
        <div style={{
          border: `1px solid ${TOKEN.gray200}`, borderRadius:12, overflow:"hidden",
        }}>
          <LocationInput icon="circle" label="出發位置" placeholder="目前位置" value={origin} onChange={setOrigin} autoFocus />
          <div style={{ height:1, background:TOKEN.gray100, marginLeft:34 }}/>
          <LocationInput icon="square" label="目的地點" placeholder="目的地" value={dest} onChange={setDest} />
        </div>

        {/* ride type */}
        <div style={{ fontSize:12, fontWeight:600, color:TOKEN.gray400 }}>選擇車型</div>
        <div style={{ display:"flex", gap:8 }}>
          <RideTypeCard name="標準" sub="標準4人座" price={260} selected={rideType==="standard"} onSelect={()=>setRideType("standard")} />
          <RideTypeCard name="優選" sub="豪華出行" price={420} selected={rideType==="premium"} onSelect={()=>setRideType("premium")} />
        </div>

        <button
          style={S.btnPrimary}
          onClick={() => onNext({ origin, dest, rideType, price: priceMap[rideType], waitMin: etaData.waitMin })}
          disabled={!origin || !dest}
        >
          確認叫車
        </button>
      </div>
    </div>
  )
}

// ─── Screen: 確認訂單 ───
function ConfirmScreen({ orderData, onBack, onSubmit, submitting, errorMsg }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      {/* header */}
      <div style={{
        padding:"14px 20px", display:"flex", alignItems:"center", gap:12,
        borderBottom:`1px solid ${TOKEN.gray100}`, background:TOKEN.white,
      }}>
        <button onClick={onBack} style={{ border:"none", background:"none", cursor:"pointer", fontSize:18, color:TOKEN.black, padding:0 }}>←</button>
        <span style={{ fontSize:15, fontWeight:600, color:TOKEN.black }}>確認叫車</span>
      </div>

      <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14, flex:1 }}>
        {/* summary card */}
        <div style={S.card}>
          {[
            ["出發位置", orderData.origin],
            ["目的地點", orderData.dest],
          ].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0" }}>
              <span style={{ color:TOKEN.gray400 }}>{k}</span>
              <span style={{ fontWeight:500, color:TOKEN.black }}>{v}</span>
            </div>
          ))}
          <div style={{ height:1, background:TOKEN.gray100, margin:"6px 0" }}/>
          {[
            ["車型", orderData.rideType === "standard" ? "標準" : "優選"],
            ["預估費用", `$${orderData.price}`],
            ["預估等待", `約 ${orderData.waitMin} 分鐘`],
          ].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0" }}>
              <span style={{ color:TOKEN.gray400 }}>{k}</span>
              <span style={{ fontWeight: k==="預估費用" ? 700 : 500, fontSize: k==="預估費用" ? 15 : 13, color:TOKEN.black }}>{v}</span>
            </div>
          ))}
        </div>

        {errorMsg && (
          <div style={{
            background:TOKEN.redLight, color:"#991b1b", borderRadius:12,
            padding:"10px 14px", fontSize:13, textAlign:"center",
          }}>
            {errorMsg}
          </div>
        )}

        <button
          style={{ ...S.btnPrimary, opacity: submitting ? 0.6 : 1, cursor: submitting ? "default" : "pointer" }}
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? "送出中…" : "送出訂單"}
        </button>
        <button style={S.btnOutline} onClick={onBack} disabled={submitting}>返回修改</button>

        <div style={{ flex:1 }}/>
      </div>
    </div>
  )
}

// ─── Screen: 配對中 ───
function MatchingScreen({ tripStatus, onCancel }) {
  const steps = [
    { label:"訂單已建立", state:"done", time:"剛剛" },
    {
      label: tripStatus === "pending" ? "配對司機中" : "司機已配對",
      state: tripStatus === "pending" ? "active" : "done",
      time: tripStatus !== "pending" ? "剛剛" : undefined,
    },
    {
      label:"司機前往中",
      state: ["driver_assigned","driver_arrived","on_trip","completed"].includes(tripStatus) ? (tripStatus === "driver_assigned" ? "active" : "done") : "idle",
    },
    {
      label:"行程中",
      state: ["on_trip","completed"].includes(tripStatus) ? (tripStatus==="on_trip" ? "active" : "done") : "idle",
    },
  ]

  const titleMap = {
    pending: "正在尋找司機",
    matching: "正在尋找司機",
    driver_assigned: "司機已配對",
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <MapPlaceholder height={260} showCar />
      <div style={{
        background:TOKEN.white, borderRadius:"20px 20px 0 0",
        padding:20, display:"flex", flexDirection:"column", gap:14,
        marginTop:-20, position:"relative", zIndex:1,
      }}>
        <div style={{ width:36, height:3, borderRadius:999, background:TOKEN.gray200, margin:"0 auto 2px" }}/>

        {/* status header */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:20, height:20, borderRadius:"50%",
            border:`2px solid ${TOKEN.gray200}`, borderTopColor:TOKEN.black,
            animation:"spin 0.8s linear infinite", flexShrink:0,
          }}/>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:TOKEN.black }}>{titleMap[tripStatus] || "正在尋找司機"}</div>
            <div style={{ fontSize:13, color:TOKEN.gray400 }}>系統正在配對附近的司機</div>
          </div>
          <div style={{ marginLeft:"auto" }}>
            <StatusPill status={tripStatus} />
          </div>
        </div>

        {/* steps */}
        <div style={{ display:"flex", flexDirection:"column" }}>
          {steps.map((s,i) => <ProgressStep key={i} {...s} />)}
        </div>

        <button style={{ ...S.btnOutline, fontSize:13, padding:"10px 0" }} onClick={onCancel}>
          取消訂單
        </button>
      </div>
    </div>
  )
}

// ─── Screen: 司機前往中 ───
function DriverScreen({ driverInfo }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <MapPlaceholder height={240} showCar />
      <div style={{
        background:TOKEN.white, borderRadius:"20px 20px 0 0",
        padding:20, display:"flex", flexDirection:"column", gap:14,
        marginTop:-20, position:"relative", zIndex:1,
      }}>
        <div style={{ width:36, height:3, borderRadius:999, background:TOKEN.gray200, margin:"0 auto 2px" }}/>

        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:TOKEN.green, flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:TOKEN.black }}>司機前往中</div>
            <div style={{ fontSize:13, color:TOKEN.gray400 }}>
              預計 <strong style={{ color:TOKEN.black }}>{driverInfo.eta}</strong> 分鐘後抵達
            </div>
          </div>
          <div style={{ marginLeft:"auto" }}>
            <StatusPill status="driver_assigned" />
          </div>
        </div>

        {/* driver card */}
        <div style={{
          ...S.card,
          display:"flex", alignItems:"center", gap:12,
        }}>
          <div style={{
            width:48, height:48, borderRadius:"50%",
            background:TOKEN.gray100, display:"flex",
            alignItems:"center", justifyContent:"center",
            fontSize:18, fontWeight:600, color:TOKEN.gray600, flexShrink:0,
          }}>
            {driverInfo.name[0]}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600, color:TOKEN.black }}>{driverInfo.name}</div>
            <div style={{ fontSize:12, color:TOKEN.gray400, marginTop:2 }}>⭐ {driverInfo.rating} · 1,234 趟</div>
          </div>
          <div style={{
            background:TOKEN.gray100, borderRadius:8,
            padding:"4px 10px", fontSize:13, fontWeight:600, letterSpacing:"0.05em",
          }}>
            {driverInfo.plate}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column" }}>
          {[
            { label:"訂單已建立", state:"done" },
            { label:"司機已配對", state:"done" },
            { label:"司機前往中", state:"active" },
            { label:"行程中",     state:"idle" },
          ].map((s,i) => <ProgressStep key={i} {...s} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Screen: 行程中 ───
function TripScreen({ orderData, tripElapsed, tripTotal }) {
  const pct = tripTotal > 0 ? Math.min(100, Math.round((tripElapsed / tripTotal) * 100)) : 0
  const remaining = Math.max(0, tripTotal - tripElapsed)

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <MapPlaceholder height={240} showCar />
      <div style={{
        background:TOKEN.white, borderRadius:"20px 20px 0 0",
        padding:20, display:"flex", flexDirection:"column", gap:14,
        marginTop:-20, position:"relative", zIndex:1,
      }}>
        <div style={{ width:36, height:3, borderRadius:999, background:TOKEN.gray200, margin:"0 auto 2px" }}/>

        {/* status header */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:TOKEN.blue, flexShrink:0, animation:"blink 1.5s ease-in-out infinite" }}/>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:TOKEN.black }}>行程中</div>
            <div style={{ fontSize:13, color:TOKEN.gray400 }}>
              預計還需 <strong style={{ color:TOKEN.black }}>{remaining}</strong> 秒抵達
            </div>
          </div>
          <div style={{ marginLeft:"auto" }}>
            <StatusPill status="on_trip" />
          </div>
        </div>

        {/* 行程進度條 */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:TOKEN.gray400 }}>
            <span>{orderData?.origin || "出發地"}</span>
            <span>{orderData?.dest || "目的地"}</span>
          </div>
          <div style={{ height:6, background:TOKEN.gray200, borderRadius:999, overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:999,
              background:`linear-gradient(90deg, ${TOKEN.blue}, #60a5fa)`,
              width:`${pct}%`, transition:"width 1s linear",
            }}/>
          </div>
          <div style={{ textAlign:"center", fontSize:12, color:TOKEN.gray400 }}>{pct}% 完成</div>
        </div>

        {/* 路線資訊 */}
        <div style={{ ...S.card, display:"flex", justifyContent:"space-between" }}>
          {[
            ["目的地", orderData?.dest || "松山機場"],
            ["剩餘時間", `${remaining} 秒`],
            ["預估費用", `$${orderData?.price || 260}`],
          ].map(([k,v]) => (
            <div key={k} style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, color:TOKEN.gray400, marginBottom:3 }}>{k}</div>
              <div style={{ fontSize:13, fontWeight:600, color:TOKEN.black }}>{v}</div>
            </div>
          ))}
        </div>

        {/* 步驟 */}
        <div style={{ display:"flex", flexDirection:"column" }}>
          {[
            { label:"訂單已建立", state:"done" },
            { label:"司機已配對", state:"done" },
            { label:"司機前往中", state:"done" },
            { label:"行程中",     state:"active" },
          ].map((s,i) => <ProgressStep key={i} {...s} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Screen: 完成 ───
function DoneScreen({ fare, onRestart }) {
  const [rating, setRating] = useState(0)
  return (
    <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14, flex:1 }}>
      <div style={{ textAlign:"center", padding:"20px 0 8px" }}>
        <div style={{ fontSize:40, marginBottom:8 }}>✓</div>
        <div style={{ fontSize:16, fontWeight:600, color:TOKEN.black }}>行程完成</div>
        <div style={{ fontSize:12, color:TOKEN.gray400, marginTop:4 }}>謝謝您的搭乘</div>
      </div>

      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:12, color:TOKEN.gray400, marginBottom:4 }}>實際費用</div>
        <div style={{ fontSize:44, fontWeight:700, color:TOKEN.black, fontVariantNumeric:"tabular-nums" }}>${fare}</div>
        <div style={{ fontSize:12, color:TOKEN.gray400, marginTop:4 }}>信用卡 ···· 4242</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[["18 分", "行程時間"],["8.3 km","行駛距離"]].map(([v,l]) => (
          <div key={l} style={{ background:TOKEN.gray50, borderRadius:12, padding:12, textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:600, color:TOKEN.black }}>{v}</div>
            <div style={{ fontSize:11, color:TOKEN.gray400, marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ background:TOKEN.gray50, borderRadius:12, padding:"12px 14px" }}>
        <div style={{ fontSize:12, color:TOKEN.gray400, marginBottom:8 }}>為這趟行程評分</div>
        <div style={{ display:"flex", gap:8, justifyContent:"center", fontSize:28 }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} onClick={() => setRating(i)} style={{ cursor:"pointer", color: i<=rating ? TOKEN.amber : TOKEN.gray200, transition:"color .15s" }}>★</span>
          ))}
        </div>
      </div>

      <div style={{ flex:1 }}/>
      <button style={S.btnPrimary} onClick={onRestart}>完成</button>
    </div>
  )
}

// ─── 主元件 RideApp ───
export default function RideApp() {
  const [screen, setScreen] = useState("home")   // home | confirm | matching | driver | trip | done
  const [orderData, setOrderData] = useState(null)
  const [tripStatus, setTripStatus] = useState("pending")
  const [etaData, setEtaData] = useState({ waitMin:2, surge:false })
  const [driverInfo, setDriverInfo] = useState({ name:"王大明", rating:4.8, plate:"ABC-1234", eta:4 })
  const [fare, setFare] = useState(268)
  const [tripElapsed, setTripElapsed] = useState(0)
  const [submitting, setSubmitting] = useState(false)  // 送出中，防重複點擊
  const [errorMsg, setErrorMsg] = useState(null)        // 叫車失敗訊息
  const TRIP_TOTAL = 20
  const unsubRef = useRef(null)

  // ── GET /cluster/eta polling
  useEffect(() => {
    const refreshEta = () => api.getEta().then(setEtaData).catch(() => {})
    refreshEta()
    const id = setInterval(refreshEta, 4000)
    return () => clearInterval(id)
  }, [])

  // ── 行程中進度條計時器
  useEffect(() => {
    if (screen !== "trip") return
    setTripElapsed(0)
    const id = setInterval(() => {
      setTripElapsed(prev => {
        if (prev >= TRIP_TOTAL) { clearInterval(id); return prev }
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [screen])

  const handleConfirm = (data) => {
    setOrderData(data)
    setScreen("confirm")
  }

  const handleSubmit = async () => {
    if (submitting) return        // 防止 await 期間重複點擊
    setSubmitting(true)
    setErrorMsg(null)

    try {
      const { order_id } = await api.createRideOrder(orderData)

      setTripStatus("pending")
      setScreen("matching")

      unsubRef.current = api.subscribeRideOrder(order_id, ({ status, trip, result }) => {
        setTripStatus(status)
        if (status === "driver_assigned" && trip) {
          setDriverInfo({ name: trip.driver_name, rating: trip.driver_rating, plate: trip.license_plate, eta: trip.estimated_arrival })
          setScreen("driver")
        } else if (status === "on_trip") {
          setScreen("trip")
        } else if (status === "completed") {
          setFare(result?.fare ?? (orderData?.price ? orderData.price + 8 : 268))
          setScreen("done")
        } else if (status === "failed") {
          // 配對失敗：顯示訊息、退回確認頁讓使用者重試、並清除這次訂閱
          setErrorMsg("叫車失敗，請稍後再試")
          setScreen("confirm")
          if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
        }
      })
    } catch (err) {
      // 建立訂單失敗（後端錯誤／斷線）→ 退回確認頁並提示，不卡在配對中
      setErrorMsg("無法送出訂單，請檢查連線後再試一次")
      setScreen("confirm")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestart = () => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    setScreen("home")
    setTripStatus("pending")
    setOrderData(null)
    setTripElapsed(0)
    setErrorMsg(null)
  }

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes pulse { 0%{transform:translate(-50%,-50%) scale(0.5);opacity:0.8} 100%{transform:translate(-50%,-50%) scale(2);opacity:0} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes stepPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
        @keyframes carDrive {
          0%   { transform: translate(-50%,-50%) translate(0px, 0px);   opacity:1 }
          85%  { transform: translate(-50%,-50%) translate(220px,-52px); opacity:1 }
          95%  { transform: translate(-50%,-50%) translate(220px,-52px); opacity:0 }
          100% { transform: translate(-50%,-50%) translate(0px, 0px);   opacity:0 }
        }
        @keyframes ringFade {
          0%   { opacity:0.6 }
          85%  { opacity:0.1 }
          100% { opacity:0   }
        }

        * { -webkit-tap-highlight-color: transparent; }

        /* ── 手機版（真的用手機開）：全螢幕，無外框 ── */
        .device-stage { width: 100%; height: 100%; }
        .device {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          background: #000;
        }
        .device-island, .device-btn { display: none; }
        .ride-shell {
          width: 100%; height: 100%;
          background: #ffffff;
          display: flex; flex-direction: column;
          overflow: hidden; position: relative;
        }
        .home-indicator {
          position: absolute; bottom: 7px; left: 50%;
          transform: translateX(-50%);
          width: 130px; height: 5px; border-radius: 999px;
          background: rgba(0,0,0,0.28); pointer-events: none; z-index: 5;
        }

        /* ── 桌面 demo：包成一支真的手機 ── */
        @media (min-width: 500px) {
          .device-stage {
            position: fixed; inset: 0;
            display: flex; align-items: center; justify-content: center;
            background: radial-gradient(circle at 50% 30%, #f4f5f8 0%, #e6e8ee 55%, #d9dbe3 100%);
          }
          .device {
            position: relative;
            width: 390px; height: min(844px, calc(100vh - 56px));
            padding: 13px;
            background: linear-gradient(160deg, #2a2c30 0%, #0c0d0f 100%);
            border-radius: 56px;
            box-shadow:
              0 0 0 2px #3a3c40,
              0 30px 70px rgba(0,0,0,0.35),
              inset 0 0 2px rgba(255,255,255,0.25);
          }
          .ride-shell {
            border-radius: 44px;
            box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);
          }
          /* 動態島 */
          .device-island {
            display: block; position: absolute;
            top: 25px; left: 50%; transform: translateX(-50%);
            width: 116px; height: 33px; border-radius: 999px;
            background: #000; z-index: 20;
          }
          /* 側邊實體按鍵 */
          .device-btn {
            display: block; position: absolute;
            background: linear-gradient(90deg, #1a1b1d, #404247);
            border-radius: 2px;
          }
          .device-btn--vol-up  { left: -3px; top: 150px; width: 3px; height: 52px; border-radius: 3px 0 0 3px; }
          .device-btn--vol-dn  { left: -3px; top: 214px; width: 3px; height: 52px; border-radius: 3px 0 0 3px; }
          .device-btn--power   { right: -3px; top: 190px; width: 3px; height: 78px;
            background: linear-gradient(270deg, #1a1b1d, #404247); border-radius: 0 3px 3px 0; }
        }
      `}</style>

      <div className="device-stage">
       <div className="device">
        <div className="device-island" />
        <span className="device-btn device-btn--vol-up" />
        <span className="device-btn device-btn--vol-dn" />
        <span className="device-btn device-btn--power" />
        <div className="ride-shell">
        <div style={{ padding:"14px 22px 8px", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:13, fontWeight:600, color:TOKEN.black, flexShrink:0 }}>
          <span style={{ fontVariantNumeric:"tabular-nums" }}>9:41</span>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {/* 訊號 */}
            <svg width="17" height="11" viewBox="0 0 17 11" fill={TOKEN.black} aria-hidden>
              <rect x="0"  y="7.5" width="3" height="3.5" rx="0.6" />
              <rect x="4"  y="5"   width="3" height="6"   rx="0.6" />
              <rect x="8"  y="2.5" width="3" height="8.5" rx="0.6" />
              <rect x="12" y="0"   width="3" height="11"  rx="0.6" />
            </svg>
            {/* wifi */}
            <svg width="16" height="11" viewBox="0 0 16 12" fill="none" stroke={TOKEN.black} strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M2 4.5C5.5 1.5 10.5 1.5 14 4.5" />
              <path d="M4 7C6.4 5 9.6 5 12 7" />
              <path d="M6 9.5C7.2 8.5 8.8 8.5 10 9.5" />
            </svg>
            {/* 電池 */}
            <div style={{ display:"flex", alignItems:"center", gap:1.5 }}>
              <div style={{ width:22, height:11, border:`1px solid ${TOKEN.black}`, borderRadius:3, padding:1.5, opacity:0.9 }}>
                <div style={{ width:"78%", height:"100%", background:TOKEN.black, borderRadius:1 }} />
              </div>
              <div style={{ width:1.5, height:4, background:TOKEN.black, borderRadius:1, opacity:0.6 }} />
            </div>
          </div>
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
          {screen === "home"    && <HomeScreen onNext={handleConfirm} etaData={etaData} />}
          {screen === "confirm" && orderData && <ConfirmScreen orderData={orderData} onBack={() => setScreen("home")} onSubmit={handleSubmit} submitting={submitting} errorMsg={errorMsg} />}
          {screen === "matching"&& <MatchingScreen tripStatus={tripStatus} onCancel={handleRestart} />}
          {screen === "driver"  && <DriverScreen driverInfo={driverInfo} />}
          {screen === "trip"    && <TripScreen orderData={orderData} tripElapsed={tripElapsed} tripTotal={TRIP_TOTAL} />}
          {screen === "done"    && <DoneScreen fare={fare} onRestart={handleRestart} />}
        </div>

        <div className="home-indicator" />
        </div>
       </div>
      </div>
    </>
  )
}
