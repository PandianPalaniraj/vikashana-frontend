import { useState, useEffect, useCallback, useRef } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'

// ── API ───────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
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

// ── Constants ─────────────────────────────────────────────────
const CLASSES = ["Nursery","LKG","UKG","1","2","3","4","5","6","7","8","9","10","11","12"];
const SOURCES  = ["Walk-in","Phone Call","Website","WhatsApp","Referral","Social Media","Newspaper Ad","Other"];
const STAGES   = [
  { id:"new",       label:"New Enquiry",    color:"#6366F1", bg:"#EEF2FF", icon:"🆕" },
  { id:"contacted", label:"Contacted",      color:"#3B82F6", bg:"#EFF6FF", icon:"📞" },
  { id:"visit",     label:"Visit Scheduled",color:"#F59E0B", bg:"#FFFBEB", icon:"🏫" },
  { id:"docs",      label:"Docs Submitted", color:"#8B5CF6", bg:"#F5F3FF", icon:"📄" },
  { id:"enrolled",  label:"Enrolled",       color:"#10B981", bg:"#ECFDF5", icon:"✅" },
  { id:"rejected",  label:"Not Interested", color:"#EF4444", bg:"#FEF2F2", icon:"❌" },
];
const GENDERS = ["Male","Female","Other"];
const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];

// ── Normalise API → component shape ───────────────────────────
function normalizeEnq(e) {
  return {
    ...e,
    studentName: e.student_name,
    applyClass:  e.apply_class,
    parentName:  e.parent_name,
    parentPhone: e.parent_phone,
    parentEmail: e.parent_email || '',
    followUpDate: e.follow_up_date || '',
    assignedTo:   e.assigned_to?.name || '',
    assignedToId: e.assigned_to?.id   || null,
    address: e.address || '',
    notes:   e.notes   || '',
  };
}

// Denormalise component form → API body
function toApiBody(form) {
  return {
    student_name:    form.studentName,
    dob:             form.dob        || null,
    gender:          form.gender,
    apply_class:     form.applyClass,
    parent_name:     form.parentName,
    parent_phone:    form.parentPhone,
    parent_email:    form.parentEmail  || null,
    address:         form.address      || null,
    source:          form.source,
    notes:           form.notes        || null,
    follow_up_date:  form.followUpDate || null,
    assigned_to:     form.assignedToId || null,
  };
}

// ── Helpers ───────────────────────────────────────────────────
const stageMeta  = id => STAGES.find(s => s.id === id) || STAGES[0];
const stageIndex = id => STAGES.findIndex(s => s.id === id);
const TODAY = new Date().toISOString().split('T')[0];

