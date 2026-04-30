import { useState, useEffect, useCallback, useRef } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'

// ── API ───────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
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

// ── Constants ─────────────────────────────────────────────────
const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];

// ── Helpers ───────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const daysFrom = n => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };

function isOverdue(dueDate)  { return dueDate < todayStr(); }
function isDueToday(dueDate) { return dueDate === todayStr(); }
function daysLeft(dueDate) {
  return Math.ceil((new Date(dueDate) - new Date(todayStr())) / (1000*60*60*24));
}

// New 3-state badge: Archived | Pending Review (past due) | Active sub-state.
function statusBadge(hw) {
  if (hw.is_archived) return { text:"📦 Archived",       color:"#64748B", bg:"#F1F5F9" };
  const due = hw.dueDate || '';
  if (!due)            return { text:"📚 Active",         color:"#10B981", bg:"#ECFDF5" };
  if (isOverdue(due))  return { text:"⏳ Pending Review", color:"#F59E0B", bg:"#FFFBEB" };
  if (isDueToday(due)) return { text:"📅 Due Today",      color:"#EF4444", bg:"#FEF2F2" };
  const d = daysLeft(due);
  if (d===1)           return { text:"📅 Due Tomorrow",   color:"#F97316", bg:"#FFF7ED" };
  return                       { text:`📅 Due in ${d} days`, color:"#10B981", bg:"#ECFDF5" };
}

// Normalize API shape to what HWCard expects
function normalize(hw) {
  return {
    ...hw,
    subject:   hw.subject?.name  || '—',
    subjectId: hw.subject?.id    || null,
    class:     hw.class?.name    || '—',
    classId:   hw.class?.id      || null,
    section:   hw.section?.name  || 'All Sections',
    sectionId: hw.section?.id    || null,
    teacher:   hw.teacher?.name  || '—',
    teacherId: hw.teacher?.id    || null,
    dueDate:   hw.due_date       || '',
    assignedDate: hw.created_at  || '',
    is_archived: !!hw.is_archived,
  };
}

function Toast({ toast }) {
  if (!toast) return null;
  const err = toast.type === "error";
  return <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:err?"#FEF2F2":"#F0FDF4",border:`1px solid ${err?"#FECACA":"#86EFAC"}`,color:err?"#DC2626":"#16A34A",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",maxWidth:340 }}>{err?"❌":"✅"} {toast.msg}</div>;
}

const subjectColor = s => palette[(s||"").charCodeAt(0) % palette.length];
const SUBJECT_ICON = { Mathematics:"📐", English:"📖", Science:"🔬", "Social Studies":"🌍", Hindi:"🪔", Computer:"💻", Physics:"⚛️", Chemistry:"🧪", Biology:"🌿", History:"🏛️", Geography:"🗺️" };
const sIcon = s => SUBJECT_ICON[s] || "📚";

// ── Skeleton card ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",border:"1px solid #F1F5F9",animation:"pulse 1.5s ease-in-out infinite" }}>
      <div style={{ height:4,background:"#E2E8F0" }}/>
      <div style={{ padding:"15px 18px" }}>
        <div style={{ display:"flex",gap:12,marginBottom:10 }}>
          <div style={{ width:44,height:44,borderRadius:11,background:"#E2E8F0",flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ height:14,background:"#E2E8F0",borderRadius:5,marginBottom:7,width:"70%" }}/>
            <div style={{ height:10,background:"#F1F5F9",borderRadius:5,width:"50%" }}/>
          </div>
        </div>
        <div style={{ height:52,background:"#F1F5F9",borderRadius:8,marginBottom:12 }}/>
        <div style={{ height:24,background:"#F1F5F9",borderRadius:8 }}/>
      </div>
    </div>
  );
}

