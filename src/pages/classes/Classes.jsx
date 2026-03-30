import { useState, useEffect, useCallback } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'

// ── API ───────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1'
const apiFetch = (path, opts = {}) => {
  const token = localStorage.getItem('token')
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Bearer ${token}`,
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then(async r => {
    const json = await r.json()
    if (!r.ok) throw new Error(json.message || `HTTP ${r.status}`)
    return json
  })
}

// ── Subject Bank (school-level name list) ─────────────────────
const SB_KEY = 'vikashana_subject_bank'
const loadStoredBank = () => { try { return JSON.parse(localStorage.getItem(SB_KEY) || '[]') } catch { return [] } }
const saveStoredBank = (names) => localStorage.setItem(SB_KEY, JSON.stringify(names))

// ── Constants ─────────────────────────────────────────────────
const DAYS    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const PERIODS = ["P1","P2","P3","P4","P5","P6","P7","P8"];
const PERIOD_TIMES = {
  P1:"8:00–8:45", P2:"8:45–9:30",  P3:"9:30–10:15", P4:"10:30–11:15",
  P5:"11:15–12:00",P6:"12:00–12:45",P7:"1:30–2:15",  P8:"2:15–3:00",
};

// ── Helpers ───────────────────────────────────────────────────
const palette      = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
const subjectColor = sub => ({ English:"#3B82F6", Hindi:"#F59E0B", Mathematics:"#6366F1", Science:"#10B981", "Social Studies":"#EC4899", Computer:"#06B6D4", Sanskrit:"#8B5CF6" }[sub]||"#94A3B8");
const subjectBg    = sub => ({ English:"#EFF6FF", Hindi:"#FFFBEB", Mathematics:"#EEF2FF", Science:"#ECFDF5", "Social Studies":"#FDF2F8", Computer:"#ECFEFF", Sanskrit:"#F5F3FF" }[sub]||"#F8FAFC");

const inp = (extra={}) => ({
  width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #E2E8F0",
  fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit", ...extra,
});
const lbl = { fontSize:10, fontWeight:800, color:"#64748B", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 };

// ── Atoms ─────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const err = toast.type==="error";
  return <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:err?"#FEF2F2":"#F0FDF4",border:`1px solid ${err?"#FECACA":"#86EFAC"}`,color:err?"#DC2626":"#16A34A",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>{err?"❌":"✅"} {toast.msg}</div>;
}

function Avatar({ name, size=30 }) {
  const bg = palette[name.charCodeAt(0) % palette.length];
  return <div style={{ width:size,height:size,borderRadius:"50%",background:bg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:800,color:"#fff" }}>{name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>;
}

function SkeletonCard() {
  return (
    <div style={{ background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",border:"1px solid #F1F5F9" }}>
      <div style={{ height:5,background:"#E2E8F0" }}/>
      <div style={{ padding:"20px 20px 14px" }}>
        <div style={{ display:"flex",gap:16,marginBottom:14 }}>
          <div style={{ width:56,height:56,borderRadius:14,background:"#E2E8F0",flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ height:16,background:"#E2E8F0",borderRadius:6,marginBottom:8,width:"50%" }}/>
            <div style={{ height:11,background:"#F1F5F9",borderRadius:6,width:"70%" }}/>
          </div>
        </div>
        <div style={{ height:10,background:"#F1F5F9",borderRadius:6,marginBottom:6,width:"80%" }}/>
        <div style={{ height:10,background:"#F1F5F9",borderRadius:6,width:"60%" }}/>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom:"1px solid #F1F5F9" }}>
      <td style={{ padding:"10px 14px" }}><div style={{ width:20,height:12,background:"#E2E8F0",borderRadius:4 }}/></td>
      <td style={{ padding:"10px 14px" }}><div style={{ display:"flex",gap:9,alignItems:"center" }}><div style={{ width:30,height:30,borderRadius:"50%",background:"#E2E8F0" }}/><div style={{ width:120,height:13,background:"#E2E8F0",borderRadius:5 }}/></div></td>
      <td style={{ padding:"10px 14px" }}><div style={{ width:80,height:12,background:"#F1F5F9",borderRadius:4 }}/></td>
      <td style={{ padding:"10px 14px" }}><div style={{ width:50,height:20,background:"#F1F5F9",borderRadius:10 }}/></td>
    </tr>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────
function Modal({ title, onClose, children, width=440 }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff",borderRadius:18,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ background:"linear-gradient(135deg,#0F172A,#6366F1)",padding:"16px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#fff",position:"sticky",top:0,zIndex:10,borderRadius:"18px 18px 0 0" }}>
          <div style={{ fontWeight:800,fontSize:15 }}>{title}</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:"#fff",width:30,height:30,fontSize:16,cursor:"pointer",fontWeight:700 }}>✕</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Delete confirm modal ──────────────────────────────────────
function DeleteModal({ item, onConfirm, onClose, loading }) {
  return (
    <Modal title="⚠️ Confirm Delete" onClose={onClose} width={380}>
      <p style={{ color:"#374151",fontSize:14,marginBottom:20 }}>
        Are you sure you want to delete <strong>{item}</strong>? This action cannot be undone.
      </p>
      <div style={{ display:"flex",gap:10 }}>
        <button onClick={onClose} style={{ flex:1,background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
        <button onClick={onConfirm} disabled={loading}
          style={{ flex:1,background:"#EF4444",color:"#fff",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:700,cursor:"pointer",opacity:loading?0.6:1 }}>
          {loading ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

// ── Timetable Slot (click to assign) ─────────────────────────
function TimetableSlot({ slot, subjects, teachers, onChange, saving }) {
  const [open, setOpen]       = useState(false);
  const [subId, setSubId]     = useState(slot?.subject?.id || "");
  const [tchId, setTchId]     = useState(slot?.teacher?.id || "");

  useEffect(() => {
    setSubId(slot?.subject?.id || "");
    setTchId(slot?.teacher?.id || "");
  }, [slot]);

  // Filter teachers by selected subject name
  const selectedSubjectName = subjects.find(s => String(s.id) === String(subId))?.name;
  const filteredTeachers = selectedSubjectName
    ? teachers.filter(t => (t.subjects || []).includes(selectedSubjectName))
    : teachers;

  const c  = slot ? subjectColor(slot.subject?.name) : null;
  const bg = slot ? subjectBg(slot.subject?.name)    : null;

  if (!open) return (
    <div onClick={()=>!saving&&setOpen(true)} style={{ background:slot?bg:"#F8FAFC",borderRadius:8,padding:"5px 4px",border:`1px solid ${slot?c+"33":"#E2E8F0"}`,cursor:saving?"not-allowed":"pointer",minHeight:52,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"all 0.15s",margin:"2px" }}
      onMouseEnter={e=>{if(!saving){e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.12)";e.currentTarget.style.transform="scale(1.02)"}}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="";}}>
      {slot ? <>
        <div style={{ fontSize:10,fontWeight:800,color:c,textAlign:"center",lineHeight:1.2 }}>{slot.subject?.name?.length>8?slot.subject.name.slice(0,7)+"…":slot.subject?.name}</div>
        {slot.teacher && <div style={{ fontSize:9,color:"#94A3B8",marginTop:2 }}>{slot.teacher.name.split(" ")[0]}</div>}
      </> : <div style={{ fontSize:16,color:"#E2E8F0" }}>+</div>}
    </div>
  );

  return (
    <div style={{ position:"relative",margin:"2px" }}>
      <div style={{ background:"#fff",border:"2px solid #6366F1",borderRadius:10,padding:8,boxShadow:"0 4px 20px rgba(99,102,241,0.25)",zIndex:10,minWidth:130,position:"absolute",top:0,left:0 }}>
        <select value={subId} onChange={e=>{setSubId(e.target.value); setTchId("");}} autoFocus
          style={{ width:"100%",padding:"5px 6px",borderRadius:6,border:"1px solid #E2E8F0",fontSize:11,outline:"none",marginBottom:4,fontFamily:"inherit" }}>
          <option value="">— No Subject —</option>
          {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={tchId} onChange={e=>setTchId(e.target.value)}
          style={{ width:"100%",padding:"5px 6px",borderRadius:6,border:"1px solid #E2E8F0",fontSize:11,outline:"none",marginBottom:6,fontFamily:"inherit" }}>
          <option value="">{selectedSubjectName && filteredTeachers.length===0 ? "No teachers assigned" : "— No Teacher —"}</option>
          {filteredTeachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div style={{ display:"flex",gap:4 }}>
          <button onClick={()=>{onChange(subId||null, tchId||null); setOpen(false);}}
            style={{ flex:1,padding:"4px",borderRadius:5,border:"none",background:"#6366F1",fontSize:10,cursor:"pointer",color:"#fff",fontWeight:700 }}>Save</button>
          {slot && <button onClick={()=>{onChange(null,null,true); setOpen(false);}}
            style={{ padding:"4px 6px",borderRadius:5,border:"none",background:"#FEE2E2",fontSize:10,cursor:"pointer",color:"#EF4444",fontWeight:700 }}>✕</button>}
          <button onClick={()=>setOpen(false)}
            style={{ padding:"4px 6px",borderRadius:5,border:"none",background:"#F1F5F9",fontSize:10,cursor:"pointer",color:"#64748B" }}>Cancel</button>
        </div>
      </div>
      <div style={{ width:"100%",minHeight:52 }}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function Classes() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'

  // ── API state ─────────────────────────────────────────────────
  const [classes, setClasses]           = useState([])
  const [classDetail, setClassDetail]   = useState(null)
  const [students, setStudents]         = useState([])
  const [teachers, setTeachers]         = useState([])
  const [loadingClasses, setLoadingCls] = useState(true)
  const [loadingStudents, setLoadingStd]= useState(false)
  const [error, setError]               = useState(null)

  // ── Timetable state ───────────────────────────────────────────
  const [timetable, setTT]         = useState({})   // key: `${day}__${period}` -> { id, subject:{id,name}, teacher:{id,name} }
  const [ttLoading, setTTLoading]  = useState(false)
  const [ttSaving, setTTSaving]    = useState(false)
  const [academicYears, setAYears] = useState([])
  const [selYear, setSelYear]      = useState(null)

  // ── UI state ──────────────────────────────────────────────────
  const [view, setView]           = useState("list")
  const [selClass, setSelClass]   = useState(null)
  const [selSection, setSelSec]   = useState(null)   // section id
  const [activeTab, setTab]       = useState("overview")
  const [showTTPrint, setTTPrint] = useState(false)
  const [toast, setToast]         = useState(null)
  const [searchStudent, setSearchStudent] = useState("")

  // ── CRUD modal state ──────────────────────────────────────────
  const [classModal,   setClassModal]   = useState(null)   // { mode:'add'|'edit', data?, saving }
  const [sectionModal, setSectionModal] = useState(null)   // { mode:'add'|'edit', classId, data?, saving }
  const [subjectModal, setSubjectModal] = useState(null)   // { mode:'add'|'edit', classId, data?, saving }
  const [delModal,     setDelModal]     = useState(null)   // { type:'class'|'section'|'subject', id, name, saving }

  const [clsForm,  setClsForm]  = useState({ name:"", display_order:"" })
  const [secForm,  setSecForm]  = useState({ name:"", capacity:40 })
  const [subForm,  setSubForm]  = useState({ name:"", code:"", is_elective:false })

  // ── Subject Bank state ────────────────────────────────────────
  const [subjectBank,     setSubjectBank]     = useState(loadStoredBank)   // unique names list
  const [subNameMode,     setSubNameMode]     = useState('pick')           // 'pick' | 'new'
  const [subjectBankOpen, setSubjectBankOpen] = useState(false)
  const [newBankName,     setNewBankName]     = useState('')

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); }

  // ── Fetch helpers ─────────────────────────────────────────────
  const fetchClasses = useCallback(async () => {
    setLoadingCls(true); setError(null);
    try {
      const res = await apiFetch('/classes');
      setClasses(res.data);
      if (res.data.length && !selClass) setSelClass(res.data[0]);
    } catch(e) { setError(e.message); }
    finally    { setLoadingCls(false); }
  }, []);

  const fetchClassDetail = useCallback(async (classId) => {
    try {
      const res = await apiFetch(`/classes/${classId}`);
      setClassDetail(res.data);
      if (res.data.sections?.length) setSelSec(res.data.sections[0].id);
    } catch(e) { setError(e.message); }
  }, []);

  const fetchStudents = useCallback(async (classId, sectionId) => {
    setLoadingStd(true);
    try {
      const params = new URLSearchParams({ per_page:200 });
      if (sectionId) params.set('section_id', sectionId);
      const res = await apiFetch(`/classes/${classId}/students?${params}`);
      setStudents(res.data);
    } catch(e) { /* non-critical */ }
    finally    { setLoadingStd(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try { const res = await apiFetch('/teachers?per_page=100'); setTeachers(res.data); }
    catch(e) { /* non-critical */ }
  }, []);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await apiFetch('/academic-years');
      setAYears(res.data);
      const cur = res.data.find(y=>y.is_current) || res.data[0];
      if (cur && !selYear) setSelYear(cur);
    } catch(e) { /* non-critical */ }
  }, []);

  const fetchSubjectBank = useCallback(async () => {
    try {
      const res = await apiFetch('/subjects');
      const apiNames = [...new Set(res.data.map(s => s.name))].sort();
      const stored   = loadStoredBank();
      const merged   = [...new Set([...apiNames, ...stored])].sort();
      setSubjectBank(merged);
      saveStoredBank(merged);
    } catch(e) { /* non-critical */ }
  }, []);

  const fetchTimetable = useCallback(async (classId, sectionId, yearId) => {
    setTTLoading(true);
    try {
      const params = new URLSearchParams({ class_id: classId });
      if (sectionId) params.set('section_id', sectionId);
      if (yearId)    params.set('academic_year_id', yearId);
      const res = await apiFetch(`/timetable?${params}`);
      const map = {};
      res.data.forEach(entry => { map[`${entry.day}__${entry.period}`] = entry; });
      setTT(map);
    } catch(e) { /* non-critical */ }
    finally    { setTTLoading(false); }
  }, []);

  // ── On mount ──────────────────────────────────────────────────
  useEffect(() => { fetchClasses(); fetchTeachers(); fetchAcademicYears(); fetchSubjectBank(); }, []);

  useEffect(() => {
    if (!selClass) return;
    setClassDetail(null); setStudents([]); setSearchStudent(""); setTT({});
    fetchClassDetail(selClass.id);
  }, [selClass?.id]);

  useEffect(() => {
    if (!selClass || !selSection) return;
    fetchStudents(selClass.id, selSection);
  }, [selClass?.id, selSection]);

  // Load timetable when switching to timetable tab
  useEffect(() => {
    if (activeTab === "timetable" && selClass && selSection) {
      fetchTimetable(selClass.id, selSection, selYear?.id);
    }
  }, [activeTab, selClass?.id, selSection, selYear?.id]);

  // ── Class CRUD ────────────────────────────────────────────────
  const openAddClass = () => {
    setClsForm({ name:"", display_order:"" });
    setClassModal({ mode:"add" });
  };
  const openEditClass = (cls) => {
    setClsForm({ name: cls.name, display_order: cls.display_order ?? "" });
    setClassModal({ mode:"edit", data: cls });
  };
  const saveClass = async () => {
    if (!clsForm.name.trim()) { showToast("Class name is required","error"); return; }
    setClassModal(m=>({...m,saving:true}));
    try {
      const body = { name: clsForm.name.trim(), display_order: Number(clsForm.display_order)||0 };
      if (classModal.mode==="add") {
        const res = await apiFetch('/classes', { method:'POST', body });
        setClasses(prev=>[...prev, { ...res.data, sections:[] }]);
        showToast(`Class ${res.data.name} created`);
      } else {
        const res = await apiFetch(`/classes/${classModal.data.id}`, { method:'PUT', body });
        setClasses(prev=>prev.map(c=>c.id===classModal.data.id ? { ...c, name:res.data.name, display_order:res.data.display_order } : c));
        if (selClass?.id===classModal.data.id) setSelClass(sc=>({...sc, name:res.data.name}));
        showToast("Class updated");
      }
      setClassModal(null);
    } catch(e) { showToast(e.message,"error"); setClassModal(m=>({...m,saving:false})); }
  };
  const deleteClass = async () => {
    setDelModal(m=>({...m,saving:true}));
    try {
      await apiFetch(`/classes/${delModal.id}`, { method:'DELETE' });
      setClasses(prev=>prev.filter(c=>c.id!==delModal.id));
      if (selClass?.id===delModal.id) { setSelClass(null); setView("list"); }
      showToast("Class deleted");
      setDelModal(null);
    } catch(e) { showToast(e.message,"error"); setDelModal(m=>({...m,saving:false})); }
  };

  // ── Section CRUD ──────────────────────────────────────────────
  const openAddSection = (classId) => {
    setSecForm({ name:"", capacity:40 });
    setSectionModal({ mode:"add", classId });
  };
  const openEditSection = (sec) => {
    setSecForm({ name: sec.name, capacity: sec.capacity });
    setSectionModal({ mode:"edit", data: sec });
  };
  const saveSection = async () => {
    if (!secForm.name.trim()) { showToast("Section name is required","error"); return; }
    setSectionModal(m=>({...m,saving:true}));
    try {
      if (sectionModal.mode==="add") {
        const res = await apiFetch('/sections', { method:'POST', body:{ class_id:sectionModal.classId, name:secForm.name.trim(), capacity:Number(secForm.capacity)||40 }});
        // refresh class data
        await fetchClassDetail(sectionModal.classId);
        setClasses(prev=>prev.map(c=>c.id===sectionModal.classId ? { ...c, sections:[...c.sections, res.data] } : c));
        showToast(`Section ${res.data.name} created`);
      } else {
        const res = await apiFetch(`/sections/${sectionModal.data.id}`, { method:'PUT', body:{ name:secForm.name.trim(), capacity:Number(secForm.capacity)||40 }});
        setClassDetail(d=>d ? {...d, sections:d.sections.map(s=>s.id===sectionModal.data.id?res.data:s)} : d);
        showToast("Section updated");
      }
      setSectionModal(null);
    } catch(e) { showToast(e.message,"error"); setSectionModal(m=>({...m,saving:false})); }
  };
  const deleteSection = async () => {
    setDelModal(m=>({...m,saving:true}));
    try {
      await apiFetch(`/sections/${delModal.id}`, { method:'DELETE' });
      setClassDetail(d=>d ? {...d, sections:d.sections.filter(s=>s.id!==delModal.id)} : d);
      if (selSection===delModal.id) setSelSec(classDetail?.sections?.find(s=>s.id!==delModal.id)?.id || null);
      showToast("Section deleted");
      setDelModal(null);
    } catch(e) { showToast(e.message,"error"); setDelModal(m=>({...m,saving:false})); }
  };

  // ── Subject Bank helpers ──────────────────────────────────────
  const addNameToBank = (name) => {
    const trimmed = name.trim();
    if (!trimmed || subjectBank.includes(trimmed)) return;
    const updated = [...subjectBank, trimmed].sort();
    setSubjectBank(updated);
    saveStoredBank(updated);
  };
  const removeNameFromBank = (name) => {
    const updated = subjectBank.filter(n => n !== name);
    setSubjectBank(updated);
    saveStoredBank(updated);
  };

  // ── Subject CRUD ──────────────────────────────────────────────
  const openAddSubject = (classId) => {
    const defaultName = subjectBank[0] || '';
    setSubForm({ name:defaultName, code:"", is_elective:false });
    setSubNameMode(subjectBank.length > 0 ? 'pick' : 'new');
    setSubjectModal({ mode:"add", classId });
  };
  const openEditSubject = (sub, classId) => {
    setSubForm({ name:sub.name, code:sub.code||"", is_elective:sub.is_elective||false });
    setSubNameMode('pick');
    setSubjectModal({ mode:"edit", data:sub, classId });
  };
  const saveSubject = async () => {
    if (!subForm.name.trim()) { showToast("Subject name is required","error"); return; }
    setSubjectModal(m=>({...m,saving:true}));
    try {
      const body = { name:subForm.name.trim(), code:subForm.code.trim()||null, is_elective:subForm.is_elective };
      if (subjectModal.mode==="add") {
        const res = await apiFetch('/subjects', { method:'POST', body:{ ...body, class_id:subjectModal.classId }});
        setClassDetail(d=>d ? {...d, subjects:[...d.subjects, res.data]} : d);
        addNameToBank(res.data.name);
        showToast(`Subject ${res.data.name} added`);
      } else {
        const res = await apiFetch(`/subjects/${subjectModal.data.id}`, { method:'PUT', body });
        setClassDetail(d=>d ? {...d, subjects:d.subjects.map(s=>s.id===subjectModal.data.id?res.data:s)} : d);
        addNameToBank(res.data.name);
        showToast("Subject updated");
      }
      setSubjectModal(null);
    } catch(e) { showToast(e.message,"error"); setSubjectModal(m=>({...m,saving:false})); }
  };
  const deleteSubject = async () => {
    setDelModal(m=>({...m,saving:true}));
    try {
      await apiFetch(`/subjects/${delModal.id}`, { method:'DELETE' });
      setClassDetail(d=>d ? {...d, subjects:d.subjects.filter(s=>s.id!==delModal.id)} : d);
      showToast("Subject deleted");
      setDelModal(null);
    } catch(e) { showToast(e.message,"error"); setDelModal(m=>({...m,saving:false})); }
  };

  // ── Timetable slot save/clear ──────────────────────────────────
  const saveTimetableSlot = async (day, period, subjectId, teacherId, clear=false) => {
    const key = `${day}__${period}`;
    const existing = timetable[key];

    if (clear && existing?.id) {
      setTTSaving(true);
      try {
        await apiFetch(`/timetable/${existing.id}`, { method:'DELETE' });
        setTT(p=>{ const n={...p}; delete n[key]; return n; });
      } catch(e) { showToast(e.message,"error"); }
      finally { setTTSaving(false); }
      return;
    }

    if (!subjectId) return;

    setTTSaving(true);
    try {
      const res = await apiFetch('/timetable/bulk', {
        method:'POST',
        body: {
          class_id:         selClass.id,
          section_id:       selSection,
          academic_year_id: selYear?.id || null,
          slots: [{ day, period, subject_id: subjectId, teacher_id: teacherId || null }],
        },
      });
      const saved = res.data[0];
      setTT(p=>({ ...p, [key]: saved }));
    } catch(e) { showToast(e.message,"error"); }
    finally { setTTSaving(false); }
  };

  // ── Derived data ──────────────────────────────────────────────
  const curSec           = classDetail?.sections?.find(s=>s.id===selSection) || classDetail?.sections?.[0];
  const filteredStudents = searchStudent
    ? students.filter(s=>s.name.toLowerCase().includes(searchStudent.toLowerCase())||(s.admission_no||"").toLowerCase().includes(searchStudent.toLowerCase()))
    : students;

  // KPI widgets — use withCount data from API
  const totalClasses  = classes.length;
  const totalSections = classes.reduce((a,c)=>a+(c.sections_count||c.sections?.length||0),0);
  const totalStudents = classes.reduce((a,c)=>a+(c.students_count||0),0);
  const totalSubjects = classes.reduce((a,c)=>a+(c.subjects_count||0),0);

  const widgets = [
    { icon:"🏫", label:"Total Classes",   value:totalClasses,  c:"#6366F1", bg:"#EEF2FF", sub:"All grades"           },
    { icon:"🔢", label:"Total Sections",  value:totalSections, c:"#10B981", bg:"#ECFDF5", sub:"Across all classes"   },
    { icon:"👨‍🎓",label:"Total Students",  value:totalStudents, c:"#3B82F6", bg:"#EFF6FF", sub:"Active students"      },
    { icon:"📚", label:"Total Subjects",  value:totalSubjects, c:"#F59E0B", bg:"#FFFBEB", sub:"Across all classes"   },
  ];

  const classTeachersForDetail = teachers.filter(t=>(t.classes||[]).includes(selClass?.name||""));

  // ── DETAIL VIEW ───────────────────────────────────────────────
  if (view==="detail" && selClass) {
    const cls      = selClass;
    const sections = classDetail?.sections || [];
    const subjects = classDetail?.subjects || [];

    return (
      <div style={{ fontFamily:"'Segoe UI',sans-serif",padding:isMobile?12:24,background:"#F0F4F8",minHeight:"100vh" }}>
        {/* Toolbar */}
        <div style={{ display:"flex",gap:8,marginBottom:18,alignItems:"center",flexWrap:"wrap" }}>
          <button onClick={()=>setView("list")} style={{ background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:600,color:"#475569" }}>← Back</button>
          <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
            <button onClick={()=>openEditClass(cls)} style={{ background:"#EEF2FF",color:"#6366F1",border:"1px solid #C7D2FE",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontWeight:700 }}>✏️ Edit Class</button>
            <button onClick={()=>setDelModal({type:"class",id:cls.id,name:`Class ${cls.name}`})} style={{ background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontWeight:700 }}>🗑 Delete</button>
            {!isMobile&&<button onClick={()=>setTTPrint(true)} style={{ background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontWeight:700 }}>🖨️ Print Timetable</button>}
          </div>
        </div>

        {/* Header */}
        <div style={{ background:"#fff",borderRadius:16,overflow:"hidden",marginBottom:16,boxShadow:"0 1px 8px rgba(0,0,0,0.08)" }}>
          <div style={{ background:"linear-gradient(135deg,#0F172A,#1E3A5F,#6366F1)",padding:isMobile?'14px 16px':'24px 28px',color:"#fff",display:"flex",alignItems:"center",gap:isMobile?12:20 }}>
            <div style={{ width:isMobile?44:60,height:isMobile?44:60,background:"rgba(255,255,255,0.12)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?18:26,fontWeight:900,flexShrink:0 }}>{cls.name}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:900,fontSize:isMobile?16:22 }}>Class {cls.name}</div>
              <div style={{ opacity:0.65,fontSize:isMobile?11:13,marginTop:3 }}>{sections.length} Sections · {students.length} Students</div>
            </div>
            {!isMobile&&<div style={{ marginLeft:"auto",display:"flex",gap:12 }}>
              {[["Students",students.length,"#fff"],["Sections",sections.length,"#A5B4FC"],["Subjects",subjects.length,"#6EE7B7"]].map(([l,v,c])=>(
                <div key={l} style={{ textAlign:"center",background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"10px 16px" }}>
                  <div style={{ fontSize:22,fontWeight:900,color:c }}>{v}</div><div style={{ fontSize:11,opacity:0.7 }}>{l}</div>
                </div>
              ))}
            </div>}
          </div>
          {/* Section tabs */}
          <div style={{ padding:isMobile?"0 12px":"0 28px",display:"flex",gap:0,borderBottom:"2px solid #F1F5F9",overflowX:"auto",alignItems:"center" }}>
            {sections.map(sec=>{
              const active = selSection===sec.id;
              const cnt    = students.filter(s=>s.section?.id===sec.id).length;
              return (
                <button key={sec.id} onClick={()=>setSelSec(sec.id)}
                  style={{ padding:"14px 20px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:"transparent",position:"relative",color:active?"#6366F1":"#94A3B8",borderBottom:active?"3px solid #6366F1":"3px solid transparent",marginBottom:-2,whiteSpace:"nowrap" }}>
                  Sec {sec.name}
                  <span style={{ marginLeft:6,background:active?"#EEF2FF":"#F1F5F9",color:active?"#6366F1":"#94A3B8",padding:"2px 7px",borderRadius:10,fontSize:10,fontWeight:800 }}>{cnt}</span>
                </button>
              );
            })}
            {!classDetail && <div style={{ padding:"14px 20px",color:"#CBD5E1",fontSize:13 }}>Loading…</div>}
            <button onClick={()=>openAddSection(cls.id)} style={{ marginLeft:"auto",padding:"6px 12px",background:"#EEF2FF",color:"#6366F1",border:"1px solid #C7D2FE",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0 }}>+ Add Section</button>
          </div>
        </div>

        {/* Content tabs */}
        <div style={{ display:"flex",gap:4,background:"#E2E8F0",borderRadius:10,padding:4,marginBottom:16,width:isMobile?"100%":"fit-content",overflowX:isMobile?"auto":"visible" }}>
          {[["overview","📋 Overview"],["students","👨‍🎓 Students"],["timetable","📅 Timetable"],["analytics","📊 Analytics"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:isMobile?"6px 12px":"7px 16px",borderRadius:7,border:"none",cursor:"pointer",fontSize:isMobile?11:12,fontWeight:700,transition:"all 0.18s",background:activeTab===t?"#fff":"transparent",color:activeTab===t?"#6366F1":"#64748B",boxShadow:activeTab===t?"0 1px 6px rgba(0,0,0,0.1)":"none",flexShrink:0,whiteSpace:"nowrap" }}>{l}</button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab==="overview" && (
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16 }}>
            {/* Section detail */}
            <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                <div style={{ fontWeight:800,fontSize:14,color:"#0F172A" }}>Section {curSec?.name} Details</div>
                {curSec && <div style={{ display:"flex",gap:6 }}>
                  <button onClick={()=>openEditSection(curSec)} style={{ padding:"4px 10px",background:"#EEF2FF",color:"#6366F1",border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer" }}>✏️ Edit</button>
                  <button onClick={()=>setDelModal({type:"section",id:curSec.id,name:`Section ${curSec.name}`})} style={{ padding:"4px 10px",background:"#FEF2F2",color:"#DC2626",border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer" }}>🗑</button>
                </div>}
              </div>
              {!classDetail
                ? [1,2,3,4].map(i=><div key={i} style={{ height:40,background:"#F1F5F9",borderRadius:9,marginBottom:8,animation:"pulse 1.5s ease-in-out infinite" }}/>)
                : [
                    ["Capacity",   curSec?.capacity || "—"],
                    ["Students",   students.length],
                    ["Boys",       students.filter(s=>s.gender==="Male").length],
                    ["Girls",      students.filter(s=>s.gender==="Female").length],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#F8FAFC",borderRadius:9,border:"1px solid #F1F5F9",marginBottom:8 }}>
                      <span style={{ fontSize:12,fontWeight:600,color:"#64748B" }}>{k}</span>
                      <span style={{ fontSize:13,fontWeight:800,color:"#0F172A" }}>{v}</span>
                    </div>
                  ))
              }
            </div>

            {/* Subjects */}
            <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                <div style={{ fontWeight:800,fontSize:14,color:"#0F172A" }}>Subjects ({subjects.length})</div>
                <div style={{ display:"flex",gap:6 }}>
                  <button onClick={()=>setSubjectBankOpen(true)} style={{ padding:"5px 10px",background:"#F8FAFC",color:"#64748B",border:"1px solid #E2E8F0",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer" }}>📚 Manage Names</button>
                  <button onClick={()=>openAddSubject(cls.id)} style={{ padding:"5px 12px",background:"#EEF2FF",color:"#6366F1",border:"1px solid #C7D2FE",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer" }}>+ Add</button>
                </div>
              </div>
              {!classDetail
                ? [1,2,3].map(i=><div key={i} style={{ height:36,background:"#F1F5F9",borderRadius:8,marginBottom:8,animation:"pulse 1.5s ease-in-out infinite" }}/>)
                : subjects.length>0
                  ? subjects.map(sub=>{
                      const tc = classTeachersForDetail.find(t=>(t.subjects||[]).includes(sub.name));
                      return (
                        <div key={sub.id} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:7,padding:"8px 10px",background:"#F8FAFC",borderRadius:8,border:"1px solid #F1F5F9" }}>
                          <div style={{ width:8,height:8,borderRadius:2,background:subjectColor(sub.name),flexShrink:0 }}/>
                          <span style={{ flex:1,fontSize:12,fontWeight:700,color:subjectColor(sub.name) }}>{sub.name}</span>
                          {sub.code&&<span style={{ fontSize:10,color:"#94A3B8",fontWeight:600 }}>{sub.code}</span>}
                          {sub.is_elective&&<span style={{ fontSize:9,background:"#FFFBEB",color:"#D97706",padding:"2px 6px",borderRadius:5,fontWeight:700 }}>Elective</span>}
                          {tc?<div style={{ display:"flex",alignItems:"center",gap:5 }}><Avatar name={tc.name} size={20}/><span style={{ fontSize:11,fontWeight:600 }}>{tc.name}</span></div>
                             :<span style={{ fontSize:11,color:"#CBD5E1" }}>—</span>}
                          <button onClick={()=>openEditSubject(sub, cls.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#6366F1",padding:2 }}>✏️</button>
                          <button onClick={()=>setDelModal({type:"subject",id:sub.id,name:sub.name})} style={{ background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#EF4444",padding:2 }}>🗑</button>
                        </div>
                      );
                    })
                  : <div style={{ color:"#94A3B8",fontSize:13,padding:"12px 0" }}>No subjects. <button onClick={()=>openAddSubject(cls.id)} style={{ color:"#6366F1",fontWeight:700,background:"none",border:"none",cursor:"pointer",fontSize:13 }}>Add one →</button></div>
              }
            </div>
          </div>
        )}

        {/* ── Students ── */}
        {activeTab==="students" && (
          <div style={{ background:"#fff",borderRadius:14,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",overflow:"hidden" }}>
            <div style={{ padding:isMobile?"12px 14px":"14px 20px",borderBottom:"1px solid #F1F5F9",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap" }}>
              <div style={{ fontWeight:800,fontSize:14 }}>Section {curSec?.name} Students</div>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <input placeholder="🔍 Search…" value={searchStudent} onChange={e=>setSearchStudent(e.target.value)}
                  style={{ padding:"7px 12px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:12,outline:"none",width:160 }}/>
                <span style={{ background:"#EEF2FF",color:"#6366F1",padding:"4px 12px",borderRadius:12,fontSize:12,fontWeight:700 }}>{filteredStudents.length} students</span>
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse",minWidth:isMobile?360:"auto" }}>
                <thead><tr style={{ background:"#F8FAFC",borderBottom:"2px solid #E2E8F0" }}>
                  {(isMobile?["Student","ID","Gender"]:["#","Student","Adm. No","Gender","Section"]).map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:800,color:"#64748B",textTransform:"uppercase",letterSpacing:0.6 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {loadingStudents
                    ? Array.from({length:5},(_,i)=><SkeletonRow key={i}/>)
                    : filteredStudents.length===0
                      ? <tr><td colSpan={5} style={{ padding:32,textAlign:"center",color:"#94A3B8",fontSize:13 }}>No students in this section</td></tr>
                      : filteredStudents.map((s,i)=>(
                          <tr key={s.id} style={{ borderBottom:"1px solid #F1F5F9" }}
                            onMouseEnter={e=>e.currentTarget.style.background="#FAFBFC"}
                            onMouseLeave={e=>e.currentTarget.style.background=""}>
                            {!isMobile&&<td style={{ padding:"10px 14px",fontSize:12,color:"#94A3B8",fontWeight:600 }}>{i+1}</td>}
                            <td style={{ padding:"10px 14px" }}><div style={{ display:"flex",alignItems:"center",gap:9 }}><Avatar name={s.name}/><span style={{ fontWeight:700,fontSize:13 }}>{s.name}</span></div></td>
                            <td style={{ padding:"10px 14px",fontSize:12,color:"#94A3B8" }}>{s.admission_no||"—"}</td>
                            <td style={{ padding:"10px 14px" }}><span style={{ background:s.gender==="Male"?"#EFF6FF":"#FDF2F8",color:s.gender==="Male"?"#1D4ED8":"#BE185D",padding:"3px 10px",borderRadius:10,fontSize:11,fontWeight:700 }}>{s.gender||"—"}</span></td>
                            {!isMobile&&<td style={{ padding:"10px 14px",fontSize:12,color:"#64748B" }}>{s.section?.name||"—"}</td>}
                          </tr>
                        ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Timetable ── */}
        {activeTab==="timetable" && (
          <div style={{ background:"#fff",borderRadius:14,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",overflow:"hidden" }}>
            <div style={{ padding:"14px 20px",borderBottom:"1px solid #F1F5F9",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap" }}>
              <div>
                <div style={{ fontWeight:800,fontSize:14 }}>Weekly Timetable — Section {curSec?.name}</div>
                <div style={{ fontSize:11,color:"#94A3B8",marginTop:2 }}>Click any slot to assign subject &amp; teacher</div>
              </div>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                {academicYears.length>0 && (
                  <select value={selYear?.id||""} onChange={e=>{const y=academicYears.find(a=>a.id==e.target.value); setSelYear(y);}}
                    style={{ padding:"6px 10px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit" }}>
                    {academicYears.map(y=><option key={y.id} value={y.id}>{y.name}{y.is_current?" (Current)":""}</option>)}
                  </select>
                )}
                {ttSaving && <span style={{ fontSize:11,color:"#6366F1",fontWeight:600 }}>Saving…</span>}
                <button onClick={()=>setTTPrint(true)} style={{ background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",fontWeight:700 }}>🖨️ Print</button>
              </div>
            </div>
            {ttLoading ? (
              <div style={{ padding:40,textAlign:"center",color:"#94A3B8" }}>Loading timetable…</div>
            ) : (
              <div style={{ overflowX:"auto",padding:"12px 12px 16px" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",minWidth:700 }}>
                  <thead>
                    <tr style={{ background:"#F8FAFC" }}>
                      <th style={{ padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:800,color:"#64748B",textTransform:"uppercase",minWidth:80,borderBottom:"2px solid #E2E8F0" }}>Day</th>
                      {PERIODS.map(p=>(
                        <th key={p} style={{ padding:"10px 6px",textAlign:"center",fontSize:10,fontWeight:800,color:"#64748B",textTransform:"uppercase",minWidth:100,borderBottom:"2px solid #E2E8F0" }}>
                          <div>{p}</div><div style={{ fontSize:8,color:"#94A3B8",fontWeight:500,marginTop:1 }}>{PERIOD_TIMES[p]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day,di)=>(
                      <tr key={day} style={{ borderBottom:"1px solid #F1F5F9",background:di%2===0?"#fff":"#FAFBFC" }}>
                        <td style={{ padding:"8px 12px",fontWeight:800,fontSize:12,color:"#0F172A",borderRight:"2px solid #F1F5F9",background:"#F8FAFC" }}>
                          <div>{day.slice(0,3)}</div><div style={{ fontSize:9,color:"#94A3B8",fontWeight:500 }}>{day.slice(3)}</div>
                        </td>
                        {PERIODS.map(period=>{
                          const key  = `${day}__${period}`;
                          const slot = timetable[key];
                          return (
                            <td key={period} style={{ padding:"2px",verticalAlign:"top" }}>
                              <TimetableSlot
                                slot={slot} subjects={subjects} teachers={teachers} saving={ttSaving}
                                onChange={(subId, tchId, clear)=>saveTimetableSlot(day, period, subId, tchId, clear)}/>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ padding:"10px 16px",background:"#F8FAFC",borderTop:"1px solid #F1F5F9",display:"flex",gap:10,flexWrap:"wrap" }}>
              {subjects.map(s=>(
                <div key={s.id} style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <div style={{ width:10,height:10,borderRadius:3,background:subjectColor(s.name) }}/><span style={{ fontSize:10,fontWeight:700,color:"#64748B" }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Analytics ── */}
        {activeTab==="analytics" && (
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16 }}>
            <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>Section Strength</div>
              {!classDetail
                ? [1,2].map(i=><div key={i} style={{ height:44,background:"#F1F5F9",borderRadius:9,marginBottom:14,animation:"pulse 1.5s ease-in-out infinite" }}/>)
                : sections.map(sec=>{
                    const cnt = students.filter(s=>s.section?.id===sec.id).length;
                    const max = Math.max(...sections.map(s2=>students.filter(st=>st.section?.id===s2.id).length), sec.capacity||40, 1);
                    return (
                      <div key={sec.id} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                          <span style={{ fontSize:13,fontWeight:700,color:"#374151" }}>Section {sec.name}</span>
                          <span style={{ fontSize:12,fontWeight:800,color:"#6366F1" }}>{cnt} / {sec.capacity}</span>
                        </div>
                        <div style={{ background:"#F1F5F9",borderRadius:99,height:10,overflow:"hidden" }}>
                          <div style={{ width:`${(cnt/max)*100}%`,height:"100%",borderRadius:99,background:"linear-gradient(90deg,#6366F1,#10B981)" }}/>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
            <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>Gender Distribution</div>
              {sections.map(sec=>{
                const ss=students.filter(s=>s.section?.id===sec.id);
                const m=ss.filter(s=>s.gender==="Male").length; const f=ss.filter(s=>s.gender==="Female").length; const tot=ss.length||1;
                return (
                  <div key={sec.id} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                      <span style={{ fontSize:13,fontWeight:700,color:"#374151" }}>Section {sec.name}</span>
                      <span style={{ fontSize:11,color:"#94A3B8" }}>👦 {m} · 👧 {f}</span>
                    </div>
                    <div style={{ display:"flex",height:10,borderRadius:99,overflow:"hidden" }}>
                      <div style={{ width:`${m/tot*100}%`,background:"#3B82F6" }}/><div style={{ flex:1,background:"#EC4899" }}/>
                    </div>
                    <div style={{ display:"flex",gap:12,marginTop:4 }}>
                      <span style={{ fontSize:10,color:"#3B82F6",fontWeight:700 }}>Boys {Math.round(m/tot*100)}%</span>
                      <span style={{ fontSize:10,color:"#EC4899",fontWeight:700 }}>Girls {Math.round(f/tot*100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",gridColumn:"1/-1" }}>
              <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>Teachers in Class {cls.name}</div>
              {classTeachersForDetail.length>0
                ? <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10 }}>
                    {classTeachersForDetail.map(tc=>(
                      <div key={tc.id} style={{ background:"#F8FAFC",borderRadius:10,padding:"12px 14px",border:"1px solid #F1F5F9" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}><Avatar name={tc.name} size={28}/><div style={{ fontWeight:700,fontSize:12 }}>{tc.name}</div></div>
                        {(tc.subjects||[]).map(s=><span key={s} style={{ display:"inline-block",background:subjectBg(s),color:subjectColor(s),padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,margin:"2px 2px 0 0" }}>{s}</span>)}
                      </div>
                    ))}
                  </div>
                : <div style={{ color:"#94A3B8",fontSize:13 }}>No teachers assigned to this class yet.</div>
              }
            </div>
          </div>
        )}

        {/* Timetable print modal */}
        {showTTPrint && (
          <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={e=>e.target===e.currentTarget&&setTTPrint(false)}>
            <div style={{ background:"#fff",borderRadius:20,width:"92vw",maxWidth:860,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ background:"linear-gradient(135deg,#0F172A,#6366F1)",padding:"16px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#fff",position:"sticky",top:0,zIndex:10 }}>
                <div><div style={{ fontWeight:800,fontSize:15 }}>📅 Timetable — Class {cls.name}-{curSec?.name}</div></div>
                <button onClick={()=>setTTPrint(false)} style={{ background:"rgba(255,255,255,0.12)",border:"none",borderRadius:8,color:"#fff",width:30,height:30,fontSize:16,cursor:"pointer",fontWeight:700 }}>✕</button>
              </div>
              <div style={{ padding:20,overflowX:"auto" }}>
                <div style={{ background:"#fff",borderRadius:12,overflow:"hidden",border:"1px solid #E2E8F0" }}>
                  <div style={{ background:"#0F172A",padding:"12px 16px",color:"#fff",textAlign:"center" }}>
                    <div style={{ fontWeight:900,fontSize:15 }}>School Timetable</div>
                    <div style={{ fontSize:11,opacity:0.6,marginTop:2 }}>Class {cls.name} Section {curSec?.name}</div>
                  </div>
                  <table style={{ width:"100%",borderCollapse:"collapse",minWidth:700 }}>
                    <thead>
                      <tr style={{ background:"#F8FAFC",borderBottom:"2px solid #E2E8F0" }}>
                        <th style={{ padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:800,color:"#64748B",textTransform:"uppercase",minWidth:80 }}>Day</th>
                        {PERIODS.map(p=><th key={p} style={{ padding:"10px 8px",textAlign:"center",fontSize:10,fontWeight:800,color:"#64748B",textTransform:"uppercase",minWidth:85 }}><div>{p}</div><div style={{ fontSize:8,color:"#94A3B8",marginTop:2 }}>{PERIOD_TIMES[p]}</div></th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day,di)=>(
                        <tr key={day} style={{ borderBottom:"1px solid #F1F5F9",background:di%2===0?"#fff":"#FAFBFC" }}>
                          <td style={{ padding:"10px 12px",fontWeight:800,fontSize:12,color:"#0F172A",background:"#F8FAFC",borderRight:"2px solid #E2E8F0" }}>{day.slice(0,3)}</td>
                          {PERIODS.map(period=>{
                            const slot=timetable[`${day}__${period}`];
                            const c=slot?subjectColor(slot.subject?.name):null; const bg=slot?subjectBg(slot.subject?.name):null;
                            return (
                              <td key={period} style={{ padding:"6px 4px",textAlign:"center",verticalAlign:"middle" }}>
                                {slot?.subject?<div style={{ background:bg,borderRadius:8,padding:"6px 4px",border:`1px solid ${c}22`,margin:"0 2px" }}>
                                  <div style={{ fontSize:10,fontWeight:800,color:c,lineHeight:1.2 }}>{slot.subject.name.length>9?slot.subject.name.slice(0,8)+"…":slot.subject.name}</div>
                                  {slot.teacher&&<div style={{ fontSize:8,color:"#64748B",marginTop:2 }}>{slot.teacher.name.split(" ")[0]}</div>}
                                </div>:<span style={{ color:"#E2E8F0" }}>—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ padding:"0 20px 20px",display:"flex",gap:10 }}>
                <button onClick={()=>setTTPrint(false)} style={{ flex:1,background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:"pointer" }}>Close</button>
                <button onClick={()=>window.print()} style={{ flex:2,background:"linear-gradient(135deg,#0F172A,#6366F1)",color:"#fff",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:700,cursor:"pointer" }}>🖨️ Print Timetable</button>
              </div>
            </div>
          </div>
        )}

        {/* ── CRUD Modals ── */}
        {classModal && (
          <Modal title={classModal.mode==="add"?"➕ Add Class":"✏️ Edit Class"} onClose={()=>setClassModal(null)}>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Class Name <span style={{ color:"#EF4444" }}>*</span></label>
              <input value={clsForm.name} onChange={e=>setClsForm(f=>({...f,name:e.target.value}))} placeholder="e.g. 10, LKG, 6A"
                style={inp()} onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Display Order</label>
              <input type="number" value={clsForm.display_order} onChange={e=>setClsForm(f=>({...f,display_order:e.target.value}))} placeholder="0"
                style={inp({maxWidth:120})} onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setClassModal(null)} style={{ flex:1,background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
              <button onClick={saveClass} disabled={classModal.saving}
                style={{ flex:2,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:700,cursor:"pointer",opacity:classModal.saving?0.6:1 }}>
                {classModal.saving ? "Saving…" : classModal.mode==="add" ? "Create Class" : "Save Changes"}
              </button>
            </div>
          </Modal>
        )}

        {sectionModal && (
          <Modal title={sectionModal.mode==="add"?"➕ Add Section":"✏️ Edit Section"} onClose={()=>setSectionModal(null)}>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Section Name <span style={{ color:"#EF4444" }}>*</span></label>
              <input value={secForm.name} onChange={e=>setSecForm(f=>({...f,name:e.target.value}))} placeholder="e.g. A, B, C"
                style={inp()} onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Capacity</label>
              <input type="number" value={secForm.capacity} onChange={e=>setSecForm(f=>({...f,capacity:e.target.value}))} placeholder="40"
                style={inp({maxWidth:120})} onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setSectionModal(null)} style={{ flex:1,background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
              <button onClick={saveSection} disabled={sectionModal.saving}
                style={{ flex:2,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:700,cursor:"pointer",opacity:sectionModal.saving?0.6:1 }}>
                {sectionModal.saving ? "Saving…" : sectionModal.mode==="add" ? "Create Section" : "Save Changes"}
              </button>
            </div>
          </Modal>
        )}

        {subjectModal && (
          <Modal title={subjectModal.mode==="add"?"➕ Add Subject":"✏️ Edit Subject"} onClose={()=>setSubjectModal(null)}>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                <label style={lbl}>Subject Name <span style={{ color:"#EF4444" }}>*</span></label>
                {subjectBank.length > 0 && (
                  <div style={{ display:"flex",gap:4 }}>
                    <button onClick={()=>setSubNameMode('pick')} style={{ padding:"2px 8px",borderRadius:6,border:`1px solid ${subNameMode==='pick'?'#6366F1':'#E2E8F0'}`,background:subNameMode==='pick'?'#EEF2FF':'#fff',color:subNameMode==='pick'?'#6366F1':'#64748B',fontSize:11,fontWeight:700,cursor:'pointer' }}>
                      Pick from list
                    </button>
                    <button onClick={()=>{ setSubNameMode('new'); setSubForm(f=>({...f,name:''})); }} style={{ padding:"2px 8px",borderRadius:6,border:`1px solid ${subNameMode==='new'?'#6366F1':'#E2E8F0'}`,background:subNameMode==='new'?'#EEF2FF':'#fff',color:subNameMode==='new'?'#6366F1':'#64748B',fontSize:11,fontWeight:700,cursor:'pointer' }}>
                      Type new
                    </button>
                  </div>
                )}
              </div>

              {subNameMode==='pick' && subjectBank.length > 0 ? (
                <select value={subForm.name} onChange={e=>setSubForm(f=>({...f,name:e.target.value}))}
                  style={{ ...inp(), background:'#fff', cursor:'pointer' }}>
                  <option value="">— Select subject —</option>
                  {subjectBank.map(name=>(
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              ) : (
                <input value={subForm.name} onChange={e=>setSubForm(f=>({...f,name:e.target.value}))}
                  placeholder="e.g. Mathematics" style={inp()}
                  onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}
                  autoFocus />
              )}

              {subjectBank.length === 0 && (
                <p style={{ fontSize:11,color:'#94A3B8',marginTop:4 }}>
                  No subjects in bank yet. Type a name above — it will be saved for reuse.
                </p>
              )}
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Subject Code</label>
              <input value={subForm.code} onChange={e=>setSubForm(f=>({...f,code:e.target.value}))} placeholder="e.g. MATH, ENG"
                style={inp({maxWidth:160})} onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
            <div style={{ marginBottom:20,display:"flex",alignItems:"center",gap:10 }}>
              <input type="checkbox" id="is_elective" checked={subForm.is_elective} onChange={e=>setSubForm(f=>({...f,is_elective:e.target.checked}))}
                style={{ width:16,height:16,cursor:"pointer" }}/>
              <label htmlFor="is_elective" style={{ fontSize:13,fontWeight:600,color:"#374151",cursor:"pointer" }}>Elective / Optional subject</label>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setSubjectModal(null)} style={{ flex:1,background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
              <button onClick={saveSubject} disabled={subjectModal.saving}
                style={{ flex:2,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:700,cursor:"pointer",opacity:subjectModal.saving?0.6:1 }}>
                {subjectModal.saving ? "Saving…" : subjectModal.mode==="add" ? "Add Subject" : "Save Changes"}
              </button>
            </div>
          </Modal>
        )}

        {delModal && (
          <DeleteModal item={delModal.name} loading={delModal.saving}
            onClose={()=>setDelModal(null)}
            onConfirm={()=>{ if(delModal.type==="class") deleteClass(); else if(delModal.type==="section") deleteSection(); else deleteSubject(); }}/>
        )}

        {/* ── Subject Bank Modal ── */}
        {subjectBankOpen && (
          <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16 }}
            onClick={()=>setSubjectBankOpen(false)}>
            <div style={{ background:"#fff",borderRadius:16,padding:28,width:"100%",maxWidth:460,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ fontWeight:800,fontSize:16,color:"#0F172A",marginBottom:4 }}>📚 Subject Name Bank</div>
              <p style={{ fontSize:12,color:"#64748B",marginBottom:16 }}>
                Add subject names here. They'll appear in the dropdown when assigning subjects to classes.
              </p>

              {/* Add new name */}
              <div style={{ display:"flex",gap:8,marginBottom:16 }}>
                <input
                  value={newBankName}
                  onChange={e=>setNewBankName(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'){ addNameToBank(newBankName); setNewBankName(''); }}}
                  placeholder="e.g. Environmental Science"
                  style={{ ...inp(),flex:1 }}
                  onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}
                />
                <button
                  onClick={()=>{ addNameToBank(newBankName); setNewBankName(''); }}
                  disabled={!newBankName.trim() || subjectBank.includes(newBankName.trim())}
                  style={{ padding:"9px 16px",background:"#6366F1",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",opacity:(!newBankName.trim()||subjectBank.includes(newBankName.trim()))?0.5:1 }}>
                  + Add
                </button>
              </div>

              {/* Name list */}
              {subjectBank.length === 0 ? (
                <p style={{ color:"#94A3B8",fontSize:13,textAlign:"center",padding:"20px 0" }}>No subjects in bank yet. Add one above.</p>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                  {subjectBank.map(name=>(
                    <div key={name} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#F8FAFC",borderRadius:8,border:"1px solid #F1F5F9" }}>
                      <div style={{ width:8,height:8,borderRadius:2,background:subjectColor(name),flexShrink:0 }}/>
                      <span style={{ flex:1,fontSize:13,fontWeight:600,color:"#1E293B" }}>{name}</span>
                      <button onClick={()=>removeNameFromBank(name)}
                        style={{ background:"none",border:"none",cursor:"pointer",color:"#94A3B8",fontSize:15,padding:2,lineHeight:1 }}
                        title="Remove from bank">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop:20,display:"flex",justifyContent:"flex-end" }}>
                <button onClick={()=>setSubjectBankOpen(false)}
                  style={{ padding:"9px 22px",background:"#6366F1",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer" }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        <Toast toast={toast}/>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif",padding:isMobile?12:24,background:"#F0F4F8",minHeight:"100vh" }}>
      {/* Page header */}
      <div style={{ display:"flex",alignItems:isMobile?"flex-start":"center",justifyContent:"space-between",marginBottom:20,gap:10,flexWrap:"wrap" }}>
        <div>
          <div style={{ fontWeight:900,fontSize:isMobile?18:22,color:"#0F172A" }}>🏫 Classes</div>
          {!isMobile&&<div style={{ fontSize:13,color:"#94A3B8",marginTop:3 }}>Manage classes, sections, timetables and subject assignments</div>}
        </div>
        <button onClick={()=>setClassModal({mode:"add"})}
          style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:10,padding:isMobile?"8px 14px":"10px 20px",fontSize:isMobile?12:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 2px 10px rgba(99,102,241,0.35)",flexShrink:0 }}>
          <span style={{ fontSize:16,lineHeight:1 }}>+</span> New Class
        </button>
      </div>

      {/* Widgets */}
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:isMobile?10:14,marginBottom:22 }}>
        {widgets.map(w=>(
          <div key={w.label} style={{ background:"#fff",borderRadius:14,padding:isMobile?"12px 10px":"18px 20px",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",display:"flex",alignItems:"center",gap:isMobile?8:14,border:`1px solid ${w.c}18`,transition:"transform 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ width:isMobile?36:52,height:isMobile?36:52,background:w.bg,borderRadius:12,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?18:26 }}>{w.icon}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:isMobile?20:26,fontWeight:900,color:w.c,lineHeight:1 }}>{w.value}</div>
              <div style={{ fontSize:isMobile?10:12,fontWeight:700,color:"#374151",marginTop:2 }}>{w.label}</div>
              {!isMobile&&<div style={{ fontSize:10,color:"#94A3B8",marginTop:1 }}>{w.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <span style={{ color:"#DC2626",fontSize:13,fontWeight:600 }}>⚠️ {error}</span>
          <button onClick={fetchClasses} style={{ background:"#EF4444",color:"#fff",border:"none",borderRadius:7,padding:"5px 14px",fontSize:12,fontWeight:700,cursor:"pointer" }}>Retry</button>
        </div>
      )}

      {/* Class cards */}
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(340px,1fr))",gap:isMobile?12:16,marginBottom:20 }}>
        {loadingClasses
          ? Array.from({length:4},(_,i)=><SkeletonCard key={i}/>)
          : classes.map(cls=>{
              const sections = cls.sections || [];
              return (
                <div key={cls.id} style={{ background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",border:"1px solid #F1F5F9",transition:"transform 0.15s,box-shadow 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.1)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,0.07)";}}>
                  <div style={{ height:5,background:"linear-gradient(90deg,#6366F1,#10B981,#3B82F6)" }}/>
                  <div style={{ padding:"20px 20px 14px",borderBottom:"1px solid #F1F5F9",display:"flex",alignItems:"center",gap:16 }}>
                    <div style={{ width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#6366F1,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:"#fff",flexShrink:0 }}>{cls.name}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:900,fontSize:18,color:"#0F172A" }}>Class {cls.name}</div>
                      <div style={{ fontSize:11,color:"#94A3B8",marginTop:2 }}>{cls.sections_count||sections.length} sections · {cls.students_count||0} students</div>
                    </div>
                    <div style={{ display:"flex",gap:6 }}>
                      <button onClick={e=>{e.stopPropagation();openEditClass(cls);}} style={{ padding:"5px 10px",background:"#EEF2FF",color:"#6366F1",border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer" }}>✏️</button>
                      <button onClick={e=>{e.stopPropagation();setDelModal({type:"class",id:cls.id,name:`Class ${cls.name}`});}} style={{ padding:"5px 10px",background:"#FEF2F2",color:"#DC2626",border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer" }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ padding:"14px 20px",borderBottom:"1px solid #F1F5F9" }}>
                    <div style={{ fontSize:10,fontWeight:800,color:"#94A3B8",textTransform:"uppercase",letterSpacing:0.8,marginBottom:8 }}>Sections</div>
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
                      {sections.map(sec=>(
                        <div key={sec.id} style={{ background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:10,padding:"7px 12px",minWidth:60 }}>
                          <div style={{ fontSize:12,fontWeight:900,color:"#6366F1" }}>Sec {sec.name}</div>
                          <div style={{ fontSize:10,color:"#94A3B8",marginTop:2 }}>Cap. {sec.capacity}</div>
                        </div>
                      ))}
                      <button onClick={e=>{e.stopPropagation();openAddSection(cls.id);}} style={{ padding:"7px 12px",background:"#F8FAFC",border:"1px dashed #C7D2FE",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer",color:"#6366F1" }}>+ Section</button>
                    </div>
                  </div>
                  <div style={{ padding:"12px 20px",display:"flex",gap:8 }}>
                    <button onClick={()=>{ setSelClass(cls); setTab("overview"); setView("detail"); }}
                      style={{ flex:1,background:"#EEF2FF",color:"#6366F1",border:"none",borderRadius:8,padding:"8px",fontSize:12,fontWeight:700,cursor:"pointer" }}>👁 View Details</button>
                    <button onClick={()=>{ setSelClass(cls); setTab("timetable"); setView("detail"); }}
                      style={{ flex:1,background:"#F0FDF4",color:"#059669",border:"none",borderRadius:8,padding:"8px",fontSize:12,fontWeight:700,cursor:"pointer" }}>📅 Timetable</button>
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* Analytics strip */}
      {!loadingClasses && classes.length>0 && (
        <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16 }}>📊 School-wide Class Overview</div>
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fill,minmax(180px,1fr))",gap:isMobile?8:12 }}>
            {classes.map(cls=>{
              const sections = cls.sections || [];
              const totalCap = sections.reduce((a,s)=>a+s.capacity,0);
              return (
                <div key={cls.id} style={{ background:"#F8FAFC",borderRadius:12,padding:16,border:"1px solid #F1F5F9" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                    <span style={{ fontWeight:900,fontSize:16,color:"#0F172A" }}>Class {cls.name}</span>
                    <span style={{ fontWeight:800,fontSize:12,color:"#6366F1",background:"#EEF2FF",padding:"2px 8px",borderRadius:8 }}>{cls.sections_count||sections.length} sec</span>
                  </div>
                  <div style={{ fontSize:11,color:"#64748B",marginBottom:4 }}>Capacity: <strong>{totalCap}</strong></div>
                  <div style={{ fontSize:11,color:"#64748B",marginBottom:8 }}>Students: <strong>{cls.students_count||0}</strong></div>
                  <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                    {sections.map(s=>(
                      <span key={s.id} style={{ fontSize:10,fontWeight:700,color:"#6366F1",background:"#EEF2FF",padding:"2px 6px",borderRadius:6 }}>{s.name}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view CRUD modals */}
      {classModal && (
        <Modal title={classModal.mode==="add"?"➕ Add Class":"✏️ Edit Class"} onClose={()=>setClassModal(null)}>
          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Class Name <span style={{ color:"#EF4444" }}>*</span></label>
            <input value={clsForm.name} onChange={e=>setClsForm(f=>({...f,name:e.target.value}))} placeholder="e.g. 10, LKG, 6A"
              style={inp()} onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Display Order</label>
            <input type="number" value={clsForm.display_order} onChange={e=>setClsForm(f=>({...f,display_order:e.target.value}))} placeholder="0"
              style={inp({maxWidth:120})} onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setClassModal(null)} style={{ flex:1,background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
            <button onClick={saveClass} disabled={classModal.saving}
              style={{ flex:2,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:700,cursor:"pointer",opacity:classModal.saving?0.6:1 }}>
              {classModal.saving ? "Saving…" : classModal.mode==="add" ? "Create Class" : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {sectionModal && (
        <Modal title={sectionModal.mode==="add"?"➕ Add Section":"✏️ Edit Section"} onClose={()=>setSectionModal(null)}>
          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Section Name <span style={{ color:"#EF4444" }}>*</span></label>
            <input value={secForm.name} onChange={e=>setSecForm(f=>({...f,name:e.target.value}))} placeholder="e.g. A, B, C"
              style={inp()} onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Capacity</label>
            <input type="number" value={secForm.capacity} onChange={e=>setSecForm(f=>({...f,capacity:e.target.value}))} placeholder="40"
              style={inp({maxWidth:120})} onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setSectionModal(null)} style={{ flex:1,background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
            <button onClick={saveSection} disabled={sectionModal.saving}
              style={{ flex:2,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:10,padding:11,fontSize:13,fontWeight:700,cursor:"pointer",opacity:sectionModal.saving?0.6:1 }}>
              {sectionModal.saving ? "Saving…" : sectionModal.mode==="add" ? "Create Section" : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {delModal && (
        <DeleteModal item={delModal.name} loading={delModal.saving}
          onClose={()=>setDelModal(null)}
          onConfirm={()=>{ if(delModal.type==="class") deleteClass(); else if(delModal.type==="section") deleteSection(); else deleteSubject(); }}/>
      )}

      <Toast toast={toast}/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
