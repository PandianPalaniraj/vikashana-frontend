import { useState, useCallback, useEffect, useRef } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'

// ── API ────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Constants ─────────────────────────────────────────────────
// P/A/L → API status names
const KEY_TO_STATUS = { P: 'Present', A: 'Absent', L: 'Late' };
// API status names → P/A/L  (Late and Leave both show as L in the grid)
const STATUS_TO_KEY = { Present: 'P', Absent: 'A', Late: 'L', Leave: 'L', 'Half Day': 'A' };

// Holiday removed — only P / A / L
const ATT = {
  P: { label:"Present", short:"P", c:"#059669", bg:"#D1FAE5", border:"#6EE7B7" },
  A: { label:"Absent",  short:"A", c:"#DC2626", bg:"#FEE2E2", border:"#FCA5A5" },
  L: { label:"Leave",   short:"L", c:"#D97706", bg:"#FEF3C7", border:"#FCD34D" },
};
const CYCLE = ["P","A","L"];

// ── Helpers ───────────────────────────────────────────────────
const todayStr    = () => new Date().toISOString().slice(0,10);
const fmtDate     = d  => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—";
const fmtDateFull = d  => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const isWeekday   = d  => { const day = new Date(d).getDay(); return day!==0 && day!==6; };

function getWeekdays(n) {
  const days=[]; let d=new Date();
  while(days.length < n) {
    const s = d.toISOString().slice(0,10);
    if(isWeekday(s)) days.push(s);
    d.setDate(d.getDate()-1);
  }
  return days;
}

function normalizeStudent(s) {
  return {
    id:       s.id,
    name:     s.name     || '',
    admNo:    s.admission_no || '',
    gender:   s.gender   || '',
    phone:    s.parent_phone || s.parents?.[0]?.phone || '',
    guardian: s.parent_name  || s.parents?.[0]?.name  || '',
    class:    s.class    || '',
    section:  s.section  || '',
  };
}

function openWA(phone, msg) {
  const num = phone.replace(/\D/g,"");
  const url = `https://wa.me/91${num}?text=${encodeURIComponent(msg)}`;
  window.open(url,"_blank");
}

// ── Shared UI ─────────────────────────────────────────────────
function Avatar({ name, size=32 }) {
  const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
  const bg = palette[name.charCodeAt(0) % palette.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.36, fontWeight:800, color:"#fff" }}>
      {name.split(" ").map(w=>w[0]).join("").slice(0,2)}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const err = toast.type==="error";
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
      background:err?"#FEF2F2":"#F0FDF4", border:`1px solid ${err?"#FECACA":"#86EFAC"}`,
      color:err?"#DC2626":"#16A34A", padding:"12px 20px", borderRadius:10,
      fontSize:13, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
      {err?"❌":"✅"} {toast.msg}
    </div>
  );
}

function SkeletonRows({ cols }) {
  return Array.from({length:5}).map((_,i)=>(
    <tr key={i} style={{ borderBottom:"1px solid #F1F5F9" }}>
      {Array.from({length:cols}).map((__,j)=>(
        <td key={j} style={{ padding:"10px 14px" }}>
          <div style={{ height:14, background:"#F1F5F9", borderRadius:6,
            animation:"pulse 1.5s ease-in-out infinite",
            width: j===0?"30%":j===1?"60%":"40%" }}/>
        </td>
      ))}
    </tr>
  ));
}