// ── HW Card ───────────────────────────────────────────────────
function HWCard({ hw, onDelete, onWhatsApp, onEdit, onArchive, isMobile }) {
  const sb   = statusBadge(hw);
  const sc   = subjectColor(hw.subject);
  const past = hw.dueDate && isOverdue(hw.dueDate);
  const archived = hw.is_archived;
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div style={{ background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",border:`1px solid ${past && !archived ? "#FCD34D" : "#F1F5F9"}`,transition:"transform 0.15s,box-shadow 0.15s",opacity:archived ? 0.75 : 1 }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.1)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,0.07)";}}>
      <div style={{ height:4,background:sc }}/>
      <div style={{ padding:"15px 18px" }}>
        {/* Top row */}
        <div style={{ display:"flex",alignItems:"flex-start",gap:12,marginBottom:10 }}>
          <div style={{ width:44,height:44,borderRadius:11,background:sc+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{sIcon(hw.subject)}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",lineHeight:1.3,marginBottom:3,textDecoration:archived?"line-through":"none" }}>{hw.title}</div>
            <div style={{ display:"flex",gap:7,flexWrap:"wrap",alignItems:"center" }}>
              <span style={{ fontSize:11,fontWeight:700,color:sc,background:sc+"18",padding:"2px 8px",borderRadius:6 }}>{hw.subject}</span>
              <span style={{ fontSize:11,color:"#64748B" }}>Class {hw.class}-{hw.section}</span>
              {!isMobile&&<span style={{ fontSize:11,color:"#94A3B8" }}>👩‍🏫 {hw.teacher}</span>}
            </div>
          </div>
          <div style={{ display:"flex",gap:5,flexShrink:0 }}>
            <span style={{ background:sb.bg,color:sb.color,padding:"3px 9px",borderRadius:8,fontSize:10,fontWeight:700,whiteSpace:"nowrap" }}>{sb.text}</span>
          </div>
        </div>
        {/* Description */}
        <div style={{ fontSize:12,color:"#64748B",lineHeight:1.6,marginBottom:12,background:"#F8FAFC",padding:"9px 12px",borderRadius:8,border:"1px solid #F1F5F9" }}>{hw.description}</div>
        {/* Footer */}
        <div style={{ display:"flex",alignItems:isMobile?"flex-start":"center",gap:8,flexWrap:"wrap",flexDirection:isMobile?"column":"row" }}>
          <span style={{ background:"#F8FAFC",color:"#475569",border:"1px solid #E2E8F0",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:700 }}>
            📅 Due {hw.dueDate || '—'}
          </span>
          <div style={{ display:"flex",gap:6,marginLeft:isMobile?0:"auto",flexWrap:"wrap" }}>
            {!archived && (
              <button onClick={()=>onEdit(hw)} style={{ background:"#EEF2FF",color:"#6366F1",border:"1px solid #C7D2FE",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>✏️ Edit</button>
            )}
            {/* Remind only makes sense for active (not yet past due) homework */}
            {!archived && !past && (
              <button onClick={()=>onWhatsApp(hw)} style={{ background:"#F0FDF4",color:"#16A34A",border:"1px solid #86EFAC",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>📱 Remind</button>
            )}
            {/* Archive only when past due and not already archived */}
            {!archived && past && (
              <button onClick={()=>onArchive(hw.id)} style={{ background:"#F8FAFC",color:"#64748B",border:"1px solid #E2E8F0",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>📦 Archive</button>
            )}
            {confirmDel
              ? <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                  <span style={{ fontSize:10,fontWeight:700,color:"#EF4444" }}>Sure?</span>
                  <button onClick={()=>onDelete(hw.id)} style={{ background:"#EF4444",color:"#fff",border:"none",borderRadius:6,padding:"4px 9px",fontSize:11,fontWeight:800,cursor:"pointer" }}>Yes</button>
                  <button onClick={()=>setConfirmDel(false)} style={{ background:"#F1F5F9",border:"none",borderRadius:6,padding:"4px 9px",fontSize:11,cursor:"pointer",color:"#475569" }}>No</button>
                </div>
              : <button onClick={()=>setConfirmDel(true)} style={{ background:"#FEF2F2",color:"#EF4444",border:"none",borderRadius:7,padding:"5px 9px",fontSize:11,cursor:"pointer" }}>🗑</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assignments Tab ───────────────────────────────────────────
function AssignmentsTab({ homework, meta, counts, loading, error, filters, setFilters, onDelete, onWhatsApp, onEdit, onArchive, onArchiveAllPending, classes, isMobile }) {
  const [search, setSearch] = useState("");

  const displayed = search
    ? homework.filter(h => h.title.toLowerCase().includes(search.toLowerCase()) || h.subject.toLowerCase().includes(search.toLowerCase()))
    : homework;

  // Backend already filters by status; keep client-side sort by due date desc
  const sorted = [...displayed].sort((a,b) => new Date(b.dueDate) - new Date(a.dueDate));

  const STATUS_TABS = [
    ["all",      `📚 All (${counts.total})`,                "#6366F1","#EEF2FF"],
    ["active",   `✅ Active (${counts.active})`,            "#10B981","#ECFDF5"],
    ["pending",  `⏳ Pending Review (${counts.pending})`,   "#F59E0B","#FFFBEB"],
    ["archived", `📦 Archived (${counts.archived})`,        "#64748B","#F1F5F9"],
  ];

  return (
    <div>
      {/* Status quick filters */}
      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
        {STATUS_TABS.map(([val,label,color,bg])=>(
          <button key={val} onClick={()=>setFilters(f=>({...f,status:val,page:1}))}
            style={{ padding:isMobile?"6px 10px":"8px 16px",borderRadius:9,border:`1.5px solid ${filters.status===val?color:"#E2E8F0"}`,background:filters.status===val?bg:"#fff",color:filters.status===val?color:"#64748B",fontSize:isMobile?11:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
        {counts.pending > 0 && (
          <button onClick={onArchiveAllPending}
            style={{ marginLeft:isMobile?0:"auto",background:"#FFFBEB",color:"#D97706",border:"1px solid #FCD34D",borderRadius:9,padding:isMobile?"6px 10px":"8px 16px",fontSize:isMobile?11:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
            📦 Archive All Pending ({counts.pending})
          </button>
        )}
      </div>

      {/* Filters row */}
      <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",background:"#fff",borderRadius:12,padding:12,boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
        <div style={{ position:"relative",flex:1,minWidth:180 }}>
          <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",fontSize:13 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search homework…"
            style={{ width:"100%",paddingLeft:30,paddingRight:10,paddingTop:8,paddingBottom:8,borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}/>
        </div>
        <select value={filters.class_id||""} onChange={e=>setFilters(f=>({...f,class_id:e.target.value||null,page:1}))}
          style={{ flex:1,minWidth:isMobile?80:120,padding:"8px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit",color:"#374151",fontWeight:600,background:"#fff" }}>
          <option value="">All Classes</option>
          {classes.map(c=><option key={c.id} value={c.id}>Class {c.name}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:"12px 16px",marginBottom:16 }}>
          <span style={{ color:"#DC2626",fontSize:13,fontWeight:600 }}>⚠️ {error}</span>
        </div>
      )}

      {/* Cards */}
      {loading
        ? <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>
            {Array.from({length:6},(_,i)=><SkeletonCard key={i}/>)}
          </div>
        : sorted.length===0
          ? <div style={{ textAlign:"center",padding:56,color:"#94A3B8",fontSize:14,background:"#fff",borderRadius:14 }}>
              <div style={{ fontSize:48,marginBottom:12 }}>📭</div>No homework found for the selected filters
            </div>
          : <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>
              {sorted.map(hw=><HWCard key={hw.id} hw={hw} onDelete={onDelete} onWhatsApp={onWhatsApp} onEdit={onEdit} onArchive={onArchive} isMobile={isMobile}/>)}
            </div>
      }

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:20,background:"#fff",borderRadius:12,padding:"12px 16px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
          <span style={{ fontSize:12,color:"#64748B" }}>
            Showing {((filters.page||1)-1)*meta.per_page+1}–{Math.min((filters.page||1)*meta.per_page,meta.total)} of {meta.total}
          </span>
          <div style={{ display:"flex",gap:8 }}>
            <button disabled={(filters.page||1)<=1} onClick={()=>setFilters(f=>({...f,page:(f.page||1)-1}))}
              style={{ padding:"6px 14px",borderRadius:8,border:"1px solid #E2E8F0",background:(filters.page||1)<=1?"#F8FAFC":"#fff",color:(filters.page||1)<=1?"#CBD5E1":"#374151",fontSize:12,fontWeight:700,cursor:(filters.page||1)<=1?"not-allowed":"pointer" }}>← Prev</button>
            <span style={{ padding:"6px 14px",fontSize:12,fontWeight:700,color:"#6366F1" }}>Page {filters.page||1} / {meta.last_page}</span>
            <button disabled={(filters.page||1)>=meta.last_page} onClick={()=>setFilters(f=>({...f,page:(f.page||1)+1}))}
              style={{ padding:"6px 14px",borderRadius:8,border:"1px solid #E2E8F0",background:(filters.page||1)>=meta.last_page?"#F8FAFC":"#fff",color:(filters.page||1)>=meta.last_page?"#CBD5E1":"#374151",fontSize:12,fontWeight:700,cursor:(filters.page||1)>=meta.last_page?"not-allowed":"pointer" }}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assign / Edit Form ────────────────────────────────────────
const EMPTY_FORM = { title:"", subjectId:"", classId:"", sectionId:"", teacherId:"", description:"", dueDate:daysFrom(3) };

function AssignForm({ initial, onSave, onCancel, classes, allTeachers, showToast, isMobile, mode="assign" }) {
  const [form, setForm]           = useState(initial || EMPTY_FORM);
  const [sections, setSections]   = useState([]);
  const [subjects, setSubjects]   = useState([]);
  const [loadingDD, setLoadingDD] = useState(false);
  const [saving, setSaving]       = useState(false);
  const setF = p => setForm(f=>({...f,...p}));

  // Filter teachers to those who teach the selected subject
  const selectedSubjectName = subjects.find(s => String(s.id) === String(form.subjectId))?.name;
  const filteredTeachers = selectedSubjectName
    ? allTeachers.filter(t => (t.subjects || []).includes(selectedSubjectName))
    : allTeachers;

  useEffect(() => {
    if (!form.classId) { setSections([]); setSubjects([]); return; }
    setLoadingDD(true);
    Promise.all([
      apiFetch(`/sections?class_id=${form.classId}`),
      apiFetch(`/subjects?class_id=${form.classId}`),
    ]).then(([sr,sbr]) => {
      setSections(sr.data || []);
      setSubjects(sbr.data || []);
    }).catch(e => {
      showToast('Failed to load sections/subjects: ' + e.message, 'error');
    }).finally(() => setLoadingDD(false));
  }, [form.classId]);

  const handleSubmit = async () => {
    if (!form.title.trim())       { showToast("Title is required","error"); return; }
    if (!form.description.trim()) { showToast("Description is required","error"); return; }
    if (!form.dueDate)            { showToast("Due date is required","error"); return; }
    if (mode==="assign" && form.dueDate < todayStr()) { showToast("Due date cannot be in the past","error"); return; }
    setSaving(true);
    try { await onSave(form); }
    catch(e) { showToast(e.message,"error"); setSaving(false); }
  };

  return (
    <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 320px",gap:16 }}>
      {/* Left */}
      <div style={{ display:"grid",gap:14 }}>
        <div style={{ background:"#fff",borderRadius:14,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontWeight:800,fontSize:14,color:"#0F172A",marginBottom:16,paddingBottom:10,borderBottom:"1px solid #F1F5F9" }}>
            {mode==="assign" ? "📚 Assignment Details" : "✏️ Edit Assignment"}
          </div>
          <div style={{ marginBottom:13 }}>
            <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>Title *</label>
            <input value={form.title} onChange={e=>setF({title:e.target.value})} placeholder="e.g. Chapter 5 — Quadratic Equations"
              style={{ width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:14,fontWeight:600,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}
              onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:13 }}>
            <div>
              <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>Subject</label>
              <select value={form.subjectId||""} onChange={e=>setF({subjectId:e.target.value||null, teacherId:""})}
                style={{ width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit",background:loadingDD?"#F8FAFC":"#fff" }}>
                <option value="">{loadingDD ? "Loading…" : form.classId ? "— Select Subject —" : "— Select class first —"}</option>
                {subjects.map(s=><option key={s.id} value={s.id}>{sIcon(s.name)} {s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>
                Teacher {selectedSubjectName && filteredTeachers.length > 0 && <span style={{ color:"#10B981",fontWeight:600 }}>({filteredTeachers.length} for {selectedSubjectName})</span>}
              </label>
              <select value={form.teacherId||""} onChange={e=>setF({teacherId:e.target.value||null})}
                style={{ width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit" }}>
                <option value="">{selectedSubjectName && filteredTeachers.length === 0 ? `— No teachers for ${selectedSubjectName} —` : "— Select Teacher —"}</option>
                {filteredTeachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>Description / Instructions *</label>
            <textarea value={form.description} onChange={e=>setF({description:e.target.value})}
              placeholder="Describe the homework task clearly — what students need to do, which pages/chapters to refer, any special instructions…" rows={5}
              style={{ width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",lineHeight:1.7 }}
              onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            <div style={{ fontSize:10,color:"#94A3B8",textAlign:"right",marginTop:4 }}>{form.description.length} characters</div>
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display:"grid",gap:14,alignContent:"start" }}>
        {/* Class + Section */}
        <div style={{ background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize:10,fontWeight:800,color:"#64748B",marginBottom:12,textTransform:"uppercase",letterSpacing:0.8 }}>🏫 {mode==="assign" ? "Assign To" : "Assigned To"}</div>
          {mode==="edit"
            ? <div style={{ background:"#F8FAFC",borderRadius:9,padding:"10px 14px",fontSize:13,fontWeight:600,color:"#374151",border:"1px solid #F1F5F9" }}>
                Class {initial?.classId ? classes.find(c=>String(c.id)===String(initial.classId))?.name || "—" : "—"} · {initial?.sectionId ? "Section selected" : "All Sections"}
                <div style={{ fontSize:10,color:"#94A3B8",marginTop:3 }}>Class and section cannot be changed after creation</div>
              </div>
            : <>
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:10,fontWeight:700,color:"#94A3B8",display:"block",marginBottom:5 }}>Class *</label>
                  <select value={form.classId||""} onChange={e=>setF({classId:e.target.value||null,sectionId:"",subjectId:""})}
                    style={{ width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit" }}>
                    <option value="">— Select Class —</option>
                    {classes.map(c=><option key={c.id} value={c.id}>Class {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:10,fontWeight:700,color:"#94A3B8",display:"block",marginBottom:5 }}>Section</label>
                  <select value={form.sectionId||""} onChange={e=>setF({sectionId:e.target.value||null})}
                    style={{ width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit",background:loadingDD?"#F8FAFC":"#fff" }}>
                    <option value="">{loadingDD ? "Loading…" : "All Sections"}</option>
                    {sections.map(s=><option key={s.id} value={s.id}>Section {s.name}</option>)}
                  </select>
                </div>
              </>
          }
        </div>

        {/* Due date */}
        <div style={{ background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize:10,fontWeight:800,color:"#64748B",marginBottom:12,textTransform:"uppercase",letterSpacing:0.8 }}>📅 Due Date *</div>
          <input type="date" value={form.dueDate} min={mode==="assign"?todayStr():undefined} onChange={e=>setF({dueDate:e.target.value})}
            style={{ width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}
            onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          {form.dueDate && (
            <div style={{ marginTop:8,fontSize:11,color:"#64748B",textAlign:"center" }}>
              {daysLeft(form.dueDate)===0 ? "⚠️ Due today" : daysLeft(form.dueDate)<0 ? `⚠️ Past by ${Math.abs(daysLeft(form.dueDate))} day(s)` : daysLeft(form.dueDate)===1 ? "📅 Due tomorrow" : `📅 ${daysLeft(form.dueDate)} days from today`}
            </div>
          )}
          <div style={{ display:"flex",gap:6,marginTop:10,flexWrap:"wrap" }}>
            {[["Tomorrow",1],["In 2 days",2],["In 3 days",3],["In 1 week",7]].map(([lbl,n])=>(
              <button key={n} onClick={()=>setF({dueDate:daysFrom(n)})}
                style={{ flex:1,padding:"5px 4px",borderRadius:7,border:`1px solid ${form.dueDate===daysFrom(n)?"#6366F1":"#E2E8F0"}`,background:form.dueDate===daysFrom(n)?"#EEF2FF":"#F8FAFC",color:form.dueDate===daysFrom(n)?"#6366F1":"#64748B",fontSize:10,fontWeight:700,cursor:"pointer" }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Submit / Actions */}
        {mode==="assign"
          ? <button onClick={handleSubmit} disabled={saving}
              style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:800,cursor:saving?"not-allowed":"pointer",boxShadow:"0 3px 12px rgba(99,102,241,0.4)",letterSpacing:0.3,opacity:saving?0.7:1 }}>
              {saving ? "Assigning…" : "📚 Assign Homework"}
            </button>
          : <div style={{ display:"flex",flexDirection:isMobile?"column":"row",gap:10 }}>
              <button onClick={onCancel} style={{ flex:1,background:"#F1F5F9",color:"#64748B",border:"none",borderRadius:12,padding:"13px",fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                style={{ flex:2,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,cursor:saving?"not-allowed":"pointer",boxShadow:"0 3px 12px rgba(99,102,241,0.4)",opacity:saving?0.7:1 }}>
                {saving ? "Saving…" : "✓ Save Changes"}
              </button>
            </div>
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function Homework() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'

  // ── API state ─────────────────────────────────────────────────
  const [homework, setHomework] = useState([])
  const [meta, setMeta]         = useState({ page:1, per_page:20, total:0, last_page:1 })
  const [counts, setCounts]     = useState({ total:0, active:0, pending:0, archived:0 })
  const [classes, setClasses]   = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // ── UI state ──────────────────────────────────────────────────
  const [tab, setTab]         = useState("assignments")
  const [editingHW, setEditing] = useState(null)
  const [toast, setToast]     = useState(null)
  const [filters, setFilters] = useState({ status:"all", class_id:null, page:1, per_page:20 })

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); }
  const switchTab = (t) => { if(t!=="edit") setEditing(null); setTab(t); }

  // ── Fetch homework ────────────────────────────────────────────
  const fetchHomework = useCallback(async (f) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ per_page: f.per_page||20, page: f.page||1 });
      if (f.class_id) params.set('class_id', f.class_id);
      // 'all' => backend defaults to non-archived; 'active'/'pending'/'archived' map directly.
      if (f.status && f.status !== "all") params.set('status', f.status);

      const res = await apiFetch(`/homework?${params}`);
      const data = (res.data || []).map(normalize);

      setHomework(data);
      setMeta(res.meta || { page:1, per_page:20, total:data.length, last_page:1 });
      setCounts(res.counts || { total:0, active:0, pending:0, archived:0 });
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses  = useCallback(async () => {
    try { const r = await apiFetch('/classes'); setClasses(r.data||[]); } catch(e) {}
  }, []);

  const fetchTeachers = useCallback(async () => {
    try { const r = await apiFetch('/teachers?per_page=100'); setTeachers(r.data||[]); } catch(e) {}
  }, []);

  useEffect(() => { fetchClasses(); fetchTeachers(); }, []);
  useEffect(() => { fetchHomework(filters); }, [filters]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleCreate = async (form) => {
    const res = await apiFetch('/homework', {
      method: 'POST',
      body: {
        title:       form.title.trim(),
        description: form.description.trim(),
        due_date:    form.dueDate,
        subject_id:  form.subjectId  || null,
        class_id:    form.classId,
        section_id:  form.sectionId  || null,
        teacher_id:  form.teacherId  || null,
      },
    });
    showToast(`Homework assigned: ${res.data.title}`);
    switchTab("assignments");
    setFilters(f => ({...f, page:1}));
  };

  const handleEdit = async (form) => {
    await apiFetch(`/homework/${editingHW.id}`, {
      method: 'PUT',
      body: {
        title:       form.title.trim(),
        description: form.description.trim(),
        due_date:    form.dueDate,
      },
    });
    showToast("Homework updated");
    switchTab("assignments");
    setFilters(f => ({...f}));
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/homework/${id}`, { method:'DELETE' });
      setHomework(p => p.filter(h => h.id !== id));
      showToast("Homework deleted");
      setFilters(f => ({...f})); // refetch for fresh counts
    } catch(e) { showToast(e.message, "error"); }
  };

  const handleArchive = async (id) => {
    try {
      await apiFetch(`/homework/${id}/archive`, { method:'POST' });
      showToast("Homework archived");
      setFilters(f => ({...f})); // refetch
    } catch(e) { showToast(e.message, "error"); }
  };

  const handleArchiveAllPending = async () => {
    if (!window.confirm(`Archive all ${counts.pending} pending homework? This marks them as reviewed.`)) return;
    try {
      const res = await apiFetch('/homework/archive-pending', { method:'POST' });
      showToast(res.message || `${res.count} homework archived`);
      setFilters(f => ({...f})); // refetch
    } catch(e) { showToast(e.message, "error"); }
  };

  const handleWhatsApp = async (hw) => {
    const sb  = statusBadge(hw);
    const msg = `Dear Parent,\n\n📚 Homework Reminder\n\nSubject: ${hw.subject}\nClass: ${hw.class}-${hw.section}\nTask: ${hw.title}\nDue: ${hw.dueDate} (${sb.text.replace(/^[^a-zA-Z]+/, '')})\n\nPlease ensure your child completes this assignment on time.\n\nRegards,\nSchool`;
    try {
      const params = new URLSearchParams({ per_page:200 });
      if (hw.classId)   params.set('class_id',   hw.classId);
      if (hw.sectionId) params.set('section_id', hw.sectionId);
      const res = await apiFetch(`/students?${params}`);
      const students = res.data || [];
      let sent = 0;
      students.forEach(s => {
        const phone = s.parents?.[0]?.phone || s.parent_phone || null;
        if (phone) { window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, "_blank"); sent++; }
      });
      if (sent === 0) window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
      showToast(`Reminder prepared for ${sent || students.length} parent${(sent||students.length)!==1?"s":""}`);
    } catch(e) {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  // ── KPI widgets ───────────────────────────────────────────────
  const widgets = [
    { icon:"📚", label:"Total Active",   value:counts.total,    c:"#6366F1", bg:"#EEF2FF", sub:"Currently in play" },
    { icon:"✅", label:"Active",         value:counts.active,   c:"#10B981", bg:"#ECFDF5", sub:"Due today or later" },
    { icon:"⏳", label:"Pending Review", value:counts.pending,  c:"#F59E0B", bg:"#FFFBEB", sub:"Past due date"      },
    { icon:"📦", label:"Archived",       value:counts.archived, c:"#94A3B8", bg:"#F8FAFC", sub:"Reviewed & done"    },
  ];

  const editInitial = editingHW ? {
    title:       editingHW.title,
    description: editingHW.description,
    dueDate:     editingHW.dueDate,
    subjectId:   editingHW.subjectId || null,
    classId:     editingHW.classId   || null,
    sectionId:   editingHW.sectionId || null,
    teacherId:   editingHW.teacherId || null,
  } : null;

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif",padding:isMobile?12:24,background:"#F0F4F8",minHeight:"100vh" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,gap:10,flexWrap:"wrap" }}>
        <div>
          <div style={{ fontWeight:900,fontSize:isMobile?18:22,color:"#0F172A" }}>📚 Homework</div>
          {!isMobile&&<div style={{ fontSize:13,color:"#94A3B8",marginTop:3 }}>Assign and manage homework across all classes</div>}
        </div>
        {tab==="assignments" && (
          <button onClick={()=>switchTab("assign")} style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:10,padding:isMobile?"8px 14px":"10px 20px",fontSize:isMobile?12:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 10px rgba(99,102,241,0.35)",flexShrink:0 }}>
            + Assign Homework
          </button>
        )}
      </div>

      {/* Widgets */}
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:22 }}>
        {widgets.map(w=>(
          <div key={w.label} style={{ background:"#fff",borderRadius:14,padding:isMobile?"12px 10px":"18px 20px",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",display:"flex",alignItems:"center",gap:isMobile?8:14,border:`1px solid ${w.c}18`,transition:"transform 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ width:isMobile?36:52,height:isMobile?36:52,background:w.bg,borderRadius:12,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?18:26 }}>{w.icon}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:isMobile?20:28,fontWeight:900,color:w.c,lineHeight:1 }}>{w.value}</div>
              <div style={{ fontSize:isMobile?10:12,fontWeight:700,color:"#374151",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{w.label}</div>
              {!isMobile&&<div style={{ fontSize:10,color:"#94A3B8",marginTop:1 }}>{w.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:0,background:"#fff",borderRadius:12,padding:5,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",marginBottom:20,width:isMobile?"100%":"fit-content" }}>
        {[
          ["assignments", isMobile?"📋 Assignments":"📋 Assignments"],
          ["assign",      isMobile?"➕ Assign":"➕ Assign Homework"],
          ...(tab==="edit"?[["edit", isMobile?"✏️ Edit":"✏️ Edit Homework"]]:[]),
        ].map(([t,l])=>(
          <button key={t} onClick={()=>switchTab(t)}
            style={{ flex:isMobile?1:"none",padding:isMobile?"9px 12px":"9px 22px",borderRadius:8,border:"none",cursor:"pointer",fontSize:isMobile?12:13,fontWeight:700,transition:"all 0.18s",background:tab===t?"linear-gradient(135deg,#6366F1,#4F46E5)":"transparent",color:tab===t?"#fff":"#64748B",boxShadow:tab===t?"0 2px 8px rgba(99,102,241,0.3)":"none",whiteSpace:"nowrap" }}>{l}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab==="assignments" && (
        <AssignmentsTab
          homework={homework} meta={meta} counts={counts} loading={loading} error={error}
          filters={filters} setFilters={setFilters}
          onDelete={handleDelete} onWhatsApp={handleWhatsApp} onArchive={handleArchive}
          onArchiveAllPending={handleArchiveAllPending}
          onEdit={hw=>{ setEditing(hw); switchTab("edit"); }}
          classes={classes} isMobile={isMobile}/>
      )}
      {tab==="assign" && (
        <AssignForm
          mode="assign" initial={EMPTY_FORM} classes={classes} allTeachers={teachers}
          onSave={handleCreate} onCancel={()=>switchTab("assignments")}
          showToast={showToast} isMobile={isMobile}/>
      )}
      {tab==="edit" && editingHW && (
        <AssignForm
          mode="edit" initial={editInitial} classes={classes} allTeachers={teachers}
          onSave={handleEdit} onCancel={()=>switchTab("assignments")}
          showToast={showToast} isMobile={isMobile}/>
      )}

      <Toast toast={toast}/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
