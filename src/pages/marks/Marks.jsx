import { useState, useCallback, useEffect, useMemo } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'

// ── API ───────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
async function API(path, opts = {}) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      ...opts,
    });
    return res.json();
  } catch { return { success: false, message: 'Network error' }; }
}

// ── Grade helper (unchanged) ──────────────────────────────────
function getGrade(pct) {
  if (pct >= 91) return { g:"A1", gp:10, c:"#059669", bg:"#D1FAE5" };
  if (pct >= 81) return { g:"A2", gp:9,  c:"#10B981", bg:"#ECFDF5" };
  if (pct >= 71) return { g:"B1", gp:8,  c:"#3B82F6", bg:"#EFF6FF" };
  if (pct >= 61) return { g:"B2", gp:7,  c:"#6366F1", bg:"#EEF2FF" };
  if (pct >= 51) return { g:"C1", gp:6,  c:"#8B5CF6", bg:"#F5F3FF" };
  if (pct >= 41) return { g:"C2", gp:5,  c:"#F59E0B", bg:"#FFFBEB" };
  if (pct >= 33) return { g:"D",  gp:4,  c:"#D97706", bg:"#FEF3C7" };
  return           { g:"E",  gp:0,  c:"#DC2626", bg:"#FEE2E2" };
}

// Map API grade string (A+, A, B+…) to a getGrade()-compatible meta object
function apiGradeMeta(apiGrade, pct) {
  if (pct != null && !isNaN(pct)) return getGrade(Number(pct));
  const mid = { 'A+':95, 'A':85, 'B+':75, 'B':65, 'C':55, 'D':40, 'F':20 };
  return getGrade(mid[apiGrade] ?? 0);
}

// ── Helpers ───────────────────────────────────────────────────
const openWA = (phone, msg) =>
  window.open(`https://wa.me/91${phone.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`,"_blank");

// ── Shared UI ─────────────────────────────────────────────────
function Avatar({ name, size=32 }) {
  const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
  const bg = palette[(name||"?").charCodeAt(0) % palette.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.36, fontWeight:800, color:"#fff" }}>
      {(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2)}
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

