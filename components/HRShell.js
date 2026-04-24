"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";

const PUBLIC_HOLIDAYS = [
  { date:"2025-01-01", name:"New Year's Day" },
  { date:"2025-04-25", name:"Sinai Liberation Day" },
  { date:"2025-05-01", name:"Labour Day" },
  { date:"2025-07-23", name:"Revolution Day" },
  { date:"2025-10-06", name:"Armed Forces Day" },
  { date:"2025-12-25", name:"Christmas Day" },
];
const LEAVE_TYPES = [
  { key:"annual", label:"Annual Leave",   total:21, color:"#818cf8", icon:"🌴" },
  { key:"sick",   label:"Sick Leave",     total:6,  color:"#f87171", icon:"🏥" },
  { key:"public", label:"Public Holiday", total:6,  color:"#fbbf24", icon:"🎉" },
];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const NAV = [
  { key:"dashboard",     label:"Dashboard",      icon:"⊞" },
  { key:"team",          label:"Team",           icon:"⊛" },
  { key:"leaves",        label:"Leave Calendar", icon:"◫" },
  { key:"schedule",      label:"Schedule",       icon:"⊟" },
  { key:"requests",      label:"Requests",       icon:"⊜" },
  { key:"notifications", label:"Teams Notify",   icon:"⊕" },
];

