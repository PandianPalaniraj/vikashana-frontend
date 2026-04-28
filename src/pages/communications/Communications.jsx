import { useState, useEffect } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'
import useAuthStore from '../../store/authStore'

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

// ── Constants (UI only) ───────────────────────────────────────
const CATEGORY_COLORS = { Finance:"#F59E0B", Academic:"#6366F1", Attendance:"#EF4444", General:"#10B981", Events:"#EC4899" };
const CATEGORY_BG     = { Finance:"#FFFBEB", Academic:"#EEF2FF", Attendance:"#FEF2F2", General:"#ECFDF5", Events:"#FDF2F8" };
const PRIORITY_META   = { high:{ c:"#EF4444",bg:"#FEF2F2",label:"High",icon:"🔴" }, medium:{ c:"#F59E0B",bg:"#FFFBEB",label:"Medium",icon:"🟡" }, low:{ c:"#10B981",bg:"#ECFDF5",label:"Low",icon:"🟢" } };
const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];

// ── Normalizers ───────────────────────────────────────────────
function annAudienceLabel(a) {
  if (a.audience === 'all')     return 'All Students & Staff';
  if (a.audience === 'students') return 'All Students';
  if (a.audience === 'staff')   return 'All Staff';
  if (a.audience === 'parents') return 'All Parents';
  if (a.audience === 'class')   return a.class   ? `Class ${a.class.name}`   : 'Class';
  if (a.audience === 'section') return (a.class && a.section) ? `Class ${a.class.name}-${a.section.name}` : 'Section';
  return a.audience || '—';
}
function normalizeAnn(a) {
  return {
    ...a,
    audienceLabel: annAudienceLabel(a),
    priority: a.is_pinned ? 'high' : 'medium',
    pinned:   !!a.is_pinned,
    date:     a.created_at ? a.created_at.slice(0, 10) : '',
    sentBy:   a.created_by?.name || 'Admin',
  };
}