// ── Shared UI ─────────────────────────────────────────────────
function Avatar({ name, size=34 }) {
  const n  = name || '?';
  const bg = palette[n.charCodeAt(0) % palette.length];
  return <div style={{ width:size,height:size,borderRadius:"50%",background:bg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:800,color:"#fff" }}>{n.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>;
}

function Toast({ toast }) {
  if (!toast) return null;
  const err = toast.type === "error";
  return <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:err?"#FEF2F2":"#F0FDF4",border:`1px solid ${err?"#FECACA":"#86EFAC"}`,color:err?"#DC2626":"#16A34A",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",maxWidth:320 }}>{err?"❌":"✅"} {toast.msg}</div>;
}

function StagePill({ stage }) {
  const m = stageMeta(stage);
  return <span style={{ background:m.bg,color:m.color,border:`1px solid ${m.color}33`,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap" }}>{m.icon} {m.label}</span>;
}

// ── Stage Progress Bar ────────────────────────────────────────
function StageProgress({ current }) {
  const activeStages = STAGES.filter(s=>s.id!=="rejected");
  const curIdx = activeStages.findIndex(s=>s.id===current);
  const isRejected = current === "rejected";
  return (
    <div style={{ display:"flex",alignItems:"center",gap:0,padding:"16px 0",overflowX:"auto" }}>
      {activeStages.map((s,i)=>{
        const done   = !isRejected && i <= curIdx;
        const active = !isRejected && i === curIdx;
        return (
          <div key={s.id} style={{ display:"flex",alignItems:"center",flex:1,minWidth:0 }}>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:1 }}>
              <div style={{ width:32,height:32,borderRadius:"50%",background:done?s.color:"#E2E8F0",color:done?"#fff":"#94A3B8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,border:active?`3px solid ${s.color}`:"none",boxShadow:active?`0 0 0 3px ${s.color}22`:"none",transition:"all 0.2s" }}>
                {done&&!active?"✓":s.icon}
              </div>
              <div style={{ fontSize:9,fontWeight:700,color:done?s.color:"#94A3B8",textAlign:"center",maxWidth:60,lineHeight:1.2 }}>{s.label}</div>
            </div>
            {i < activeStages.length-1 && <div style={{ height:2,flex:0.5,background:(!isRejected&&i<curIdx)?"#6366F1":"#E2E8F0",minWidth:16,margin:"0 2px",marginBottom:18 }}/>}
          </div>
        );
      })}
      {isRejected && (
        <div style={{ marginLeft:12,background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,color:"#EF4444" }}>❌ Not Interested</div>
      )}
    </div>
  );
}

// ── Convert to Student Modal ──────────────────────────────────
function ConvertModal({ enquiry, onConfirm, onClose, isMobile, classes, academicYears }) {
  // Try to find matching class by name (apply_class is a string like "8")
  const matchedClass = classes.find(c => c.name === enquiry.applyClass || c.name === `Class ${enquiry.applyClass}`) || classes[0] || null;

  const [classId,     setClassId]     = useState(matchedClass?.id || '');
  const [sections,    setSections]    = useState([]);
  const [sectionId,   setSectionId]   = useState('');
  const [yearId,      setYearId]      = useState('');
  const [admNo,       setAdmNo]       = useState(`VN${new Date().getFullYear()}${String(Math.floor(Math.random()*900)+100)}`);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');

  // Auto-select current academic year
  useEffect(() => {
    const cur = academicYears.find(y => y.is_current) || academicYears[0];
    if (cur) setYearId(String(cur.id));
  }, [academicYears]);

  // Load sections when class changes
  useEffect(() => {
    setSections([]); setSectionId('');
    if (!classId) return;
    API(`/sections?class_id=${classId}`).then(r => {
      if (r.success) { setSections(r.data); if (r.data[0]) setSectionId(String(r.data[0].id)); }
    });
  }, [classId]);

  const handleConfirm = async () => {
    if (!admNo.trim()) { setErr('Admission number is required'); return; }
    if (!classId)      { setErr('Select a class'); return; }
    if (!sectionId)    { setErr('Select a section'); return; }
    if (!yearId)       { setErr('Select an academic year'); return; }
    setErr('');
    setSaving(true);
    try {
      await onConfirm({ admNo, classId: Number(classId), sectionId: Number(sectionId), academicYearId: Number(yearId) });
    } finally { setSaving(false); }
  };

  const inp = { width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit" };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth:480,boxShadow:"0 24px 60px rgba(0,0,0,0.25)",overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#10B981,#059669)",padding:"20px 24px",color:"#fff" }}>
          <div style={{ fontWeight:900,fontSize:18 }}>🎓 Convert to Student</div>
          <div style={{ fontSize:12,opacity:0.8,marginTop:3 }}>Enroll {enquiry.studentName} as a registered student</div>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:10,padding:"12px 16px",marginBottom:20 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#16A34A",marginBottom:6 }}>Student Details</div>
            <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6,fontSize:12,color:"#374151" }}>
              <div><span style={{ color:"#94A3B8" }}>Name: </span><strong>{enquiry.studentName}</strong></div>
              <div><span style={{ color:"#94A3B8" }}>Gender: </span><strong>{enquiry.gender}</strong></div>
              <div><span style={{ color:"#94A3B8" }}>DOB: </span><strong>{enquiry.dob}</strong></div>
              <div><span style={{ color:"#94A3B8" }}>Parent: </span><strong>{enquiry.parentName}</strong></div>
            </div>
          </div>
          <div style={{ display:"grid",gap:14 }}>
            <div>
              <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.8 }}>Admission Number</label>
              <input value={admNo} onChange={e=>setAdmNo(e.target.value)} style={inp}
                onFocus={e=>e.target.style.borderColor="#10B981"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            </div>
            <div>
              <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.8 }}>Academic Year</label>
              <select value={yearId} onChange={e=>setYearId(e.target.value)} style={inp}>
                <option value="">— Select Year —</option>
                {academicYears.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12 }}>
              <div>
                <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.8 }}>Class</label>
                <select value={classId} onChange={e=>setClassId(e.target.value)} style={inp}>
                  <option value="">— Select Class —</option>
                  {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.8 }}>Section</label>
                <select value={sectionId} onChange={e=>setSectionId(e.target.value)} style={inp}
                  disabled={!classId}>
                  <option value="">{classId?"— Select —":"Select class first"}</option>
                  {sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          {err && <div style={{ marginTop:10,padding:"8px 12px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,fontSize:12,color:"#DC2626",fontWeight:600 }}>{err}</div>}
          <div style={{ display:"flex",gap:10,marginTop:22 }}>
            <button onClick={onClose} disabled={saving} style={{ flex:1,background:"#F1F5F9",border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:600,cursor:"pointer",color:"#475569" }}>Cancel</button>
            <button onClick={handleConfirm} disabled={saving} style={{ flex:2,background:"linear-gradient(135deg,#10B981,#059669)",color:"#fff",border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:"0 2px 10px rgba(16,185,129,0.35)",opacity:saving?0.7:1 }}>
              {saving ? "Enrolling…" : "✓ Confirm Enrollment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Enquiry Form ──────────────────────────────────────────────
const EMPTY_FORM = {
  studentName:"", dob:"", gender:"Male", applyClass:"8",
  parentName:"", parentPhone:"", parentEmail:"", address:"",
  source:"Walk-in", notes:"", assignedToId:"", followUpDate:"",
};

function EnquiryForm({ initial, onSave, onCancel, title, isMobile, isTablet, staff, saving }) {
  const [form, setForm] = useState(initial ? {
    ...EMPTY_FORM,
    studentName:  initial.studentName  || initial.student_name || '',
    dob:          initial.dob          || '',
    gender:       initial.gender       || 'Male',
    applyClass:   initial.applyClass   || initial.apply_class  || '8',
    parentName:   initial.parentName   || initial.parent_name  || '',
    parentPhone:  initial.parentPhone  || initial.parent_phone || '',
    parentEmail:  initial.parentEmail  || initial.parent_email || '',
    address:      initial.address      || '',
    source:       initial.source       || 'Walk-in',
    notes:        initial.notes        || '',
    assignedToId: initial.assignedToId != null ? String(initial.assignedToId) : '',
    followUpDate: initial.followUpDate || initial.follow_up_date || '',
  } : EMPTY_FORM);
  const setF = patch => setForm(f=>({...f,...patch}));

  const fields1 = [["studentName","Student Name","text","e.g. Aryan Kapoor",true],["dob","Date of Birth","date","",true]];
  const fields2 = [["parentName","Parent / Guardian Name","text","e.g. Ramesh Kapoor",true],["parentPhone","Parent Phone","tel","10-digit mobile",true],["parentEmail","Parent Email","email","email@example.com",false],["address","Address","text","Full address",false]];
  const inp = { width:"100%",padding:"9px 11px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit" };
  const lbl = { fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 };

  return (
    <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 320px",gap:16 }}>
      {/* Left */}
      <div style={{ display:"grid",gap:14 }}>
        <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16,paddingBottom:10,borderBottom:"1px solid #F1F5F9" }}>👨‍🎓 Student Details</div>
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12 }}>
            {fields1.map(([key,lbl_,type,ph,req])=>(
              <div key={key}>
                <label style={lbl}>{lbl_}{req&&<span style={{ color:"#EF4444" }}> *</span>}</label>
                <input type={type} value={form[key]} onChange={e=>setF({[key]:e.target.value})} placeholder={ph} style={inp}
                  onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
              </div>
            ))}
            <div>
              <label style={lbl}>Gender</label>
              <div style={{ display:"flex",gap:6 }}>
                {GENDERS.map(g=>(
                  <button key={g} onClick={()=>setF({gender:g})} style={{ flex:1,padding:"8px 4px",borderRadius:8,border:"1.5px solid",fontSize:11,fontWeight:700,cursor:"pointer",borderColor:form.gender===g?"#6366F1":"#E2E8F0",background:form.gender===g?"#EEF2FF":"#fff",color:form.gender===g?"#6366F1":"#94A3B8" }}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Applying for Class <span style={{ color:"#EF4444" }}>*</span></label>
              <select value={form.applyClass} onChange={e=>setF({applyClass:e.target.value})} style={{ ...inp,padding:"9px 10px" }}>
                {CLASSES.map(c=><option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16,paddingBottom:10,borderBottom:"1px solid #F1F5F9" }}>👨‍👩‍👧 Parent / Guardian Details</div>
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12 }}>
            {fields2.map(([key,lbl_,type,ph,req])=>(
              <div key={key}>
                <label style={lbl}>{lbl_}{req&&<span style={{ color:"#EF4444" }}> *</span>}</label>
                <input type={type} value={form[key]} onChange={e=>setF({[key]:e.target.value})} placeholder={ph} style={inp}
                  onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:12 }}>📝 Notes</div>
          <textarea value={form.notes} onChange={e=>setF({notes:e.target.value})} placeholder="Any additional notes about the enquiry…" rows={3}
            style={{ ...inp,resize:"vertical",lineHeight:1.6 }}
            onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
        </div>
      </div>

      {/* Right */}
      <div style={{ display:"grid",gap:14,alignContent:"start" }}>
        <div style={{ background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize:10,fontWeight:800,color:"#64748B",marginBottom:12,textTransform:"uppercase",letterSpacing:0.8 }}>📣 Enquiry Source</div>
          <div style={{ display:"grid",gap:6,maxHeight:isMobile?180:undefined,overflowY:isMobile?"auto":undefined }}>
            {SOURCES.map(s=>(
              <label key={s} style={{ display:"flex",alignItems:"center",gap:9,padding:"8px 11px",borderRadius:8,cursor:"pointer",background:form.source===s?"#EEF2FF":"#F8FAFC",border:`1px solid ${form.source===s?"#C7D2FE":"#F1F5F9"}` }}>
                <input type="radio" checked={form.source===s} onChange={()=>setF({source:s})} style={{ accentColor:"#6366F1" }}/>
                <span style={{ fontSize:12,fontWeight:600,color:form.source===s?"#6366F1":"#374151" }}>{s}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={{ background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize:10,fontWeight:800,color:"#64748B",marginBottom:8,textTransform:"uppercase",letterSpacing:0.8 }}>👤 Assigned To</div>
          <select value={form.assignedToId} onChange={e=>setF({assignedToId:e.target.value})} style={{ width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit",marginBottom:14 }}>
            <option value="">— Unassigned —</option>
            {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div style={{ fontSize:10,fontWeight:800,color:"#64748B",marginBottom:8,textTransform:"uppercase",letterSpacing:0.8 }}>📅 Follow-up Date</div>
          <input type="date" value={form.followUpDate||""} onChange={e=>setF({followUpDate:e.target.value})} style={{ width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}/>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          <button onClick={()=>onSave(form)} disabled={saving} style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:11,padding:"13px",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:"0 2px 10px rgba(99,102,241,0.35)",opacity:saving?0.7:1 }}>
            {saving ? "Saving…" : `✓ ${title||"Save Enquiry"}`}
          </button>
          <button onClick={onCancel} disabled={saving} style={{ background:"#F1F5F9",border:"none",borderRadius:11,padding:"11px",fontSize:13,fontWeight:600,cursor:"pointer",color:"#475569" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Detail View ───────────────────────────────────────────────
function DetailView({ enquiry, onBack, onUpdate, onStageChange, onConvert, onDelete, isMobile, isTablet, staff, classes, academicYears }) {
  const [editing,       setEditing]     = useState(false);
  const [showConvert,   setConvert]     = useState(false);
  const [confirmDelete, setConfirmDel]  = useState(false);
  const [stageUpdating, setStageUpd]   = useState(false);
  const [formSaving,    setFormSaving]  = useState(false);
  const [toast,         setToast]       = useState(null);
  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const handleStageChange = async (stageId) => {
    setStageUpd(true);
    try {
      await onStageChange(enquiry.id, stageId);
      showToast(`Stage updated to "${stageMeta(stageId).label}"`);
    } catch(e) {
      showToast(e.message || "Failed to update stage", "error");
    } finally { setStageUpd(false); }
  };

  const handleSave = async (form) => {
    setFormSaving(true);
    try {
      await onUpdate({ ...form, id: enquiry.id });
      setEditing(false);
      showToast("Enquiry updated!");
    } catch(e) {
      showToast(e.message || "Failed to save", "error");
    } finally { setFormSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await onDelete(enquiry.id);
      onBack();
    } catch(e) {
      showToast(e.message || "Failed to delete", "error");
      setConfirmDel(false);
    }
  };

  const handleConvert = async (data) => {
    try {
      await onConvert(enquiry, data);
      setConvert(false);
      showToast(`${enquiry.studentName} enrolled successfully!`);
    } catch(e) {
      showToast(e.message || "Failed to convert", "error");
    }
  };

  const handleWhatsApp = () => {
    const msg = `Dear ${enquiry.parentName},\n\nThank you for your enquiry at our school for ${enquiry.studentName} (Class ${enquiry.applyClass}).\n\nOur admissions team will contact you shortly.\n\nRegards,\nAdmissions Team`;
    window.open(`https://wa.me/91${enquiry.parentPhone}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  if (editing) return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
        <button onClick={()=>setEditing(false)} style={{ background:"#F1F5F9",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,color:"#475569" }}>← Cancel</button>
        <div style={{ fontWeight:800,fontSize:16,color:"#0F172A" }}>✏️ Edit Enquiry</div>
      </div>
      <EnquiryForm initial={enquiry} title="Save Changes" isMobile={isMobile} isTablet={isTablet} staff={staff} saving={formSaving} onSave={handleSave} onCancel={()=>setEditing(false)}/>
      <Toast toast={toast}/>
    </div>
  );

  const m = stageMeta(enquiry.stage);
  return (
    <div>
      <div style={{ display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap" }}>
        <button onClick={onBack} style={{ background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontWeight:600,color:"#475569" }}>← Back</button>
        <div style={{ marginLeft:"auto",display:"flex",gap:8,flexWrap:"wrap" }}>
          <button onClick={handleWhatsApp} style={{ background:"#F0FDF4",color:"#16A34A",border:"1px solid #86EFAC",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontWeight:700 }}>📱 WhatsApp</button>
          <button onClick={()=>setEditing(true)} style={{ background:"#EEF2FF",color:"#6366F1",border:"1px solid #C7D2FE",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontWeight:700 }}>✏️ Edit</button>
          {enquiry.stage!=="enrolled"&&enquiry.stage!=="rejected"&&(
            <button onClick={()=>setConvert(true)} style={{ background:"linear-gradient(135deg,#10B981,#059669)",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,cursor:"pointer",fontWeight:700,boxShadow:"0 2px 8px rgba(16,185,129,0.3)" }}>🎓 Convert to Student</button>
          )}
          {!confirmDelete
            ? <button onClick={()=>setConfirmDel(true)} style={{ background:"#FEF2F2",color:"#EF4444",border:"1px solid #FECACA",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontWeight:700 }}>🗑 Delete</button>
            : <div style={{ display:"flex",alignItems:"center",gap:6,background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"5px 10px" }}>
                <span style={{ fontSize:11,fontWeight:700,color:"#EF4444" }}>Sure?</span>
                <button onClick={handleDelete} style={{ background:"#EF4444",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:800,cursor:"pointer" }}>Yes</button>
                <button onClick={()=>setConfirmDel(false)} style={{ background:"#F1F5F9",color:"#475569",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer" }}>No</button>
              </div>
          }
        </div>
      </div>

      <div style={{ background:"#fff",borderRadius:16,overflow:"hidden",overflowX:"auto",marginBottom:16,boxShadow:"0 1px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ background:`linear-gradient(135deg,#0F172A,#1E3A5F,${m.color})`,padding:"24px 28px",color:"#fff",display:"flex",alignItems:"center",gap:20 }}>
          <Avatar name={enquiry.studentName} size={60}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900,fontSize:22 }}>{enquiry.studentName}</div>
            <div style={{ opacity:0.7,fontSize:13,marginTop:3 }}>{enquiry.gender} · Class {enquiry.applyClass} · DOB: {enquiry.dob}</div>
            <div style={{ marginTop:8,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
              <StagePill stage={enquiry.stage}/>
              <span style={{ fontSize:12,opacity:0.7 }}>Source: {enquiry.source}</span>
              {enquiry.assignedTo && <span style={{ fontSize:12,opacity:0.7 }}>Assigned: {enquiry.assignedTo}</span>}
            </div>
          </div>
          <div style={{ textAlign:"center",background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"12px 20px" }}>
            <div style={{ fontSize:11,opacity:0.7,marginBottom:4 }}>Enquiry ID</div>
            <div style={{ fontWeight:900,fontSize:16,letterSpacing:1 }}>#{enquiry.id}</div>
            <div style={{ fontSize:10,opacity:0.6,marginTop:4 }}>{enquiry.date}</div>
          </div>
        </div>
        <div style={{ padding:"8px 28px 4px",borderBottom:"1px solid #F1F5F9" }}>
          <StageProgress current={enquiry.stage}/>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:16 }}>
        <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:14 }}>👨‍👩‍👧 Parent Details</div>
          {[["Parent Name",enquiry.parentName],["Phone",enquiry.parentPhone],["Email",enquiry.parentEmail||"—"],["Address",enquiry.address||"—"]].map(([k,v])=>(
            <div key={k} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"#F8FAFC",borderRadius:8,border:"1px solid #F1F5F9",marginBottom:7 }}>
              <span style={{ fontSize:11,fontWeight:600,color:"#64748B" }}>{k}</span>
              <span style={{ fontSize:12,fontWeight:700,color:"#0F172A",maxWidth:200,textAlign:"right" }}>{v}</span>
            </div>
          ))}
          <button onClick={handleWhatsApp} style={{ width:"100%",marginTop:8,background:"#F0FDF4",color:"#16A34A",border:"1px solid #86EFAC",borderRadius:9,padding:"9px",fontSize:12,cursor:"pointer",fontWeight:700 }}>📱 Send WhatsApp to Parent</button>
        </div>
        <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:14 }}>📋 Enquiry Info</div>
          {[["Enquiry Date",enquiry.date||"—"],["Source",enquiry.source],["Applying For","Class "+enquiry.applyClass],["Assigned To",enquiry.assignedTo||"Unassigned"],["Follow-up",enquiry.followUpDate||"Not set"]].map(([k,v])=>(
            <div key={k} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"#F8FAFC",borderRadius:8,border:"1px solid #F1F5F9",marginBottom:7 }}>
              <span style={{ fontSize:11,fontWeight:600,color:"#64748B" }}>{k}</span>
              <span style={{ fontSize:12,fontWeight:700,color:"#0F172A" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {enquiry.notes && (
        <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",marginBottom:16 }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:10 }}>📝 Notes</div>
          <div style={{ fontSize:13,color:"#374151",lineHeight:1.7,background:"#F8FAFC",padding:"14px 16px",borderRadius:9,border:"1px solid #F1F5F9" }}>{enquiry.notes}</div>
        </div>
      )}

      {enquiry.stage !== "enrolled" && (
        <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:14 }}>⚡ Update Stage</div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {STAGES.map(s=>(
              <button key={s.id}
                onClick={()=>s.id==='enrolled' ? setConvert(true) : handleStageChange(s.id)}
                disabled={stageUpdating||enquiry.stage===s.id}
                style={{ padding:"8px 16px",borderRadius:9,border:"1.5px solid",fontSize:12,fontWeight:700,cursor:stageUpdating||enquiry.stage===s.id?"not-allowed":"pointer",borderColor:enquiry.stage===s.id?s.color:"#E2E8F0",background:enquiry.stage===s.id?s.bg:"#F8FAFC",color:enquiry.stage===s.id?s.color:"#64748B",opacity:stageUpdating&&enquiry.stage!==s.id?0.5:1 }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {enquiry.stage === "enrolled" && (
        <div style={{ background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",border:"2px solid #6EE7B7",borderRadius:14,padding:"18px 22px",display:"flex",alignItems:"center",gap:16 }}>
          <div style={{ fontSize:40 }}>🎓</div>
          <div>
            <div style={{ fontWeight:900,fontSize:16,color:"#065F46" }}>{enquiry.studentName} is now enrolled!</div>
            <div style={{ fontSize:12,color:"#059669",marginTop:2 }}>This enquiry has been converted to a student record.</div>
          </div>
        </div>
      )}

      {showConvert && (
        <ConvertModal
          enquiry={enquiry}
          isMobile={isMobile}
          classes={classes}
          academicYears={academicYears}
          onClose={()=>setConvert(false)}
          onConfirm={handleConvert}
        />
      )}
      <Toast toast={toast}/>
    </div>
  );
}

// ── Kanban Board ──────────────────────────────────────────────
function KanbanBoard({ enquiries, onCardClick }) {
  const activeStages = STAGES.filter(s=>s.id!=="rejected");
  return (
    <div style={{ display:"flex",gap:12,overflowX:"auto",paddingBottom:8 }}>
      {activeStages.map(stage=>{
        const cards = enquiries.filter(e=>e.stage===stage.id);
        return (
          <div key={stage.id} style={{ minWidth:220,flex:"0 0 220px" }}>
            <div style={{ background:stage.bg,border:`1px solid ${stage.color}33`,borderRadius:10,padding:"9px 13px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ fontWeight:800,fontSize:12,color:stage.color }}>{stage.icon} {stage.label}</span>
              <span style={{ background:stage.color,color:"#fff",width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800 }}>{cards.length}</span>
            </div>
            <div style={{ display:"grid",gap:8,minHeight:120 }}>
              {cards.map(e=>(
                <div key={e.id} onClick={()=>onCardClick(e)} style={{ background:"#fff",borderRadius:11,padding:"12px 14px",boxShadow:"0 1px 6px rgba(0,0,0,0.07)",border:"1px solid #F1F5F9",cursor:"pointer",borderTop:`3px solid ${stage.color}`,transition:"all 0.15s" }}
                  onMouseEnter={ex=>{ex.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.12)";ex.currentTarget.style.transform="translateY(-1px)";}}
                  onMouseLeave={ex=>{ex.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,0.07)";ex.currentTarget.style.transform="";}}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:7 }}>
                    <Avatar name={e.studentName} size={28}/>
                    <div>
                      <div style={{ fontWeight:800,fontSize:12,color:"#0F172A",lineHeight:1.2 }}>{e.studentName}</div>
                      <div style={{ fontSize:10,color:"#94A3B8" }}>Class {e.applyClass}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:10,color:"#64748B",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>👨‍👩‍👧 {e.parentName}</div>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ fontSize:10,color:"#94A3B8",background:"#F1F5F9",padding:"2px 7px",borderRadius:6,fontWeight:600 }}>{e.source}</span>
                    {e.followUpDate&&<span style={{ fontSize:9,color:e.followUpDate===TODAY?"#EF4444":"#F59E0B",fontWeight:700 }}>📅 {e.followUpDate}</span>}
                  </div>
                </div>
              ))}
              {cards.length===0 && <div style={{ padding:20,textAlign:"center",color:"#CBD5E1",fontSize:11,border:"1.5px dashed #E2E8F0",borderRadius:10 }}>No enquiries</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN ADMISSIONS COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Admissions() {
  const bp       = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  // ── API data ──────────────────────────────────────────────
  const [enquiries,    setEnquiries]  = useState([]);
  const [stats,        setStats]      = useState(null);
  const [staff,        setStaff]      = useState([]);
  const [classes,      setClasses]    = useState([]);
  const [academicYears,setAcYears]    = useState([]);
  const [meta,         setMeta]       = useState({ page:1, last_page:1, total:0 });

  // ── Filters (server-side) ─────────────────────────────────
  const [filterStage,  setFilterStage]  = useState("all");
  const [searchInput,  setSearchInput]  = useState("");  // immediate input
  const [search,       setSearch]       = useState("");  // debounced
  const [filterClass,  setFilterClass]  = useState("all"); // client-side only

  // ── UI state ──────────────────────────────────────────────
  const [view,    setView]    = useState("list"); // list | kanban | create | detail
  const [selEnq,  setSelEnq]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);
  const showToast = useCallback((msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); }, []);

  // ── Debounce search ───────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Load helpers ──────────────────────────────────────────
  const loadStats = useCallback(() => {
    API('/admissions/stats').then(r => { if (r.success) setStats(r.data); });
  }, []);

  const loadList = useCallback(async (page = 1, append = false) => {
    const p = new URLSearchParams({ per_page:'20', page:String(page) });
    if (filterStage !== 'all') p.set('stage', filterStage);
    if (search) p.set('search', search);
    const r = await API(`/admissions/enquiries?${p}`);
    if (r.success) {
      const norm = (r.data || []).map(normalizeEnq);
      setEnquiries(prev => append ? [...prev, ...norm] : norm);
      setMeta(r.meta || { page:1, last_page:1, total:0 });
    }
  }, [filterStage, search]);

  // ── Mount: load everything ────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadList(1),
      API('/admissions/stats'),
      API('/staff'),
      API('/classes'),
      API('/academic-years'),
    ]).then(([, sr, staffR, classR, yearR]) => {
      if (sr.success)    setStats(sr.data);
      if (staffR.success) setStaff(staffR.data);
      if (classR.success) setClasses(classR.data);
      if (yearR.success)  setAcYears(yearR.data);
    }).catch(()=>{}).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  // ── Reload when filters/search change (after mount) ───────
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setLoading(true);
    loadList(1).finally(() => setLoading(false));
  }, [filterStage, search]); // eslint-disable-line

  // ── Action handlers ───────────────────────────────────────
  const handleSaveNew = async (form) => {
    if (!form.studentName.trim()||!form.parentName.trim()||!form.parentPhone.trim()) {
      showToast("Name and phone are required","error"); return;
    }
    setSaving(true);
    const r = await API('/admissions/enquiries', { method:'POST', body: JSON.stringify(toApiBody(form)) });
    setSaving(false);
    if (!r.success) { showToast(r.message||"Failed to save","error"); return; }
    showToast(`Enquiry for ${form.studentName} added!`);
    setView("list");
    loadList(1).then(() => loadStats());
  };

  const handleUpdate = async (form) => {
    const r = await API(`/admissions/enquiries/${form.id}`, { method:'PUT', body: JSON.stringify(toApiBody(form)) });
    if (!r.success) throw new Error(r.message||"Failed to update");
    const norm = normalizeEnq(r.data);
    setEnquiries(prev => prev.map(e => e.id===norm.id ? norm : e));
    setSelEnq(norm);
  };

  const handleStageChange = async (id, stage) => {
    const r = await API(`/admissions/enquiries/${id}/stage`, { method:'PUT', body: JSON.stringify({ stage }) });
    if (!r.success) throw new Error(r.message||"Failed to update stage");
    setEnquiries(prev => prev.map(e => e.id===id ? { ...e, stage } : e));
    setSelEnq(prev => prev?.id===id ? { ...prev, stage } : prev);
    loadStats();
  };

  const handleConvert = async (enquiry, data) => {
    const r = await API(`/admissions/enquiries/${enquiry.id}/convert`, { method:'POST', body: JSON.stringify({
      admission_no: data.admNo, class_id: data.classId, section_id: data.sectionId, academic_year_id: data.academicYearId,
    })});
    if (!r.success) throw new Error(r.message||"Failed to convert");
    const updated = { ...enquiry, stage:'enrolled' };
    setEnquiries(prev => prev.map(e => e.id===enquiry.id ? updated : e));
    setSelEnq(updated);
    loadStats();
  };

  const handleDelete = async (id) => {
    const r = await API(`/admissions/enquiries/${id}`, { method:'DELETE' });
    if (!r.success) throw new Error(r.message||"Failed to delete");
    setEnquiries(prev => prev.filter(e => e.id!==id));
    showToast("Enquiry deleted");
    loadStats();
  };

  const handleLoadMore = async () => {
    if (meta.page >= meta.last_page) return;
    setLoadingMore(true);
    await loadList(meta.page + 1, true);
    setLoadingMore(false);
  };

  // ── Client-side class filter ──────────────────────────────
  const filtered = filterClass==="all" ? enquiries : enquiries.filter(e => e.applyClass===filterClass);

  // ── KPI widgets ───────────────────────────────────────────
  const followUpsToday = enquiries.filter(e => e.followUpDate===TODAY).length;
  const widgets = [
    { icon:"📋", label:"Total Enquiries",  value: stats?.total ?? '…',            c:"#6366F1", bg:"#EEF2FF", sub:"All time"           },
    { icon:"🎓", label:"Enrolled",         value: stats?.enrolled ?? '…',         c:"#10B981", bg:"#ECFDF5", sub:"Converted students" },
    { icon:"📈", label:"Conversion Rate",  value: stats ? stats.conversion_rate+"%" : '…', c:"#3B82F6", bg:"#EFF6FF", sub:"Enquiry → Enroll" },
    { icon:"📅", label:"Follow-ups Today", value: followUpsToday,                 c:"#F59E0B", bg:"#FFFBEB", sub:"Due today"           },
  ];

  const stageCount = id => stats?.by_stage?.[id] ?? enquiries.filter(e=>e.stage===id).length;

  // ── Detail View ───────────────────────────────────────────
  if (view==="detail" && selEnq) {
    const latest = enquiries.find(e=>e.id===selEnq.id) || selEnq;
    return (
      <div style={{ fontFamily:"'Segoe UI',sans-serif",padding:isMobile?12:24,background:"#F0F4F8",minHeight:"100vh" }}>
        <DetailView enquiry={latest} isMobile={isMobile} isTablet={isTablet}
          onBack={()=>{ setView("list"); setSelEnq(null); }}
          onUpdate={handleUpdate}
          onStageChange={handleStageChange}
          onConvert={handleConvert}
          onDelete={handleDelete}
          staff={staff} classes={classes} academicYears={academicYears}/>
        <Toast toast={toast}/>
      </div>
    );
  }

  // ── Create View ───────────────────────────────────────────
  if (view==="create") return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif",padding:isMobile?12:24,background:"#F0F4F8",minHeight:"100vh" }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
        <button onClick={()=>setView("list")} style={{ background:"#F1F5F9",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,color:"#475569" }}>← Back</button>
        <div>
          <div style={{ fontWeight:900,fontSize:18,color:"#0F172A" }}>➕ New Admission Enquiry</div>
          <div style={{ fontSize:12,color:"#94A3B8",marginTop:2 }}>Capture student and parent details</div>
        </div>
      </div>
      <EnquiryForm title="Save Enquiry" isMobile={isMobile} isTablet={isTablet} staff={staff} saving={saving} onSave={handleSaveNew} onCancel={()=>setView("list")}/>
      <Toast toast={toast}/>
    </div>
  );

  // ── List / Kanban View ────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif",padding:isMobile?12:24,background:"#F0F4F8",minHeight:"100vh" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22 }}>
        <div>
          <div style={{ fontWeight:900,fontSize:isMobile?16:22,color:"#0F172A" }}>🎓 {isMobile?"Admissions":"Admission Enquiries"}</div>
          <div style={{ fontSize:13,color:"#94A3B8",marginTop:3 }}>Track, manage and convert admission leads</div>
        </div>
        <button onClick={()=>setView("create")} style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 2px 10px rgba(99,102,241,0.35)" }}>
          <span style={{ fontSize:18,lineHeight:1 }}>+</span>{isMobile?"New":"New Enquiry"}
        </button>
      </div>

      {/* Widgets */}
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:22 }}>
        {widgets.map(w=>(
          <div key={w.label} style={{ background:"#fff",borderRadius:14,padding:"18px 20px",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",display:"flex",alignItems:"center",gap:14,border:`1px solid ${w.c}18`,transition:"transform 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ width:isMobile?40:52,height:isMobile?40:52,background:w.bg,borderRadius:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?20:26 }}>{w.icon}</div>
            <div>
              <div style={{ fontSize:isMobile?20:26,fontWeight:900,color:w.c,lineHeight:1 }}>{w.value}</div>
              <div style={{ fontSize:12,fontWeight:700,color:"#374151",marginTop:2 }}>{w.label}</div>
              <div style={{ fontSize:10,color:"#94A3B8",marginTop:1 }}>{w.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
        <div style={{ position:"relative",flex:1,minWidth:isMobile?120:220 }}>
          <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#94A3B8" }}>🔍</span>
          <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Search by name or phone…"
            style={{ width:"100%",paddingLeft:34,paddingRight:12,paddingTop:9,paddingBottom:9,borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",background:"#fff",boxSizing:"border-box",fontFamily:"inherit" }}/>
        </div>
        <select value={filterStage} onChange={e=>setFilterStage(e.target.value)} style={{ padding:"9px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit",background:"#fff",fontWeight:600,color:"#374151" }}>
          <option value="all">All Stages</option>
          {STAGES.map(s=><option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
        </select>
        <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} style={{ padding:"9px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit",background:"#fff",fontWeight:600,color:"#374151" }}>
          <option value="all">All Classes</option>
          {CLASSES.map(c=><option key={c} value={c}>Class {c}</option>)}
        </select>
        <div style={{ display:"flex",gap:0,background:"#E2E8F0",borderRadius:9,padding:3 }}>
          {[["list","☰ List"],["kanban","⊞ Kanban"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:"6px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:view===v?"#fff":"transparent",color:view===v?"#6366F1":"#64748B",boxShadow:view===v?"0 1px 4px rgba(0,0,0,0.08)":"none" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ background:"#fff",borderRadius:14,overflow:"hidden" }}>
          {[1,2,3,4,5].map(i=>(
            <div key={i} style={{ padding:"14px 18px",borderBottom:"1px solid #F1F5F9",display:"flex",gap:12,alignItems:"center" }}>
              <div style={{ width:32,height:32,borderRadius:"50%",background:"#E2E8F0",flexShrink:0 }}/>
              <div style={{ flex:1,height:13,background:"#E2E8F0",borderRadius:6 }}/>
              <div style={{ width:80,height:13,background:"#E2E8F0",borderRadius:6 }}/>
              <div style={{ width:90,height:13,background:"#E2E8F0",borderRadius:6 }}/>
            </div>
          ))}
        </div>
      )}

      {/* Kanban */}
      {!loading && view==="kanban" && (
        <KanbanBoard enquiries={filtered} onCardClick={e=>{ setSelEnq(e); setView("detail"); }}/>
      )}

      {/* List */}
      {!loading && view==="list" && (
        <div style={{ background:"#fff",borderRadius:14,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",overflow:"hidden",overflowX:"auto" }}>
          <div style={{ padding:"13px 20px",borderBottom:"1px solid #F1F5F9",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ fontWeight:800,fontSize:14,color:"#0F172A" }}>All Enquiries</div>
            <span style={{ background:"#EEF2FF",color:"#6366F1",padding:"3px 12px",borderRadius:12,fontSize:12,fontWeight:700 }}>{meta.total} records</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",minWidth:800 }}>
              <thead>
                <tr style={{ background:"#F8FAFC",borderBottom:"2px solid #E2E8F0" }}>
                  {["Student","Class","Parent & Contact","Source","Stage","Follow-up","Actions"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:800,color:"#64748B",textTransform:"uppercase",letterSpacing:0.6,whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0
                  ? <tr><td colSpan={7} style={{ padding:40,textAlign:"center",color:"#94A3B8",fontSize:13 }}>No enquiries found</td></tr>
                  : filtered.map(e=>{
                      const isToday = e.followUpDate===TODAY;
                      return (
                        <tr key={e.id} style={{ borderBottom:"1px solid #F1F5F9",cursor:"pointer",background:isToday?"#FFFBEB":"" }}
                          onMouseEnter={el=>el.currentTarget.style.background=isToday?"#FEF3C7":"#FAFBFC"}
                          onMouseLeave={el=>el.currentTarget.style.background=isToday?"#FFFBEB":""}>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                              <Avatar name={e.studentName} size={32}/>
                              <div>
                                <div style={{ fontWeight:800,fontSize:13,color:"#0F172A" }}>{e.studentName}</div>
                                <div style={{ fontSize:10,color:"#94A3B8" }}>#{e.id} · {e.date}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"12px 14px" }}>
                            <span style={{ background:"#EEF2FF",color:"#6366F1",padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:800 }}>Class {e.applyClass}</span>
                          </td>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ fontSize:12,fontWeight:700,color:"#374151" }}>{e.parentName}</div>
                            <div style={{ fontSize:11,color:"#94A3B8" }}>📱 {e.parentPhone}</div>
                          </td>
                          <td style={{ padding:"12px 14px" }}>
                            <span style={{ fontSize:11,color:"#64748B",background:"#F1F5F9",padding:"3px 9px",borderRadius:8,fontWeight:600 }}>{e.source}</span>
                          </td>
                          <td style={{ padding:"12px 14px" }}><StagePill stage={e.stage}/></td>
                          <td style={{ padding:"12px 14px" }}>
                            {e.followUpDate
                              ? <span style={{ fontSize:11,fontWeight:700,color:isToday?"#EF4444":"#F59E0B" }}>{isToday?"🔴":"📅"} {e.followUpDate}</span>
                              : <span style={{ fontSize:11,color:"#CBD5E1" }}>—</span>}
                          </td>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ display:"flex",gap:6 }}>
                              <button onClick={()=>{ setSelEnq(e); setView("detail"); }} style={{ background:"#EEF2FF",color:"#6366F1",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>👁 View</button>
                              <button onClick={ev=>{ ev.stopPropagation(); window.open(`https://wa.me/91${e.parentPhone}?text=${encodeURIComponent(`Dear ${e.parentName}, thank you for your enquiry at our school for ${e.studentName}.`)}`,"_blank"); }} style={{ background:"#F0FDF4",color:"#16A34A",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>📱</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
          {/* Load more */}
          {meta.page < meta.last_page && (
            <div style={{ padding:"14px 20px",textAlign:"center",borderTop:"1px solid #F1F5F9" }}>
              <button onClick={handleLoadMore} disabled={loadingMore} style={{ background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:9,padding:"9px 28px",fontSize:13,fontWeight:600,cursor:loadingMore?"not-allowed":"pointer",color:"#475569" }}>
                {loadingMore ? "Loading…" : `Load More (${meta.total - enquiries.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pipeline overview */}
      {!loading && (
        <div style={{ background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",marginTop:16 }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:14 }}>📊 Pipeline Overview</div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {STAGES.map(s=>{
              const cnt = stageCount(s.id);
              const total = stats?.total || enquiries.length || 1;
              const pct = total>0?Math.round((cnt/total)*100):0;
              return (
                <div key={s.id} style={{ flex:1,minWidth:100,background:s.bg,borderRadius:11,padding:"12px 14px",border:`1px solid ${s.color}22`,cursor:"pointer",transition:"transform 0.15s" }}
                  onClick={()=>{ setFilterStage(s.id); setView("list"); }}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform=""}>
                  <div style={{ fontSize:20,marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontSize:isMobile?18:22,fontWeight:900,color:s.color }}>{cnt}</div>
                  <div style={{ fontSize:10,fontWeight:800,color:s.color,marginTop:1,lineHeight:1.3 }}>{s.label}</div>
                  <div style={{ fontSize:9,color:"#94A3B8",marginTop:4 }}>{pct}% of total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Toast toast={toast}/>
    </div>
  );
}
