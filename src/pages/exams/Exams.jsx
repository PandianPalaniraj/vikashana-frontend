import { useState, useEffect, useCallback } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'
import useToast from '../../hooks/useToast'
import Toast from '../../components/ui/Toast'

// ── API helper ────────────────────────────────────────────────
const API = (path, opts = {}) => {
  const token = localStorage.getItem('token');
  return fetch(`/api/v1${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...opts.headers,
    },
    ...opts,
  }).then(r => r.json());
};

// ── Constants ────────────────────────────────────────────────
const EXAM_TYPES = ["Unit Test", "Mid Term", "Final", "Board", "Internal", "Other"];
const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
const DUR_OPTS   = [
  { val: 30,  label: "30 min" },
  { val: 60,  label: "1 Hour" },
  { val: 90,  label: "1.5 Hours" },
  { val: 120, label: "2 Hours" },
  { val: 150, label: "2.5 Hours" },
  { val: 180, label: "3 Hours" },
];
const fmtDur = m => DUR_OPTS.find(d => d.val === Number(m))?.label || (m ? `${m} min` : "—");

const EMPTY_FORM = {
  name: "", type: "Unit Test", academicYearId: "", classId: "",
  startDate: "", endDate: "", status: "Upcoming",
};
const EMPTY_SLOT = {
  subjectId: "", date: "", startTime: "09:00", durationMinutes: 120,
  maxMarks: "100", passMarks: "35", venue: "",
};

// ── Helpers ───────────────────────────────────────────────────
const fmtDate  = d => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtShort = d => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short" }) : "—";
const fmtTime  = t => t ? t.slice(0, 5) : "—";

const STATUS_META = {
  Upcoming:  { c:"#3B82F6", bg:"#EFF6FF", border:"#BFDBFE" },
  Ongoing:   { c:"#F59E0B", bg:"#FFFBEB", border:"#FCD34D" },
  Completed: { c:"#10B981", bg:"#ECFDF5", border:"#6EE7B7" },
};

// ── UI Atoms ──────────────────────────────────────────────────
function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.Upcoming;
  return (
    <span style={{ background:m.bg, color:m.c, border:`1px solid ${m.border}`,
      padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>
      {status}
    </span>
  );
}

function Field({ label, children, col }) {
  return (
    <div style={{ gridColumn: col || "auto" }}>
      <label style={{ fontSize:10, fontWeight:800, color:"#64748B", display:"block",
        marginBottom:5, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = {
  width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #E2E8F0",
  fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit",
  background:"#fff", color:"#1A202C", transition:"border-color 0.15s",
};

// ── Admit Card Print Modal ─────────────────────────────────────
function AdmitCardModal({ exam, student, school, onClose, isMobile }) {
  const handlePrint = () => {
    const el  = document.getElementById("admit-card-print");
    const win = window.open("", "_blank", "width=500,height=700");
    win.document.write(`<html><head><title>Admit Card</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;padding:20px;background:#fff;}
      @media print{@page{size:A5;margin:10mm;}}</style></head>
      <body>${el.innerHTML}
      <script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    win.document.close();
  };

  const schoolName    = school?.name    || "School";
  const schoolAddress = school?.address || "";
  const schoolPhone   = school?.phone   || "";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000,
      display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:isMobile ? 'calc(100vw - 24px)' : 520,
        boxShadow:"0 24px 60px rgba(0,0,0,0.3)", marginTop:"auto", marginBottom:"auto", flexShrink:0 }}>

        <div style={{ background:"linear-gradient(135deg,#1E3A5F,#1D4ED8)", padding:"16px 22px",
          borderRadius:"20px 20px 0 0", display:"flex", alignItems:"center", justifyContent:"space-between", color:"#fff" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>🎫 Admit Card Preview</div>
            <div style={{ fontSize:11, opacity:0.65, marginTop:2 }}>{exam.name}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.12)", border:"none",
            borderRadius:8, color:"#fff", width:30, height:30, fontSize:16, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>✕</button>
        </div>

        <div style={{ padding:isMobile ? 12 : 24, background:"#F0F4F8", overflowX:"auto" }}>
          <div id="admit-card-print">
            <div style={{ border:"2px solid #1E3A5F", borderRadius:12, overflow:"hidden",
              fontFamily:"'Segoe UI',sans-serif", background:"#fff", minWidth:460 }}>

              <div style={{ background:"linear-gradient(135deg,#0F172A,#1E3A5F,#1D4ED8)",
                padding:"16px 20px", color:"#fff", textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:900, letterSpacing:0.5 }}>{schoolName}</div>
                <div style={{ fontSize:10, opacity:0.7, marginTop:2 }}>{schoolAddress}{schoolPhone ? ` · ${schoolPhone}` : ""}</div>
                <div style={{ marginTop:10, background:"rgba(255,255,255,0.15)", borderRadius:6,
                  padding:"5px 14px", display:"inline-block", fontSize:13, fontWeight:800,
                  letterSpacing:1, textTransform:"uppercase" }}>
                  Hall Ticket / Admit Card
                </div>
              </div>

              <div style={{ background:"#EFF6FF", padding:"10px 20px", display:"flex",
                justifyContent:"space-between", borderBottom:"1px solid #BFDBFE" }}>
                <div>
                  <div style={{ fontSize:9, color:"#64748B", fontWeight:800, textTransform:"uppercase" }}>Examination</div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#1E3A5F" }}>{exam.name}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, color:"#64748B", fontWeight:800, textTransform:"uppercase" }}>Academic Year</div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#1E3A5F" }}>{exam.academic_year?.name || "—"}</div>
                </div>
              </div>

              <div style={{ padding:"16px 20px", display:"flex", gap:16, borderBottom:"1px solid #F1F5F9" }}>
                <div style={{ width:70, height:80, background:"#EFF6FF", borderRadius:8,
                  border:"1px solid #BFDBFE", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:28, flexShrink:0, color:"#1D4ED8" }}>👤</div>
                <div style={{ flex:1 }}>
                  {[
                    ["Student Name", student.name],
                    ["Roll / Adm No", student.admission_no || student.id],
                    ["Class",         `${exam.class?.name || "—"} – ${student.section?.name || "—"}`],
                    ["Date of Birth", fmtDate(student.dob)],
                    ["Guardian",      student.guardian || "—"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:"flex", gap:8, marginBottom:5 }}>
                      <span style={{ fontSize:10, fontWeight:800, color:"#94A3B8",
                        textTransform:"uppercase", minWidth:90, flexShrink:0 }}>{k}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:"#1A202C" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding:"14px 20px" }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#64748B",
                  textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>
                  Examination Schedule
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ background:"#F8FAFC" }}>
                      {["Date","Subject","Time","Duration","Room"].map(h => (
                        <th key={h} style={{ padding:"6px 8px", textAlign:"left",
                          fontSize:9, fontWeight:800, color:"#64748B",
                          textTransform:"uppercase", borderBottom:"1px solid #E2E8F0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(exam.timetable || []).map((row, i) => (
                      <tr key={i} style={{ borderBottom:"1px solid #F1F5F9", background:i%2===0?"#fff":"#FAFBFC" }}>
                        <td style={{ padding:"6px 8px", fontWeight:700 }}>{fmtShort(row.date)}</td>
                        <td style={{ padding:"6px 8px", fontWeight:700, color:"#1E3A5F" }}>{row.subject}</td>
                        <td style={{ padding:"6px 8px" }}>{fmtTime(row.start_time)}</td>
                        <td style={{ padding:"6px 8px" }}>{fmtDur(row.duration_minutes)}</td>
                        <td style={{ padding:"6px 8px", fontWeight:600, color:"#6366F1" }}>{row.venue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding:"0 20px 14px" }}>
                <div style={{ background:"#FFFBEB", border:"1px solid #FCD34D", borderRadius:8, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#D97706", marginBottom:6 }}>📋 INSTRUCTIONS</div>
                  <div style={{ fontSize:10, color:"#92400E", lineHeight:1.6 }}>
                    1. Bring this admit card to every exam session.<br/>
                    2. Arrive 15 minutes before the exam time.<br/>
                    3. Mobile phones are not allowed in the exam hall.<br/>
                    4. Bring your own stationery (pens, pencils, ruler).
                  </div>
                </div>
              </div>

              <div style={{ padding:"10px 20px 16px", display:"flex", justifyContent:"space-between" }}>
                {["Student Signature","Class Teacher","Principal"].map(s => (
                  <div key={s} style={{ textAlign:"center" }}>
                    <div style={{ width:100, borderBottom:"1px solid #CBD5E1", marginBottom:4, height:28 }}/>
                    <div style={{ fontSize:9, color:"#64748B", fontWeight:700 }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:"0 24px 24px", display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:"#F1F5F9", color:"#64748B",
            border:"none", borderRadius:10, padding:11, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Close
          </button>
          <button onClick={handlePrint} style={{ flex:2, background:"linear-gradient(135deg,#0F172A,#1D4ED8)",
            color:"#fff", border:"none", borderRadius:10, padding:11, fontSize:13,
            fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(29,78,216,0.35)" }}>
            🖨️ Print Admit Card
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Timetable Print Modal ─────────────────────────────────────
function TimetableModal({ exam, school, onClose, isMobile }) {
  const handlePrint = () => {
    const el  = document.getElementById("tt-print");
    const win = window.open("", "_blank", "width=700,height=500");
    win.document.write(`<html><head><title>Timetable</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;padding:20px;}
      table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px 10px;font-size:12px;}
      th{background:#1E3A5F;color:#fff;font-weight:800;}
      @media print{@page{size:A4 landscape;margin:10mm;}}</style></head>
      <body>${el.innerHTML}
      <script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    win.document.close();
  };

  const schoolName = school?.name || "School";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000,
      display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:isMobile ? 'calc(100vw - 24px)' : 620,
        boxShadow:"0 24px 60px rgba(0,0,0,0.3)", marginTop:"auto", marginBottom:"auto", flexShrink:0 }}>

        <div style={{ background:"linear-gradient(135deg,#1E3A5F,#1D4ED8)", padding:"16px 22px",
          borderRadius:"20px 20px 0 0", display:"flex", alignItems:"center", justifyContent:"space-between", color:"#fff" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>📅 Exam Timetable</div>
            <div style={{ fontSize:11, opacity:0.65, marginTop:2 }}>{exam.name}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.12)", border:"none",
            borderRadius:8, color:"#fff", width:30, height:30, fontSize:16, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>✕</button>
        </div>

        <div style={{ padding:isMobile ? 12 : 24, background:"#F0F4F8" }}>
          <div id="tt-print" style={{ overflowX:"auto" }}>
            <div style={{ fontFamily:"'Segoe UI',sans-serif", background:"#fff",
              borderRadius:12, border:"1px solid #E2E8F0", minWidth:520 }}>
              <div style={{ background:"#0F172A", padding:"16px 20px", color:"#fff", textAlign:"center" }}>
                <div style={{ fontSize:16, fontWeight:900 }}>{schoolName}</div>
                <div style={{ fontSize:11, opacity:0.6, marginTop:2 }}>
                  {exam.name} · {exam.academic_year?.name || ""}
                </div>
                <div style={{ fontSize:10, opacity:0.5, marginTop:1 }}>
                  {fmtDate(exam.start_date)} — {fmtDate(exam.end_date)}
                </div>
              </div>
              <div style={{ padding:"10px 20px", background:"#EFF6FF", display:"flex",
                gap:8, alignItems:"center", borderBottom:"1px solid #BFDBFE" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#64748B" }}>Class:</span>
                <span style={{ background:"#1D4ED8", color:"#fff", padding:"2px 10px",
                  borderRadius:12, fontSize:11, fontWeight:700 }}>{exam.class?.name || "—"}</span>
                <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:"#6366F1" }}>
                  {exam.timetable?.length || 0} Subjects
                </span>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse", margin:0, minWidth:520 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                    {["Date","Day","Subject","Time","Duration","Venue/Room"].map(h => (
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:10,
                        fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.6 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(exam.timetable || []).map((row, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #F1F5F9", background:i%2===0?"#fff":"#FAFBFC" }}>
                      <td style={{ padding:"11px 14px", fontWeight:700, fontSize:13 }}>{fmtShort(row.date)}</td>
                      <td style={{ padding:"11px 14px", fontSize:12, color:"#64748B" }}>
                        {row.date ? new Date(row.date).toLocaleDateString("en-IN", { weekday:"short" }) : "—"}
                      </td>
                      <td style={{ padding:"11px 14px", fontWeight:800, fontSize:13, color:"#1E3A5F" }}>{row.subject}</td>
                      <td style={{ padding:"11px 14px", fontSize:12 }}>{fmtTime(row.start_time)}</td>
                      <td style={{ padding:"11px 14px", fontSize:12 }}>{fmtDur(row.duration_minutes)}</td>
                      <td style={{ padding:"11px 14px" }}>
                        <span style={{ background:"#EEF2FF", color:"#6366F1", padding:"3px 10px",
                          borderRadius:6, fontSize:12, fontWeight:700 }}>{row.venue || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding:"10px 20px", background:"#F8FAFC", fontSize:10, color:"#94A3B8" }}>
                Generated by Vikashana
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:"12px 24px 20px", display:"flex", gap:10, borderTop:"1px solid #F1F5F9" }}>
          <button onClick={onClose} style={{ flex:1, background:"#F1F5F9", color:"#64748B",
            border:"none", borderRadius:10, padding:11, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Close
          </button>
          <button onClick={handlePrint} style={{ flex:2, background:"linear-gradient(135deg,#0F172A,#1D4ED8)",
            color:"#fff", border:"none", borderRadius:10, padding:11, fontSize:13, fontWeight:700,
            cursor:"pointer", boxShadow:"0 4px 12px rgba(29,78,216,0.35)" }}>
            🖨️ Print Timetable
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN EXAMS COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Exams() {
  const bp       = useBreakpoint();
  const isMobile = bp === 'mobile';
  const [toast, showToast] = useToast();

  // ── Core state ────────────────────────────────────────────
  const [exams, setExams]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [classes, setClasses]           = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects]         = useState([]);
  const [school, setSchool]             = useState(null);
  const [detailSubjects, setDetailSubjects] = useState([]);

  // ── View state ────────────────────────────────────────────
  const [view, setView]           = useState("list");   // list | create | detail
  const [selExam, setSelExam]     = useState(null);     // full exam detail object
  const [detailTab, setDetailTab] = useState("schedule"); // schedule | marks | results
  const [showTT, setShowTT]       = useState(false);
  const [admitStu, setAdmitStu]   = useState(null);

  // ── Create/Edit form ──────────────────────────────────────
  const [form, setForm]         = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [editModal, setEditModal]   = useState(null); // exam to edit

  // ── Timetable slot builder ────────────────────────────────
  const [ttSlot, setTtSlot]         = useState(EMPTY_SLOT);
  const [ttSaving, setTtSaving]     = useState(false);

  // ── Marks entry ───────────────────────────────────────────
  const [marksData, setMarksData]       = useState(null); // { subjects:[], students:[] }
  const [marksGrid, setMarksGrid]       = useState({});   // { examSubjectId: { studentId: value } }
  const [marksSaving, setMarksSaving]   = useState(false);
  const [marksLoading, setMarksLoading] = useState(false);

  // ── Results ───────────────────────────────────────────────
  const [report, setReport]           = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // ── Delete confirm ────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fc = useCallback((field, val) => setForm(f => ({ ...f, [field]: val })), []);
  const tc = useCallback((field, val) => setTtSlot(r => ({ ...r, [field]: val })), []);

  // ── Load on mount ─────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      API('/exams'),
      API('/classes'),
      API('/academic-years'),
      API('/settings'),
    ]).then(([examsRes, classesRes, yearsRes, settingsRes]) => {
      if (examsRes.success)   setExams(examsRes.data);
      if (classesRes.success) setClasses(classesRes.data);
      if (yearsRes.success)   setAcademicYears(yearsRes.data);
      if (settingsRes.success) setSchool(settingsRes.data?.school || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Load subjects when form class changes ─────────────────
  useEffect(() => {
    if (!form.classId) { setSubjects([]); return; }
    API(`/subjects?class_id=${form.classId}`).then(r => {
      if (r.success) setSubjects(r.data);
    });
  }, [form.classId]);

  // Load subjects for timetable slot builder when exam detail changes
  useEffect(() => {
    const classId = selExam?.class?.id;
    if (!classId) { setDetailSubjects([]); return; }
    API(`/subjects?class_id=${classId}`).then(r => {
      if (r.success) setDetailSubjects(r.data);
    });
  }, [selExam?.id]); // depend on exam ID so it re-fires on every exam change

  // ── Load marks when tab switches ──────────────────────────
  useEffect(() => {
    if (detailTab === 'marks' && selExam && !marksData) {
      setMarksLoading(true);
      API(`/exams/${selExam.id}/marks`).then(r => {
        if (r.success) {
          setMarksData(r);
          // Build initial grid from existing marks
          const grid = {};
          r.subjects.forEach(sub => {
            grid[sub.id] = {};
            r.students.forEach(stu => {
              grid[sub.id][stu.id] = stu.marks[sub.id]?.marks_obtained ?? '';
            });
          });
          setMarksGrid(grid);
        }
      }).catch(() => {}).finally(() => setMarksLoading(false));
    }
  }, [detailTab, selExam?.id]);

  // ── Load report when tab switches ────────────────────────
  useEffect(() => {
    if (detailTab === 'results' && selExam && !report) {
      setReportLoading(true);
      API(`/exams/${selExam.id}/report`).then(r => {
        if (r.success) setReport(r);
      }).catch(() => {}).finally(() => setReportLoading(false));
    }
  }, [detailTab, selExam?.id]);

  // ── Helpers ───────────────────────────────────────────────
  const reloadExamDetail = (examId) => {
    API(`/exams/${examId}`).then(r => {
      if (r.success) setSelExam(r.data);
    });
  };

  // ── Widgets ───────────────────────────────────────────────
  const widgets = [
    { icon:"📋", label:"Total Exams",  value:exams.length,                                   c:"#6366F1", bg:"#EEF2FF", sub:"All classes" },
    { icon:"⏳", label:"Upcoming",      value:exams.filter(e=>e.status==="Upcoming").length,  c:"#3B82F6", bg:"#EFF6FF", sub:"Scheduled"   },
    { icon:"🔴", label:"Ongoing",       value:exams.filter(e=>e.status==="Ongoing").length,   c:"#F59E0B", bg:"#FFFBEB", sub:"In progress"  },
    { icon:"✅", label:"Completed",     value:exams.filter(e=>e.status==="Completed").length, c:"#10B981", bg:"#ECFDF5", sub:"This year"     },
  ];

  // ── Create exam ───────────────────────────────────────────
  const saveExam = async () => {
    if (!form.name || !form.classId || !form.academicYearId) {
      showToast("Fill Name, Class and Academic Year", "error"); return;
    }
    setFormSaving(true);
    try {
      const r = await API('/exams', {
        method: 'POST',
        body: JSON.stringify({
          name:             form.name,
          type:             form.type,
          academic_year_id: form.academicYearId,
          class_id:         form.classId,
          start_date:       form.startDate || null,
          end_date:         form.endDate   || null,
        }),
      });
      if (!r.success) { showToast(r.message || "Failed", "error"); return; }
      setExams(prev => [r.data, ...prev]);
      showToast(`${r.data.name} created!`);
      setForm(EMPTY_FORM);
      setView("list");
    } catch { showToast("Network error", "error"); }
    finally { setFormSaving(false); }
  };

  // ── Edit exam ─────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editModal?.name) { showToast("Name required", "error"); return; }
    const r = await API(`/exams/${editModal.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name:       editModal.name,
        type:       editModal.type,
        start_date: editModal.start_date || null,
        end_date:   editModal.end_date   || null,
        status:     editModal.status,
      }),
    });
    if (!r.success) { showToast(r.message || "Failed", "error"); return; }
    setExams(prev => prev.map(e => e.id === r.data.id ? { ...e, ...r.data } : e));
    if (selExam?.id === r.data.id) setSelExam(r.data);
    setEditModal(null);
    showToast("Exam updated");
  };

  // ── Delete exam ───────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const r = await API(`/exams/${deleteTarget.id}`, { method: 'DELETE' });
    if (!r.success) { showToast(r.message || "Failed", "error"); setDeleteTarget(null); return; }
    setExams(prev => prev.filter(e => e.id !== deleteTarget.id));
    if (selExam?.id === deleteTarget.id) { setSelExam(null); setView("list"); }
    setDeleteTarget(null);
    showToast("Exam deleted");
  };

  // ── Add timetable slot ────────────────────────────────────
  const addSlot = async () => {
    if (!ttSlot.subjectId) { showToast("Select a subject", "error"); return; }
    if (!selExam) return;
    setTtSaving(true);
    try {
      const r = await API(`/exams/${selExam.id}/timetable`, {
        method: 'POST',
        body: JSON.stringify({
          subject_id:       ttSlot.subjectId,
          date:             ttSlot.date || null,
          start_time:       ttSlot.startTime,
          duration_minutes: Number(ttSlot.durationMinutes),
          max_marks:        Number(ttSlot.maxMarks),
          pass_marks:       Number(ttSlot.passMarks),
          venue:            ttSlot.venue,
        }),
      });
      if (!r.success) { showToast(r.message || "Failed", "error"); return; }
      setSelExam(prev => ({ ...prev, timetable: [...(prev.timetable||[]), r.data], subjects_count: (prev.subjects_count||0)+1 }));
      setExams(prev => prev.map(e => e.id === selExam.id ? { ...e, subjects_count: (e.subjects_count||0)+1 } : e));
      setTtSlot(EMPTY_SLOT);
      showToast("Subject added");
      // Reset marks/report cache
      setMarksData(null); setReport(null);
    } catch { showToast("Network error", "error"); }
    finally { setTtSaving(false); }
  };

  // ── Delete timetable slot ─────────────────────────────────
  const deleteSlot = async (slotId) => {
    const r = await API(`/exams/${selExam.id}/timetable/${slotId}`, { method: 'DELETE' });
    if (!r.success) { showToast(r.message || "Failed", "error"); return; }
    setSelExam(prev => ({
      ...prev,
      timetable: (prev.timetable||[]).filter(s => s.id !== slotId),
      subjects_count: Math.max(0, (prev.subjects_count||1)-1),
    }));
    setExams(prev => prev.map(e => e.id === selExam.id ? { ...e, subjects_count: Math.max(0,(e.subjects_count||1)-1) } : e));
    showToast("Subject removed");
    setMarksData(null); setReport(null);
  };

  // ── Save marks ────────────────────────────────────────────
  const saveMarks = async () => {
    if (!marksData || !selExam) return;
    setMarksSaving(true);
    const payload = [];
    marksData.subjects.forEach(sub => {
      marksData.students.forEach(stu => {
        const val = marksGrid[sub.id]?.[stu.id];
        payload.push({
          student_id:      stu.id,
          exam_subject_id: sub.id,
          marks_obtained:  val !== '' && val !== undefined ? Number(val) : null,
        });
      });
    });
    try {
      const r = await API(`/exams/${selExam.id}/marks`, {
        method: 'POST',
        body: JSON.stringify({ marks: payload }),
      });
      if (r.success) { showToast("Marks saved"); setReport(null); }
      else showToast(r.message || "Failed", "error");
    } catch { showToast("Network error", "error"); }
    finally { setMarksSaving(false); }
  };

  // ─────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ─────────────────────────────────────────────────────────
  if (view === "detail" && selExam) {
    const ex = selExam;
    return (
      <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>

        {/* Header row */}
        <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={() => { setView("list"); setSelExam(null); setDetailTab("schedule"); setMarksData(null); setReport(null); }}
            style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:8, padding:"8px 16px",
              fontSize:13, cursor:"pointer", fontWeight:600, color:"#475569" }}>
            ← Back
          </button>
          <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={() => setEditModal({ ...ex })}
              style={{ background:"#F8FAFC", color:"#475569", border:"1px solid #E2E8F0",
                borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer", fontWeight:600 }}>
              ✏️ Edit
            </button>
            <button onClick={() => setShowTT(true)}
              style={{ background:"#EFF6FF", color:"#1D4ED8", border:"1px solid #BFDBFE",
                borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:700 }}>
              📅 Print Timetable
            </button>
            <button onClick={() => setDeleteTarget(ex)}
              style={{ background:"#FEF2F2", color:"#EF4444", border:"1px solid #FCA5A5",
                borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer", fontWeight:700 }}>
              🗑 Delete
            </button>
          </div>
        </div>

        {/* Exam header */}
        <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 8px rgba(0,0,0,0.08)", overflow:"hidden", marginBottom:16 }}>
          <div style={{ background:"linear-gradient(135deg,#0F172A,#1E3A5F,#1D4ED8)",
            padding:"22px 28px", color:"#fff", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{ width:52, height:52, background:"rgba(255,255,255,0.12)",
              borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>📝</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:900, fontSize:18 }}>{ex.name}</div>
              <div style={{ opacity:0.65, fontSize:12, marginTop:4 }}>
                {ex.type} · {ex.academic_year?.name} · {ex.class?.name} · {fmtDate(ex.start_date)} — {fmtDate(ex.end_date)}
              </div>
            </div>
            <Badge status={ex.status}/>
          </div>
          <div style={{ padding:16, display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:10 }}>
            {[
              ["Type",      ex.type],
              ["Class",     ex.class?.name || "—"],
              ["Year",      ex.academic_year?.name || "—"],
              ["Subjects",  ex.timetable?.length || 0],
            ].map(([k,v]) => (
              <div key={k} style={{ background:"#F8FAFC", borderRadius:10, padding:"10px 14px", border:"1px solid #F1F5F9" }}>
                <div style={{ fontSize:9, color:"#94A3B8", fontWeight:800, textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>{k}</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#1A202C" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Tabs */}
        <div style={{ display:"flex", gap:6, background:"#E2E8F0", borderRadius:10, padding:4, marginBottom:16, alignSelf:"flex-start", width:"fit-content" }}>
          {[["schedule","📅 Schedule"],["marks","✏️ Marks Entry"],["results","📊 Results"]].map(([v,l]) => (
            <button key={v} onClick={() => setDetailTab(v)}
              style={{ padding:"7px 16px", borderRadius:7, border:"none", cursor:"pointer",
                fontSize:12, fontWeight:700, transition:"all 0.18s",
                background:detailTab===v?"#fff":"transparent",
                color:detailTab===v?"#6366F1":"#64748B",
                boxShadow:detailTab===v?"0 1px 6px rgba(0,0,0,0.1)":"none" }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── Schedule tab ── */}
        {detailTab === "schedule" && (
          <div style={{ display:"grid", gap:16, gridTemplateColumns:isMobile?"1fr":"1fr 1fr" }}>

            {/* Timetable table */}
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden" }}>
              <div style={{ padding:"14px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontWeight:800, fontSize:14, color:"#0F172A" }}>📅 Exam Schedule</div>
                <span style={{ fontSize:12, color:"#94A3B8" }}>{ex.timetable?.length || 0} subjects</span>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:480 }}>
                  <thead>
                    <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                      {["Date","Subject","Time","Duration","Venue","Max",""].map(h => (
                        <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontSize:10,
                          fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(ex.timetable || []).length === 0 ? (
                      <tr><td colSpan={7} style={{ padding:"24px", textAlign:"center", color:"#CBD5E1", fontSize:13 }}>
                        No subjects added yet. Use the form to add.
                      </td></tr>
                    ) : (ex.timetable || []).map((row, i) => (
                      <tr key={row.id} style={{ borderBottom:"1px solid #F1F5F9" }}
                        onMouseEnter={e => e.currentTarget.style.background="#FAFBFC"}
                        onMouseLeave={e => e.currentTarget.style.background=""}>
                        <td style={{ padding:"10px 12px", fontWeight:700, fontSize:13 }}>{fmtShort(row.date)}</td>
                        <td style={{ padding:"10px 12px", fontWeight:800, color:"#1E3A5F", fontSize:13 }}>{row.subject}</td>
                        <td style={{ padding:"10px 12px", fontSize:12 }}>{fmtTime(row.start_time)}</td>
                        <td style={{ padding:"10px 12px", fontSize:12 }}>{fmtDur(row.duration_minutes)}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ background:"#EEF2FF", color:"#6366F1", padding:"2px 8px",
                            borderRadius:6, fontSize:11, fontWeight:700 }}>{row.venue || "—"}</span>
                        </td>
                        <td style={{ padding:"10px 12px", fontSize:12, fontWeight:700 }}>{row.max_marks}</td>
                        <td style={{ padding:"10px 8px" }}>
                          <button onClick={() => deleteSlot(row.id)}
                            style={{ background:"#FEF2F2", color:"#EF4444", border:"none",
                              borderRadius:5, padding:"3px 8px", fontSize:11, cursor:"pointer", fontWeight:700 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Admit card section */}
              {(ex.timetable || []).length > 0 && (
                <div style={{ padding:"14px 20px", borderTop:"1px solid #F1F5F9", background:"#F8FAFC" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>
                    Generate Admit Card
                  </div>
                  <AdmitCardStudentList examId={ex.id} schoolId={ex.class?.id} setAdmitStu={setAdmitStu} showToast={showToast}/>
                </div>
              )}
            </div>

            {/* Add slot form */}
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", padding:20 }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#0F172A", marginBottom:16,
                paddingBottom:12, borderBottom:"1px solid #F1F5F9" }}>➕ Add Subject to Schedule</div>
              <div style={{ display:"grid", gap:12 }}>
                <Field label="Subject *">
                  <select value={ttSlot.subjectId} onChange={e => tc("subjectId", e.target.value)} style={inp}>
                    <option value="">— Select Subject —</option>
                    {detailSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Field label="Date">
                    <input type="date" value={ttSlot.date} onChange={e => tc("date", e.target.value)} style={inp}/>
                  </Field>
                  <Field label="Start Time">
                    <select value={ttSlot.startTime} onChange={e => tc("startTime", e.target.value)} style={inp}>
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Duration">
                    <select value={ttSlot.durationMinutes} onChange={e => tc("durationMinutes", e.target.value)} style={inp}>
                      {DUR_OPTS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Max Marks">
                    <input type="number" value={ttSlot.maxMarks} onChange={e => tc("maxMarks", e.target.value)} style={inp}/>
                  </Field>
                  <Field label="Pass Marks">
                    <input type="number" value={ttSlot.passMarks} onChange={e => tc("passMarks", e.target.value)} style={inp}/>
                  </Field>
                  <Field label="Venue / Room">
                    <input value={ttSlot.venue} onChange={e => tc("venue", e.target.value)}
                      placeholder="e.g. Hall A" style={inp}/>
                  </Field>
                </div>
                <button onClick={addSlot} disabled={ttSaving}
                  style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff",
                    border:"none", borderRadius:10, padding:"10px", fontSize:13, fontWeight:700,
                    cursor:"pointer", opacity:ttSaving?0.6:1 }}>
                  {ttSaving ? "Adding…" : "+ Add Subject"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Marks Entry tab ── */}
        {detailTab === "marks" && (
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden" }}>
            <div style={{ padding:"14px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#0F172A" }}>✏️ Marks Entry</div>
              {marksData && (
                <button onClick={saveMarks} disabled={marksSaving}
                  style={{ background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff",
                    border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:700,
                    cursor:"pointer", opacity:marksSaving?0.6:1 }}>
                  {marksSaving ? "Saving…" : "💾 Save Marks"}
                </button>
              )}
            </div>
            {marksLoading ? (
              <div style={{ padding:40, textAlign:"center", color:"#94A3B8" }}>Loading marks data…</div>
            ) : !marksData ? (
              <div style={{ padding:40, textAlign:"center", color:"#94A3B8" }}>No data available. Add subjects to the schedule first.</div>
            ) : marksData.subjects.length === 0 ? (
              <div style={{ padding:40, textAlign:"center", color:"#94A3B8" }}>No subjects in schedule yet. Add subjects from the Schedule tab.</div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
                  <thead>
                    <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                      <th style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", minWidth:160 }}>
                        Student
                      </th>
                      {marksData.subjects.map(sub => (
                        <th key={sub.id} style={{ padding:"10px 12px", textAlign:"center", fontSize:11,
                          fontWeight:800, color:"#64748B", textTransform:"uppercase", minWidth:100 }}>
                          {sub.subject}
                          <div style={{ fontSize:9, fontWeight:600, color:"#94A3B8" }}>/{sub.max_marks}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {marksData.students.map((stu, si) => (
                      <tr key={stu.id} style={{ borderBottom:"1px solid #F1F5F9",
                        background:si%2===0?"#fff":"#FAFBFC" }}>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ fontWeight:700, fontSize:13, color:"#0F172A" }}>{stu.name}</div>
                          <div style={{ fontSize:10, color:"#94A3B8" }}>{stu.admission_no}</div>
                        </td>
                        {marksData.subjects.map(sub => (
                          <td key={sub.id} style={{ padding:"8px 10px", textAlign:"center" }}>
                            <input
                              type="number"
                              min="0"
                              max={sub.max_marks}
                              value={marksGrid[sub.id]?.[stu.id] ?? ''}
                              onChange={e => setMarksGrid(prev => ({
                                ...prev,
                                [sub.id]: { ...(prev[sub.id]||{}), [stu.id]: e.target.value }
                              }))}
                              style={{ width:70, padding:"6px 8px", borderRadius:6,
                                border:"1.5px solid #E2E8F0", fontSize:13, textAlign:"center",
                                outline:"none", fontFamily:"inherit" }}
                              onFocus={e => e.target.style.borderColor="#6366F1"}
                              onBlur={e => e.target.style.borderColor="#E2E8F0"}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Results tab ── */}
        {detailTab === "results" && (
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden" }}>
            <div style={{ padding:"14px 20px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#0F172A" }}>📊 Results / Report</div>
              {report && <span style={{ fontSize:12, color:"#94A3B8" }}>Total Max: {report.total_max} marks</span>}
            </div>
            {reportLoading ? (
              <div style={{ padding:40, textAlign:"center", color:"#94A3B8" }}>Loading results…</div>
            ) : !report ? (
              <div style={{ padding:40, textAlign:"center", color:"#94A3B8" }}>No results data available.</div>
            ) : report.data.length === 0 ? (
              <div style={{ padding:40, textAlign:"center", color:"#94A3B8" }}>No marks entered yet.</div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
                  <thead>
                    <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                      {["Rank","Student","Adm No","Total Marks","Percentage","Grade"].map(h => (
                        <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:10,
                          fontWeight:800, color:"#64748B", textTransform:"uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.map((row, i) => (
                      <tr key={row.student_id} style={{ borderBottom:"1px solid #F1F5F9",
                        background:i%2===0?"#fff":"#FAFBFC" }}>
                        <td style={{ padding:"11px 14px" }}>
                          <span style={{ background:row.rank<=3?"#FEF3C7":"#F1F5F9",
                            color:row.rank<=3?"#D97706":"#64748B", borderRadius:20,
                            padding:"2px 10px", fontWeight:800, fontSize:12 }}>#{row.rank}</span>
                        </td>
                        <td style={{ padding:"11px 14px", fontWeight:700, fontSize:13, color:"#0F172A" }}>{row.name}</td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:"#64748B" }}>{row.admission_no}</td>
                        <td style={{ padding:"11px 14px", fontSize:13, fontWeight:700 }}>
                          {row.total_marks} / {row.max_marks}
                        </td>
                        <td style={{ padding:"11px 14px" }}>
                          <span style={{ fontWeight:800, fontSize:13,
                            color: row.percentage >= 75 ? "#10B981" : row.percentage >= 35 ? "#F59E0B" : "#EF4444" }}>
                            {row.percentage !== null ? `${row.percentage}%` : "—"}
                          </span>
                        </td>
                        <td style={{ padding:"11px 14px" }}>
                          <span style={{ background:"#EEF2FF", color:"#6366F1", padding:"3px 10px",
                            borderRadius:8, fontSize:12, fontWeight:800 }}>{row.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showTT && <TimetableModal exam={ex} school={school} onClose={() => setShowTT(false)} isMobile={isMobile}/>}
        {admitStu && <AdmitCardModal exam={ex} student={admitStu} school={school} onClose={() => setAdmitStu(null)} isMobile={isMobile}/>}
        {editModal && <EditExamModal exam={editModal} setExam={setEditModal} onSave={saveEdit} onClose={() => setEditModal(null)}/>}
        {deleteTarget && (
          <ConfirmModal
            message={`Delete "${deleteTarget.name}"? All marks and subjects will be removed.`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
        <Toast toast={toast}/>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // CREATE VIEW
  // ─────────────────────────────────────────────────────────
  if (view === "create") return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:18, color:"#0F172A" }}>Create New Exam</div>
          <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>Set up exam details</div>
        </div>
        <button onClick={() => setView("list")} style={{ background:"#F1F5F9", border:"none",
          borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:600, color:"#475569" }}>
          Cancel
        </button>
      </div>

      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", padding:24, maxWidth:640 }}>
        <div style={{ fontWeight:800, fontSize:14, color:"#0F172A", marginBottom:18,
          paddingBottom:12, borderBottom:"1px solid #F1F5F9" }}>📝 Exam Details</div>
        <div style={{ display:"grid", gap:14 }}>
          <Field label="Exam Name *">
            <input value={form.name} onChange={e => fc("name", e.target.value)}
              placeholder="e.g. Unit Test 1 – Class 8"
              onFocus={e => e.target.style.borderColor="#6366F1"}
              onBlur={e => e.target.style.borderColor="#E2E8F0"}
              style={inp}/>
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12 }}>
            <Field label="Exam Type *">
              <select value={form.type} onChange={e => fc("type", e.target.value)} style={inp}>
                {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Class *">
              <select value={form.classId} onChange={e => fc("classId", e.target.value)} style={inp}>
                <option value="">— Select Class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Academic Year *">
              <select value={form.academicYearId} onChange={e => fc("academicYearId", e.target.value)} style={inp}>
                <option value="">— Select Year —</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" value={form.startDate} onChange={e => fc("startDate", e.target.value)} style={inp}/>
            </Field>
            <Field label="End Date">
              <input type="date" value={form.endDate} onChange={e => fc("endDate", e.target.value)} style={inp}/>
            </Field>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
        <button onClick={() => setView("list")} style={{ background:"#F1F5F9", border:"none",
          borderRadius:10, padding:"11px 28px", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569" }}>
          Cancel
        </button>
        <button onClick={saveExam} disabled={formSaving}
          style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff",
            border:"none", borderRadius:10, padding:"11px 32px", fontSize:13, fontWeight:700,
            cursor:"pointer", boxShadow:"0 4px 12px rgba(99,102,241,0.35)", opacity:formSaving?0.6:1 }}>
          {formSaving ? "Creating…" : "✓ Create Exam"}
        </button>
      </div>
      <Toast toast={toast}/>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>

      {/* Widgets */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        {widgets.map(w => (
          <div key={w.label} style={{ background:"#fff", borderRadius:14, padding:"18px 20px",
            boxShadow:"0 1px 8px rgba(0,0,0,0.07)", display:"flex", alignItems:"center", gap:14,
            border:`1px solid ${w.c}18`, transition:"transform 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform=""}>
            <div style={{ width:isMobile?42:52, height:isMobile?42:52, background:w.bg, borderRadius:14, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:isMobile?22:26 }}>{w.icon}</div>
            <div>
              <div style={{ fontSize:isMobile?22:28, fontWeight:900, color:w.c, lineHeight:1 }}>{w.value}</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginTop:2 }}>{w.label}</div>
              <div style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>{w.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div style={{ fontWeight:900, fontSize:16, color:"#0F172A" }}>All Exams</div>
        <button onClick={() => setView("create")}
          style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff", border:"none",
            borderRadius:10, padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer",
            boxShadow:"0 4px 12px rgba(99,102,241,0.35)" }}>
          + Create Exam
        </button>
      </div>

      {/* Exams list */}
      {loading ? (
        <div style={{ textAlign:"center", padding:48, color:"#94A3B8" }}>Loading exams…</div>
      ) : exams.length === 0 ? (
        <div style={{ textAlign:"center", padding:48, color:"#94A3B8" }}>
          <div style={{ fontSize:40 }}>📝</div>
          <div style={{ marginTop:12, fontWeight:700 }}>No exams yet</div>
          <div style={{ fontSize:12, marginTop:4 }}>Click "+ Create Exam" to get started</div>
        </div>
      ) : (
        <div style={{ display:"grid", gap:12 }}>
          {exams.map(ex => (
            <div key={ex.id} style={{ background:"#fff", borderRadius:14,
              boxShadow:"0 1px 8px rgba(0,0,0,0.07)", padding:isMobile?"14px":"18px 22px",
              display:"flex", flexDirection:isMobile?"column":"row", alignItems:isMobile?"flex-start":"center", gap:isMobile?10:18,
              border:"1px solid #F1F5F9", transition:"box-shadow 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.1)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,0.07)"}>

              <div style={{ width:isMobile?44:52, height:isMobile?44:52, borderRadius:14, flexShrink:0,
                background:"linear-gradient(135deg,#0F172A,#1D4ED8)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:isMobile?20:24 }}>📝</div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#0F172A" }}>{ex.name}</div>
                <div style={{ fontSize:12, color:"#94A3B8", marginTop:3, display:"flex", gap:isMobile?6:12, flexWrap:"wrap" }}>
                  <span>📅 {fmtDate(ex.start_date)} — {fmtDate(ex.end_date)}</span>
                  <span>🏫 {ex.class?.name || "—"}</span>
                  <span>📚 {ex.subjects_count} subjects</span>
                  <span>📋 {ex.type}</span>
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", width:isMobile?"100%":"auto" }}>
                <span style={{ background:"#EEF2FF", color:"#6366F1", padding:"3px 10px",
                  borderRadius:12, fontSize:11, fontWeight:700 }}>{ex.class?.name}</span>
                <Badge status={ex.status}/>
                <div style={{ display:"flex", gap:8, marginLeft:isMobile?"auto":"0", flexShrink:0 }}>
                  <button
                    onClick={async () => {
                      setSelExam(null);
                      const r = await API(`/exams/${ex.id}`);
                      if (r.success) { setSelExam(r.data); setDetailTab("schedule"); setMarksData(null); setReport(null); setView("detail"); }
                      else showToast("Failed to load exam", "error");
                    }}
                    style={{ background:"#EFF6FF", color:"#1D4ED8", border:"1px solid #BFDBFE",
                      borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    👁 View
                  </button>
                  <button onClick={() => setDeleteTarget(ex)}
                    style={{ background:"#FEF2F2", color:"#EF4444", border:"1px solid #FCA5A5",
                      borderRadius:8, padding:"7px 10px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete "${deleteTarget.name}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <Toast toast={toast}/>
    </div>
  );
}

// ── Lazy student list for admit card ─────────────────────────
function AdmitCardStudentList({ examId, schoolId, setAdmitStu, showToast }) {
  const [students, setStudents] = useState([]);
  useEffect(() => {
    // We don't have class_id here — fetch marks students
    API(`/exams/${examId}/marks`).then(r => {
      if (r.success) setStudents(r.students.slice(0, 12));
    });
  }, [examId]);

  if (students.length === 0) return null;
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      {students.map(s => (
        <button key={s.id} onClick={() => setAdmitStu(s)}
          style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:8,
            padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#475569" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#6366F1"; e.currentTarget.style.color="#6366F1"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="#E2E8F0"; e.currentTarget.style.color="#475569"; }}>
          🎫 {s.name}
        </button>
      ))}
    </div>
  );
}

// ── Edit Exam Modal ───────────────────────────────────────────
function EditExamModal({ exam, setExam, onSave, onClose }) {
  const ec = (field, val) => setExam(e => ({ ...e, [field]: val }));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:"min(520px,100%)",
        boxShadow:"0 24px 60px rgba(0,0,0,0.25)", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#0F172A,#1D4ED8)", padding:"16px 22px",
          display:"flex", justifyContent:"space-between", alignItems:"center", color:"#fff" }}>
          <div style={{ fontWeight:800, fontSize:15 }}>✏️ Edit Exam</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.12)", border:"none",
            borderRadius:8, color:"#fff", width:30, height:30, cursor:"pointer", fontWeight:700, fontSize:16 }}>✕</button>
        </div>
        <div style={{ padding:24, display:"grid", gap:14 }}>
          <Field label="Exam Name *">
            <input value={exam.name} onChange={e => ec("name", e.target.value)} style={inp}
              onFocus={e => e.target.style.borderColor="#6366F1"}
              onBlur={e => e.target.style.borderColor="#E2E8F0"}/>
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Type">
              <select value={exam.type} onChange={e => ec("type", e.target.value)} style={inp}>
                {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={exam.status} onChange={e => ec("status", e.target.value)} style={inp}>
                {Object.keys(STATUS_META).map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" value={exam.start_date || ""} onChange={e => ec("start_date", e.target.value)} style={inp}/>
            </Field>
            <Field label="End Date">
              <input type="date" value={exam.end_date || ""} onChange={e => ec("end_date", e.target.value)} style={inp}/>
            </Field>
          </div>
        </div>
        <div style={{ padding:"0 24px 24px", display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:"#F1F5F9", color:"#64748B",
            border:"none", borderRadius:10, padding:11, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={onSave} style={{ flex:2, background:"linear-gradient(135deg,#6366F1,#4F46E5)",
            color:"#fff", border:"none", borderRadius:10, padding:11, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"min(400px,100%)",
        boxShadow:"0 16px 48px rgba(0,0,0,0.2)", padding:28, textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:14 }}>⚠️</div>
        <div style={{ fontSize:15, fontWeight:700, color:"#0F172A", marginBottom:8 }}>Are you sure?</div>
        <div style={{ fontSize:13, color:"#64748B", marginBottom:24, lineHeight:1.5 }}>{message}</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, background:"#F1F5F9", color:"#475569",
            border:"none", borderRadius:10, padding:"10px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex:1, background:"#EF4444", color:"#fff",
            border:"none", borderRadius:10, padding:"10px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