export default function HRShell({ currentUser, allProfiles: initProfiles, balances: initBalances, leaveRequests: initRequests, schedule: initSchedule, notifications: initNotifs }) {
  const supabase = createClient();
  const router   = useRouter();

  const [dark, setDark]               = useState(true);
  const [activeNav, setNav]           = useState("dashboard");
  const [profiles]                    = useState(initProfiles || []);
  const [balances]                    = useState(initBalances || []);
  const [requests, setRequests]       = useState(initRequests || []);
  const [schedule]                    = useState(initSchedule || []);
  const [notifs]                      = useState(initNotifs || []);
  const [toast, setToast]             = useState(null);
  const [selMember, setSelMember]     = useState(null);
  const [calMonth, setCalMonth]       = useState(new Date(2025, 3, 1));
  const [filterStatus, setFilter]     = useState("all");
  const [leaveForm, setLeaveForm]     = useState({ memberId:"", type:"annual", startDate:"", endDate:"", reason:"" });
  const [schedDate, setSchedDate]     = useState("");
  const [schedMembers, setSchedMembers] = useState([]);
  const [submitting, setSubmitting]   = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Clock
  useEffect(() => {
    function tick() {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", second:"2-digit" }));
      setCurrentDate(now.toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short", year:"numeric" }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Load theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem("turbohr-theme");
      setDark(saved !== "light");
    } catch(e) {}
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    try { localStorage.setItem("turbohr-theme", next ? "dark" : "light"); } catch(e) {}
  }

  // Derived
  const isAdmin       = currentUser?.is_admin === true;
  const agentProfiles = profiles.filter(p => !p.is_admin);
  const todayStr      = new Date().toISOString().split("T")[0];
  const todayAbsent   = requests.filter(r => r.status === "approved" && r.start_date <= todayStr && r.end_date >= todayStr);
  const pendingCount  = requests.filter(r => r.status === "pending").length;
  const myRequests    = isAdmin ? requests : requests.filter(r => r.user_id === currentUser?.id);
  const getMember     = id => profiles.find(p => p.id === id);
  const getBalance    = id => balances.find(b => b.user_id === id);
  const calcDays      = (a, b) => { if (!a||!b) return 0; let n=0; for(const d=new Date(a);d<=new Date(b);d.setDate(d.getDate()+1)){const w=d.getDay();if(w!==5&&w!==6)n++;} return n; };
  const showToast     = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };

  // ── Theme ──────────────────────────────────────────────────────────────────
  const T = dark ? {
    bg:         "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0f15 100%)",
    bgSolid:    "#0a0a0f",
    bgCard:     "rgba(255,255,255,0.04)",
    bgCardHov:  "rgba(255,255,255,0.07)",
    bgSide:     "rgba(255,255,255,0.03)",
    bgDeep:     "rgba(0,0,0,0.3)",
    bgInput:    "rgba(255,255,255,0.05)",
    bgTopbar:   "rgba(10,10,15,0.85)",
    border:     "rgba(255,255,255,0.08)",
    borderHi:   "rgba(129,140,248,0.4)",
    text:       "#f0f0ff",
    textMid:    "#9090b0",
    textDim:    "#4a4a6a",
    logo:       "#818cf8",
    accent:     "#818cf8",
    accentGlow: "rgba(129,140,248,0.3)",
    navAct:     "rgba(129,140,248,0.15)",
    navActText: "#a5b4fc",
    navText:    "#606080",
    toastOk:    ["rgba(16,185,129,0.15)","rgba(16,185,129,0.4)","#34d399"],
    toastErr:   ["rgba(239,68,68,0.15)","rgba(239,68,68,0.4)","#f87171"],
    todayBg:    "rgba(129,140,248,0.12)",
    holBg:      "rgba(251,191,36,0.08)",
    wkndBg:     "rgba(0,0,0,0.2)",
    shadow:     "0 8px 32px rgba(0,0,0,0.4)",
    shadowSm:   "0 2px 8px rgba(0,0,0,0.3)",
  } : {
    bg:         "linear-gradient(135deg, #f0f0ff 0%, #f8f8ff 50%, #f0f8ff 100%)",
    bgSolid:    "#f8f8ff",
    bgCard:     "rgba(255,255,255,0.9)",
    bgCardHov:  "rgba(255,255,255,1)",
    bgSide:     "rgba(255,255,255,0.8)",
    bgDeep:     "rgba(240,240,255,0.8)",
    bgInput:    "rgba(240,240,255,0.8)",
    bgTopbar:   "rgba(248,248,255,0.9)",
    border:     "rgba(99,102,241,0.12)",
    borderHi:   "rgba(99,102,241,0.4)",
    text:       "#1a1a2e",
    textMid:    "#5a5a8a",
    textDim:    "#9090b8",
    logo:       "#4f46e5",
    accent:     "#4f46e5",
    accentGlow: "rgba(99,102,241,0.2)",
    navAct:     "rgba(99,102,241,0.1)",
    navActText: "#4f46e5",
    navText:    "#8080a8",
    toastOk:    ["#d1fae5","#6ee7b7","#065f46"],
    toastErr:   ["#fee2e2","#fca5a5","#991b1b"],
    todayBg:    "rgba(99,102,241,0.08)",
    holBg:      "rgba(251,191,36,0.08)",
    wkndBg:     "rgba(99,102,241,0.03)",
    shadow:     "0 8px 32px rgba(99,102,241,0.1)",
    shadowSm:   "0 2px 8px rgba(99,102,241,0.08)",
  };

  // ── Style helpers ──────────────────────────────────────────────────────────
  const row   = { display:"flex", alignItems:"center", gap:10 };
  const g2    = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 };
  const g3    = { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 };
  const g4    = { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 };
  const card  = { background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:16, padding:24, backdropFilter:"blur(20px)", boxShadow:T.shadowSm };
  const cardT = { fontSize:10, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:20 };
  const inp   = { background:T.bgInput, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontSize:13, color:T.text, width:"100%", outline:"none", backdropFilter:"blur(10px)" };
  const lbl   = { fontSize:11, color:T.textDim, marginBottom:6, display:"block", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em" };
  const pill  = c => ({ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:c+"20", color:c, border:`1px solid ${c}35` });
  const btnP  = { background:`linear-gradient(135deg, #6366f1, #818cf8)`, border:"none", color:"#fff", borderRadius:10, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 15px rgba(99,102,241,0.4)" };
  const btnG  = c => ({ background:c+"15", border:`1px solid ${c}35`, color:c, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer" });
  const btnD  = { background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer" };
  const avStyle = (color, size) => ({ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg, ${color}40, ${color}20)`, border:`2px solid ${color}60`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:Math.floor(size*0.3), fontWeight:800, color, flexShrink:0, boxShadow:`0 0 12px ${color}30` });

  function Av({ m, size=38 }) {
    const initials = m?.name ? m.name.split(" ").map(n=>n[0]).slice(0,2).join("") : "?";
    return <div style={avStyle(m?.color||"#818cf8", size)}>{initials}</div>;
  }
  function Bar({ value, max, color }) {
    const pct = Math.min((value/max)*100, 100);
    return (
      <div style={{ height:6, borderRadius:6, background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius:6, boxShadow:`0 0 8px ${color}60` }} />
      </div>
    );
  }
  function Badge({ s }) {
    const c = { pending:"#fbbf24", approved:"#34d399", rejected:"#f87171" }[s] || "#888";
    return <span style={pill(c)}>{s}</span>;
  }

  // ── API calls ──────────────────────────────────────────────────────────────
  async function handleApprove(id) {
    setSubmitting(true);
    const res = await fetch("/api/approve", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({requestId:id,action:"approved"}) });
    const json = await res.json();
    if (json.error) showToast(json.error,"error"); else { showToast("✓ Approved · Teams notified"); router.refresh(); }
    setSubmitting(false);
  }
  async function handleReject(id) {
    setSubmitting(true);
    const res = await fetch("/api/approve", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({requestId:id,action:"rejected"}) });
    const json = await res.json();
    if (json.error) showToast(json.error,"error"); else { showToast("Request rejected","error"); router.refresh(); }
    setSubmitting(false);
  }
  async function handleSubmitLeave() {
    const { memberId, type, startDate, endDate, reason } = leaveForm;
    if (!startDate||!endDate||!reason||(isAdmin&&!memberId)) { showToast("Please fill all fields","error"); return; }
    const days = calcDays(startDate, endDate);
    setSubmitting(true);
    const res = await fetch("/api/notify", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type,startDate,endDate,days,reason,memberId:isAdmin?memberId:currentUser?.id}) });
    const json = await res.json();
    if (json.error) showToast(json.error,"error"); else { showToast("Request submitted"); setLeaveForm({memberId:"",type:"annual",startDate:"",endDate:"",reason:""}); router.refresh(); }
    setSubmitting(false);
  }
  async function handleSaveSchedule() {
    if (!schedDate||schedMembers.length===0) { showToast("Pick a date and agents","error"); return; }
    setSubmitting(true);
    const rows = schedMembers.map(uid=>({date:schedDate,user_id:uid,shift:profiles.find(p=>p.id===uid)?.shift||"Morning"}));
    const {error} = await supabase.from("schedule").upsert(rows,{onConflict:"date,user_id"});
    if (error) showToast(error.message,"error"); else { showToast("Schedule saved"); setSchedDate(""); setSchedMembers([]); router.refresh(); }
    setSubmitting(false);
  }
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGES
  // ══════════════════════════════════════════════════════════════════════════

  function Dashboard() {
    const totalUsed  = balances.reduce((s,b)=>s+(b.annual_used||0),0);
    const todaySched = schedule.filter(s=>s.date===todayStr);
    return (
      <div>
        {/* Hero greeting */}
        <div style={{ marginBottom:32, padding:"28px 32px", background:dark?"linear-gradient(135deg,rgba(129,140,248,0.15),rgba(129,140,248,0.05))":"linear-gradient(135deg,rgba(99,102,241,0.1),rgba(99,102,241,0.03))", borderRadius:20, border:`1px solid ${T.borderHi}`, backdropFilter:"blur(20px)" }}>
          <div style={{ fontSize:26, fontWeight:900, color:T.text, marginBottom:6 }}>
            {isAdmin ? `Welcome back, ${currentUser?.name?.split(" ")[0]} 👋` : `Hello, ${currentUser?.name?.split(" ")[0]} 👋`}
          </div>
          <div style={{ fontSize:14, color:T.textMid }}>
            {isAdmin ? "turboSMTP · Support Team Leader" : `${currentUser?.role} · ${currentUser?.shift}`}
          </div>
        </div>

        {/* Agent personal balance */}
        {!isAdmin && getBalance(currentUser?.id) && (
          <div style={{ ...g3, marginBottom:24 }}>
            {LEAVE_TYPES.map(lt => {
              const b     = getBalance(currentUser?.id);
              const total = b[`${lt.key}_total`]||lt.total;
              const used  = b[`${lt.key}_used`]||0;
              return (
                <div key={lt.key} style={{ ...card, padding:20, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:-20, right:-20, fontSize:70, opacity:0.06 }}>{lt.icon}</div>
                  <div style={{ fontSize:13, color:T.textMid, marginBottom:8 }}>{lt.icon} {lt.label}</div>
                  <div style={{ fontSize:34, fontWeight:900, color:lt.color, lineHeight:1, marginBottom:4 }}>{total-used}</div>
                  <div style={{ fontSize:11, color:T.textDim, marginBottom:12 }}>of {total} days remaining</div>
                  <Bar value={used} max={total} color={lt.color}/>
                </div>
              );
            })}
          </div>
        )}

        {/* Admin stats */}
        {isAdmin && (
          <div style={{ ...g4, marginBottom:24 }}>
            {[
              ["9","Support Agents","#818cf8","👥"],
              [todayAbsent.length,"On Leave Today","#f87171","🏖"],
              [pendingCount,"Pending Requests","#fbbf24","⏳"],
              [totalUsed,"Annual Days Used","#34d399","📊"],
            ].map(([v,l,c,ico])=>(
              <div key={l} style={{ ...card, padding:20, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:-10, right:-10, fontSize:60, opacity:0.08 }}>{ico}</div>
                <div style={{ fontSize:11, color:T.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{l}</div>
                <div style={{ fontSize:36, fontWeight:900, color:c, lineHeight:1 }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        <div style={g2}>
          <div style={card}>
            <div style={cardT}>{isAdmin?"Annual Leave Progress":"My Recent Requests"}</div>
            {isAdmin ? (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {agentProfiles.map(m=>{
                  const b=getBalance(m.id), used=b?.annual_used||0;
                  return (
                    <div key={m.id}>
                      <div style={{ ...row, justifyContent:"space-between", marginBottom:6 }}>
                        <div style={row}><Av m={m} size={28}/><span style={{fontSize:13,fontWeight:600,color:T.text}}>{m.name}</span></div>
                        <span style={{fontSize:12,color:T.textMid,fontWeight:600}}>{used}/21d</span>
                      </div>
                      <Bar value={used} max={21} color={m.color||"#818cf8"}/>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {myRequests.slice(0,5).map(r=>(
                  <div key={r.id} style={{...row,justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:T.text,textTransform:"capitalize"}}>{r.type} leave · {r.days}d</div>
                      <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{r.start_date}{r.start_date!==r.end_date?` → ${r.end_date}`:""}</div>
                    </div>
                    <Badge s={r.status}/>
                  </div>
                ))}
                {myRequests.length===0&&<div style={{color:T.textDim,fontSize:13,textAlign:"center",padding:"20px 0"}}>No requests yet ✨</div>}
              </div>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div style={card}>
              <div style={cardT}>Absent Today</div>
              {todayAbsent.length===0
                ? <div style={{color:T.textDim,fontSize:13,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:20}}>🎉</span> All 9 agents present</div>
                : todayAbsent.map(r=>{const m=getMember(r.user_id)||r.profiles; return(
                  <div key={r.id} style={{...row,justifyContent:"space-between",marginBottom:10}}>
                    <div style={row}><Av m={m} size={32}/><div><div style={{fontSize:13,fontWeight:600,color:T.text}}>{m?.name}</div><div style={{fontSize:11,color:T.textDim}}>{r.type} leave</div></div></div>
                    <Badge s={r.status}/>
                  </div>
                );})}
            </div>
            <div style={card}>
              <div style={cardT}>Public Holidays</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {PUBLIC_HOLIDAYS.filter(h=>h.date>=todayStr).slice(0,4).map(h=>(
                  <div key={h.date} style={{...row,justifyContent:"space-between",padding:"8px 12px",background:T.bgDeep,borderRadius:8}}>
                    <span style={{fontSize:13,color:T.text}}>🎌 {h.name}</span>
                    <span style={{fontSize:11,color:"#fbbf24",fontWeight:700}}>{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={card}>
              <div style={cardT}>Today Scheduled ({todaySched.length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {todaySched.length===0
                  ? <span style={{fontSize:13,color:T.textDim}}>No schedule set</span>
                  : todaySched.map(s=>{const m=getMember(s.user_id); return m?<Av key={s.id} m={m} size={36}/>:null;})}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function TeamPage() {
    return (
      <div>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:22,fontWeight:800,color:T.text}}>Support Agents</div>
          <div style={{fontSize:13,color:T.textDim,marginTop:4}}>turboSMTP · First Line Support — 9 Agents</div>
        </div>
        <div style={g3}>
          {agentProfiles.map(m=>{
            const b=getBalance(m.id), sel=selMember?.id===m.id;
            return (
              <div key={m.id} onClick={()=>setSelMember(sel?null:m)}
                style={{...card,cursor:"pointer",borderColor:sel?m.color+"88":T.border,boxShadow:sel?`0 0 0 2px ${m.color}40, ${T.shadowSm}`:T.shadowSm,transition:"all .2s"}}>
                <div style={{...row,marginBottom:14}}>
                  <Av m={m} size={46}/>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:T.text}}>{m.name}</div>
                    <div style={{fontSize:12,color:T.textDim,marginTop:2}}>{m.role}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                  <span style={pill(m.color||"#818cf8")}>{m.shift}</span>
                </div>
                {b && LEAVE_TYPES.map(lt=>{
                  const total=b[`${lt.key}_total`]||lt.total, used=b[`${lt.key}_used`]||0;
                  return (
                    <div key={lt.key} style={{marginBottom:10}}>
                      <div style={{...row,justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:11,color:T.textDim}}>{lt.icon} {lt.label}</span>
                        <span style={{fontSize:11,fontWeight:700,color:lt.color}}>{total-used}/{total}</span>
                      </div>
                      <Bar value={used} max={total} color={lt.color}/>
                    </div>
                  );
                })}
                {sel&&(
                  <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${T.border}`,fontSize:12,color:T.textMid}}>
                    🕐 {m.shift}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function LeaveCalendar() {
    const y=calMonth.getFullYear(), mo=calMonth.getMonth();
    const first=new Date(y,mo,1).getDay(), dim=new Date(y,mo+1,0).getDate();
    const cells=[];
    for(let i=0;i<first;i++) cells.push(null);
    for(let d=1;d<=dim;d++) cells.push(new Date(y,mo,d));
    const dateLeaves=date=>{if(!date)return[];const k=date.toISOString().split("T")[0];return requests.filter(r=>r.status==="approved"&&r.start_date<=k&&r.end_date>=k);};
    const holiday=date=>date&&PUBLIC_HOLIDAYS.find(h=>h.date===date.toISOString().split("T")[0]);
    return (
      <div>
        <div style={{...row,justifyContent:"space-between",marginBottom:24}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:T.text}}>Leave Calendar</div>
            <div style={{fontSize:13,color:T.textDim,marginTop:4}}>Approved absences overview</div>
          </div>
          <div style={row}>
            <button style={btnG(T.accent)} onClick={()=>setCalMonth(p=>new Date(p.getFullYear(),p.getMonth()-1,1))}>← Prev</button>
            <span style={{fontWeight:800,minWidth:160,textAlign:"center",fontSize:15,color:T.text}}>{MONTHS[mo]} {y}</span>
            <button style={btnG(T.accent)} onClick={()=>setCalMonth(p=>new Date(p.getFullYear(),p.getMonth()+1,1))}>Next →</button>
          </div>
        </div>
        <div style={card}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:8}}>
            {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,color:T.textDim,fontWeight:800,padding:"6px 0",letterSpacing:"0.05em"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
            {cells.map((date,i)=>{
              if(!date) return <div key={i}/>;
              const k=date.toISOString().split("T")[0], leaves=dateLeaves(date), hol=holiday(date);
              const isToday=k===todayStr, isWknd=date.getDay()===5||date.getDay()===6;
              return (
                <div key={k} style={{minHeight:76,border:`1px solid ${isToday?T.accent:T.border}`,borderRadius:10,padding:"7px 8px",background:isToday?T.todayBg:hol?T.holBg:isWknd?T.wkndBg:T.bgCard,boxShadow:isToday?`0 0 0 2px ${T.accentGlow}`:"none",transition:"all .15s"}}>
                  <div style={{fontSize:13,fontWeight:isToday?900:500,color:isToday?T.accent:isWknd?T.textDim:T.textMid,marginBottom:4}}>{date.getDate()}</div>
                  {hol&&<div style={{fontSize:8,color:"#fbbf24",lineHeight:1.3,marginBottom:3,fontWeight:700}}>{hol.name.split(" ")[0]}</div>}
                  {leaves.slice(0,2).map(r=>{const m=getMember(r.user_id)||r.profiles;return m?(<div key={r.id} style={{fontSize:9,background:(m.color||"#818cf8")+"30",color:m.color||"#818cf8",borderRadius:4,padding:"1px 5px",marginBottom:3,fontWeight:700}}>{m.name?.split(" ").map(n=>n[0]).slice(0,2).join("")}</div>):null;})}
                  {leaves.length>2&&<div style={{fontSize:9,color:T.textDim,fontWeight:600}}>+{leaves.length-2}</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:16}}>
          {agentProfiles.map(m=>(
            <div key={m.id} style={{...row,gap:6,padding:"4px 10px",background:T.bgCard,borderRadius:20,border:`1px solid ${T.border}`}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:m.color||"#818cf8",boxShadow:`0 0 6px ${m.color||"#818cf8"}`}}/>
              <span style={{fontSize:11,color:T.textMid,fontWeight:600}}>{m.name?.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function SchedulePage() {
    const [uploadStatus, setUploadStatus] = useState(null);
    const [uploadedRows, setUploadedRows] = useState([]);
    const [conflicts, setConflicts]       = useState([]);
    const [uploadError, setUploadError]   = useState("");

    function parseCSV(text) {
      const lines = text.trim().split("\n").filter(l=>l.trim());
      if (lines.length < 2) return [];
      // Support both comma and tab separated
      const sep = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(sep).map(h=>h.trim().toLowerCase().replace(/"/g,"").replace(/\r/g,""));
      return lines.slice(1).map(line=>{
        const cols = line.split(sep).map(c=>c.trim().replace(/"/g,"").replace(/\r/g,""));
        const row={};
        headers.forEach((h,i)=>{ row[h]=cols[i]||""; });
        return row;
      }).filter(r=>r.date&&r.name);
    }

    async function parseExcel(file) {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        script.onload = () => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const wb = XLSX.read(e.target.result, {type:"array"});
              const ws = wb.Sheets[wb.SheetNames[0]];
              const json = XLSX.utils.sheet_to_json(ws, {raw:false, defval:""});
              // Normalize headers to lowercase
              const rows = json.map(r => {
                const norm = {};
                Object.keys(r).forEach(k => { norm[k.toLowerCase().trim()] = String(r[k]).trim(); });
                return norm;
              }).filter(r => r.date && r.name);
              resolve(rows);
            } catch(err) { reject(err); }
          };
          reader.readAsArrayBuffer(file);
        };
        script.onerror = () => reject(new Error("Could not load Excel parser"));
        document.head.appendChild(script);
      });
    }

    function matchProfile(name) {
      const n=name.toLowerCase().trim();
      return agentProfiles.find(p=>
        p.name.toLowerCase()===n||
        p.name.toLowerCase().includes(n)||
        n.includes(p.name.toLowerCase().split(" ")[0])
      );
    }

    function detectConflicts(rows) {
      const found=[];
      rows.forEach(row=>{
        const profile=matchProfile(row.name);
        if(!profile) return;
        const date=row.date;
        const onLeave=requests.find(r=>r.user_id===profile.id&&r.status==="approved"&&r.start_date<=date&&r.end_date>=date);
        const isHoliday=PUBLIC_HOLIDAYS.find(h=>h.date===date);
        if(onLeave) found.push({profile,date,shift:row.shift||"",type:"leave",detail:`${onLeave.type} leave (${onLeave.start_date} to ${onLeave.end_date})`});
        else if(isHoliday) found.push({profile,date,shift:row.shift||"",type:"holiday",detail:isHoliday.name});
      });
      return found;
    }

    async function handleFileUpload(e) {
      const file=e.target.files?.[0];
      if(!file) return;
      setUploadError(""); setUploadStatus("parsing");
      try {
        let rows = [];
        const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
        if (isExcel) {
          rows = await parseExcel(file);
        } else {
          const text = await file.text();
          rows = parseCSV(text);
        }
        if(rows.length===0){ setUploadError("No valid rows found. Make sure your file has columns: date, name, shift"); setUploadStatus(null); return; }
        setUploadedRows(rows);
        setConflicts(detectConflicts(rows));
        setUploadStatus("preview");
      } catch(err){ setUploadError("Could not read file: "+err.message); setUploadStatus(null); }
      e.target.value="";
    }

    async function confirmUpload() {
      setUploadStatus("uploading");
      try {
        const rows=uploadedRows.map(row=>{
          const p=matchProfile(row.name);
          if(!p) return null;
          return {date:row.date,user_id:p.id,shift:row.shift||p.shift||"Morning"};
        }).filter(Boolean);
        const {error}=await supabase.from("schedule").upsert(rows,{onConflict:"date,user_id"});
        if(error) throw new Error(error.message);
        setUploadStatus("done");
        showToast(`Schedule uploaded: ${rows.length} shifts, ${conflicts.length} conflict(s) flagged`);
        router.refresh();
      } catch(err){ setUploadError(err.message); setUploadStatus("preview"); }
    }

    function resetUpload(){ setUploadStatus(null); setUploadedRows([]); setConflicts([]); setUploadError(""); }

    const ws=new Date(2025,3,21);
    const wd=Array.from({length:7},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return d;});

    return (
      <div>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:22,fontWeight:800,color:T.text}}>Shift Schedule</div>
          <div style={{fontSize:13,color:T.textDim,marginTop:4}}>Upload CSV, detect conflicts, and manage shifts</div>
        </div>

        {conflicts.length>0&&uploadStatus!=="done"&&(
          <div style={{marginBottom:24,background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:16,padding:20}}>
            <div style={{...row,marginBottom:14,gap:12}}>
              <span style={{fontSize:26}}>{"⚠️"}</span>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:"#fbbf24"}}>{conflicts.length} Schedule Conflict{conflicts.length>1?"s":""} Detected</div>
                <div style={{fontSize:12,color:T.textDim,marginTop:2}}>These agents are scheduled but have approved leave or a public holiday on that day</div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {conflicts.map((c,i)=>(
                <div key={i} style={{...row,justifyContent:"space-between",background:T.bgDeep,borderRadius:10,padding:"12px 16px",border:"1px solid rgba(251,191,36,0.2)"}}>
                  <div style={row}>
                    <Av m={c.profile} size={36}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:T.text}}>{c.profile.name}</div>
                      <div style={{fontSize:11,color:T.textDim,marginTop:2}}>Scheduled: {c.date} {c.shift&&`· ${c.shift} shift`}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={pill(c.type==="holiday"?"#fbbf24":"#f87171")}>{c.type==="holiday"?"🎉 Public Holiday":"🏖 On Leave"}</span>
                    <div style={{fontSize:11,color:T.textDim,marginTop:4}}>{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:14,fontSize:12,color:"#fbbf24",fontWeight:700}}>
              {"💬 Confirm upload → shift colleagues will be notified automatically via Microsoft Teams"}
            </div>
          </div>
        )}

        {isAdmin&&(
          <div style={{...g2,marginBottom:24}}>
            <div style={card}>
              <div style={cardT}>{"📤 Upload Schedule (CSV)"}</div>
              {uploadStatus===null&&(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:"32px 20px",border:`2px dashed ${T.borderHi}`,borderRadius:14,cursor:"pointer",background:T.bgDeep}}>
                    <span style={{fontSize:40}}>{"📂"}</span>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:800,color:T.text}}>Drop Excel or CSV here · click to browse</div>
                      <div style={{fontSize:12,color:T.textDim,marginTop:4}}>Supports Excel (.xlsx) and CSV — columns: <code style={{color:T.accent}}>date</code>, <code style={{color:T.accent}}>name</code>, <code style={{color:T.accent}}>shift</code></div>
                    </div>
                    <input type="file" accept=".csv,.xlsx,.xls,.txt" style={{display:"none"}} onChange={handleFileUpload}/>
                  </label>
                  {uploadError&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#f87171"}}>{"⚠ "}{uploadError}</div>}
                  <div style={{background:T.bgDeep,borderRadius:10,padding:"14px 16px"}}>
                    <div style={{fontSize:11,fontWeight:800,color:T.textMid,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>CSV Format Example</div>
                    <div style={{fontSize:11,color:T.accent,lineHeight:2,fontFamily:"monospace"}}>
                      date,name,shift<br/>
                      2025-05-05,Abdullah El Quady,Morning (9-5)<br/>
                      2025-05-05,Merna Badr,Night (5-1)<br/>
                      2025-05-06,Mai Seif,Morning (9-5)
                    </div>
                  </div>
                </div>
              )}
              {uploadStatus==="parsing"&&(
                <div style={{textAlign:"center",padding:"40px 0",color:T.textDim}}>
                  <div style={{fontSize:32,marginBottom:12}}>{"⏳"}</div>
                  <div style={{fontSize:13}}>Parsing and checking conflicts...</div>
                </div>
              )}
              {(uploadStatus==="preview"||uploadStatus==="uploading")&&(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{...row,justifyContent:"space-between",padding:"10px 14px",background:T.bgDeep,borderRadius:10}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,color:T.text}}>{"📄 "}{uploadedRows.length} shifts parsed</div>
                      <div style={{fontSize:11,color:T.textDim,marginTop:2}}>
                        {uploadedRows.filter(r=>matchProfile(r.name)).length} matched
                        {" · "}
                        <span style={{color:conflicts.length>0?"#fbbf24":"#34d399",fontWeight:700}}>{conflicts.length} conflict{conflicts.length!==1?"s":""}</span>
                      </div>
                    </div>
                    <span style={pill(conflicts.length>0?"#fbbf24":"#34d399")}>{conflicts.length>0?"⚠ Review":"✓ Clean"}</span>
                  </div>
                  <div style={{maxHeight:200,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:10}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:T.bgDeep}}>
                          {["Date","Name","Shift","Status"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",color:T.textDim,fontWeight:800,fontSize:11}}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedRows.slice(0,20).map((r,i)=>{
                          const p=matchProfile(r.name);
                          const hasC=p&&conflicts.some(c=>c.profile.id===p.id&&c.date===r.date);
                          return (
                            <tr key={i} style={{borderTop:`1px solid ${T.border}`,background:hasC?"rgba(251,191,36,0.06)":"transparent"}}>
                              <td style={{padding:"7px 12px",color:T.textMid}}>{r.date}</td>
                              <td style={{padding:"7px 12px",color:T.text,fontWeight:p?600:400}}>{r.name}{!p&&<span style={{color:"#f87171",fontSize:10,marginLeft:4}}>?</span>}</td>
                              <td style={{padding:"7px 12px",color:T.textMid}}>{r.shift||"—"}</td>
                              <td style={{padding:"7px 12px"}}>{hasC?<span style={pill("#fbbf24")}>⚠ conflict</span>:p?<span style={pill("#34d399")}>✓</span>:<span style={pill("#f87171")}>? unknown</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {uploadedRows.length>20&&<div style={{padding:"8px 12px",fontSize:11,color:T.textDim,borderTop:`1px solid ${T.border}`}}>...and {uploadedRows.length-20} more rows</div>}
                  </div>
                  <div style={row}>
                    <button style={{...btnP,flex:1,opacity:uploadStatus==="uploading"?0.6:1}} onClick={confirmUpload} disabled={uploadStatus==="uploading"}>
                      {uploadStatus==="uploading"?"Uploading...":"✓ Confirm & Upload"}
                    </button>
                    <button style={btnG(T.textMid)} onClick={resetUpload}>Cancel</button>
                  </div>
                  {conflicts.length>0&&<div style={{fontSize:11,color:"#fbbf24",fontWeight:700,textAlign:"center"}}>{"⚡ Teams alerts will fire for "}{conflicts.length}{" conflict"}{conflicts.length!==1?"s":""}{" on confirm"}</div>}
                </div>
              )}
              {uploadStatus==="done"&&(
                <div style={{textAlign:"center",padding:"28px 0"}}>
                  <div style={{fontSize:40,marginBottom:10}}>{"✅"}</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#34d399",marginBottom:6}}>Schedule uploaded!</div>
                  <div style={{fontSize:12,color:T.textDim,marginBottom:16}}>{uploadedRows.length} shifts saved · {conflicts.length} alerts sent</div>
                  <button style={btnG(T.accent)} onClick={resetUpload}>Upload Another</button>
                </div>
              )}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <div style={card}>
                <div style={cardT}>{"✋ Manual Entry"}</div>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div><label style={lbl}>Date</label><input type="date" style={inp} value={schedDate} onChange={e=>setSchedDate(e.target.value)}/></div>
                  <div>
                    <label style={lbl}>Agents on Shift</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:6}}>
                      {agentProfiles.map(m=>{
                        const sel=schedMembers.includes(m.id);
                        return (
                          <div key={m.id} onClick={()=>setSchedMembers(p=>sel?p.filter(x=>x!==m.id):[...p,m.id])}
                            style={{...row,gap:6,padding:"6px 12px",borderRadius:20,cursor:"pointer",border:`1px solid ${sel?m.color+"88":T.border}`,background:sel?m.color+"18":"transparent"}}>
                            <Av m={m} size={22}/>
                            <span style={{fontSize:12,color:sel?m.color:T.textMid,fontWeight:sel?700:400}}>{m.name?.split(" ")[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button style={{...btnP,opacity:submitting?0.6:1}} onClick={handleSaveSchedule} disabled={submitting}>Save Schedule</button>
                </div>
              </div>
              <div style={card}>
                <div style={cardT}>Shift Groups</div>
                {["Morning (9-5)","Night (5-1)","Overnight (1-9)"].map(sh=>(
                  <div key={sh} style={{marginBottom:14,padding:"12px 14px",background:T.bgDeep,borderRadius:10}}>
                    <div style={{fontSize:12,fontWeight:800,color:T.textMid,marginBottom:8}}>{sh}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{agentProfiles.filter(m=>m.shift===sh).map(m=><Av key={m.id} m={m} size={32}/>)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={card}>
          <div style={cardT}>Weekly Grid</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={{width:140,textAlign:"left",padding:"8px 12px",fontSize:11,color:T.textDim,borderBottom:`1px solid ${T.border}`,fontWeight:800}}>AGENT</th>
                  {wd.map(d=>(
                    <th key={d.toISOString()} style={{padding:"8px 6px",fontSize:11,color:T.textDim,borderBottom:`1px solid ${T.border}`,textAlign:"center",minWidth:60,fontWeight:800}}>
                      <div>{DAYS[d.getDay()]}</div>
                      <div style={{color:T.text,fontWeight:900,fontSize:14,marginTop:2}}>{d.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentProfiles.map((m,idx)=>(
                  <tr key={m.id} style={{background:m.id===currentUser?.id?T.navAct:idx%2===0?"transparent":dark?"rgba(255,255,255,0.01)":"rgba(0,0,0,0.01)"}}>
                    <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}>
                      <div style={row}><Av m={m} size={26}/><span style={{fontSize:12,fontWeight:500,color:T.text}}>{m.name?.split(" ")[0]}</span></div>
                    </td>
                    {wd.map(d=>{
                      const k=d.toISOString().split("T")[0];
                      const onS=schedule.some(s=>s.date===k&&s.user_id===m.id);
                      const onL=requests.some(r=>r.user_id===m.id&&r.status==="approved"&&r.start_date<=k&&r.end_date>=k);
                      const isW=d.getDay()===5||d.getDay()===6;
                      return (
                        <td key={k} style={{padding:"8px 4px",borderBottom:`1px solid ${T.border}`,textAlign:"center"}}>
                          {isW?<span style={{fontSize:10,color:T.textDim}}>—</span>
                            :onS&&onL?<div style={{background:"rgba(251,191,36,0.2)",color:"#fbbf24",borderRadius:6,padding:"3px 6px",fontSize:9,fontWeight:800,border:"1px solid rgba(251,191,36,0.4)"}}>{"⚠"}</div>
                            :onL?<div style={{background:"rgba(248,113,113,0.15)",color:"#f87171",borderRadius:6,padding:"3px 6px",fontSize:9,fontWeight:800}}>LEAVE</div>
                            :onS?<div style={{background:(m.color||"#818cf8")+"25",color:m.color||"#818cf8",borderRadius:6,padding:"3px 6px",fontSize:11,fontWeight:800}}>{"✓"}</div>
                            :<span style={{color:T.border,fontSize:12}}>{"·"}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{...row,gap:16,marginTop:14,flexWrap:"wrap"}}>
            {[["✓","On Shift","#818cf8"],["LEAVE","On Leave","#f87171"],["⚠","Conflict","#fbbf24"]].map(([sym,label,color])=>(
              <div key={label} style={row}>
                <div style={{background:color+"20",color,borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:800,border:`1px solid ${color}40`}}>{sym}</div>
                <span style={{fontSize:11,color:T.textDim}}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function RequestsPage() {
    const visible=(isAdmin?requests:myRequests).filter(r=>filterStatus==="all"||r.status===filterStatus);
    return (
      <div>
        <div style={{...row,justifyContent:"space-between",marginBottom:24}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:T.text}}>Leave Requests</div>
            <div style={{fontSize:13,color:T.textDim,marginTop:4}}>{isAdmin?"Manage all team requests":"Submit and track your requests"}</div>
          </div>
          <div style={row}>
            {["all","pending","approved","rejected"].map(s=>(
              <button key={s} onClick={()=>setFilter(s)} style={{...btnG(filterStatus===s?T.accent:T.textMid),fontWeight:filterStatus===s?800:600}}>
                {s[0].toUpperCase()+s.slice(1)}
                {s==="pending"&&pendingCount>0&&<span style={{marginLeft:6,background:"#fbbf24",color:"#000",borderRadius:8,fontSize:9,padding:"1px 6px",fontWeight:900}}>{pendingCount}</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{...g2,marginBottom:24}}>
          <div style={card}>
            <div style={cardT}>Submit New Request</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {isAdmin&&(
                <div><label style={lbl}>Agent</label>
                  <select style={{...inp,cursor:"pointer"}} value={leaveForm.memberId} onChange={e=>setLeaveForm(f=>({...f,memberId:e.target.value}))}>
                    <option value="">Select agent</option>
                    {agentProfiles.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div style={g2}>
                <div><label style={lbl}>Leave Type</label>
                  <select style={{...inp,cursor:"pointer"}} value={leaveForm.type} onChange={e=>setLeaveForm(f=>({...f,type:e.target.value}))}>
                    {LEAVE_TYPES.map(lt=><option key={lt.key} value={lt.key}>{lt.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Working Days</label>
                  <div style={{...inp,color:leaveForm.startDate&&leaveForm.endDate?"#34d399":T.textDim,fontWeight:700}}>
                    {leaveForm.startDate&&leaveForm.endDate?`${calcDays(leaveForm.startDate,leaveForm.endDate)} days`:"—"}
                  </div>
                </div>
              </div>
              <div style={g2}>
                <div><label style={lbl}>Start Date</label><input type="date" style={inp} value={leaveForm.startDate} onChange={e=>setLeaveForm(f=>({...f,startDate:e.target.value}))}/></div>
                <div><label style={lbl}>End Date</label><input type="date" style={inp} value={leaveForm.endDate} onChange={e=>setLeaveForm(f=>({...f,endDate:e.target.value}))}/></div>
              </div>
              <div><label style={lbl}>Reason</label><input type="text" style={inp} placeholder="Brief reason…" value={leaveForm.reason} onChange={e=>setLeaveForm(f=>({...f,reason:e.target.value}))}/></div>
              <button style={{...btnP,opacity:submitting?0.6:1}} onClick={handleSubmitLeave} disabled={submitting}>Submit Request</button>
            </div>
          </div>
          <div style={card}>
            <div style={cardT}>{isAdmin?"All Remaining Quotas":"My Balance"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {(isAdmin?agentProfiles:[currentUser]).map(m=>{
                const b=getBalance(m?.id);
                if(!b) return null;
                return (
                  <div key={m?.id} style={{padding:"12px 14px",background:T.bgDeep,borderRadius:10}}>
                    {isAdmin&&<div style={{...row,marginBottom:10}}><Av m={m} size={24}/><span style={{fontSize:13,fontWeight:700,color:T.text}}>{m?.name}</span></div>}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {LEAVE_TYPES.map(lt=>{
                        const total=b[`${lt.key}_total`]||lt.total, used=b[`${lt.key}_used`]||0;
                        return <span key={lt.key} style={pill(lt.color)}>{lt.icon} {total-used}/{total}</span>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={cardT}>{isAdmin?"All Requests":"My Requests"} ({visible.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {visible.map(r=>{
              const m=getMember(r.user_id)||r.profiles||currentUser;
              return (
                <div key={r.id} style={{background:T.bgDeep,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px",transition:"all .15s"}}>
                  <div style={{...row,justifyContent:"space-between"}}>
                    <div style={row}>
                      <Av m={m} size={36}/>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:T.text}}>{m?.name}</div>
                        <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{m?.role} · {r.reason}</div>
                      </div>
                    </div>
                    <div style={row}>
                      <Badge s={r.status}/>
                      {isAdmin&&r.status==="pending"&&<>
                        <button style={{...btnG("#34d399"),opacity:submitting?0.6:1}} onClick={()=>handleApprove(r.id)} disabled={submitting}>✓ Approve</button>
                        <button style={{...btnD,opacity:submitting?0.6:1}} onClick={()=>handleReject(r.id)} disabled={submitting}>✗ Reject</button>
                      </>}
                    </div>
                  </div>
                  <div style={{...row,marginTop:10,flexWrap:"wrap",gap:14}}>
                    <span style={{fontSize:12,color:T.textMid}}>📅 {r.start_date}{r.start_date!==r.end_date?` → ${r.end_date}`:""}</span>
                    <span style={{fontSize:12,color:T.textMid}}>⏱ {r.days}d</span>
                    <span style={pill(LEAVE_TYPES.find(l=>l.key===r.type)?.color||"#888")}>{r.type}</span>
                    <span style={{fontSize:11,color:T.textDim}}>Submitted {r.submitted_at?.split("T")[0]}</span>
                  </div>
                </div>
              );
            })}
            {visible.length===0&&<div style={{color:T.textDim,fontSize:13,textAlign:"center",padding:"30px 0"}}>No requests found ✨</div>}
          </div>
        </div>
      </div>
    );
  }

  function NotificationsPage() {
    if(!isAdmin) return <div style={{color:T.textDim,padding:40,textAlign:"center"}}>Admin access only.</div>;
    return (
      <div>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:22,fontWeight:800,color:T.text}}>Teams Notifications</div>
          <div style={{fontSize:13,color:T.textDim,marginTop:4}}>Automatic absence alerts via Microsoft Teams</div>
        </div>
        <div style={g2}>
          <div style={card}>
            <div style={cardT}>How It Works</div>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {[["01","Leave Approved","HR admin approves a request in Requests tab.","#818cf8"],
                ["02","Shift Detection","System identifies the absent agent's shift.","#34d399"],
                ["03","Find Colleagues","Same-shift agents scheduled that day found.","#fbbf24"],
                ["04","Teams Alert","Adaptive Card POSTed via Incoming Webhook.","#f87171"],
              ].map(([n,t,d,c])=>(
                <div key={n} style={{...row,alignItems:"flex-start",gap:14,padding:"12px 14px",background:T.bgDeep,borderRadius:10}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:c+"20",border:`1px solid ${c}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:c,flexShrink:0}}>{n}</div>
                  <div><div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:3}}>{t}</div><div style={{fontSize:12,color:T.textDim,lineHeight:1.5}}>{d}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={cardT}>Webhook Config</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={lbl}>Teams Webhook URL</label><input type="text" style={inp} defaultValue="Set TEAMS_WEBHOOK_URL in Vercel → Environment Variables" readOnly/></div>
              <div style={{fontSize:11,color:T.textDim,lineHeight:1.7,background:T.bgDeep,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px"}}>
                Go to <strong style={{color:T.accent}}>Vercel → Settings → Environment Variables</strong> and add <code style={{color:T.accent,background:T.bgCard,padding:"1px 5px",borderRadius:4}}>TEAMS_WEBHOOK_URL</code>. Fires automatically on every approval.
              </div>
            </div>
          </div>
        </div>
        <div style={{marginTop:22,...card}}>
          <div style={cardT}>Notification Log ({notifs.length})</div>
          {notifs.length===0
            ?<div style={{color:T.textDim,fontSize:13,textAlign:"center",padding:"30px 0"}}>No notifications yet. Approve a request to trigger one. 🔔</div>
            :notifs.map(n=>(
              <div key={n.id} style={{background:T.bgDeep,border:`1px solid ${T.border}`,borderRadius:10,padding:16,marginBottom:10}}>
                <div style={{...row,justifyContent:"space-between"}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>{n.message}</div>
                  <span style={pill("#34d399")}>{n.teams_status}</span>
                </div>
                <div style={{fontSize:11,color:T.textDim,marginTop:4}}>{n.sent_at?.replace("T"," ").slice(0,19)}</div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  const PAGES = { dashboard:Dashboard, team:TeamPage, leaves:LeaveCalendar, schedule:SchedulePage, requests:RequestsPage, notifications:NotificationsPage };
  const Page  = PAGES[activeNav]||Dashboard;

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:T.bgTopbar, borderBottom:`1px solid ${T.border}`, backdropFilter:"blur(20px)", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:T.shadowSm }}>

        {/* Left — Logo + menu toggle */}
        <div style={row}>
          <div style={{ fontSize:18, fontWeight:900, letterSpacing:"0.06em", background:`linear-gradient(135deg, ${T.accent}, #a78bfa)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            ⚡ turboSMTP HR
          </div>
        </div>

        {/* Center — Live clock */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ fontSize:20, fontWeight:900, color:T.text, letterSpacing:"0.05em", fontVariantNumeric:"tabular-nums" }}>{currentTime}</div>
          <div style={{ fontSize:11, color:T.textDim, fontWeight:600, marginTop:1 }}>{currentDate}</div>
        </div>

        {/* Right — Theme toggle + user + logout */}
        <div style={row}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{ display:"flex", alignItems:"center", gap:8, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:20, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:700, color:T.text, backdropFilter:"blur(10px)" }}>
            <span style={{fontSize:16}}>{dark?"☀️":"🌙"}</span>
            <span>{dark?"Light":"Dark"}</span>
          </button>

          {/* Divider */}
          <div style={{ width:1, height:28, background:T.border }}/>

          {/* User badge */}
          <div style={row}>
            <Av m={currentUser} size={32}/>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{currentUser?.name?.split(" ")[0]}</div>
              <div style={{ fontSize:10, color:T.textDim }}>{isAdmin?"Team Leader":"Agent"}</div>
            </div>
          </div>

          {/* Sign out */}
          <button onClick={handleSignOut} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:20, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:700, color:"#f87171" }}>
            <span>⏻</span> Sign out
          </button>
        </div>
      </div>

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      <div style={{ display:"flex", flex:1 }}>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div style={{ width:220, background:T.bgSide, borderRight:`1px solid ${T.border}`, backdropFilter:"blur(20px)", display:"flex", flexDirection:"column", flexShrink:0, paddingTop:8 }}>

          {/* Current user */}
          <div style={{ margin:"8px 12px 4px", padding:"14px 16px", background:T.bgCard, borderRadius:14, border:`1px solid ${T.border}` }}>
            <div style={row}>
              <Av m={currentUser} size={38}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{currentUser?.name}</div>
                <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>{isAdmin?"Team Leader":currentUser?.role}</div>
              </div>
            </div>
          </div>

          <nav style={{ padding:"8px 10px", flex:1, display:"flex", flexDirection:"column", gap:3, marginTop:8 }}>
            {NAV.filter(n=>n.key!=="notifications"||isAdmin).map(n=>(
              <div key={n.key}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:activeNav===n.key?700:400, background:activeNav===n.key?T.navAct:"transparent", color:activeNav===n.key?T.navActText:T.navText, border:`1px solid ${activeNav===n.key?T.borderHi:"transparent"}`, transition:"all .15s", position:"relative" }}
                onClick={()=>setNav(n.key)}>
                {activeNav===n.key&&<div style={{position:"absolute",left:0,top:"20%",height:"60%",width:3,background:`linear-gradient(180deg,${T.accent},#a78bfa)`,borderRadius:"0 3px 3px 0"}}/>}
                <span style={{fontSize:15}}>{n.icon}</span>
                <span>{n.label}</span>
                {n.key==="requests"&&pendingCount>0&&<span style={{marginLeft:"auto",background:"linear-gradient(135deg,#f59e0b,#fbbf24)",color:"#000",fontSize:10,padding:"2px 7px",borderRadius:10,fontWeight:900}}>{pendingCount}</span>}
                {n.key==="notifications"&&notifs.length>0&&<span style={{marginLeft:"auto",background:T.accent,color:"#fff",fontSize:10,padding:"2px 7px",borderRadius:10,fontWeight:900}}>{notifs.length}</span>}
              </div>
            ))}
          </nav>

          {/* Presence indicator */}
          <div style={{ margin:"0 12px 16px", padding:"10px 14px", background:T.bgCard, borderRadius:12, border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:10, color:T.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Team Status</div>
            <div style={row}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#34d399", boxShadow:"0 0 8px #34d39988" }}/>
              <span style={{ fontSize:12, color:T.textMid, fontWeight:600 }}>{9-todayAbsent.length} of 9 present</span>
            </div>
          </div>
        </div>

        {/* ── Page content ──────────────────────────────────────────────── */}
        <div style={{ flex:1, overflow:"auto", minWidth:0 }}>
          {/* Page header bar */}
          <div style={{ padding:"20px 28px 0" }}>
            <div style={{ fontSize:11, color:T.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
              turboSMTP HR · {NAV.find(n=>n.key===activeNav)?.label}
            </div>
          </div>
          <div style={{ padding:"16px 28px 32px" }}>
            <Page/>
          </div>
        </div>
      </div>

      {/* ══ TOAST ═══════════════════════════════════════════════════════════ */}
      {toast&&(
        <div style={{ position:"fixed", bottom:24, right:24, padding:"12px 20px", background:T[toast.type==="error"?"toastErr":"toastOk"][0], border:`1px solid ${T[toast.type==="error"?"toastErr":"toastOk"][1]}`, color:T[toast.type==="error"?"toastErr":"toastOk"][2], borderRadius:12, fontSize:13, fontWeight:700, zIndex:9999, backdropFilter:"blur(20px)", boxShadow:"0 8px 32px rgba(0,0,0,0.2)", animation:"slideUp .25s ease" }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{height:100%;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:${dark?"invert(.5)":"none"};cursor:pointer;}
        select option{background:${dark?"#1a1a2e":"#ffffff"};color:${T.text};}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"};border-radius:4px;}
        button{transition:all .15s;} button:hover{opacity:0.85;transform:translateY(-1px);}
        input:focus,select:focus{border-color:${T.accent}!important;box-shadow:0 0 0 3px ${T.accentGlow};}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}