function SkeletonRows({ n=5 }) {
  return (
    <div style={{ background:"#fff", borderRadius:13, overflow:"hidden" }}>
      {Array.from({length:n}).map((_,i)=>(
        <div key={i} style={{ padding:"14px 18px", borderBottom:"1px solid #F1F5F9",
          display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#E2E8F0", flexShrink:0 }}/>
          <div style={{ flex:1, height:14, background:"#E2E8F0", borderRadius:6 }}/>
          <div style={{ width:80, height:14, background:"#E2E8F0", borderRadius:6 }}/>
          <div style={{ width:50, height:14, background:"#E2E8F0", borderRadius:6 }}/>
        </div>
      ))}
    </div>
  );
}

function Placeholder({ icon, msg }) {
  return (
    <div style={{ background:"#fff", borderRadius:12, padding:60, textAlign:"center", color:"#94A3B8" }}>
      <div style={{ fontSize:44, marginBottom:10 }}>{icon}</div>
      <div style={{ fontWeight:600, fontSize:14 }}>{msg}</div>
    </div>
  );
}

// ── Filters ───────────────────────────────────────────────────
function Filters({ classes, sections, academicYears, exams,
  cls, setCls, sec, setSec, yearId, setYearId, examId, setExamId }) {
  const sel = { border:"none", fontSize:13, fontWeight:700, color:"#6366F1",
    background:"transparent", cursor:"pointer", outline:"none" };
  const pill = { background:"#fff", borderRadius:9, padding:"8px 14px",
    display:"flex", gap:8, alignItems:"center", border:"1px solid #E2E8F0" };
  return (
    <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
      {academicYears.length > 0 && (
        <div style={pill}>
          <span style={{ fontSize:11, fontWeight:800, color:"#64748B" }}>YEAR</span>
          <select value={yearId} onChange={e=>setYearId(e.target.value)} style={sel}>
            <option value="">All Years</option>
            {academicYears.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
      )}
      <div style={pill}>
        <span style={{ fontSize:11, fontWeight:800, color:"#64748B" }}>CLASS</span>
        <select value={cls} onChange={e=>setCls(e.target.value)} style={sel}>
          <option value="">— Select —</option>
          {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {cls && (
        <div style={pill}>
          <span style={{ fontSize:11, fontWeight:800, color:"#64748B" }}>SEC</span>
          <select value={sec} onChange={e=>setSec(e.target.value)} style={sel}>
            <option value="">All</option>
            {sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      {cls && (
        <div style={pill}>
          <span style={{ fontSize:11, fontWeight:800, color:"#64748B" }}>EXAM</span>
          <select value={examId} onChange={e=>setExamId(e.target.value)} style={sel}>
            <option value="">— Select Exam —</option>
            {exams.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Print Report Card Modal ───────────────────────────────────
function ReportCardPrintModal({ student, examData, clsName, secName, academicYear, cgpa, onClose, isMobile, schoolName }) {
  const handlePrint = () => {
    const el = document.getElementById("rc-print");
    const win = window.open("","_blank","width=680,height=900");
    win.document.write(`<html><head><title>Report Card - ${student.name}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',sans-serif;padding:20px;background:#fff;font-size:12px;}
      table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:7px 10px;}
      th{background:#1E1B4B;color:#fff;font-size:10px;font-weight:800;text-transform:uppercase;}
      @media print{@page{size:A4;margin:12mm;}}</style></head>
      <body>${el.innerHTML}
      <script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    win.document.close();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:24, overflowY:"auto" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:620, maxHeight:"90vh",
        overflowY:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>

        <div style={{ background:"linear-gradient(135deg,#1E1B4B,#6D28D9)", padding:"16px 22px",
          display:"flex", alignItems:"center", justifyContent:"space-between", color:"#fff",
          position:"sticky", top:0, zIndex:10 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>📋 Report Card Preview</div>
            <div style={{ fontSize:11, opacity:0.65 }}>
              {student.name} · {clsName}{secName ? `-${secName}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.12)", border:"none",
            borderRadius:8, color:"#fff", width:30, height:30, fontSize:16, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>✕</button>
        </div>

        <div style={{ padding:isMobile?12:24, background:"#F0F4F8" }}>
          <div id="rc-print">
            <div style={{ fontFamily:"'Segoe UI',sans-serif", background:"#fff",
              borderRadius:12, overflow:"hidden", border:"2px solid #1E1B4B" }}>

              <div style={{ background:"linear-gradient(135deg,#1E1B4B,#4C1D95,#6D28D9)",
                padding:"20px 24px", color:"#fff", textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:900 }}>{schoolName || "School"}</div>
                <div style={{ marginTop:10, background:"rgba(255,255,255,0.15)", borderRadius:6,
                  padding:"5px 16px", display:"inline-block", fontSize:13, fontWeight:800,
                  letterSpacing:1, textTransform:"uppercase" }}>Progress Report Card</div>
              </div>

              <div style={{ padding:"16px 24px", display:"flex", justifyContent:"space-between",
                alignItems:"center", background:"#F5F3FF", borderBottom:"1px solid #DDD6FE" }}>
                <div>
                  {[
                    ["Student Name", student.name],
                    ["Student ID",   student.admission_no || student.id],
                    ["Class",        `${clsName}${secName ? `-${secName}` : ''}`],
                    ["Academic Year", academicYear],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:"flex", gap:12, marginBottom:5 }}>
                      <span style={{ fontSize:10, fontWeight:800, color:"#7C3AED",
                        textTransform:"uppercase", minWidth:100 }}>{k}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:"#1A202C" }}>{v}</span>
                    </div>
                  ))}
                </div>
                {cgpa && (
                  <div style={{ textAlign:"center", background:"linear-gradient(135deg,#6D28D9,#1E1B4B)",
                    borderRadius:14, padding:"16px 24px", color:"#fff" }}>
                    <div style={{ fontSize:36, fontWeight:900 }}>{cgpa}</div>
                    <div style={{ fontSize:12, opacity:0.8, fontWeight:700 }}>CGPA</div>
                    <div style={{ fontSize:10, opacity:0.6, marginTop:2 }}>{getGrade(cgpa*10).g} Grade</div>
                  </div>
                )}
              </div>

              {examData.map((ed,ei)=>(
                <div key={ed.examName} style={{ borderBottom:"1px solid #F1F5F9" }}>
                  <div style={{ padding:"10px 24px", background:ei%2===0?"#F8FAFC":"#fff",
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontWeight:800, fontSize:13, color:"#1E1B4B" }}>{ed.examName}</span>
                    {ed.totalPct != null && (
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ fontSize:12, color:"#64748B" }}>
                          Total: <strong>{ed.totalOb}/{ed.totalMax}</strong>
                        </span>
                        <span style={{ background:getGrade(ed.totalPct).bg, color:getGrade(ed.totalPct).c,
                          padding:"3px 12px", borderRadius:8, fontSize:12, fontWeight:800 }}>
                          {ed.totalPct}% · {getGrade(ed.totalPct).g}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding:"10px 24px 14px", overflowX:"auto" }}>
                    <div style={{ display:"flex", gap:8 }}>
                      {ed.subjects.map(sub=>{
                        const meta = apiGradeMeta(sub.grade, sub.pct);
                        return (
                          <div key={sub.name} style={{ minWidth:88, padding:"8px 10px", borderRadius:8,
                            background:meta.bg, border:`1px solid ${meta.c}22`, textAlign:"center" }}>
                            <div style={{ fontSize:9, fontWeight:700, color:"#64748B", marginBottom:3 }}>{sub.name}</div>
                            <div style={{ fontSize:15, fontWeight:900, color:meta.c }}>{sub.ob ?? '—'}</div>
                            {sub.max && <div style={{ fontSize:9, color:"#94A3B8" }}>/{sub.max}</div>}
                            <span style={{ background:"#fff", color:meta.c, padding:"1px 6px",
                              borderRadius:4, fontSize:10, fontWeight:800 }}>{meta.g}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ padding:"16px 24px 20px", display:"flex", justifyContent:"space-between" }}>
                {["Class Teacher","Principal","Parent / Guardian"].map(s=>(
                  <div key={s} style={{ textAlign:"center" }}>
                    <div style={{ width:120, borderBottom:"1px solid #CBD5E1", height:32, marginBottom:4 }}/>
                    <div style={{ fontSize:10, color:"#64748B", fontWeight:700 }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:"0 24px 24px", display:"flex", gap:10, position:"sticky", bottom:0,
          background:"#fff", borderTop:"1px solid #F1F5F9", paddingTop:16 }}>
          <button onClick={onClose} style={{ flex:1, background:"#F1F5F9", color:"#64748B",
            border:"none", borderRadius:10, padding:11, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Close
          </button>
          <button onClick={handlePrint} style={{ flex:2, background:"linear-gradient(135deg,#1E1B4B,#6D28D9)",
            color:"#fff", border:"none", borderRadius:10, padding:11, fontSize:13, fontWeight:700,
            cursor:"pointer", boxShadow:"0 4px 12px rgba(109,40,217,0.35)" }}>
            🖨️ Print Report Card
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN MARKS COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Marks() {
  const bp       = useBreakpoint();
  const isMobile = bp === 'mobile';

  // ── API data ──────────────────────────────────────────────
  const [classes, setClasses]         = useState([]);
  const [sections, setSections]       = useState([]);
  const [academicYears, setAcYears]   = useState([]);
  const [exams, setExams]             = useState([]);
  const [students, setStudents]       = useState([]); // for report card selector
  const [school, setSchool]           = useState(null);

  // ── Filters ───────────────────────────────────────────────
  const [cls, setCls]       = useState(""); // class ID
  const [sec, setSec]       = useState(""); // section ID
  const [yearId, setYearId] = useState(""); // academic year ID
  const [examId, setExamId] = useState(""); // selected exam ID

  // ── View ──────────────────────────────────────────────────
  const [view, setView] = useState("results"); // results | reportcard | analytics

  // ── View-specific data ────────────────────────────────────
  // GET /exams/{id}/report — { success, data:[...], subjects:[...], exam, total_max }
  const [reportRes, setReportRes]       = useState(null);
  // GET /exams/{id}/marks  — { success, subjects:[...], students:[...] }
  const [marksRes, setMarksRes]         = useState(null);
  // GET /students/{id}/marks — { success, data:[{exam(str), subject(str), marks_obtained, max_marks, grade}] }
  const [studentMarks, setStudentMarks] = useState(null);
  const [rcStu, setRcStu]               = useState(null);

  // ── Loading ───────────────────────────────────────────────
  const [reportLoading, setReportLoading]     = useState(false);
  const [marksLoading, setMarksLoading]       = useState(false);
  const [stuMarksLoading, setStuMarksLoading] = useState(false);

  // ── UI ────────────────────────────────────────────────────
  const [showPrint, setShowPrint] = useState(false);
  const [toast, setToast]         = useState(null);

  const showToast = useCallback((msg, type="success") => {
    setToast({msg, type}); setTimeout(()=>setToast(null), 3000);
  }, []);

  // ── Mount: load classes, years, school settings ───────────
  useEffect(() => {
    Promise.all([API('/classes'), API('/academic-years'), API('/settings')])
      .then(([cr, yr, sr]) => {
        if (cr.success) setClasses(cr.data);
        if (sr.success) setSchool(sr.data?.school || null);
        if (yr.success) {
          setAcYears(yr.data);
          const cur = yr.data.find(y => y.is_current) || yr.data[0];
          if (cur) setYearId(String(cur.id));
        }
      }).catch(()=>{});
  }, []);

  // ── Class change: load sections, reset downstream ─────────
  useEffect(() => {
    setSections([]); setSec("");
    setExams([]); setExamId("");
    setStudents([]); setRcStu(null); setStudentMarks(null);
    setReportRes(null); setMarksRes(null);
    if (!cls) return;
    API(`/sections?class_id=${cls}`).then(r => { if (r.success) setSections(r.data); });
  }, [cls]);

  // ── Class/year change: reload exams (Completed only) ──────
  useEffect(() => {
    setExams([]); setExamId(""); setReportRes(null); setMarksRes(null);
    if (!cls) return;
    const p = new URLSearchParams({ status:'Completed', class_id: cls });
    if (yearId) p.append('academic_year_id', yearId);
    API(`/exams?${p}`).then(r => { if (r.success) setExams(r.data); });
  }, [cls, yearId]);

  // ── Class/section change: load students (for report card) ─
  useEffect(() => {
    setStudents([]); setRcStu(null); setStudentMarks(null);
    if (!cls) return;
    const p = new URLSearchParams({ class_id: cls, per_page:'200' });
    if (sec) p.append('section_id', sec);
    API(`/students?${p}`).then(r => {
      if (r.success) {
        const arr = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setStudents(arr);
      }
    });
  }, [cls, sec]);

  // ── Exam change: clear data ────────────────────────────────
  useEffect(() => {
    setReportRes(null); setMarksRes(null);
  }, [examId]);

  // ── Load report when Results tab + examId ─────────────────
  useEffect(() => {
    if (!examId || view !== 'results' || reportRes) return;
    setReportLoading(true);
    API(`/exams/${examId}/report`)
      .then(r => { if (r.success) setReportRes(r); })
      .catch(()=>{})
      .finally(() => setReportLoading(false));
  }, [examId, view, reportRes]);

  // ── Load marks when Analytics tab + examId ────────────────
  useEffect(() => {
    if (!examId || view !== 'analytics' || marksRes) return;
    setMarksLoading(true);
    const calls = [API(`/exams/${examId}/marks`)];
    if (!reportRes) calls.push(API(`/exams/${examId}/report`));
    Promise.all(calls)
      .then(([mr, rr]) => {
        if (mr?.success) setMarksRes(mr);
        if (rr?.success) setReportRes(rr);
      })
      .catch(()=>{})
      .finally(() => setMarksLoading(false));
  }, [examId, view, marksRes]);

  // ── Load student marks when student selected ──────────────
  useEffect(() => {
    setStudentMarks(null);
    if (!rcStu) return;
    setStuMarksLoading(true);
    API(`/students/${rcStu.id}/marks`)
      .then(r => { if (r.success) setStudentMarks(r.data); })
      .catch(()=>{})
      .finally(() => setStuMarksLoading(false));
  }, [rcStu?.id]);

  // ── Derived: current selection labels ─────────────────────
  const curExam    = exams.find(e => String(e.id) === String(examId)) || null;
  const curClass   = classes.find(c => String(c.id) === String(cls)) || null;
  const curSection = sections.find(s => String(s.id) === String(sec)) || null;
  const curYear    = academicYears.find(y => String(y.id) === String(yearId)) || null;

  // ── KPIs from reportRes.data ───────────────────────────────
  const kpis = useMemo(() => {
    if (!reportRes?.data?.length) return null;
    const pcts = reportRes.data.map(r => r.percentage).filter(v => v != null);
    if (!pcts.length) return null;
    const avg     = Math.round(pcts.reduce((a,b)=>a+b,0) / pcts.length);
    const passed  = reportRes.data.filter(r => r.grade !== 'F' && r.grade !== '—').length;
    const passRate = Math.round(passed / reportRes.data.length * 100);
    const top     = Math.round(Math.max(...pcts));
    return { avg, passRate, top, total: reportRes.data.length };
  }, [reportRes]);

  // ── RC data: group studentMarks by exam name ──────────────
  // API returns flat [{exam(str), subject(str), marks_obtained, max_marks, grade}]
  const rcExamData = useMemo(() => {
    if (!studentMarks) return [];
    const map = {};
    // API returns ordered by created_at DESC — reverse for chronological display
    const items = [...studentMarks].reverse();
    items.forEach(m => {
      if (!m.exam) return;
      if (!map[m.exam]) map[m.exam] = { examName: m.exam, subjects:[], totalOb:0, totalMax:0 };
      const ob  = m.marks_obtained != null ? Number(m.marks_obtained) : null;
      const max = m.max_marks ? Number(m.max_marks) : null;
      const pct = ob != null && max ? Math.round(ob / max * 100) : null;
      map[m.exam].subjects.push({ name: m.subject || '—', ob, max, pct, grade: m.grade });
      if (ob != null)  map[m.exam].totalOb  += ob;
      if (max != null) map[m.exam].totalMax += max;
    });
    return Object.values(map).map(ed => ({
      ...ed,
      totalPct: ed.totalMax ? Math.round(ed.totalOb / ed.totalMax * 100) : null,
    }));
  }, [studentMarks]);

  const rcCgpa = useMemo(() => {
    const f = rcExamData.filter(e => e.totalPct != null);
    if (!f.length) return null;
    const avg = f.reduce((a,e)=>a+e.totalPct,0) / f.length;
    return getGrade(avg).gp.toFixed(1);
  }, [rcExamData]);

  // ── Subject analytics from marksRes (grid format) ─────────
  // marksRes.subjects = [{id, subject(str), max_marks, ...}]
  // marksRes.students = [{id, name, marks:{esId:{marks_obtained,grade}}}]
  const subjectAnalytics = useMemo(() => {
    if (!marksRes?.subjects?.length || !marksRes?.students?.length) return [];
    return marksRes.subjects.map(sub => {
      const max = Number(sub.max_marks) || 100;
      const pcts = marksRes.students.map(stu => {
        const m = stu.marks?.[sub.id];
        return m?.marks_obtained != null ? Math.round(Number(m.marks_obtained) / max * 100) : null;
      }).filter(v => v !== null);
      const avg  = pcts.length ? Math.round(pcts.reduce((a,b)=>a+b,0) / pcts.length) : 0;
      const top  = pcts.length ? Math.max(...pcts) : 0;
      const low  = pcts.length ? Math.min(...pcts) : 0;
      const fail = pcts.filter(p => p < 35).length;
      return { name: sub.subject || '—', avg, top, low, fail, pass: pcts.length - fail, total: pcts.length, ...getGrade(avg) };
    }).sort((a,b) => b.avg - a.avg);
  }, [marksRes]);

  // ── TABS ──────────────────────────────────────────────────
  const TABS = [["results","📊 Class Results"],["reportcard","📋 Report Card"],["analytics","🔬 Analytics"]];

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>

      {/* Tabs */}
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

      {/* Filters */}
      <Filters
        classes={classes} sections={sections} academicYears={academicYears} exams={exams}
        cls={cls} setCls={v=>{ setCls(v); }}
        sec={sec} setSec={setSec}
        yearId={yearId} setYearId={setYearId}
        examId={examId} setExamId={setExamId}
      />

      {!cls && <Placeholder icon="🏫" msg="Select a class to get started"/>}

      {/* ── CLASS RESULTS ─────────────────────────────────────── */}
      {view === "results" && cls && (
        <>
          {!examId && exams.length > 0 && !reportLoading &&
            <Placeholder icon="📋" msg="Select a completed exam to view results"/>}
          {!examId && exams.length === 0 && !reportLoading &&
            <Placeholder icon="📭" msg="No completed exams for this class yet"/>}

          {/* KPI widgets */}
          {kpis && examId && (
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:14, marginBottom:18 }}>
              {[
                { icon:"📊", label:"Class Average", value:`${kpis.avg}%`,      c:"#6366F1", bg:"#EEF2FF" },
                { icon:"✅", label:"Pass Rate",     value:`${kpis.passRate}%`, c:"#10B981", bg:"#ECFDF5" },
                { icon:"🏆", label:"Top Score",     value:`${kpis.top}%`,      c:"#3B82F6", bg:"#EFF6FF" },
                { icon:"👥", label:"Students",      value:kpis.total,          c:"#8B5CF6", bg:"#F5F3FF" },
              ].map(w=>(
                <div key={w.label} style={{ background:"#fff", borderRadius:13, padding:"14px 16px",
                  boxShadow:"0 1px 6px rgba(0,0,0,0.07)", display:"flex", alignItems:"center",
                  gap:12, border:`1px solid ${w.c}18` }}>
                  <div style={{ width:44, height:44, background:w.bg, borderRadius:11, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{w.icon}</div>
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, color:w.c, lineHeight:1 }}>{w.value}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#374151", marginTop:2 }}>{w.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {reportLoading && <SkeletonRows n={6}/>}

          {examId && !reportLoading && reportRes?.data && (
            <div style={{ background:"#fff", borderRadius:13, boxShadow:"0 1px 8px rgba(0,0,0,0.07)",
              overflow:"hidden", overflowX:"auto" }}>
              <div style={{ padding:"14px 20px", background:"#F8FAFC", borderBottom:"2px solid #E2E8F0",
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontWeight:800, fontSize:14 }}>{curExam?.name} — Results</span>
                <span style={{ fontSize:12, color:"#94A3B8" }}>{reportRes.data.length} students</span>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                    {["Rank","Student",
                      ...(reportRes.subjects||[]).map(s=>s.name?.slice(0,9)||''),
                      "Total","Percent","Grade"
                    ].map((h,i)=>(
                      <th key={i} style={{ padding:"10px 12px", textAlign:"left", fontSize:10,
                        fontWeight:800, color:"#64748B", textTransform:"uppercase",
                        letterSpacing:0.5, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportRes.data.map((row,i)=>{
                    const meta = apiGradeMeta(row.grade, row.percentage);
                    const fail = row.grade === 'F';
                    return (
                      <tr key={row.student_id || i} style={{ borderBottom:"1px solid #F1F5F9",
                        background: fail ? "#FFF5F5" : "" }}
                        onMouseEnter={e=>e.currentTarget.style.background=fail?"#FEE2E2":"#FAFBFC"}
                        onMouseLeave={e=>e.currentTarget.style.background=fail?"#FFF5F5":""}>
                        <td style={{ padding:"10px 12px", fontWeight:800, fontSize:14,
                          color:i===0?"#F59E0B":i===1?"#9CA3AF":i===2?"#D97706":"#64748B" }}>
                          {i===0?"🥇":i===1?"🥈":i===2?"🥉":row.rank}
                        </td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <Avatar name={row.name||'?'} size={28}/>
                            <div>
                              <div style={{ fontWeight:700, fontSize:13 }}>{row.name}</div>
                              <div style={{ fontSize:10, color:"#94A3B8" }}>{row.admission_no}</div>
                            </div>
                          </div>
                        </td>
                        {(reportRes.subjects||[]).map(sub=>{
                          const m = row.subjects?.find(s => s.subject === sub.name);
                          const ob = m?.marks_obtained;
                          return (
                            <td key={sub.id} style={{ padding:"10px 10px", textAlign:"center",
                              fontSize:13, fontWeight:700, color: ob != null ? "#374151" : "#CBD5E1" }}>
                              {ob ?? '—'}
                            </td>
                          );
                        })}
                        <td style={{ padding:"10px 12px", fontWeight:700, fontSize:13 }}>
                          {row.total_marks != null ? `${row.total_marks}/${row.max_marks}` : '—'}
                        </td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:48, background:"#F1F5F9", borderRadius:99, height:6, overflow:"hidden" }}>
                              <div style={{ width:`${row.percentage||0}%`, height:"100%", borderRadius:99, background:meta.c }}/>
                            </div>
                            <span style={{ fontSize:12, fontWeight:800, color:meta.c }}>
                              {row.percentage != null ? `${row.percentage}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ background:meta.bg, color:meta.c, padding:"3px 10px",
                            borderRadius:8, fontSize:12, fontWeight:800, border:`1px solid ${meta.c}33` }}>
                            {meta.g}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── REPORT CARD ───────────────────────────────────────── */}
      {view === "reportcard" && cls && (
        <>
          {/* Student selector */}
          {students.length > 0 ? (
            <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
              {students.map(s=>(
                <button key={s.id} onClick={()=>setRcStu(s)}
                  style={{ padding:"7px 14px", borderRadius:9, border:"none", cursor:"pointer",
                    fontSize:12, fontWeight:700, transition:"all 0.15s",
                    background:rcStu?.id===s.id?"#6366F1":"#fff",
                    color:rcStu?.id===s.id?"#fff":"#475569",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
                  {s.name}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ background:"#FEF9C3", border:"1px solid #FEF08A", borderRadius:10,
              padding:"12px 18px", marginBottom:16, fontSize:13, color:"#854D0E", fontWeight:600 }}>
              {sec ? "No students in this section" : "Select a section to see students"}
            </div>
          )}

          {stuMarksLoading && <SkeletonRows n={5}/>}

          {!rcStu && !stuMarksLoading && students.length > 0 && (
            <Placeholder icon="👆" msg="Select a student above to view their report card"/>
          )}

          {rcStu && !stuMarksLoading && (
            studentMarks !== null ? (
              rcExamData.length > 0 ? (
                <>
                  {/* Header */}
                  <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 12px rgba(0,0,0,0.08)",
                    overflow:"hidden", marginBottom:14 }}>
                    <div style={{ background:"linear-gradient(135deg,#1E1B4B,#6D28D9)",
                      padding:"22px 26px", color:"#fff", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <Avatar name={rcStu.name} size={50}/>
                        <div>
                          <div style={{ fontSize:19, fontWeight:900 }}>{rcStu.name}</div>
                          <div style={{ fontSize:12, opacity:0.7, marginTop:2 }}>
                            {curClass?.name}{curSection?`-${curSection.name}`:''} · {curYear?.name||''}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        {rcCgpa && (
                          <div style={{ textAlign:"center", background:"rgba(255,255,255,0.12)",
                            borderRadius:12, padding:"10px 18px" }}>
                            <div style={{ fontSize:26, fontWeight:900 }}>{rcCgpa}</div>
                            <div style={{ fontSize:11, opacity:0.8 }}>CGPA</div>
                          </div>
                        )}
                        <button onClick={()=>setShowPrint(true)}
                          style={{ background:"rgba(255,255,255,0.15)", color:"#fff",
                            border:"1px solid rgba(255,255,255,0.3)", borderRadius:9,
                            padding:"9px 16px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                          🖨️ Print
                        </button>
                      </div>
                    </div>

                    {/* Trend */}
                    <div style={{ padding:"14px 22px", background:"#F8FAFC", borderBottom:"1px solid #F1F5F9" }}>
                      <div style={{ fontSize:10, fontWeight:800, color:"#64748B",
                        textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>
                        📈 Cross-Exam Trend
                      </div>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
                        {rcExamData.map(t=>{
                          const meta = t.totalPct != null ? getGrade(t.totalPct) : null;
                          return (
                            <div key={t.examName} style={{ flex:1, textAlign:"center" }}>
                              <div style={{ fontSize:12, fontWeight:800, color:meta?meta.c:"#CBD5E1" }}>
                                {t.totalPct != null ? `${t.totalPct}%` : "—"}
                              </div>
                              <div style={{ height:Math.max(4,(t.totalPct||0)*0.6), background:meta?meta.c:"#F1F5F9",
                                borderRadius:"4px 4px 0 0", margin:"4px 4px 0", transition:"height 0.4s" }}/>
                              <div style={{ fontSize:9, color:"#94A3B8", fontWeight:700, marginTop:4,
                                padding:"2px 4px", background:"#F1F5F9", borderRadius:4,
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                {t.examName.split(' ')[0]}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Exam-wise breakdown */}
                  {rcExamData.map(ed=>(
                    <div key={ed.examName} style={{ background:"#fff", borderRadius:13,
                      boxShadow:"0 1px 6px rgba(0,0,0,0.07)", marginBottom:10, overflow:"hidden" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"12px 20px", background:"#F8FAFC", borderBottom:"1px solid #F1F5F9" }}>
                        <span style={{ fontWeight:800, fontSize:13 }}>{ed.examName}</span>
                        {ed.totalPct != null && (
                          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                            <span style={{ fontSize:12, color:"#64748B" }}>
                              Total: <strong>{ed.totalOb}/{ed.totalMax}</strong>
                            </span>
                            <span style={{ background:getGrade(ed.totalPct).bg, color:getGrade(ed.totalPct).c,
                              padding:"3px 12px", borderRadius:8, fontSize:12, fontWeight:800 }}>
                              {ed.totalPct}% · {getGrade(ed.totalPct).g}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:0, overflowX:"auto", padding:"12px 20px 14px" }}>
                        {ed.subjects.map(sub=>{
                          const meta = apiGradeMeta(sub.grade, sub.pct);
                          return (
                            <div key={sub.name} style={{ minWidth:95, padding:"9px 10px", borderRadius:9,
                              margin:"0 4px", background:meta.bg, border:`1px solid ${meta.c}22`, textAlign:"center" }}>
                              <div style={{ fontSize:10, fontWeight:700, color:"#64748B", marginBottom:4 }}>{sub.name}</div>
                              <div style={{ fontSize:16, fontWeight:900, color:meta.c }}>
                                {sub.ob ?? '—'}
                              </div>
                              {sub.max && <div style={{ fontSize:9, color:"#94A3B8" }}>/{sub.max}</div>}
                              <span style={{ background:"#fff", color:meta.c, padding:"2px 7px",
                                borderRadius:5, fontSize:11, fontWeight:800 }}>{meta.g}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* WhatsApp */}
                  {rcStu.parents?.[0]?.phone && (
                    <button onClick={()=>{
                      const p = rcStu.parents[0];
                      const lines = rcExamData.map(e =>
                        `${e.examName}: ${e.totalPct != null ? `${e.totalPct}% (${getGrade(e.totalPct).g})` : '—'}`
                      ).join('\n');
                      const msg = `Dear ${p.name}, here is the academic report for ${rcStu.name}:\n${lines}\nCGPA: ${rcCgpa || '—'} — Vikashana`;
                      openWA(p.phone, msg);
                      showToast(`Report sent to ${p.name}`);
                    }}
                      style={{ marginTop:14, background:"#DCFCE7", color:"#16A34A",
                        border:"1px solid #86EFAC", borderRadius:10, padding:"10px 20px",
                        fontSize:13, fontWeight:700, cursor:"pointer",
                        display:"flex", alignItems:"center", gap:8 }}>
                      📱 Send Report Card via WhatsApp
                    </button>
                  )}
                </>
              ) : (
                <Placeholder icon="📄" msg="No marks recorded for this student yet"/>
              )
            ) : null
          )}
        </>
      )}

      {/* ── ANALYTICS ─────────────────────────────────────────── */}
      {view === "analytics" && cls && (
        <>
          {!examId && <Placeholder icon="🔬" msg="Select a completed exam to view subject analysis"/>}
          {marksLoading && <SkeletonRows n={5}/>}

          {examId && !marksLoading && marksRes && (
            <>
              {subjectAnalytics.length === 0 ? (
                <Placeholder icon="📊" msg="No marks entered for this exam yet"/>
              ) : (
                <>
                  {/* Subject bars */}
                  <div style={{ background:"#fff", borderRadius:13, padding:"18px 22px",
                    boxShadow:"0 1px 6px rgba(0,0,0,0.07)", marginBottom:14 }}>
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:16, display:"flex", justifyContent:"space-between" }}>
                      <span>📊 Subject-wise Average — {curExam?.name}</span>
                      <span style={{ fontSize:11, color:"#94A3B8", fontWeight:600 }}>
                        {marksRes.students?.length || 0} students
                      </span>
                    </div>
                    {subjectAnalytics.map(a=>(
                      <div key={a.name} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                        <div style={{ width:130, fontSize:12, fontWeight:700, flexShrink:0, color:"#374151" }}>{a.name}</div>
                        <div style={{ flex:1, background:"#F1F5F9", borderRadius:99, height:20, overflow:"hidden", position:"relative" }}>
                          <div style={{ width:`${a.avg}%`, height:"100%", background:a.c, borderRadius:99,
                            display:"flex", alignItems:"center", paddingLeft:10, transition:"width 0.4s" }}>
                            {a.avg>15 && <span style={{ fontSize:10, fontWeight:800, color:"#fff" }}>{a.avg}%</span>}
                          </div>
                        </div>
                        <span style={{ fontSize:12, fontWeight:800, color:a.c, minWidth:40 }}>{a.avg}%</span>
                        <span style={{ background:a.bg, color:a.c, padding:"2px 8px",
                          borderRadius:6, fontSize:11, fontWeight:800, minWidth:28, textAlign:"center" }}>{a.g}</span>
                        {a.fail > 0 && (
                          <span style={{ background:"#FEF2F2", color:"#DC2626", padding:"2px 8px",
                            borderRadius:6, fontSize:11, fontWeight:700, border:"1px solid #FECACA",
                            minWidth:52, textAlign:"center" }}>
                            {a.fail} fail
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Top performers */}
                  {reportRes?.data?.length > 0 && (
                    <div style={{ background:"#fff", borderRadius:13, padding:"18px 22px",
                      boxShadow:"0 1px 6px rgba(0,0,0,0.07)", marginBottom:14 }}>
                      <div style={{ fontWeight:800, fontSize:14, marginBottom:14 }}>🏆 Top Performers</div>
                      {[...reportRes.data]
                        .sort((a,b)=>(b.percentage||0)-(a.percentage||0))
                        .slice(0,5)
                        .map((row,i)=>{
                          const meta = apiGradeMeta(row.grade, row.percentage);
                          return (
                            <div key={row.student_id||i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                              <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0,
                                background:i===0?"#FCD34D":i===1?"#CBD5E1":i===2?"#FDBA74":"#F1F5F9",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:11, fontWeight:900, color:i<3?"#fff":"#94A3B8" }}>{i+1}</div>
                              <Avatar name={row.name||'?'} size={30}/>
                              <span style={{ flex:1, fontSize:13, fontWeight:700 }}>{row.name}</span>
                              <span style={{ background:meta.bg, color:meta.c, padding:"3px 12px",
                                borderRadius:7, fontSize:12, fontWeight:800 }}>{row.percentage}%</span>
                              <span style={{ background:meta.bg, color:meta.c, padding:"3px 10px",
                                borderRadius:7, fontSize:11, fontWeight:800, minWidth:32, textAlign:"center" }}>
                                {meta.g}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* At-risk students */}
                  {(()=>{
                    const atRisk = (reportRes?.data||[]).filter(r=>r.grade==='F');
                    if (!atRisk.length) return null;
                    // Build phone map from already-loaded students state (includes parents)
                    const phoneMap = {};
                    students.forEach(s=>{
                      if (s.parents?.[0]) phoneMap[s.id] = s.parents[0];
                    });
                    return (
                      <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:13, padding:"18px 22px" }}>
                        <div style={{ fontWeight:800, fontSize:14, color:"#DC2626", marginBottom:14 }}>
                          ⚠️ At-Risk Students — Failing in {curExam?.name}
                        </div>
                        {atRisk.map(row=>{
                          const parent = phoneMap[row.student_id];
                          return (
                            <div key={row.student_id} style={{ display:"flex", alignItems:"center", gap:12,
                              background:"#fff", borderRadius:10, padding:"12px 14px", marginBottom:8,
                              border:"1px solid #FECACA" }}>
                              <Avatar name={row.name||'?'} size={32}/>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:700, fontSize:13 }}>{row.name}</div>
                                <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>
                                  {row.percentage != null ? `${row.percentage}%` : '—'} overall · Grade {row.grade}
                                </div>
                              </div>
                              {parent?.phone && (
                                <button onClick={()=>{
                                  const msg = `Dear ${parent.name||'Parent'}, ${row.name} scored ${row.percentage}% in ${curExam?.name} and is at risk of failing. Please support their studies. — Vikashana`;
                                  openWA(parent.phone, msg);
                                  showToast(`Alert sent to ${parent.name||'parent'}`);
                                }}
                                  style={{ background:"#DCFCE7", color:"#16A34A", border:"1px solid #86EFAC",
                                    borderRadius:7, padding:"6px 14px", fontSize:11, fontWeight:700,
                                    cursor:"pointer", whiteSpace:"nowrap" }}>
                                  📱 Alert Parent
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Print modal */}
      {showPrint && rcStu && (
        <ReportCardPrintModal
          student={rcStu}
          examData={rcExamData}
          clsName={curClass?.name || ''}
          secName={curSection?.name || ''}
          academicYear={curYear?.name || ''}
          cgpa={rcCgpa}
          schoolName={school?.name}
          isMobile={isMobile}
          onClose={()=>setShowPrint(false)}
        />
      )}

      <Toast toast={toast}/>
    </div>
  );
}