// ── Helpers ───────────────────────────────────────────────────
function Avatar({ name, size=32 }) {
  const bg = palette[name.charCodeAt(0) % palette.length];
  return <div style={{ width:size,height:size,borderRadius:"50%",background:bg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:800,color:"#fff" }}>{name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>;
}

function Toast({ toast }) {
  if (!toast) return null;
  const err = toast.type==="error";
  return <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:err?"#FEF2F2":"#F0FDF4",border:`1px solid ${err?"#FECACA":"#86EFAC"}`,color:err?"#DC2626":"#16A34A",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",maxWidth:320 }}>{err?"❌":"✅"} {toast.msg}</div>;
}

function Badge({ text, color, bg }) {
  return <span style={{ background:bg,color,border:`1px solid ${color}33`,padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700 }}>{text}</span>;
}

function Skeleton({ h=18, w="100%", r=6 }) {
  return <div style={{ height:h,width:w,borderRadius:r,background:"linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite" }}/>;
}

// ── Announce Tab ──────────────────────────────────────────────
function AnnounceTab({ isMobile, isTablet, onCountChange, isStaff }) {
  const [announcements, setAnnouncements] = useState([]);
  const [classes, setClasses]     = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("list");
  const [selAnn, setSelAnn]       = useState(null);
  const [filter, setFilter]       = useState("all");
  const [saving, setSaving]       = useState(false);
  const [useTpl, setUseTpl]       = useState(false);
  const [toast, setToast]         = useState(null);
  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const emptyForm = { title:"", body:"", audience:"all", classId:"", sectionId:"", isPinned:false };
  const [form, setForm] = useState(emptyForm);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch('/announcements'),
      apiFetch('/classes'),
      apiFetch('/templates'),
    ]).then(([ar, cr, tr]) => {
      if (ar?.data) setAnnouncements((ar.data.data || ar.data).map(normalizeAnn));
      if (cr?.data) setClasses(cr.data);
      if (tr?.data) setTemplates(tr.data.data || tr.data);
    }).catch(() => showToast("Failed to load announcements", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (form.classId) {
      apiFetch(`/sections?class_id=${form.classId}`)
        .then(r => { if (r?.data) setSections(r.data); })
        .catch(() => {});
    } else {
      setSections([]);
    }
  }, [form.classId]);

  const AUDIENCE_OPTS = [
    ["all",      "All Students & Staff"],
    ["students", "All Students / Parents"],
    ["staff",    "All Staff / Teachers"],
    ["parents",  "All Parents"],
    ["class",    "Specific Class"],
    ["section",  "Specific Section"],
  ];

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) { showToast("Title and message are required","error"); return; }
    setSaving(true);
    try {
      const body = { title: form.title, body: form.body, audience: form.audience, is_pinned: form.isPinned };
      if (form.audience === 'class' || form.audience === 'section') body.class_id = form.classId;
      if (form.audience === 'section') body.section_id = form.sectionId;
      const res = await apiFetch('/announcements', { method:'POST', body });
      setAnnouncements(prev => [normalizeAnn(res.data), ...prev]);
      onCountChange?.(1);
      showToast(`Announcement "${form.title}" created!`);
      setForm(emptyForm);
      setUseTpl(false);
      setView("list");
    } catch(e) { showToast(e.message || "Failed to create","error"); }
    finally { setSaving(false); }
  };

  const handlePin = async (ann) => {
    try {
      const res = await apiFetch(`/announcements/${ann.id}/pin`, { method:'PUT' });
      const updated = normalizeAnn(res.data);
      setAnnouncements(p => p.map(a => a.id === ann.id ? updated : a));
      if (selAnn?.id === ann.id) setSelAnn(updated);
      showToast(updated.pinned ? "Pinned!" : "Unpinned");
    } catch(e) { showToast(e.message || "Failed","error"); }
  };

  const handleDelete = async (ann) => {
    try {
      await apiFetch(`/announcements/${ann.id}`, { method:'DELETE' });
      setAnnouncements(p => p.filter(a => a.id !== ann.id));
      onCountChange?.(-1);
      showToast("Deleted");
      setView("list");
    } catch(e) { showToast(e.message || "Failed to delete","error"); }
  };

  const filtered = announcements.filter(a => {
    if (filter === "pinned")   return a.pinned;
    if (filter === "students") return a.audience === "students";
    if (filter === "staff")    return a.audience === "staff";
    if (filter === "parents")  return a.audience === "parents";
    return true;
  });
  const pinnedCount = announcements.filter(a => a.pinned).length;

  if (view === "create") return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
        <button onClick={()=>setView("list")} style={{ background:"#F1F5F9",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,color:"#475569" }}>← Back</button>
        <div>
          <div style={{ fontWeight:800,fontSize:16,color:"#0F172A" }}>📣 New Announcement</div>
          <div style={{ fontSize:11,color:"#94A3B8" }}>Broadcast to students, parents or staff</div>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 340px",gap:16 }}>
        <div style={{ display:"grid",gap:14 }}>
          <div style={{ background:"#fff",borderRadius:14,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.8 }}>Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Annual Sports Day - Dec 20"
              style={{ width:"100%",padding:"10px 13px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:14,fontWeight:600,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}
              onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </div>
          <div style={{ background:"#fff",borderRadius:14,padding:isMobile?14:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
              <label style={{ fontSize:10,fontWeight:800,color:"#64748B",textTransform:"uppercase",letterSpacing:0.8 }}>Message *</label>
              {templates.length > 0 && (
                <div style={{ display:"flex",gap:6 }}>
                  <button onClick={()=>setUseTpl(false)} style={{ padding:"4px 10px",borderRadius:6,border:"1.5px solid",fontSize:11,fontWeight:700,cursor:"pointer",borderColor:!useTpl?"#6366F1":"#E2E8F0",background:!useTpl?"#EEF2FF":"#fff",color:!useTpl?"#6366F1":"#64748B" }}>✏️ Write</button>
                  <button onClick={()=>setUseTpl(true)}  style={{ padding:"4px 10px",borderRadius:6,border:"1.5px solid",fontSize:11,fontWeight:700,cursor:"pointer",borderColor:useTpl?"#6366F1":"#E2E8F0",background:useTpl?"#EEF2FF":"#fff",color:useTpl?"#6366F1":"#64748B" }}>📝 Template</button>
                </div>
              )}
            </div>
            {useTpl ? (
              <div style={{ display:"grid",gap:7,maxHeight:260,overflowY:"auto" }}>
                {templates.map(t=>(
                  <div key={t.id} onClick={()=>{ setForm(f=>({...f,title:f.title||t.name,body:t.body})); setUseTpl(false); }}
                    style={{ padding:"10px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",cursor:"pointer",background:"#F8FAFC" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366F1";e.currentTarget.style.background="#EEF2FF";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#E2E8F0";e.currentTarget.style.background="#F8FAFC";}}>
                    <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:3 }}>
                      <span style={{ fontSize:10,fontWeight:700,color:CATEGORY_COLORS[t.category]||"#6366F1",background:CATEGORY_BG[t.category]||"#EEF2FF",padding:"1px 6px",borderRadius:5,flexShrink:0 }}>{t.category}</span>
                      <span style={{ fontWeight:700,fontSize:12,color:"#0F172A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.name}</span>
                    </div>
                    <div style={{ fontSize:10,color:"#94A3B8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.body.slice(0,80)}…</div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Type your announcement message here…" rows={7}
                  style={{ width:"100%",padding:"10px 13px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",lineHeight:1.6 }}
                  onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                <div style={{ fontSize:10,color:"#94A3B8",marginTop:6,textAlign:"right" }}>{form.body.length} characters</div>
              </>
            )}
          </div>
        </div>
        <div style={{ display:"grid",gap:14,alignContent:"start" }}>
          <div style={{ background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:10,fontWeight:800,color:"#64748B",marginBottom:12,textTransform:"uppercase",letterSpacing:0.8 }}>👥 Audience</div>
            {AUDIENCE_OPTS.map(([val,lbl]) => (
              <label key={val} style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:8,marginBottom:6,cursor:"pointer",background:form.audience===val?"#EEF2FF":"#F8FAFC",border:`1px solid ${form.audience===val?"#C7D2FE":"#F1F5F9"}` }}>
                <input type="radio" name="audience" checked={form.audience===val} onChange={()=>setForm(f=>({...f,audience:val,classId:"",sectionId:""}))} style={{ accentColor:"#6366F1" }}/>
                <span style={{ fontSize:12,fontWeight:600,color:"#374151" }}>{lbl}</span>
              </label>
            ))}
            {(form.audience === "class" || form.audience === "section") && (
              <div style={{ marginTop:8,display:"grid",gap:8 }}>
                <select value={form.classId} onChange={e=>setForm(f=>({...f,classId:e.target.value,sectionId:""}))}
                  style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit" }}>
                  <option value="">Select Class…</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {form.audience === "section" && form.classId && (
                  <select value={form.sectionId} onChange={e=>setForm(f=>({...f,sectionId:e.target.value}))}
                    style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit" }}>
                    <option value="">Select Section…</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
          <div style={{ background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer" }}>
              <input type="checkbox" checked={form.isPinned} onChange={e=>setForm(f=>({...f,isPinned:e.target.checked}))} style={{ accentColor:"#D97706",width:16,height:16 }}/>
              <span style={{ fontSize:13,fontWeight:700,color:"#92400E" }}>📌 Pin this announcement</span>
            </label>
          </div>
          <button onClick={handleCreate} disabled={saving} style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:11,padding:"13px",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,boxShadow:"0 2px 12px rgba(99,102,241,0.35)" }}>
            {saving ? "Posting…" : "📣 Post Announcement"}
          </button>
        </div>
      </div>
      <Toast toast={toast}/>
    </div>
  );

  if (view === "detail" && selAnn) return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:20,alignItems:"center",flexWrap:"wrap" }}>
        <button onClick={()=>setView("list")} style={{ background:"#F1F5F9",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,color:"#475569" }}>← Back</button>
        <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
          <button onClick={()=>handlePin(selAnn)}
            style={{ background:selAnn.pinned?"#FEF3C7":"#F1F5F9",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",fontWeight:700,color:selAnn.pinned?"#D97706":"#475569" }}>
            {selAnn.pinned ? "📌 Unpin" : "📌 Pin"}
          </button>
          {!isStaff && (
            <button onClick={()=>handleDelete(selAnn)}
              style={{ background:"#FEF2F2",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer",fontWeight:700,color:"#EF4444" }}>🗑 Delete</button>
          )}
        </div>
      </div>
      <div style={{ background:"#fff",borderRadius:16,overflow:"hidden",overflowX:"auto",boxShadow:"0 1px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ background:`linear-gradient(135deg,${PRIORITY_META[selAnn.priority].c}22,${PRIORITY_META[selAnn.priority].c}08)`,borderBottom:`3px solid ${PRIORITY_META[selAnn.priority].c}`,padding:isMobile?"16px":"24px 28px" }}>
          <div style={{ display:"flex",gap:10,marginBottom:12,flexWrap:"wrap" }}>
            <Badge text={PRIORITY_META[selAnn.priority].icon+" "+PRIORITY_META[selAnn.priority].label} color={PRIORITY_META[selAnn.priority].c} bg={PRIORITY_META[selAnn.priority].bg}/>
            <Badge text={"👥 "+selAnn.audienceLabel} color="#6366F1" bg="#EEF2FF"/>
            {selAnn.pinned && <Badge text="📌 Pinned" color="#D97706" bg="#FEF3C7"/>}
          </div>
          <div style={{ fontWeight:900,fontSize:20,color:"#0F172A",marginBottom:8 }}>{selAnn.title}</div>
          <div style={{ fontSize:12,color:"#94A3B8" }}>By {selAnn.sentBy} · {selAnn.date}</div>
        </div>
        <div style={{ padding:isMobile?"16px":"24px 28px" }}>
          <div style={{ fontSize:isMobile?13:14,color:"#374151",lineHeight:1.8,whiteSpace:"pre-wrap" }}>{selAnn.body}</div>
        </div>
      </div>
      <Toast toast={toast}/>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <div style={{ display:"flex",gap:4,background:"#E2E8F0",borderRadius:9,padding:3,flexWrap:"wrap" }}>
          {[["all","All"],["pinned","📌 Pinned"],["students","Students"],["staff","Staff"],["parents","Parents"]].map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)} style={{ padding:isMobile?"6px 10px":"6px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:isMobile?11:12,fontWeight:700,background:filter===k?"#fff":"transparent",color:filter===k?"#6366F1":"#64748B",boxShadow:filter===k?"0 1px 4px rgba(0,0,0,0.08)":"none",whiteSpace:"nowrap" }}>{l}</button>
          ))}
        </div>
        <button onClick={()=>{ setForm(emptyForm); setView("create"); }} style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:9,padding:isMobile?"7px 12px":"8px 18px",fontSize:isMobile?12:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(99,102,241,0.3)",flexShrink:0 }}>{isMobile?"+New":"+ New Announcement"}</button>
      </div>

      {pinnedCount > 0 && (
        <div style={{ background:"linear-gradient(135deg,#FFFBEB,#FEF3C7)",border:"1px solid #FCD34D",borderRadius:12,padding:isMobile?"10px 12px":"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:16 }}>📌</span>
          <span style={{ fontSize:isMobile?11:13,fontWeight:700,color:"#92400E" }}>{pinnedCount} pinned{pinnedCount>1?" announcements":" announcement"}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display:"grid",gap:10 }}>
          {[1,2,3].map(i => <div key={i} style={{ background:"#fff",borderRadius:13,padding:"14px 18px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}><Skeleton h={14} w="60%" r={4}/><div style={{ marginTop:8 }}/><Skeleton h={10} w="40%" r={4}/></div>)}
        </div>
      ) : (
        <div style={{ display:"grid",gap:isMobile?8:10,gridTemplateColumns:isTablet?"1fr 1fr":"1fr" }}>
          {filtered.filter(a=>a.pinned).map(a=>renderCard(a))}
          {filtered.filter(a=>!a.pinned).map(a=>renderCard(a))}
        </div>
      )}
      {!loading && filtered.length === 0 && <div style={{ textAlign:"center",padding:48,color:"#94A3B8",fontSize:14 }}>No announcements found</div>}
      <Toast toast={toast}/>
    </div>
  );

  function renderCard(a) {
    const pm = PRIORITY_META[a.priority];
    const compact = isMobile || isTablet;
    if (compact) return (
      <div key={a.id} onClick={()=>{ setSelAnn(a); setView("detail"); }}
        style={{ background:"#fff",borderRadius:10,padding:"9px 10px 9px 0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",border:`1px solid ${a.pinned?"#FCD34D":"#F1F5F9"}`,cursor:"pointer",borderLeft:`3px solid ${pm.c}`,display:"flex",alignItems:"center",gap:8 }}>
        <div style={{ width:6,flexShrink:0 }}/>
        <span style={{ fontSize:16,flexShrink:0 }}>{pm.icon}</span>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontWeight:700,fontSize:12,color:"#0F172A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.title}</div>
          <div style={{ fontSize:10,color:"#94A3B8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.audienceLabel} · {a.date}</div>
        </div>
        {a.pinned && <span style={{ fontSize:12,flexShrink:0 }}>📌</span>}
        <span style={{ fontSize:14,color:"#CBD5E1",flexShrink:0,paddingRight:4 }}>›</span>
      </div>
    );
    return (
      <div key={a.id} onClick={()=>{ setSelAnn(a); setView("detail"); }} style={{ background:"#fff",borderRadius:13,padding:"14px 18px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:`1px solid ${a.pinned?"#FCD34D":"#F1F5F9"}`,cursor:"pointer",transition:"all 0.15s",borderLeft:`4px solid ${pm.c}` }}
        onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)";e.currentTarget.style.transform="translateX(2px)";}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,0.06)";e.currentTarget.style.transform="";}}>
        <div style={{ display:"flex",alignItems:"flex-start",gap:14 }}>
          <div style={{ width:40,height:40,borderRadius:10,background:pm.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{pm.icon}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap" }}>
              <span style={{ fontWeight:800,fontSize:14,color:"#0F172A" }}>{a.title}</span>
              {a.pinned && <span style={{ fontSize:10,fontWeight:700,color:"#D97706",background:"#FEF3C7",padding:"1px 7px",borderRadius:8 }}>📌 Pinned</span>}
            </div>
            <div style={{ fontSize:12,color:"#64748B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.5 }}>{a.body}</div>
            <div style={{ display:"flex",gap:10,marginTop:8,alignItems:"center" }}>
              <Badge text={"👥 "+a.audienceLabel} color="#6366F1" bg="#EEF2FF"/>
              <span style={{ fontSize:11,color:"#94A3B8" }}>By {a.sentBy} · {a.date}</span>
            </div>
          </div>
          <span style={{ fontSize:18,color:"#CBD5E1",flexShrink:0 }}>›</span>
        </div>
      </div>
    );
  }
}

// ── WhatsApp Broadcast Tab ────────────────────────────────────
function BroadcastTab({ isMobile, isTablet, onCountChange }) {
  const [step, setStep]           = useState(1);
  const [audience, setAudience]   = useState("all_students");
  const [classVal, setClassVal]   = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [sectionVal, setSectionVal] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  const [message, setMessage]     = useState("");
  const [useTemplate, setUseTpl]  = useState(false);
  const [history, setHistory]     = useState([]);
  const [classes, setClasses]     = useState([]);
  const [sections, setSections]   = useState([]);
  const [templates, setTemplates] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [recipients, setRecipients] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);
  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    Promise.all([
      apiFetch('/broadcasts'),
      apiFetch('/classes'),
      apiFetch('/templates'),
      apiFetch('/students?per_page=1'),
      apiFetch('/teachers?per_page=1'),
    ]).then(([br, cr, tr, sr, tchr]) => {
      if (br?.data) setHistory(br.data.data || br.data);
      if (cr?.data) setClasses(cr.data);
      if (tr?.data) setTemplates(tr.data.data || tr.data);
      if (sr?.meta?.total !== undefined) setStudentCount(sr.meta.total);
      else if (sr?.data?.total !== undefined) setStudentCount(sr.data.total);
      if (tchr?.meta?.total !== undefined) setTeacherCount(tchr.meta.total);
      else if (tchr?.data?.total !== undefined) setTeacherCount(tchr.data.total);
    }).catch(() => showToast("Failed to load data","error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (classVal) {
      apiFetch(`/sections?class_id=${classVal}`)
        .then(r => { if (r?.data) setSections(r.data); })
        .catch(() => {});
    } else {
      setSections([]);
      setSectionVal(""); setSectionLabel("");
    }
  }, [classVal]);

  // Resolve recipients when entering step 3
  useEffect(() => {
    if (step !== 3) return;
    setResolving(true);
    const fetchStudents = (params="") =>
      apiFetch(`/students?per_page=200&status=Active${params}`).then(r => (r?.data?.data || r?.data || []));
    const fetchTeachers = () =>
      apiFetch(`/teachers?per_page=200&status=Active`).then(r => (r?.data?.data || r?.data || []));

    let promise;
    if (audience === "all_students") {
      promise = fetchStudents().then(list =>
        list.map(s => ({ name: s.name, phone: s.parent_phone || s.parents?.[0]?.phone || "", label: `Parent of ${s.name}` }))
      );
    } else if (audience === "all_staff") {
      promise = fetchTeachers().then(list =>
        list.map(t => ({ name: t.name, phone: t.phone || "", label: t.name }))
      );
    } else if (audience === "everyone") {
      promise = Promise.all([fetchStudents(), fetchTeachers()]).then(([sl, tl]) => [
        ...sl.map(s => ({ name: s.name, phone: s.parent_phone || s.parents?.[0]?.phone || "", label: `Parent of ${s.name}` })),
        ...tl.map(t => ({ name: t.name, phone: t.phone || "", label: t.name })),
      ]);
    } else if (audience === "class") {
      promise = fetchStudents(`&class_id=${classVal}`).then(list =>
        list.map(s => ({ name: s.name, phone: s.parent_phone || s.parents?.[0]?.phone || "", label: `Parent of ${s.name} (${classLabel})` }))
      );
    } else if (audience === "section") {
      promise = fetchStudents(`&class_id=${classVal}&section_id=${sectionVal}`).then(list =>
        list.map(s => ({ name: s.name, phone: s.parent_phone || s.parents?.[0]?.phone || "", label: `Parent of ${s.name}` }))
      );
    } else {
      promise = Promise.resolve([]);
    }

    promise
      .then(list => setRecipients(list))
      .catch(() => { showToast("Failed to resolve recipients","error"); setRecipients([]); })
      .finally(() => setResolving(false));
  }, [step]);

  const audienceLabel = audience==="all_students"?"All Students":audience==="all_staff"?"All Staff":audience==="everyone"?"Everyone":audience==="class"?`Class ${classLabel}`:audience==="section"?`Class ${classLabel}-${sectionLabel}`:"";

  const sendAll = async () => {
    if (!message.trim()) { showToast("Please write a message first","error"); return; }
    setSending(true);
    try {
      recipients.forEach(r => {
        if (r.phone) window.open(`https://wa.me/91${r.phone}?text=${encodeURIComponent(message)}`,"_blank");
      });
      const res = await apiFetch('/broadcasts', { method:'POST', body:{
        audience_type: audience,
        audience_label: audienceLabel,
        message,
        reach: recipients.length,
      }});
      setHistory(prev => [res.data || res, ...prev]);
      onCountChange?.(1);
      showToast(`Broadcast sent to ${recipients.length} recipients!`);
      setStep(1); setMessage(""); setRecipients([]);
    } catch(e) { showToast(e.message || "Failed to record broadcast","error"); }
    finally { setSending(false); }
  };

  const audienceOptions = [
    { val:"all_students", label:"All Students / Parents", icon:"👨‍👩‍👧", count:studentCount },
    { val:"all_staff",    label:"All Teachers / Staff",   icon:"👩‍🏫", count:teacherCount },
    { val:"everyone",     label:"Everyone",               icon:"🏫", count:studentCount+teacherCount },
    { val:"class",        label:"Specific Class",         icon:"🎓", count:null },
    { val:"section",      label:"Specific Section",       icon:"🔢", count:null },
  ];

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",background:"#fff",borderRadius:12,padding:isMobile?"10px 12px":"14px 20px",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",marginBottom:14 }}>
        {[["1","Audience"],["2","Compose"],["3","Send"]].map(([n,l],i)=>(
          <div key={n} style={{ display:"flex",alignItems:"center",flex:1,minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:4,minWidth:0,overflow:"hidden" }}>
              <div style={{ width:isMobile?24:28,height:isMobile?24:28,borderRadius:"50%",background:step>=parseInt(n)?"#6366F1":"#E2E8F0",color:step>=parseInt(n)?"#fff":"#94A3B8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?10:12,fontWeight:800,flexShrink:0 }}>
                {step>parseInt(n)?"✓":n}
              </div>
              <span style={{ fontSize:isMobile?10:12,fontWeight:700,color:step>=parseInt(n)?"#0F172A":"#94A3B8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{l}</span>
            </div>
            {i<2&&<div style={{ flex:1,height:2,background:step>i+1?"#6366F1":"#E2E8F0",margin:"0 6px",borderRadius:2,minWidth:8 }}/>}
          </div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:(isMobile||isTablet)?"1fr":"1fr 280px",gap:14,alignItems:"start" }}>
        <div>
          {/* Step 1 – Audience */}
          {step===1&&(
            <div style={{ background:"#fff",borderRadius:14,padding:isMobile?14:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
              <p style={{ fontWeight:800,fontSize:isMobile?13:15,color:"#0F172A",margin:"0 0 12px" }}>👥 Who should receive this broadcast?</p>
              <div style={{ display:"grid",gap:7,marginBottom:12 }}>
                {audienceOptions.map(opt=>(
                  <label key={opt.val} style={{ display:"flex",alignItems:"center",gap:10,padding:isMobile?"9px 12px":"11px 14px",borderRadius:10,cursor:"pointer",background:audience===opt.val?"#EEF2FF":"#F8FAFC",border:`1.5px solid ${audience===opt.val?"#6366F1":"#E2E8F0"}` }}>
                    <input type="radio" name="bcast_audience" checked={audience===opt.val} onChange={()=>{ setAudience(opt.val); setClassVal(""); setClassLabel(""); setSectionVal(""); setSectionLabel(""); }} style={{ accentColor:"#6366F1",flexShrink:0,margin:0 }}/>
                    <span style={{ fontSize:isMobile?16:18,flexShrink:0 }}>{opt.icon}</span>
                    <span style={{ flex:1,fontSize:isMobile?12:13,fontWeight:700,color:"#374151",lineHeight:1.3 }}>{opt.label}</span>
                    {audience===opt.val&&opt.count!=null&&<span style={{ background:"#6366F1",color:"#fff",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700,flexShrink:0 }}>{opt.count}</span>}
                  </label>
                ))}
              </div>

              {(audience==="class"||audience==="section")&&(
                <div style={{ display:"flex",gap:10,padding:12,background:"#F8FAFC",borderRadius:10,border:"1px solid #E2E8F0",marginBottom:12 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>Class</label>
                    <select value={classVal} onChange={e=>{ const opt=e.target.options[e.target.selectedIndex]; setClassVal(e.target.value); setClassLabel(opt.text.replace("Class ",""));}}
                      style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:isMobile?16:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box" }}>
                      <option value="">Select…</option>
                      {classes.map(c=><option key={c.id} value={c.id}>Class {c.name}</option>)}
                    </select>
                  </div>
                  {audience==="section"&&(
                    <div style={{ flex:1,minWidth:0 }}>
                      <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>Section</label>
                      <select value={sectionVal} onChange={e=>{ const opt=e.target.options[e.target.selectedIndex]; setSectionVal(e.target.value); setSectionLabel(opt.text.replace("Section ",""));}}
                        style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:isMobile?16:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box" }}>
                        <option value="">Select…</option>
                        {sections.map(s=><option key={s.id} value={s.id}>Section {s.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display:"flex",justifyContent:"flex-end" }}>
                <button onClick={()=>setStep(2)} disabled={(audience==="class"||audience==="section")&&!classVal}
                  style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:9,padding:"9px 20px",fontSize:13,fontWeight:700,cursor:((audience==="class"||audience==="section")&&!classVal)?"not-allowed":"pointer",opacity:((audience==="class"||audience==="section")&&!classVal)?0.5:1,flexShrink:0 }}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 – Compose */}
          {step===2&&(
            <div style={{ background:"#fff",borderRadius:14,padding:isMobile?14:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
              <p style={{ fontWeight:800,fontSize:isMobile?13:15,color:"#0F172A",margin:"0 0 4px" }}>✍️ Compose Message</p>
              <p style={{ fontSize:12,color:"#94A3B8",margin:"0 0 12px" }}>To: <strong style={{ color:"#6366F1" }}>{audienceLabel}</strong></p>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 }}>
                <button onClick={()=>setUseTpl(false)} style={{ padding:"8px",borderRadius:8,border:"1.5px solid",fontSize:12,fontWeight:700,cursor:"pointer",borderColor:!useTemplate?"#6366F1":"#E2E8F0",background:!useTemplate?"#EEF2FF":"#fff",color:!useTemplate?"#6366F1":"#64748B" }}>✏️ Write</button>
                <button onClick={()=>setUseTpl(true)}  style={{ padding:"8px",borderRadius:8,border:"1.5px solid",fontSize:12,fontWeight:700,cursor:"pointer",borderColor:useTemplate?"#6366F1":"#E2E8F0",background:useTemplate?"#EEF2FF":"#fff",color:useTemplate?"#6366F1":"#64748B" }}>📝 Template</button>
              </div>
              {useTemplate ? (
                <div style={{ display:"grid",gap:7 }}>
                  {templates.length === 0 && <div style={{ textAlign:"center",padding:24,color:"#94A3B8",fontSize:13 }}>No templates available</div>}
                  {templates.map(t=>(
                    <div key={t.id} onClick={()=>{ setMessage(t.body); setUseTpl(false); }}
                      style={{ padding:"10px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",cursor:"pointer",background:"#F8FAFC" }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366F1";e.currentTarget.style.background="#EEF2FF";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#E2E8F0";e.currentTarget.style.background="#F8FAFC";}}>
                      <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:3 }}>
                        <span style={{ fontSize:10,fontWeight:700,color:CATEGORY_COLORS[t.category]||"#6366F1",background:CATEGORY_BG[t.category]||"#EEF2FF",padding:"1px 6px",borderRadius:5,flexShrink:0 }}>{t.category}</span>
                        <span style={{ fontWeight:700,fontSize:12,color:"#0F172A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.name}</span>
                      </div>
                      <div style={{ fontSize:10,color:"#94A3B8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.body.slice(0,80)}…</div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Type your message here…" rows={isMobile?5:8}
                    style={{ width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:isMobile?16:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",lineHeight:1.7,display:"block" }}
                    onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10,color:"#94A3B8" }}>
                    <span>{message.length} chars</span>
                    <span style={{ color:message.length>160?"#F59E0B":"#94A3B8" }}>{Math.ceil(message.length/160)||1} SMS page{(Math.ceil(message.length/160)||1)!==1?"s":""}</span>
                  </div>
                </>
              )}
              <div style={{ display:"flex",gap:8,marginTop:14 }}>
                <button onClick={()=>setStep(1)} style={{ background:"#F1F5F9",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer",color:"#475569" }}>← Back</button>
                <button onClick={()=>setStep(3)} disabled={!message.trim()} style={{ flex:1,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:9,padding:"9px",fontSize:13,fontWeight:700,cursor:!message.trim()?"not-allowed":"pointer",opacity:!message.trim()?0.5:1 }}>Preview & Send →</button>
              </div>
            </div>
          )}

          {/* Step 3 – Preview & Send */}
          {step===3&&(
            <div style={{ display:"grid",gap:14 }}>
              <div style={{ background:"#fff",borderRadius:14,padding:isMobile?14:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
                <p style={{ fontWeight:800,fontSize:isMobile?13:15,color:"#0F172A",margin:"0 0 12px" }}>📱 Preview & Confirm</p>
                <div style={{ background:"#E5DDD5",borderRadius:12,padding:10,marginBottom:12 }}>
                  <div style={{ background:"#075E54",borderRadius:"8px 8px 0 0",padding:"8px 12px",display:"flex",alignItems:"center",gap:9 }}>
                    <div style={{ width:28,height:28,borderRadius:"50%",background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>🏫</div>
                    <div>
                      <div style={{ color:"#fff",fontWeight:700,fontSize:12 }}>Vidya Niketan School</div>
                      <div style={{ color:"rgba(255,255,255,0.7)",fontSize:9 }}>Official Communication</div>
                    </div>
                  </div>
                  <div style={{ padding:"10px 8px" }}>
                    <div style={{ background:"#fff",borderRadius:"0 8px 8px 8px",padding:"8px 10px",maxWidth:"85%",wordBreak:"break-word" }}>
                      <div style={{ fontSize:isMobile?11:12,color:"#303030",lineHeight:1.6,whiteSpace:"pre-wrap" }}>{message}</div>
                      <div style={{ fontSize:9,color:"#94A3B8",textAlign:"right",marginTop:3 }}>12:00 ✓✓</div>
                    </div>
                  </div>
                </div>
                <div style={{ background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:10,padding:"10px 12px" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#16A34A",marginBottom:6 }}>📊 Summary</div>
                  {resolving ? (
                    <div style={{ fontSize:12,color:"#94A3B8" }}>Resolving recipients…</div>
                  ) : (
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:5 }}>
                      {[["Audience",audienceLabel],["Recipients",recipients.length],["Length",`${message.length} chars`],["Date",new Date().toLocaleDateString("en-IN")]].map(([k,v])=>(
                        <div key={k} style={{ fontSize:11,color:"#374151" }}><span style={{ color:"#94A3B8" }}>{k}: </span><strong>{v}</strong></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {!isMobile&&recipients.length>0&&(
                <div style={{ background:"#fff",borderRadius:14,padding:16,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
                  <div style={{ fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:8 }}>Recipients ({recipients.length})</div>
                  <div style={{ maxHeight:140,overflowY:"auto",display:"grid",gap:5 }}>
                    {recipients.map((r,i)=>(
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 9px",background:"#F8FAFC",borderRadius:8 }}>
                        <Avatar name={r.name} size={24}/>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:11,fontWeight:600,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.label}</div>
                          <div style={{ fontSize:10,color:"#94A3B8" }}>+91 {r.phone}</div>
                        </div>
                        {r.phone && <a href={`https://wa.me/91${r.phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" style={{ color:"#25D366",fontSize:16,textDecoration:"none" }}>📱</a>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display:"flex",gap:10 }}>
                <button onClick={()=>setStep(2)} style={{ background:"#F1F5F9",border:"none",borderRadius:9,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer",color:"#475569" }}>← Edit</button>
                <button onClick={sendAll} disabled={sending||resolving}
                  style={{ flex:1,background:"linear-gradient(135deg,#25D366,#128C7E)",color:"#fff",border:"none",borderRadius:9,padding:"12px",fontSize:isMobile?12:13,fontWeight:700,cursor:(sending||resolving)?"not-allowed":"pointer",opacity:(sending||resolving)?0.6:1,boxShadow:"0 2px 10px rgba(37,211,102,0.35)" }}>
                  {sending ? "Sending…" : resolving ? "Loading…" : `📱 Send to All (${recipients.length})`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Broadcast History */}
        <div>
          <div style={{ background:"#fff",borderRadius:14,padding:(isMobile||isTablet)?12:18,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ fontWeight:800,fontSize:13,color:"#0F172A",marginBottom:10 }}>📋 Broadcast History</div>
            {loading ? (
              <div style={{ display:"grid",gap:8 }}>{[1,2,3].map(i=><div key={i} style={{ background:"#F8FAFC",borderRadius:10,padding:"9px 11px" }}><Skeleton h={10} w="70%" r={4}/><div style={{ marginTop:6 }}/><Skeleton h={8} w="90%" r={4}/></div>)}</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign:"center",padding:24,color:"#94A3B8",fontSize:12 }}>No broadcasts yet</div>
            ) : (
              <div style={{ display:"grid",gap:8 }}>
                {history.map((h,i)=>(
                  <div key={h.id||i} style={{ background:"#F8FAFC",borderRadius:10,padding:"9px 11px",border:"1px solid #F1F5F9" }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:4 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:5,minWidth:0,flex:1 }}>
                        <span style={{ fontSize:11,fontWeight:800,color:"#6366F1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0 }}>{h.audience_label || h.audience}</span>
                        <span style={{ fontSize:9,background:"#ECFDF5",color:"#059669",padding:"1px 5px",borderRadius:5,fontWeight:700,flexShrink:0 }}>✓</span>
                      </div>
                      <span style={{ fontSize:9,color:"#94A3B8",flexShrink:0,whiteSpace:"nowrap" }}>{(h.created_at||h.date||"").slice(0,10)}</span>
                    </div>
                    <div style={{ fontSize:10,color:"#64748B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:6,lineHeight:1.4 }}>{h.message}</div>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <span style={{ fontSize:9,color:"#94A3B8",fontWeight:600 }}>👥 {h.reach} reached</span>
                      <button onClick={()=>{ setMessage(h.message); setStep(2); }}
                        style={{ fontSize:10,fontWeight:700,color:"#6366F1",background:"#EEF2FF",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer" }}>↻ Resend</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast toast={toast}/>
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────
function TemplatesTab({ isMobile, onCountChange, isStaff }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState("list");
  const [selTpl, setSelTpl]     = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const emptyForm = { name:"", category:"General", body:"", tags:[] };
  const [form, setForm]         = useState(emptyForm);
  const [tagInput, setTagInput] = useState("");

  const categories = ["Finance","Academic","Attendance","General","Events"];

  useEffect(() => {
    apiFetch('/templates')
      .then(r => { if (r?.data) setTemplates(r.data.data || r.data); })
      .catch(() => showToast("Failed to load templates","error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = templates.filter(t => filterCat === "all" || t.category === filterCat);

  const handleSave = async () => {
    if (!form.name.trim() || !form.body.trim()) { showToast("Name and body are required","error"); return; }
    setSaving(true);
    try {
      const payload = { ...form, tags: Array.isArray(form.tags) ? form.tags : [] };
      if (view === "edit" && selTpl) {
        const res = await apiFetch(`/templates/${selTpl.id}`, { method:'PUT', body: payload });
        setTemplates(p => p.map(t => t.id === selTpl.id ? (res.data||res) : t));
        showToast("Template updated!");
      } else {
        const res = await apiFetch('/templates', { method:'POST', body: payload });
        setTemplates(p => [...p, res.data||res]);
        onCountChange?.(1);
        showToast("Template created!");
      }
      setForm(emptyForm); setTagInput(""); setView("list"); setSelTpl(null);
    } catch(e) { showToast(e.message || "Failed to save","error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/templates/${id}`, { method:'DELETE' });
      setTemplates(p => p.filter(t => t.id !== id));
      onCountChange?.(-1);
      showToast("Template deleted");
    } catch(e) { showToast(e.message || "Failed to delete","error"); }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g,"-");
    if (t && !form.tags.includes(t)) setForm(f=>({...f,tags:[...f.tags,t]}));
    setTagInput("");
  };

  if (view === "create" || view === "edit") return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
        <button onClick={()=>{ setView("list"); setForm(emptyForm); setSelTpl(null); }} style={{ background:"#F1F5F9",border:"none",borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,color:"#475569" }}>← Back</button>
        <div style={{ fontWeight:800,fontSize:16,color:"#0F172A" }}>{view==="edit"?"✏️ Edit Template":"📝 New Template"}</div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 300px",gap:16 }}>
        <div style={{ display:"grid",gap:14 }}>
          <div style={{ background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.8 }}>Template Name *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Fee Reminder, Exam Alert…"
              style={{ width:"100%",padding:"10px 13px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:14,fontWeight:600,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:14 }}
              onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.8 }}>Message Body *</label>
            <textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder={"Type your template message here…\n\nUse {{variable_name}} for dynamic fields.\nExample: Dear {{student_name}}, your {{exam_name}} result is ready."} rows={10}
              style={{ width:"100%",padding:"11px 13px",borderRadius:9,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",lineHeight:1.7 }}
              onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
            <div style={{ marginTop:8,padding:"10px 14px",background:"#F8FAFC",borderRadius:8,border:"1px solid #F1F5F9" }}>
              <div style={{ fontSize:10,fontWeight:800,color:"#6366F1",marginBottom:6 }}>💡 Available Variables</div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {["{{student_name}}","{{class}}","{{section}}","{{date}}","{{teacher_name}}","{{amount}}","{{due_date}}","{{exam_name}}"].map(v=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,body:f.body+v}))}
                    style={{ padding:"2px 8px",borderRadius:6,border:"1px solid #C7D2FE",background:"#EEF2FF",color:"#6366F1",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"monospace" }}>{v}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display:"grid",gap:14,alignContent:"start" }}>
          <div style={{ background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:10,fontWeight:800,color:"#64748B",marginBottom:12,textTransform:"uppercase",letterSpacing:0.8 }}>Category</div>
            {categories.map(cat=>(
              <label key={cat} style={{ display:"flex",alignItems:"center",gap:9,padding:"8px 11px",borderRadius:8,marginBottom:6,cursor:"pointer",background:form.category===cat?CATEGORY_BG[cat]:"#F8FAFC",border:`1px solid ${form.category===cat?CATEGORY_COLORS[cat]+"44":"#F1F5F9"}` }}>
                <input type="radio" checked={form.category===cat} onChange={()=>setForm(f=>({...f,category:cat}))} style={{ accentColor:CATEGORY_COLORS[cat] }}/>
                <span style={{ fontSize:12,fontWeight:700,color:CATEGORY_COLORS[cat]||"#374151" }}>{cat}</span>
              </label>
            ))}
          </div>
          <div style={{ background:"#fff",borderRadius:14,padding:20,boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:10,fontWeight:800,color:"#64748B",marginBottom:10,textTransform:"uppercase",letterSpacing:0.8 }}>Tags</div>
            <div style={{ display:"flex",gap:6,marginBottom:10,flexWrap:"wrap" }}>
              {form.tags.map(tag=>(
                <span key={tag} style={{ background:"#EEF2FF",color:"#6366F1",padding:"3px 9px",borderRadius:8,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4 }}>
                  #{tag}
                  <button onClick={()=>setForm(f=>({...f,tags:f.tags.filter(t=>t!==tag)}))} style={{ background:"none",border:"none",color:"#6366F1",cursor:"pointer",padding:0,fontSize:12,lineHeight:1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display:"flex",gap:6 }}>
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTag()} placeholder="Add tag…"
                style={{ flex:1,padding:"7px 10px",borderRadius:7,border:"1px solid #E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit" }}/>
              <button onClick={addTag} style={{ padding:"7px 12px",borderRadius:7,background:"#6366F1",color:"#fff",border:"none",fontSize:12,cursor:"pointer",fontWeight:700 }}>+</button>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:11,padding:"13px",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,boxShadow:"0 2px 10px rgba(99,102,241,0.3)" }}>
            {saving ? "Saving…" : `✓ ${view==="edit"?"Save Changes":"Create Template"}`}
          </button>
        </div>
      </div>
      <Toast toast={toast}/>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <div style={{ display:"flex",gap:6,background:"#E2E8F0",borderRadius:9,padding:3,flexWrap:"wrap" }}>
          {["all",...categories].map(c=>(
            <button key={c} onClick={()=>setFilterCat(c)} style={{ padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:filterCat===c?"#fff":"transparent",color:filterCat===c?(CATEGORY_COLORS[c]||"#6366F1"):"#64748B",boxShadow:filterCat===c?"0 1px 4px rgba(0,0,0,0.08)":"none" }}>
              {c==="all"?"All":c}
            </button>
          ))}
        </div>
        <button onClick={()=>{ setForm(emptyForm); setView("create"); }} style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:9,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(99,102,241,0.3)" }}>+ New Template</button>
      </div>

      {loading ? (
        <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:14 }}>
          {[1,2,3].map(i=><div key={i} style={{ background:"#fff",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 8px rgba(0,0,0,0.07)" }}><Skeleton h={12} w="40%" r={4}/><div style={{ marginTop:10 }}/><Skeleton h={14} w="70%" r={4}/><div style={{ marginTop:8 }}/><Skeleton h={10} w="100%" r={4}/></div>)}
        </div>
      ) : (
        <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:14 }}>
          {filtered.map(t=>(
            <div key={t.id} style={{ background:"#fff",borderRadius:14,overflow:"hidden",overflowX:"auto",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",border:"1px solid #F1F5F9",transition:"transform 0.15s,box-shadow 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.1)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,0.07)";}}>
              <div style={{ height:4,background:CATEGORY_COLORS[t.category]||"#6366F1" }}/>
              <div style={{ padding:"16px 18px 12px" }}>
                <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8 }}>
                  <div>
                    <span style={{ fontSize:10,fontWeight:700,color:CATEGORY_COLORS[t.category],background:CATEGORY_BG[t.category],padding:"2px 8px",borderRadius:6 }}>{t.category}</span>
                    <div style={{ fontWeight:800,fontSize:15,color:"#0F172A",marginTop:5 }}>{t.name}</div>
                  </div>
                  <div style={{ display:"flex",gap:6 }}>
                    <button onClick={()=>{ setForm({name:t.name,category:t.category,body:t.body,tags:Array.isArray(t.tags)?t.tags:(t.tags||"").split(",").map(x=>x.trim()).filter(Boolean)}); setSelTpl(t); setView("edit"); }}
                      style={{ background:"#F1F5F9",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700,color:"#475569" }}>✏️</button>
                    {!isStaff && (
                      <button onClick={()=>handleDelete(t.id)}
                        style={{ background:"#FEF2F2",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700,color:"#EF4444" }}>🗑</button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize:11,color:"#64748B",lineHeight:1.6,maxHeight:56,overflow:"hidden",marginBottom:10 }}>{t.body.slice(0,120)}…</div>
                <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:10 }}>
                  {(Array.isArray(t.tags)?t.tags:(t.tags||"").split(",").map(x=>x.trim()).filter(Boolean)).map(tag=>(
                    <span key={tag} style={{ background:"#F1F5F9",color:"#64748B",padding:"2px 7px",borderRadius:6,fontSize:10,fontWeight:600 }}>#{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ borderTop:"1px solid #F1F5F9",padding:"10px 18px",display:"flex",gap:8 }}>
                <button onClick={()=>{ setForm({name:t.name,category:t.category,body:t.body,tags:Array.isArray(t.tags)?t.tags:(t.tags||"").split(",").map(x=>x.trim()).filter(Boolean)}); setSelTpl(t); setView("edit"); }}
                  style={{ flex:1,background:"#EEF2FF",color:"#6366F1",border:"none",borderRadius:8,padding:"7px",fontSize:12,fontWeight:700,cursor:"pointer" }}>✏️ Edit</button>
                <button onClick={()=>navigator.clipboard.writeText(t.body).then(()=>showToast("Copied to clipboard!"))}
                  style={{ flex:1,background:"#F0FDF4",color:"#059669",border:"none",borderRadius:8,padding:"7px",fontSize:12,fontWeight:700,cursor:"pointer" }}>📋 Copy</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && <div style={{ textAlign:"center",padding:48,color:"#94A3B8",fontSize:14 }}>No templates in this category</div>}
      <Toast toast={toast}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function Communications() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'
  const { user } = useAuthStore()
  const isStaff  = user?.role === 'staff'
  const [tab, setTab] = useState("announce");

  const [annCount,       setAnnCount]       = useState("—");
  const [broadcastCount, setBroadcastCount] = useState("—");
  const [templateCount,  setTemplateCount]  = useState("—");
  const [reachCount,     setReachCount]     = useState("—");

  useEffect(() => {
    Promise.all([
      apiFetch('/announcements?per_page=1'),
      apiFetch('/broadcasts'),
      apiFetch('/templates?per_page=1'),
      apiFetch('/students?per_page=1'),
      apiFetch('/teachers?per_page=1'),
    ]).then(([ar, br, tr, sr, tchr]) => {
      const annTotal  = ar?.meta?.total  ?? ar?.data?.total  ?? (ar?.data?.data||ar?.data||[]).length;
      const tplTotal  = tr?.meta?.total  ?? tr?.data?.total  ?? (tr?.data?.data||tr?.data||[]).length;
      const brdList   = br?.data?.data   || br?.data || [];
      const stuTotal  = sr?.meta?.total  ?? sr?.data?.total  ?? 0;
      const tchTotal  = tchr?.meta?.total ?? tchr?.data?.total ?? 0;
      setAnnCount(annTotal);
      setBroadcastCount(brdList.length);
      setTemplateCount(tplTotal);
      setReachCount(stuTotal + tchTotal);
    }).catch(() => {});
  }, []);

  const widgets = [
    { icon:"📣", label:"Announcements",  value:annCount,       c:"#6366F1", bg:"#EEF2FF", sub:"Posted this term"   },
    { icon:"📱", label:"Broadcasts Sent",value:broadcastCount, c:"#10B981", bg:"#ECFDF5", sub:"Via WhatsApp"        },
    { icon:"👥", label:"Total Reach",    value:reachCount,     c:"#3B82F6", bg:"#EFF6FF", sub:"Students + Teachers" },
    { icon:"📝", label:"Templates",      value:templateCount,  c:"#F59E0B", bg:"#FFFBEB", sub:"Ready to use"        },
  ];

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif",padding:isMobile?12:24,background:"#F0F4F8",minHeight:"100vh" }}>
      <div style={{ marginBottom:22 }}>
        <div style={{ fontWeight:900,fontSize:22,color:"#0F172A" }}>📢 Communications</div>
        <div style={{ fontSize:13,color:"#94A3B8",marginTop:3 }}>Announcements, WhatsApp broadcasts and message templates</div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:14,marginBottom:22 }}>
        {widgets.map(w=>(
          <div key={w.label} style={{ background:"#fff",borderRadius:14,padding:isMobile?"12px 10px":"18px 20px",boxShadow:"0 1px 8px rgba(0,0,0,0.07)",display:"flex",alignItems:"center",gap:isMobile?8:14,border:`1px solid ${w.c}18`,transition:"transform 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ width:isMobile?36:52,height:isMobile?36:52,background:w.bg,borderRadius:12,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?18:26 }}>{w.icon}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:isMobile?20:26,fontWeight:900,color:w.c,lineHeight:1 }}>{w.value}</div>
              <div style={{ fontSize:isMobile?10:12,fontWeight:700,color:"#374151",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{w.label}</div>
              {!isMobile&&<div style={{ fontSize:10,color:"#94A3B8",marginTop:1 }}>{w.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex",gap:0,background:"#fff",borderRadius:14,padding:6,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",marginBottom:20,width:isMobile?"100%":"fit-content",overflowX:"auto" }}>
        {[
          ["announce",  isMobile?"📣 Announce":"📣 Announcements"],
          ["broadcast", isMobile?"📱 Broadcast":"📱 WhatsApp Broadcast"],
          ["templates", isMobile?"📝 Templates":"📝 Templates"],
        ].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ flex:isMobile?1:"none",padding:isMobile?"8px 10px":"9px 20px",borderRadius:9,border:"none",cursor:"pointer",fontSize:isMobile?11:13,fontWeight:700,transition:"all 0.18s",background:tab===t?"linear-gradient(135deg,#6366F1,#4F46E5)":"transparent",color:tab===t?"#fff":"#64748B",boxShadow:tab===t?"0 2px 8px rgba(99,102,241,0.3)":"none",whiteSpace:"nowrap" }}>{l}</button>
        ))}
      </div>

      {tab==="announce"  && <AnnounceTab  isMobile={isMobile} isTablet={isTablet} isStaff={isStaff} onCountChange={d => setAnnCount(c => c==="—" ? 1 : Math.max(0, c+d))}/>}
      {tab==="broadcast" && <BroadcastTab isMobile={isMobile} isTablet={isTablet} onCountChange={d => setBroadcastCount(c => c==="—" ? 1 : Math.max(0, c+d))}/>}
      {tab==="templates" && <TemplatesTab isMobile={isMobile} isStaff={isStaff} onCountChange={d => setTemplateCount(c => c==="—" ? 1 : Math.max(0, c+d))}/>}
    </div>
  );
}