// ── FilterBar — OUTSIDE to prevent remount bug ────────────────
function FilterBar({ classes, sections, cls, setCls, sec, setSec, date, setDate, showDate }) {
  const inputStyle = {
    border:"none", fontSize:14, fontWeight:700, color:"#6366F1",
    background:"transparent", cursor:"pointer", outline:"none",
  };
  return (
    <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
      <div style={{ background:"#fff", borderRadius:9, padding:"8px 14px",
        display:"flex", gap:10, alignItems:"center", border:"1px solid #E2E8F0",
        boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
        <span style={{ fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.5 }}>Class</span>
        <select value={cls} onChange={e => setCls(e.target.value)} style={inputStyle}>
          {classes.filter(c=>c.active).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <div style={{ width:1, height:16, background:"#E2E8F0" }}/>
        <span style={{ fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.5 }}>Section</span>
        <select value={sec} onChange={e => setSec(e.target.value)} style={inputStyle}>
          {sections.length === 0
            ? <option>Loading…</option>
            : sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
          }
        </select>
      </div>
      {showDate && (
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding:"9px 12px", borderRadius:9, border:"1px solid #E2E8F0",
            fontSize:13, background:"#fff", outline:"none", fontFamily:"inherit" }}/>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function Attendance() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'

  // ── Data state ────────────────────────────────────────────────
  const [classes,  setClasses]  = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  // att: { "studentId__YYYY-MM-DD": "P"|"A"|"L" }
  const [att, setAtt]           = useState({});
  // monthReport: [{student_id, name, present, absent, late, total, percent}]
  const [monthReport, setMonthReport] = useState([]);

  // ── UI state ──────────────────────────────────────────────────
  const [view, setView]     = useState("mark");
  const [cls, setCls]       = useState("");
  const [sec, setSec]       = useState("");
  const [date, setDate]     = useState(todayStr());
  const [toast, setToast]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  // Report date range
  const [rangeMode, setRangeMode] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");

  // Track which class-section-date combos have been loaded
  const loadedDatesRef = useRef(new Set());

  // Derived IDs (avoids separate id state)
  const clsId = classes.find(c => c.name === cls)?.id ?? null;
  const secId = sections.find(s => s.name === sec)?.id ?? null;

  const showToast = useCallback((msg, type="success") => {
    setToast({msg,type}); setTimeout(()=>setToast(null),3500);
  },[]);

  // ── API helpers ───────────────────────────────────────────────
  const loadAttForDate = useCallback(async (cId, sId, d) => {
    const key = `${cId}-${sId}-${d}`;
    if (loadedDatesRef.current.has(key)) return;
    loadedDatesRef.current.add(key);
    try {
      const res = await apiFetch(`/attendance?class_id=${cId}&section_id=${sId}&date=${d}`);
      const records = res.data || [];
      const updates = {};
      records.forEach(r => {
        const k = STATUS_TO_KEY[r.status];
        if (k) updates[`${r.student_id}__${r.date}`] = k;
      });
      if (Object.keys(updates).length > 0) {
        setAtt(prev => ({ ...prev, ...updates }));
      }
    } catch (e) {
      console.error(`Failed to load attendance for ${d}:`, e.message);
    }
  }, []);

  const loadMonthReport = useCallback(async (cId, sId) => {
    if (!cId || !sId) return;
    const now = new Date();
    try {
      const res = await apiFetch(
        `/attendance/report?class_id=${cId}&section_id=${sId}&month=${now.getMonth()+1}&year=${now.getFullYear()}`
      );
      setMonthReport(res.data || []);
    } catch (e) {
      console.error('Failed to load month report:', e.message);
    }
  }, []);

  // ── Initial load: fetch classes ────────────────────────────────
  useEffect(() => {
    apiFetch('/classes')
      .then(res => setClasses((res.data || []).map(c => ({ ...c, active: true }))))
      .catch(e => console.error('Failed to load classes:', e.message));
  }, []);

  // ── When classes load, auto-select first ───────────────────────
  useEffect(() => {
    if (classes.length > 0 && !cls) {
      setCls(classes[0].name);
    }
  }, [classes, cls]);

  // ── When cls changes, load sections ───────────────────────────
  useEffect(() => {
    if (!clsId) return;
    setSections([]);
    setSec('');
    apiFetch(`/sections?class_id=${clsId}`)
      .then(res => {
        const list = res.data || [];
        setSections(list);
        if (list.length > 0) setSec(list[0].name);
      })
      .catch(e => console.error('Failed to load sections:', e.message));
  }, [clsId]);

  // ── When class or section changes, reload students + attendance ─
  useEffect(() => {
    if (!clsId || !secId) return;

    // Reset loaded dates tracking for this class-section combo
    loadedDatesRef.current = new Set();
    setStudents([]);
    setAtt({});
    setError(null);

    const load = async () => {
      setLoading(true);
      try {
        const studRes = await apiFetch(
          `/students?class_id=${clsId}&section_id=${secId}&status=Active&per_page=100`
        );
        setStudents((studRes.data || []).map(normalizeStudent));

        // Load today + last 5 weekdays in parallel
        const days = getWeekdays(5);
        const extraDays = days.filter(d => d !== date);
        await Promise.all([
          loadAttForDate(clsId, secId, date),
          ...extraDays.map(d => loadAttForDate(clsId, secId, d)),
        ]);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [clsId, secId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── When date changes, load attendance for that date ──────────
  useEffect(() => {
    if (!clsId || !secId) return;
    loadAttForDate(clsId, secId, date);
  }, [date, clsId, secId, loadAttForDate]);

  // ── When switching to report + month mode, load monthly data ──
  useEffect(() => {
    if (view === "report" && rangeMode === "month" && clsId && secId) {
      loadMonthReport(clsId, secId);
    }
  }, [view, rangeMode, clsId, secId, loadMonthReport]);

  // ── When custom range is set, load those dates ─────────────────
  useEffect(() => {
    if (rangeMode !== "custom" || !customFrom || !customTo || !clsId || !secId) return;
    const days = [];
    let d = new Date(customFrom);
    const end = new Date(customTo);
    while (d <= end) {
      const s = d.toISOString().slice(0,10);
      if (isWeekday(s)) days.push(s);
      d.setDate(d.getDate()+1);
    }
    days.forEach(d => loadAttForDate(clsId, secId, d));
  }, [rangeMode, customFrom, customTo, clsId, secId, loadAttForDate]);

  // ── Attendance helpers ─────────────────────────────────────────
  const ss      = students;
  const getAtt  = (id, d) => att[`${id}__${d}`] || "";
  const setAtt_ = (id, d, v) => setAtt(p => ({...p, [`${id}__${d}`]: v}));
  const cycle   = (id, d) => {
    const cur = getAtt(id, d) || "P";
    setAtt_(id, d, CYCLE[(CYCLE.indexOf(cur)+1) % CYCLE.length]);
  };
  const markAll = v => ss.forEach(s => setAtt_(s.id, date, v));

  // ── Date range for report ──────────────────────────────────────
  const getReportDays = () => {
    if (rangeMode==="week")  return getWeekdays(5);
    if (rangeMode==="month") return []; // not used — monthReport state is used instead
    if (rangeMode==="custom" && customFrom && customTo) {
      const days=[]; let d=new Date(customFrom);
      const end=new Date(customTo);
      while(d<=end){ const s=d.toISOString().slice(0,10); if(isWeekday(s))days.push(s); d.setDate(d.getDate()+1); }
      return days.reverse();
    }
    return getWeekdays(5);
  };

  const reportDays = getReportDays();

  // Attendance % for a student over given days
  const pctDays = (id, days) => {
    const taken = days.map(d=>getAtt(id,d)).filter(Boolean);
    if(!taken.length) return null;
    return Math.round(taken.filter(v=>v==="P").length / taken.length * 100);
  };

  const last5 = getWeekdays(5);

  // Today's stats for current class
  const todayStats = { P:0, A:0, L:0, total:ss.length };
  ss.forEach(s => { const v=getAtt(s.id,date); if(v) todayStats[v]=(todayStats[v]||0)+1; });
  const markedCount = todayStats.P + todayStats.A + todayStats.L;
  const overallPct  = markedCount ? Math.round(todayStats.P / markedCount * 100) : null;

  const TABS = [["mark","✏️ Mark"],["report","📊 Report"],["summary","👤 Summary"]];

  // ── Save attendance ────────────────────────────────────────────
  const saveAttendance = useCallback(async () => {
    if (!clsId || !secId) return;
    const records = ss
      .filter(s => getAtt(s.id, date))
      .map(s => ({
        student_id: s.id,
        status:     KEY_TO_STATUS[getAtt(s.id, date)],
        note:       '',
      }));

    if (records.length === 0) {
      showToast("Mark at least one student before saving", "error");
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify({ class_id: clsId, section_id: secId, date, records }),
      });
      showToast(`Attendance saved successfully — Class ${cls}-${sec} · ${fmtDateFull(date)}`);
      // Refresh the att data for this date
      const key = `${clsId}-${secId}-${date}`;
      loadedDatesRef.current.delete(key);
      await loadAttForDate(clsId, secId, date);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }, [clsId, secId, ss, date, cls, sec, showToast, loadAttForDate, att]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Widgets ───────────────────────────────────────────────────
  const widgets = [
    { icon:"✅", label:"Present Today",    value:loading?"…":todayStats.P,   c:"#059669", bg:"#D1FAE5", sub:`Class ${cls}-${sec}` },
    { icon:"❌", label:"Absent Today",     value:loading?"…":todayStats.A,   c:"#DC2626", bg:"#FEE2E2", sub:`Class ${cls}-${sec}` },
    { icon:"🟡", label:"On Leave",         value:loading?"…":todayStats.L,   c:"#D97706", bg:"#FEF3C7", sub:`Class ${cls}-${sec}` },
    {
      icon:"📊", label:"Attendance %",
      value: loading ? "…" : overallPct!==null ? `${overallPct}%` : "—",
      c:"#6366F1", bg:"#EEF2FF",
      sub: markedCount ? `${markedCount}/${ss.length} marked` : "Not marked yet",
    },
  ];

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>

      {/* Widgets */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        {widgets.map(w=>(
          <div key={w.label} style={{ background:"#fff", borderRadius:14, padding:isMobile?"12px 14px":"16px 18px",
            boxShadow:"0 1px 8px rgba(0,0,0,0.07)", display:"flex", alignItems:"center",
            gap:isMobile?10:14, border:`1px solid ${w.c}18`, transition:"transform 0.15s",
            cursor:"default" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ width:isMobile?40:48, height:isMobile?40:48, background:w.bg, borderRadius:12, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:isMobile?20:22 }}>
              {w.icon}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:isMobile?18:26, fontWeight:900, color:w.c, lineHeight:1 }}>{w.value}</div>
              <div style={{ fontSize:isMobile?11:12, fontWeight:700, color:"#374151", marginTop:2 }}>{w.label}</div>
              {!isMobile && <div style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>{w.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:6, background:"#E2E8F0", borderRadius:10, padding:4,
        marginBottom:18, width:"fit-content" }}>
        {TABS.map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)}
            style={{ padding:"7px 18px", borderRadius:7, border:"none", cursor:"pointer",
              fontSize:12, fontWeight:700, transition:"all 0.18s",
              background:view===v?"#fff":"transparent",
              color:view===v?"#6366F1":"#64748B",
              boxShadow:view===v?"0 1px 6px rgba(0,0,0,0.1)":"none" }}>
            {l}
          </button>
        ))}
      </div>

      {/* FilterBar — outside component, no remount bug */}
      <FilterBar
        classes={classes} sections={sections}
        cls={cls} setCls={setCls}
        sec={sec} setSec={setSec}
        date={date} setDate={setDate}
        showDate={view==="mark"}
      />

      {/* Error banner */}
      {error && (
        <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10,
          padding:"12px 18px", marginBottom:14, display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:12 }}>
          <span style={{ fontSize:13, color:"#DC2626", fontWeight:600 }}>⚠️ {error}</span>
          <button onClick={() => { setError(null); if (clsId && secId) { setStudents([]); setAtt({}); loadedDatesRef.current = new Set(); } }}
            style={{ background:"#EF4444", color:"#fff", border:"none", borderRadius:7,
              padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && ss.length===0 && !error && (
        <div style={{ background:"#fff", borderRadius:12, padding:48,
          textAlign:"center", color:"#94A3B8" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🏫</div>
          <div style={{ fontWeight:700, fontSize:14 }}>
            {cls && sec ? `No students in Class ${cls}-${sec}` : "Select a class and section"}
          </div>
        </div>
      )}

      {/* ── MARK VIEW ─────────────────────────────────────────── */}
      {view==="mark" && (loading || ss.length>0) && (
        <>
          {/* Mark All + Save bar */}
          <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#64748B" }}>Mark All:</span>
            {Object.entries(ATT).map(([k,v])=>(
              <button key={k} onClick={()=>markAll(k)} disabled={loading}
                style={{ background:v.bg, color:v.c, border:`1px solid ${v.border}`,
                  borderRadius:7, padding:"6px 16px", fontSize:12, fontWeight:700,
                  cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1 }}>
                {v.short} — {v.label}
              </button>
            ))}
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8,
                padding:"6px 14px", fontSize:12, fontWeight:600, color:"#64748B" }}>
                📅 {fmtDateFull(date)}
              </div>
              <button onClick={saveAttendance} disabled={saving || loading}
                style={{ background:"#6366F1", color:"#fff", border:"none", borderRadius:8,
                  padding:"6px 18px", fontSize:12, fontWeight:700,
                  cursor:saving||loading?"not-allowed":"pointer",
                  opacity:saving||loading?0.7:1,
                  boxShadow:"0 2px 8px rgba(99,102,241,0.3)",
                  display:"flex", alignItems:"center", gap:6 }}>
                {saving ? "⏳ Saving…" : "💾 Save Attendance"}
              </button>
            </div>
          </div>

          {/* Student attendance rows */}
          <div style={{ background:"#fff", borderRadius:13, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden", overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                  {["#","Student","Today's Status","Last 5 Days","Avg %","WhatsApp"].map(h=>(
                    <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:10,
                      fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.6,
                      whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <SkeletonRows cols={6}/>
                  : ss.map((s,i)=>{
                      const cur  = getAtt(s.id, date);
                      const meta = cur ? ATT[cur] : null;
                      const p    = pctDays(s.id, last5);
                      const lowAtt = p!==null && p < 75;

                      return (
                        <tr key={s.id} style={{ borderBottom:"1px solid #F1F5F9" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#FAFBFC"}
                          onMouseLeave={e=>e.currentTarget.style.background=""}>

                          {/* # */}
                          <td style={{ padding:"10px 14px", fontSize:12, color:"#94A3B8", fontWeight:600, width:36 }}>
                            {i+1}
                          </td>

                          {/* Student */}
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <Avatar name={s.name} size={34}/>
                              <div>
                                <div style={{ fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
                                  {s.name}
                                  {lowAtt && (
                                    <span style={{ background:"#FEF2F2", color:"#DC2626", fontSize:9,
                                      fontWeight:800, padding:"2px 7px", borderRadius:10,
                                      border:"1px solid #FECACA" }}>
                                      ⚠️ LOW
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize:10, color:"#94A3B8" }}>{s.admNo}</div>
                              </div>
                            </div>
                          </td>

                          {/* Today's status — cycle on click */}
                          <td style={{ padding:"10px 14px" }}>
                            <button onClick={()=>cycle(s.id,date)}
                              style={{ background:meta?meta.bg:"#F1F5F9",
                                color:meta?meta.c:"#94A3B8",
                                border:`1.5px solid ${meta?meta.border:"#E2E8F0"}`,
                                borderRadius:9, padding:"7px 22px", fontSize:14,
                                fontWeight:900, cursor:"pointer", minWidth:64,
                                transition:"all 0.15s", letterSpacing:0.5 }}
                              title="Click to cycle P → A → L">
                              {cur || "—"}
                            </button>
                            {cur && (
                              <div style={{ fontSize:10, color:meta.c, fontWeight:600, marginTop:3, paddingLeft:2 }}>
                                {meta.label}
                              </div>
                            )}
                          </td>

                          {/* Last 5 days mini dots */}
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", gap:4 }}>
                              {last5.map(d=>{
                                const v=getAtt(s.id,d);
                                const m=v?ATT[v]:null;
                                return (
                                  <div key={d} title={`${fmtDate(d)}: ${v||"—"}`}
                                    style={{ width:26, height:26, borderRadius:6,
                                      background:m?m.bg:"#F1F5F9",
                                      color:m?m.c:"#CBD5E1",
                                      display:"flex", alignItems:"center", justifyContent:"center",
                                      fontSize:10, fontWeight:800, border:`1px solid ${m?m.border:"#E2E8F0"}` }}>
                                    {v||"·"}
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Avg % bar */}
                          <td style={{ padding:"10px 14px", minWidth:110 }}>
                            {p!==null
                              ? <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                  <div style={{ width:60, background:"#F1F5F9", borderRadius:99, height:7, overflow:"hidden" }}>
                                    <div style={{ width:`${p}%`, height:"100%", borderRadius:99,
                                      background:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}/>
                                  </div>
                                  <span style={{ fontSize:12, fontWeight:800,
                                    color:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}>
                                    {p}%
                                  </span>
                                </div>
                              : <span style={{ color:"#CBD5E1", fontSize:12 }}>—</span>
                            }
                          </td>

                          {/* WhatsApp alert — only shown when Absent */}
                          <td style={{ padding:"10px 14px" }}>
                            {cur==="A"
                              ? <button onClick={()=>{
                                  const msg = `Dear ${s.guardian||'Parent'}, your ward ${s.name} (Class ${cls}-${sec}) is marked ABSENT on ${fmtDateFull(date)}. Please contact the school if this is an error. — Vikashana`;
                                  openWA(s.phone, msg);
                                  showToast(`WhatsApp sent to ${s.guardian||s.name}'s parent`);
                                }}
                                  style={{ background:"#DCFCE7", color:"#16A34A",
                                    border:"1px solid #86EFAC", borderRadius:7,
                                    padding:"5px 12px", fontSize:11, fontWeight:700,
                                    cursor:"pointer", display:"flex", alignItems:"center", gap:5,
                                    whiteSpace:"nowrap" }}>
                                📱 Alert Parent
                              </button>
                              : <span style={{ fontSize:11, color:"#CBD5E1" }}>—</span>
                            }
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── REPORT VIEW ───────────────────────────────────────── */}
      {view==="report" && (loading || ss.length>0) && (
        <>
          {/* Date range selector */}
          <div style={{ background:"#fff", borderRadius:12, padding:"14px 18px",
            marginBottom:16, border:"1px solid #E2E8F0",
            display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.5 }}>
              Date Range:
            </span>
            {[["week","This Week"],["month","This Month"],["custom","Custom"]].map(([mode,label])=>(
              <button key={mode} onClick={()=>setRangeMode(mode)}
                style={{ padding:"6px 16px", borderRadius:8, border:"1px solid",
                  fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
                  borderColor:rangeMode===mode?"#6366F1":"#E2E8F0",
                  background:rangeMode===mode?"#6366F1":"#fff",
                  color:rangeMode===mode?"#fff":"#64748B" }}>
                {label}
              </button>
            ))}
            {rangeMode==="custom" && (
              <div style={{ display:"flex", gap:8, alignItems:"center", marginLeft:8 }}>
                <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}
                  style={{ padding:"6px 10px", borderRadius:7, border:"1px solid #E2E8F0",
                    fontSize:12, outline:"none", fontFamily:"inherit" }}/>
                <span style={{ fontSize:11, color:"#94A3B8" }}>to</span>
                <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}
                  style={{ padding:"6px 10px", borderRadius:7, border:"1px solid #E2E8F0",
                    fontSize:12, outline:"none", fontFamily:"inherit" }}/>
              </div>
            )}
            <div style={{ marginLeft:"auto", fontSize:12, color:"#94A3B8", fontWeight:600 }}>
              {rangeMode==="month"
                ? `${new Date().toLocaleString("en-IN",{month:"long",year:"numeric"})}`
                : `${reportDays.length} working day${reportDays.length!==1?"s":""}`
              }
            </div>
          </div>

          {/* ── Monthly summary table (month mode) ── */}
          {rangeMode==="month" ? (
            <div style={{ background:"#fff", borderRadius:13, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden", overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                    {["Student","Total Days","Present","Absent","Late","Leave","Attendance %","Alert"].map(h=>(
                      <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:10, fontWeight:800,
                        color:"#64748B", textTransform:"uppercase", letterSpacing:0.6, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthReport.length === 0
                    ? <tr><td colSpan={8} style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:13 }}>
                        No attendance data for this month yet.
                      </td></tr>
                    : monthReport.map(r => {
                        const student = ss.find(s => s.id === r.student_id);
                        const lowAtt  = r.percent < 75;
                        const p = r.percent;
                        return (
                          <tr key={r.student_id} style={{ borderBottom:"1px solid #F1F5F9",
                            background:lowAtt?"#FFFBEB":"" }}
                            onMouseEnter={e=>e.currentTarget.style.background=lowAtt?"#FEF9C3":"#FAFBFC"}
                            onMouseLeave={e=>e.currentTarget.style.background=lowAtt?"#FFFBEB":""}>
                            <td style={{ padding:"10px 14px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                                <Avatar name={r.name} size={30}/>
                                <div>
                                  <div style={{ fontWeight:700, fontSize:12, display:"flex", gap:5, alignItems:"center" }}>
                                    {r.name}
                                    {lowAtt && <span style={{ background:"#FEF2F2", color:"#DC2626",
                                      fontSize:9, fontWeight:800, padding:"1px 6px",
                                      borderRadius:8, border:"1px solid #FECACA" }}>⚠️ &lt;75%</span>}
                                  </div>
                                  <div style={{ fontSize:10, color:"#94A3B8" }}>{r.admission_no}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding:"10px 14px", fontSize:12, color:"#64748B", fontWeight:600, textAlign:"center" }}>{r.total}</td>
                            <td style={{ padding:"10px 14px", textAlign:"center" }}>
                              <span style={{ background:"#D1FAE5", color:"#059669", padding:"3px 10px",
                                borderRadius:6, fontSize:11, fontWeight:800 }}>{r.present}</span>
                            </td>
                            <td style={{ padding:"10px 14px", textAlign:"center" }}>
                              <span style={{ background:"#FEE2E2", color:"#DC2626", padding:"3px 10px",
                                borderRadius:6, fontSize:11, fontWeight:800 }}>{r.absent}</span>
                            </td>
                            <td style={{ padding:"10px 14px", textAlign:"center" }}>
                              <span style={{ background:"#FEF3C7", color:"#D97706", padding:"3px 10px",
                                borderRadius:6, fontSize:11, fontWeight:800 }}>{r.late ?? 0}</span>
                            </td>
                            <td style={{ padding:"10px 14px", textAlign:"center" }}>
                              <span style={{ background:"#EEF2FF", color:"#6366F1", padding:"3px 10px",
                                borderRadius:6, fontSize:11, fontWeight:800 }}>{r.leave ?? 0}</span>
                            </td>
                            <td style={{ padding:"10px 14px", textAlign:"center" }}>
                              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                                <span style={{ fontSize:13, fontWeight:900,
                                  color:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}>
                                  {p}%
                                </span>
                                <div style={{ width:48, background:"#F1F5F9", borderRadius:99, height:4 }}>
                                  <div style={{ width:`${p}%`, height:"100%", borderRadius:99,
                                    background:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}/>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding:"10px 14px", textAlign:"center" }}>
                              {lowAtt && student
                                ? <button onClick={()=>{
                                    const msg=`Dear ${student.guardian||'Parent'}, ${r.name}'s attendance is ${p}% this month — below the required 75%. Please ensure regular attendance. — Vikashana`;
                                    openWA(student.phone, msg);
                                    showToast(`Alert sent to ${r.name}'s parent`);
                                  }}
                                    style={{ background:"#DCFCE7", color:"#16A34A", border:"1px solid #86EFAC",
                                      borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:700,
                                      cursor:"pointer", whiteSpace:"nowrap" }}>
                                  📱 Warn
                                </button>
                                : <span style={{ color:"#CBD5E1", fontSize:11 }}>—</span>
                              }
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>

          ) : (
            // ── Daily grid (week / custom mode) ──
            <div style={{ background:"#fff", borderRadius:13, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden", overflowX:"auto" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                      <th style={{ padding:"11px 14px", textAlign:"left", fontSize:10, fontWeight:800,
                        color:"#64748B", textTransform:"uppercase", minWidth:180, position:"sticky", left:0, background:"#F8FAFC" }}>
                        Student
                      </th>
                      {reportDays.map(d=>(
                        <th key={d} style={{ padding:"11px 10px", textAlign:"center", fontSize:10,
                          fontWeight:800, color:"#64748B", textTransform:"uppercase", minWidth:48,
                          whiteSpace:"nowrap" }}>
                          {fmtDate(d)}
                        </th>
                      ))}
                      <th style={{ padding:"11px 14px", textAlign:"center", fontSize:10, fontWeight:800,
                        color:"#64748B", textTransform:"uppercase", minWidth:80 }}>
                        Avg %
                      </th>
                      <th style={{ padding:"11px 14px", textAlign:"center", fontSize:10, fontWeight:800,
                        color:"#64748B", textTransform:"uppercase", minWidth:60 }}>
                        Alert
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? <SkeletonRows cols={reportDays.length + 3}/>
                      : ss.map(s=>{
                          const p = pctDays(s.id, reportDays);
                          const lowAtt = p!==null && p<75;
                          return (
                            <tr key={s.id} style={{ borderBottom:"1px solid #F1F5F9",
                              background:lowAtt?"#FFFBEB":""}}
                              onMouseEnter={e=>e.currentTarget.style.background=lowAtt?"#FEF9C3":"#FAFBFC"}
                              onMouseLeave={e=>e.currentTarget.style.background=lowAtt?"#FFFBEB":""}>
                              <td style={{ padding:"10px 14px", position:"sticky", left:0,
                                background:"inherit", borderRight:"1px solid #F1F5F9" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                                  <Avatar name={s.name} size={30}/>
                                  <div>
                                    <div style={{ fontWeight:700, fontSize:12, display:"flex", gap:5, alignItems:"center" }}>
                                      {s.name}
                                      {lowAtt && (
                                        <span style={{ background:"#FEF2F2", color:"#DC2626",
                                          fontSize:9, fontWeight:800, padding:"1px 6px",
                                          borderRadius:8, border:"1px solid #FECACA" }}>
                                          ⚠️ &lt;75%
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize:10, color:"#94A3B8" }}>{s.admNo}</div>
                                  </div>
                                </div>
                              </td>
                              {reportDays.map(d=>{
                                const v=getAtt(s.id,d);
                                const m=v?ATT[v]:null;
                                return (
                                  <td key={d} style={{ padding:"8px 6px", textAlign:"center" }}>
                                    <span style={{ background:m?m.bg:"#F8FAFC", color:m?m.c:"#CBD5E1",
                                      padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:800,
                                      display:"inline-block", minWidth:24 }}>
                                      {v||"—"}
                                    </span>
                                  </td>
                                );
                              })}
                              <td style={{ padding:"10px 14px", textAlign:"center" }}>
                                {p!==null
                                  ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                                      <span style={{ fontSize:13, fontWeight:900,
                                        color:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}>
                                        {p}%
                                      </span>
                                      <div style={{ width:48, background:"#F1F5F9", borderRadius:99, height:4 }}>
                                        <div style={{ width:`${p}%`, height:"100%", borderRadius:99,
                                          background:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}/>
                                      </div>
                                    </div>
                                  : <span style={{ color:"#CBD5E1" }}>—</span>
                                }
                              </td>
                              <td style={{ padding:"10px 14px", textAlign:"center" }}>
                                {lowAtt
                                  ? <button onClick={()=>{
                                      const msg=`Dear ${s.guardian||'Parent'}, ${s.name}'s attendance is only ${p}% which is below the 75% requirement. Please ensure regular attendance. — Vikashana`;
                                      openWA(s.phone, msg);
                                      showToast(`Alert sent to ${s.name}'s parent`);
                                    }}
                                      style={{ background:"#DCFCE7", color:"#16A34A", border:"1px solid #86EFAC",
                                        borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:700,
                                        cursor:"pointer", whiteSpace:"nowrap" }}>
                                    📱 Warn
                                  </button>
                                  : <span style={{ color:"#CBD5E1", fontSize:11 }}>—</span>
                                }
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div style={{ padding:"10px 16px", borderTop:"1px solid #F1F5F9",
                background:"#FAFBFC", display:"flex", gap:16, alignItems:"center" }}>
                {Object.entries(ATT).map(([k,v])=>(
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ background:v.bg, color:v.c, padding:"2px 8px",
                      borderRadius:5, fontSize:11, fontWeight:800 }}>{k}</span>
                    <span style={{ fontSize:11, color:"#64748B" }}>{v.label}</span>
                  </div>
                ))}
                <div style={{ display:"flex", alignItems:"center", gap:5, marginLeft:"auto" }}>
                  <span style={{ background:"#FEF2F2", color:"#DC2626", padding:"2px 8px",
                    borderRadius:5, fontSize:11, fontWeight:800, border:"1px solid #FECACA" }}>⚠️</span>
                  <span style={{ fontSize:11, color:"#64748B" }}>Below 75% — action required</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SUMMARY VIEW ──────────────────────────────────────── */}
      {view==="summary" && (loading || ss.length>0) && (
        <>
          {/* At-risk alert banner */}
          {!loading && (() => {
            const atRisk = ss.filter(s => { const p=pctDays(s.id,last5); return p!==null && p<75; });
            if (!atRisk.length) return null;
            return (
              <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10,
                padding:"12px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:18 }}>⚠️</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#DC2626" }}>
                    {atRisk.length} student{atRisk.length>1?"s":""} below 75% attendance
                  </div>
                  <div style={{ fontSize:11, color:"#EF4444", marginTop:1 }}>
                    {atRisk.map(s=>s.name).join(", ")}
                  </div>
                </div>
                <button onClick={()=>{
                  atRisk.forEach(s=>{
                    const p=pctDays(s.id,last5);
                    const msg=`Dear ${s.guardian||'Parent'}, ${s.name}'s attendance is ${p}% — below the required 75%. Please ensure regular attendance. — Vikashana`;
                    openWA(s.phone,msg);
                  });
                  showToast(`WhatsApp sent to ${atRisk.length} parent${atRisk.length>1?"s":""}`);
                }}
                  style={{ marginLeft:"auto", background:"#DC2626", color:"#fff", border:"none",
                    borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:700,
                    cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  📱 Alert All Parents
                </button>
              </div>
            );
          })()}

          {/* Student summary cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
            {loading
              ? Array.from({length:6}).map((_,i)=>(
                  <div key={i} style={{ background:"#F8FAFC", borderRadius:14, padding:18,
                    height:160, animation:"pulse 1.5s ease-in-out infinite" }}/>
                ))
              : ss.map(s=>{
                  const p = pctDays(s.id, last5);
                  const lowAtt = p!==null && p<75;
                  const counts = { P:0,A:0,L:0 };
                  last5.forEach(d=>{ const v=getAtt(s.id,d); if(v) counts[v]=(counts[v]||0)+1; });

                  return (
                    <div key={s.id} style={{ background:"#fff", borderRadius:14, overflow:"hidden",
                      boxShadow:"0 1px 8px rgba(0,0,0,0.07)",
                      border:lowAtt?"2px solid #FECACA":"2px solid transparent",
                      transition:"transform 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                      onMouseLeave={e=>e.currentTarget.style.transform=""}>

                      {/* Card header */}
                      <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:10,
                        borderBottom:"1px solid #F1F5F9",
                        background:lowAtt?"#FFF5F5":"#FAFBFC" }}>
                        <Avatar name={s.name} size={36}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:800, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
                            {s.name}
                            {lowAtt && <span style={{ fontSize:8, background:"#FEF2F2",
                              color:"#DC2626", padding:"1px 5px", borderRadius:6,
                              fontWeight:800, border:"1px solid #FECACA" }}>LOW</span>}
                          </div>
                          <div style={{ fontSize:10, color:"#94A3B8" }}>{s.admNo} · Class {s.class}-{s.section}</div>
                        </div>
                        {p!==null && (
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontSize:18, fontWeight:900,
                              color:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}>
                              {p}%
                            </div>
                            <div style={{ fontSize:9, color:"#94A3B8", fontWeight:600 }}>5-day avg</div>
                          </div>
                        )}
                      </div>

                      {/* Last 5 day dots */}
                      <div style={{ padding:"10px 14px" }}>
                        <div style={{ fontSize:9, fontWeight:800, color:"#94A3B8",
                          textTransform:"uppercase", letterSpacing:0.5, marginBottom:7 }}>
                          Last 5 Days
                        </div>
                        <div style={{ display:"flex", gap:5 }}>
                          {last5.map(d=>{
                            const v=getAtt(s.id,d);
                            const m=v?ATT[v]:null;
                            return (
                              <div key={d} style={{ flex:1, textAlign:"center" }}>
                                <div style={{ width:"100%", paddingBottom:"100%", position:"relative", borderRadius:7,
                                  background:m?m.bg:"#F1F5F9", border:`1px solid ${m?m.border:"#E2E8F0"}` }}>
                                  <span style={{ position:"absolute", inset:0, display:"flex",
                                    alignItems:"center", justifyContent:"center",
                                    fontSize:12, fontWeight:900, color:m?m.c:"#CBD5E1" }}>
                                    {v||"·"}
                                  </span>
                                </div>
                                <div style={{ fontSize:8, color:"#94A3B8", marginTop:3, fontWeight:600 }}>
                                  {fmtDate(d).split(" ")[0]}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mini stats row */}
                      <div style={{ padding:"0 14px 12px", display:"flex", gap:6 }}>
                        {Object.entries(ATT).map(([k,v])=>(
                          <div key={k} style={{ flex:1, background:v.bg, borderRadius:7,
                            padding:"5px 4px", textAlign:"center", border:`1px solid ${v.border}` }}>
                            <div style={{ fontSize:14, fontWeight:900, color:v.c }}>{counts[k]||0}</div>
                            <div style={{ fontSize:9,  fontWeight:700, color:v.c }}>{v.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      {p!==null && (
                        <div style={{ padding:"0 14px 12px" }}>
                          <div style={{ background:"#F1F5F9", borderRadius:99, height:6, overflow:"hidden" }}>
                            <div style={{ width:`${p}%`, height:"100%", borderRadius:99,
                              background:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444",
                              transition:"width 0.4s ease" }}/>
                          </div>
                        </div>
                      )}

                      {/* WhatsApp absent alert at bottom of card */}
                      {lowAtt && (
                        <div style={{ padding:"0 14px 12px" }}>
                          <button onClick={()=>{
                            const msg=`Dear ${s.guardian||'Parent'}, ${s.name}'s attendance is ${p}% — below the required 75%. Please ensure regular attendance. — Vikashana`;
                            openWA(s.phone,msg);
                            showToast(`Alert sent to ${s.name}'s parent`);
                          }}
                            style={{ width:"100%", background:"#DCFCE7", color:"#16A34A",
                              border:"1px solid #86EFAC", borderRadius:8, padding:"7px",
                              fontSize:11, fontWeight:700, cursor:"pointer" }}>
                            📱 WhatsApp Parent
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </>
      )}

      <Toast toast={toast} />
    </div>
  );
}
