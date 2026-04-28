import { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom'
import { useBreakpoint } from '../../hooks/responsive.jsx'
import useAppStore from '../../store/appStore'
import useAuthStore from '../../store/authStore'
import useSubscriptionStore from '../../store/subscriptionStore'

// ── API helper ────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const DEACTIVATION_CODES = ['SCHOOL_DEACTIVATED', 'ACCOUNT_DEACTIVATED', 'SCHOOL_NOT_FOUND'];
async function apiFetch(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('subscription');
      if (DEACTIVATION_CODES.includes(json.code)) {
        alert(json.message);
      }
      window.location.href = '/login';
      return;
    }
    throw new Error(json.message || 'Request failed');
  }
  return json;
}

// ── Default fallbacks ─────────────────────────────────────────
const INIT_FEE_TYPES = [
  { id:"FT001", name:"Tuition Fee",   amount:8500,  term:"Monthly",  dueDayOfMonth:10, lateFine:100, lateFineEnabled:true  },
  { id:"FT002", name:"Transport Fee", amount:2000,  term:"Monthly",  dueDayOfMonth:10, lateFine:50,  lateFineEnabled:true  },
  { id:"FT003", name:"Annual Fee",    amount:15000, term:"Annual",   dueDayOfMonth:30, lateFine:500, lateFineEnabled:true  },
  { id:"FT004", name:"Exam Fee",      amount:1200,  term:"Per Exam", dueDayOfMonth:15, lateFine:0,   lateFineEnabled:false },
  { id:"FT005", name:"Library Fee",   amount:500,   term:"Annual",   dueDayOfMonth:30, lateFine:0,   lateFineEnabled:false },
];

// ── Role mapping ──────────────────────────────────────────────
const ROLE_DISPLAY = {
  'super_admin': 'Super Admin',
  'admin':       'Admin Staff',
  'teacher':     'Teacher',
  'staff':       'Staff',
};
const ADD_ROLES = [
  { label:"Admin Staff", value:"admin"   },
  { label:"Teacher",     value:"teacher" },
  { label:"Staff",       value:"staff"   },
];

const ROLE_META  = {
  "Super Admin":  { c:"#6366F1", bg:"#EEF2FF" },
  "Admin Staff":  { c:"#3B82F6", bg:"#EFF6FF" },
  "Teacher":      { c:"#10B981", bg:"#ECFDF5" },
  "Accountant":   { c:"#F59E0B", bg:"#FFFBEB" },
  "Receptionist": { c:"#8B5CF6", bg:"#F5F3FF" },
  "Staff":        { c:"#64748B", bg:"#F1F5F9" },
};
const TERMS      = ["Monthly","Quarterly","Annual","Per Exam","One-time"];
const palette    = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
const COLOR_PRESETS = ["#6366F1","#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#0F172A"];

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

function SectionCard({ title, icon, children, isMobile }) {
  return (
    <div style={{ background:"#fff",borderRadius:16,boxShadow:"0 1px 8px rgba(0,0,0,0.07)",overflow:"hidden",overflowX:"auto",marginBottom:20 }}>
      <div style={{ padding:isMobile?"12px 14px":"16px 22px",borderBottom:"1px solid #F1F5F9",display:"flex",alignItems:"center",gap:10 }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <span style={{ fontWeight:800,fontSize:isMobile?13:15,color:"#0F172A" }}>{title}</span>
      </div>
      <div style={{ padding:isMobile?12:22 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type="text", disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
      style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${focused?"#6366F1":"#E2E8F0"}`,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:disabled?"#F8FAFC":"#fff",color:disabled?"#94A3B8":"#0F172A" }}/>
  );
}

function Toggle({ value, onChange, label, desc }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",background:"#F8FAFC",borderRadius:10,border:"1px solid #F1F5F9",marginBottom:8 }}>
      <div>
        <div style={{ fontSize:13,fontWeight:700,color:"#374151" }}>{label}</div>
        {desc && <div style={{ fontSize:11,color:"#94A3B8",marginTop:1 }}>{desc}</div>}
      </div>
      <button onClick={()=>onChange(!value)} style={{ width:44,height:24,borderRadius:99,border:"none",cursor:"pointer",background:value?"#6366F1":"#CBD5E1",position:"relative",transition:"background 0.2s",flexShrink:0 }}>
        <div style={{ width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:value?23:3,transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
      </button>
    </div>
  );
}

// ── School Info Section ───────────────────────────────────────
function SchoolInfo({ showToast, isMobile }) {
  const [school, setSchool] = useState({ name:'', tagline:'', address:'', phone:'', altPhone:'', email:'', website:'', principal:'', established:'', affiliation:'', affNo:'' });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const setF = p => setSchool(s => ({...s, ...p}));

  useEffect(() => {
    apiFetch('/settings')
      .then(r => {
        const d = r.data;
        const s = d.settings || {};
        setSchool({
          name:        d.name           || '',
          tagline:     s.tagline        || '',
          address:     d.address        || '',
          phone:       d.phone          || '',
          altPhone:    s.alt_phone      || '',
          email:       d.email          || '',
          website:     d.website        || '',
          principal:   s.principal      || '',
          established: s.established    || '',
          affiliation: s.affiliation    || '',
          affNo:       d.affiliation_no || '',
        });
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/settings', {
        method: 'PUT',
        body: {
          name:           school.name,
          address:        school.address,
          phone:          school.phone,
          email:          school.email,
          website:        school.website,
          affiliation_no: school.affNo,
          settings: {
            tagline:     school.tagline,
            principal:   school.principal,
            established: school.established,
            affiliation: school.affiliation,
            alt_phone:   school.altPhone,
          },
        },
      });
      showToast('School profile updated');
    } catch(e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="School Information" icon="🏫" isMobile={isMobile}>
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14 }}>
        <Field label="School Name *"><Input value={school.name} onChange={e=>setF({name:e.target.value})} placeholder="School name" disabled={loading}/></Field>
        <Field label="Tagline"><Input value={school.tagline} onChange={e=>setF({tagline:e.target.value})} placeholder="School tagline" disabled={loading}/></Field>
        <Field label="Principal Name"><Input value={school.principal} onChange={e=>setF({principal:e.target.value})} placeholder="Principal's full name" disabled={loading}/></Field>
        <Field label="Established Year"><Input value={school.established} onChange={e=>setF({established:e.target.value})} placeholder="e.g. 1998" disabled={loading}/></Field>
        <Field label="Phone"><Input value={school.phone} onChange={e=>setF({phone:e.target.value})} placeholder="Primary phone" disabled={loading}/></Field>
        <Field label="Alternate Phone"><Input value={school.altPhone} onChange={e=>setF({altPhone:e.target.value})} placeholder="Alternate phone" disabled={loading}/></Field>
        <Field label="Email"><Input value={school.email} onChange={e=>setF({email:e.target.value})} type="email" placeholder="admin@school.edu.in" disabled={loading}/></Field>
        <Field label="Website"><Input value={school.website} onChange={e=>setF({website:e.target.value})} placeholder="www.school.edu.in" disabled={loading}/></Field>
        <div style={{ gridColumn:"1/-1" }}>
          <Field label="Address">
            <textarea value={school.address} onChange={e=>setF({address:e.target.value})} rows={2} disabled={loading}
              style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",background:loading?"#F8FAFC":"#fff",color:loading?"#94A3B8":"#0F172A" }}
              onFocus={e=>e.target.style.borderColor="#6366F1"} onBlur={e=>e.target.style.borderColor="#E2E8F0"}/>
          </Field>
        </div>
        <Field label="Board / Affiliation"><Input value={school.affiliation} onChange={e=>setF({affiliation:e.target.value})} placeholder="e.g. CBSE, ICSE" disabled={loading}/></Field>
        <Field label="Affiliation Number"><Input value={school.affNo} onChange={e=>setF({affNo:e.target.value})} placeholder="Affiliation no." disabled={loading}/></Field>
      </div>
      <div style={{ display:"flex",justifyContent:isMobile?"stretch":"flex-end",marginTop:4 }}>
        <button onClick={save} disabled={saving||loading}
          style={{ background:saving||loading?"#A5B4FC":"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:9,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:saving||loading?"not-allowed":"pointer",boxShadow:"0 2px 8px rgba(99,102,241,0.3)" }}>
          {saving ? "Saving…" : "✓ Save Changes"}
        </button>
      </div>
    </SectionCard>
  );
}

// ── Academic Year Section ─────────────────────────────────────
function AcademicYears({ showToast, isMobile }) {
  const [years,   setYears]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ name:'', start_date:'', end_date:'', is_current:false });

  const load = () => {
    setLoading(true);
    apiFetch('/academic-years')
      .then(r => setYears(r.data || []))
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setActive = async (id) => {
    try {
      await apiFetch(`/academic-years/${id}`, { method:'PUT', body:{ is_current:true } });
      showToast('Academic year switched!');
      load();
    } catch(e) {
      showToast(e.message, 'error');
    }
  };

  const saveNew = async () => {
    if (!form.name.trim())               { showToast('Year name is required', 'error'); return; }
    if (!form.start_date || !form.end_date) { showToast('Start and end dates required', 'error'); return; }
    setSaving(true);
    try {
      await apiFetch('/academic-years', { method:'POST', body:form });
      showToast(`Academic year ${form.name} added!`);
      setForm({ name:'', start_date:'', end_date:'', is_current:false });
      setAdding(false);
      load();
    } catch(e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteYear = async (id, isCurrent) => {
    if (isCurrent) { showToast('Cannot delete the current active year', 'error'); return; }
    try {
      await apiFetch(`/academic-years/${id}`, { method:'DELETE' });
      showToast('Academic year deleted');
      load();
    } catch(e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <SectionCard title="Academic Year Management" icon="📅" isMobile={isMobile}>
      <div style={{ display:"grid",gap:10,marginBottom:16 }}>
        {loading
          ? <div style={{ padding:20,textAlign:"center",color:"#94A3B8",fontSize:13 }}>Loading…</div>
          : years.map(y => (
            <div key={y.id} style={{ background:y.is_current?"linear-gradient(135deg,#EEF2FF,#E0E7FF)":"#F8FAFC",borderRadius:12,padding:"14px 18px",border:`1.5px solid ${y.is_current?"#6366F1":"#E2E8F0"}`,display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:4 }}>
                  <span style={{ fontWeight:900,fontSize:16,color:y.is_current?"#6366F1":"#374151" }}>{y.name}</span>
                  {y.is_current && <span style={{ background:"#6366F1",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 10px",borderRadius:20 }}>● Current</span>}
                </div>
                <div style={{ display:"flex",gap:isMobile?8:16,fontSize:isMobile?10:11,color:"#64748B",flexWrap:"wrap" }}>
                  <span>Start: {y.start_date || '—'}</span>
                  <span>End: {y.end_date || '—'}</span>
                </div>
              </div>
              {!y.is_current && (
                <button onClick={()=>setActive(y.id)} style={{ background:"#EEF2FF",color:"#6366F1",border:"1px solid #C7D2FE",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                  Set Active
                </button>
              )}
              {!y.is_current && (
                <button onClick={()=>deleteYear(y.id, y.is_current)} style={{ background:"#FEF2F2",color:"#EF4444",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer" }}>🗑</button>
              )}
            </div>
          ))
        }
      </div>

      {adding ? (
        <div style={{ background:"#F8FAFC",borderRadius:12,padding:18,border:"1.5px dashed #C7D2FE" }}>
          <div style={{ fontWeight:700,fontSize:13,color:"#6366F1",marginBottom:14 }}>➕ New Academic Year</div>
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:14 }}>
            <Field label="Year Name (e.g. 2026-27)"><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="2026-27"/></Field>
            <div/>
            <Field label="Start Date"><Input type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/></Field>
            <Field label="End Date"><Input type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/></Field>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
            <input type="checkbox" id="isCurrent" checked={form.is_current} onChange={e=>setForm(f=>({...f,is_current:e.target.checked}))} style={{ accentColor:"#6366F1",width:16,height:16 }}/>
            <label htmlFor="isCurrent" style={{ fontSize:13,color:"#374151",fontWeight:600,cursor:"pointer" }}>Set as current year</label>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setAdding(false)} style={{ background:"#F1F5F9",border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:600,cursor:"pointer",color:"#475569" }}>Cancel</button>
            <button onClick={saveNew} disabled={saving} style={{ background:saving?"#A5B4FC":"#6366F1",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer" }}>{saving?"Saving…":"✓ Add Year"}</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)} style={{ background:"#EEF2FF",color:"#6366F1",border:"1.5px dashed #C7D2FE",borderRadius:10,padding:"10px",width:"100%",fontSize:13,fontWeight:700,cursor:"pointer" }}>
          + Add New Academic Year
        </button>
      )}
    </SectionCard>
  );
}

// ── Users & Roles Section ─────────────────────────────────────
function UsersRoles({ showToast, isMobile }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({ name:'', email:'', password:'', role:'teacher', phone:'' });
  const [confirmDeact, setConfirmDeact] = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch('/staff')
      .then(r => setUsers(r.data || []))
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const saveUser = async () => {
    if (!form.name.trim() || !form.email.trim()) { showToast('Name and email required', 'error'); return; }
    if (!form.password.trim()) { showToast('Password required', 'error'); return; }
    setSaving(true);
    try {
      await apiFetch('/staff', { method:'POST', body:form });
      showToast(`User ${form.name} added!`);
      setForm({ name:'', email:'', password:'', role:'teacher', phone:'' });
      setAdding(false);
      load();
    } catch(e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u) => {
    const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await apiFetch(`/staff/${u.id}`, { method:'PUT', body:{ status:newStatus } });
      setUsers(p => p.map(x => x.id===u.id ? { ...x, status:newStatus } : x));
      showToast('User status updated');
    } catch(e) {
      showToast(e.message, 'error');
    }
  };

  const deactivateUser = async (id) => {
    try {
      await apiFetch(`/staff/${id}`, { method:'PUT', body:{ status:'Inactive' } });
      setUsers(p => p.map(u => u.id===id ? { ...u, status:'Inactive' } : u));
      setConfirmDeact(null);
      showToast('User deactivated');
    } catch(e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <SectionCard title="Users & Roles" icon="👤" isMobile={isMobile}>
      <div style={{ display:"grid",gap:8,marginBottom:14 }}>
        {loading
          ? <div style={{ padding:20,textAlign:"center",color:"#94A3B8",fontSize:13 }}>Loading…</div>
          : users.map(u => {
            const displayRole = ROLE_DISPLAY[u.role] || u.role;
            const rm = ROLE_META[displayRole] || { c:"#6366F1", bg:"#EEF2FF" };
            const isActive = (u.status || 'Active') === 'Active';
            return (
              <div key={u.id} style={{ display:"flex",alignItems:"center",gap:isMobile?8:12,padding:isMobile?"10px":"12px 14px",background:isActive?"#F8FAFC":"#FAFAFA",borderRadius:10,border:"1px solid #F1F5F9",opacity:isActive?1:0.6,flexWrap:isMobile?"wrap":"nowrap" }}>
                <Avatar name={u.name} size={36}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:800,fontSize:13,color:"#0F172A" }}>{u.name}</div>
                  <div style={{ fontSize:11,color:"#94A3B8" }}>{u.email}</div>
                </div>
                <span style={{ background:rm.bg,color:rm.c,border:`1px solid ${rm.c}33`,padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,whiteSpace:"nowrap" }}>{displayRole}</span>
                <div style={{ fontSize:10,color:"#94A3B8",minWidth:80,textAlign:"right" }}>
                  <div>Last login</div>
                  <div style={{ fontWeight:600,color:"#64748B" }}>{u.last_login || '—'}</div>
                </div>
                <button onClick={()=>toggleStatus(u)} style={{ padding:"5px 12px",borderRadius:7,border:"1px solid",fontSize:11,fontWeight:700,cursor:"pointer",borderColor:isActive?"#6EE7B7":"#E2E8F0",background:isActive?"#ECFDF5":"#F1F5F9",color:isActive?"#059669":"#94A3B8",whiteSpace:"nowrap" }}>
                  {isActive?"● Active":"○ Inactive"}
                </button>
                {confirmDeact===u.id
                  ? <div style={{ display:"flex",gap:4 }}>
                      <button onClick={()=>deactivateUser(u.id)} style={{ background:"#EF4444",color:"#fff",border:"none",borderRadius:6,padding:"4px 9px",fontSize:11,fontWeight:800,cursor:"pointer" }}>Yes</button>
                      <button onClick={()=>setConfirmDeact(null)} style={{ background:"#F1F5F9",border:"none",borderRadius:6,padding:"4px 9px",fontSize:11,cursor:"pointer",color:"#475569" }}>No</button>
                    </div>
                  : <button onClick={()=>setConfirmDeact(u.id)} style={{ background:"#FEF2F2",color:"#EF4444",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer" }}>🗑</button>
                }
              </div>
            );
          })
        }
      </div>

      {adding ? (
        <div style={{ background:"#F8FAFC",borderRadius:12,padding:18,border:"1.5px dashed #C7D2FE" }}>
          <div style={{ fontWeight:700,fontSize:13,color:"#6366F1",marginBottom:14 }}>➕ Add New User</div>
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:14 }}>
            <Field label="Full Name *"><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Full name"/></Field>
            <Field label="Email *"><Input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@school.in"/></Field>
            <Field label="Password *"><Input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min 6 characters"/></Field>
            <Field label="Phone"><Input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="Phone number"/></Field>
            <div>
              <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>Role</label>
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={{ width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit" }}>
                {ADD_ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setAdding(false)} style={{ background:"#F1F5F9",border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:600,cursor:"pointer",color:"#475569" }}>Cancel</button>
            <button onClick={saveUser} disabled={saving} style={{ background:saving?"#A5B4FC":"#6366F1",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer" }}>{saving?"Saving…":"✓ Add User"}</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)} style={{ background:"#EEF2FF",color:"#6366F1",border:"1.5px dashed #C7D2FE",borderRadius:10,padding:"10px",width:"100%",fontSize:13,fontWeight:700,cursor:"pointer" }}>
          + Add New User
        </button>
      )}
    </SectionCard>
  );
}

// ── Fee Configuration Section ─────────────────────────────────
function FeeConfig({ showToast, isMobile }) {
  const [fees,       setFees]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [adding,     setAdding]     = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState({ name:'', amount:'', term:'Monthly', dueDayOfMonth:10, lateFine:0, lateFineEnabled:false });

  useEffect(() => {
    apiFetch('/settings')
      .then(r => {
        const ft = r.data?.settings?.fee_types;
        setFees(ft && ft.length ? ft : INIT_FEE_TYPES);
      })
      .catch(e => { showToast(e.message, 'error'); setFees(INIT_FEE_TYPES); })
      .finally(() => setLoading(false));
  }, []);

  const persist = async (updatedFees) => {
    try {
      await apiFetch('/settings', { method:'PUT', body:{ settings:{ fee_types:updatedFees } } });
    } catch(e) {
      showToast(e.message, 'error');
    }
  };

  const saveNew = async () => {
    if (!form.name.trim() || !form.amount) { showToast('Name and amount required', 'error'); return; }
    const id      = `FT${Date.now()}`;
    const updated = [...fees, { ...form, id, amount:Number(form.amount) }];
    setFees(updated);
    await persist(updated);
    showToast(`Fee type "${form.name}" added!`);
    setForm({ name:'', amount:'', term:'Monthly', dueDayOfMonth:10, lateFine:0, lateFineEnabled:false });
    setAdding(false);
  };

  const saveEdit = async () => {
    const updated = fees.map(f => f.id===editId ? { ...form, id:editId, amount:Number(form.amount) } : f);
    setFees(updated);
    await persist(updated);
    showToast('Fee type updated!');
    setEditId(null);
  };

  const deleteFee = async (id) => {
    const updated = fees.filter(f => f.id !== id);
    setFees(updated);
    await persist(updated);
    setConfirmDel(null);
    showToast('Fee type removed');
  };

  if (loading) return (
    <SectionCard title="Fee Configuration" icon="💰" isMobile={isMobile}>
      <div style={{ padding:20,textAlign:"center",color:"#94A3B8",fontSize:13 }}>Loading…</div>
    </SectionCard>
  );

  return (
    <SectionCard title="Fee Configuration" icon="💰" isMobile={isMobile}>
      <div style={{ display:"grid",gap:8,marginBottom:14 }}>
        {fees.map(f=>(
          <div key={f.id}>
            {editId===f.id ? (
              <div style={{ background:"#EEF2FF",borderRadius:11,padding:16,border:"1.5px solid #C7D2FE" }}>
                <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10,marginBottom:10 }}>
                  <Field label="Name"><Input value={form.name} onChange={e=>setForm(x=>({...x,name:e.target.value}))}/></Field>
                  <Field label="Amount (₹)"><Input type="number" value={form.amount} onChange={e=>setForm(x=>({...x,amount:e.target.value}))}/></Field>
                  <div>
                    <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>Frequency</label>
                    <select value={form.term} onChange={e=>setForm(x=>({...x,term:e.target.value}))} style={{ width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit" }}>
                      {TERMS.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
                  <Toggle value={form.lateFineEnabled} onChange={v=>setForm(x=>({...x,lateFineEnabled:v}))} label="Late Fine" desc="Charge fine after due date"/>
                  {form.lateFineEnabled && <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <label style={{ fontSize:11,color:"#64748B",fontWeight:600 }}>Fine Amount (₹)</label>
                    <input type="number" value={form.lateFine} onChange={e=>setForm(x=>({...x,lateFine:Number(e.target.value)}))} style={{ width:80,padding:"6px 9px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit" }}/>
                  </div>}
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>setEditId(null)} style={{ background:"#F1F5F9",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,cursor:"pointer",color:"#475569",fontWeight:600 }}>Cancel</button>
                  <button onClick={saveEdit} style={{ background:"#6366F1",color:"#fff",border:"none",borderRadius:7,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:"pointer" }}>✓ Save</button>
                </div>
              </div>
            ) : (
              <div style={{ display:"flex",alignItems:"center",gap:isMobile?8:12,padding:isMobile?"10px":"12px 14px",background:"#F8FAFC",borderRadius:10,border:"1px solid #F1F5F9",flexWrap:isMobile?"wrap":"nowrap" }}>
                <div style={{ width:40,height:40,borderRadius:10,background:"#FFFBEB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>💰</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800,fontSize:13,color:"#0F172A" }}>{f.name}</div>
                  <div style={{ fontSize:11,color:"#94A3B8",marginTop:1 }}>Due: Day {f.dueDayOfMonth} · {f.term}{f.lateFineEnabled?` · Late fine: ₹${f.lateFine}`:""}</div>
                </div>
                <span style={{ fontWeight:900,fontSize:16,color:"#F59E0B" }}>₹{Number(f.amount).toLocaleString("en-IN")}</span>
                <span style={{ background:f.lateFineEnabled?"#FEF3C7":"#F1F5F9",color:f.lateFineEnabled?"#D97706":"#94A3B8",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700 }}>{f.lateFineEnabled?"Fine On":"No Fine"}</span>
                <button onClick={()=>{ setEditId(f.id); setForm({...f}); }} style={{ background:"#EEF2FF",color:"#6366F1",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>✏️</button>
                {confirmDel===f.id
                  ? <div style={{ display:"flex",gap:4 }}>
                      <button onClick={()=>deleteFee(f.id)} style={{ background:"#EF4444",color:"#fff",border:"none",borderRadius:6,padding:"4px 9px",fontSize:11,fontWeight:800,cursor:"pointer" }}>Yes</button>
                      <button onClick={()=>setConfirmDel(null)} style={{ background:"#F1F5F9",border:"none",borderRadius:6,padding:"4px 9px",fontSize:11,cursor:"pointer",color:"#475569" }}>No</button>
                    </div>
                  : <button onClick={()=>setConfirmDel(f.id)} style={{ background:"#FEF2F2",color:"#EF4444",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer" }}>🗑</button>
                }
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ background:"#F8FAFC",borderRadius:12,padding:18,border:"1.5px dashed #FCD34D" }}>
          <div style={{ fontWeight:700,fontSize:13,color:"#F59E0B",marginBottom:14 }}>➕ New Fee Type</div>
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:12,marginBottom:10 }}>
            <Field label="Fee Name *"><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Sports Fee"/></Field>
            <Field label="Amount (₹) *"><Input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0"/></Field>
            <div>
              <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:0.8 }}>Frequency</label>
              <select value={form.term} onChange={e=>setForm(f=>({...f,term:e.target.value}))} style={{ width:"100%",padding:"9px 10px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit" }}>
                {TERMS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <Toggle value={form.lateFineEnabled} onChange={v=>setForm(f=>({...f,lateFineEnabled:v}))} label="Enable Late Fine" desc="Charge fine when fee is paid after due date"/>
            {form.lateFineEnabled && <div style={{ display:"flex",alignItems:"center",gap:10,padding:"0 14px",marginTop:4 }}>
              <label style={{ fontSize:11,color:"#64748B",fontWeight:600 }}>Fine Amount (₹)</label>
              <input type="number" value={form.lateFine} onChange={e=>setForm(f=>({...f,lateFine:Number(e.target.value)}))} style={{ width:90,padding:"6px 9px",borderRadius:7,border:"1.5px solid #E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit" }}/>
            </div>}
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setAdding(false)} style={{ background:"#F1F5F9",border:"none",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:600,cursor:"pointer",color:"#475569" }}>Cancel</button>
            <button onClick={saveNew} style={{ background:"#F59E0B",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:700,cursor:"pointer" }}>✓ Add Fee Type</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)} style={{ background:"#FFFBEB",color:"#D97706",border:"1.5px dashed #FCD34D",borderRadius:10,padding:"10px",width:"100%",fontSize:13,fontWeight:700,cursor:"pointer" }}>
          + Add New Fee Type
        </button>
      )}
    </SectionCard>
  );
}

// ── Branding Section ──────────────────────────────────────────
function Branding({ showToast, isMobile }) {
  const [brand,   setBrand]   = useState({ primaryColor:"#6366F1", accentColor:"#10B981", sidebarTheme:"dark", logoText:"VN", logoUrl:null });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const setF = p => setBrand(b => ({...b, ...p}));
  const { setBranding } = useAppStore();

  useEffect(() => {
    apiFetch('/settings')
      .then(r => {
        const s = r.data?.settings || {};
        setBrand(b => ({
          ...b,
          primaryColor: s.primary_color || b.primaryColor,
          accentColor:  s.accent_color  || b.accentColor,
          sidebarTheme: s.sidebar_theme || b.sidebarTheme,
          logoText:     s.logo_text     || b.logoText,
          logoUrl:      r.data.logo     || null,
        }));
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/settings', {
        method: 'PUT',
        body: {
          settings: {
            primary_color: brand.primaryColor,
            accent_color:  brand.accentColor,
            sidebar_theme: brand.sidebarTheme,
            logo_text:     brand.logoText,
          },
        },
      });
      setBranding({ primaryColor: brand.primaryColor, accentColor: brand.accentColor, sidebarTheme: brand.sidebarTheme, logoText: brand.logoText, logoUrl: brand.logoUrl });
      showToast('Branding settings saved!');
    } catch(e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const themePreview = {
    dark:   { sidebar:"#0F172A", text:"#A5B4FC", label:"Dark (Default)" },
    light:  { sidebar:"#F8FAFC", text:"#6366F1", label:"Light"          },
    indigo: { sidebar:"#312E81", text:"#C7D2FE", label:"Deep Indigo"    },
  };

  return (
    <SectionCard title="Branding & Theme" icon="🎨" isMobile={isMobile}>
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20 }}>
        {/* Colors */}
        <div>
          <div style={{ fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:14 }}>🎨 Color Scheme</div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:0.8 }}>Primary Color</label>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:10 }}>
              {COLOR_PRESETS.map(c=>(
                <button key={c} onClick={()=>setF({primaryColor:c})} style={{ width:32,height:32,borderRadius:8,background:c,border:`3px solid ${brand.primaryColor===c?"#fff":"transparent"}`,outline:brand.primaryColor===c?`3px solid ${c}`:"none",cursor:"pointer",transition:"transform 0.15s",boxShadow:brand.primaryColor===c?"0 0 0 3px "+c+"66":"none" }}/>
              ))}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <input type="color" value={brand.primaryColor} onChange={e=>setF({primaryColor:e.target.value})} style={{ width:40,height:36,borderRadius:8,border:"1px solid #E2E8F0",cursor:"pointer",padding:2 }}/>
              <input value={brand.primaryColor} onChange={e=>setF({primaryColor:e.target.value})} style={{ flex:1,padding:"8px 12px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,fontFamily:"monospace",outline:"none" }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:0.8 }}>Accent Color</label>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <input type="color" value={brand.accentColor} onChange={e=>setF({accentColor:e.target.value})} style={{ width:40,height:36,borderRadius:8,border:"1px solid #E2E8F0",cursor:"pointer",padding:2 }}/>
              <input value={brand.accentColor} onChange={e=>setF({accentColor:e.target.value})} style={{ flex:1,padding:"8px 12px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:13,fontFamily:"monospace",outline:"none" }}/>
            </div>
          </div>
        </div>

        {/* Sidebar theme + logo */}
        <div>
          <div style={{ fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:14 }}>🖥️ Sidebar Theme</div>
          <div style={{ display:"grid",gap:8,marginBottom:16 }}>
            {Object.entries(themePreview).map(([key,t])=>(
              <label key={key} style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,cursor:"pointer",border:`1.5px solid ${brand.sidebarTheme===key?brand.primaryColor:"#E2E8F0"}`,background:brand.sidebarTheme===key?"#EEF2FF":"#F8FAFC" }}>
                <input type="radio" checked={brand.sidebarTheme===key} onChange={()=>setF({sidebarTheme:key})} style={{ accentColor:brand.primaryColor }}/>
                <div style={{ width:36,height:36,borderRadius:8,background:t.sidebar,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:t.text }}/>
                </div>
                <span style={{ fontSize:13,fontWeight:700,color:"#374151" }}>{t.label}</span>
              </label>
            ))}
          </div>

          {/* Logo upload */}
          <div>
            <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:0.8 }}>School Logo</label>
            <div style={{ display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ width:64,height:64,borderRadius:14,background:brand.logoUrl?"#F8FAFC":`linear-gradient(135deg,${brand.primaryColor},${brand.accentColor})`,border:brand.logoUrl?"2px solid #E2E8F0":"none",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
                {brand.logoUrl
                  ? <img src={brand.logoUrl} alt="logo" style={{ width:"100%",height:"100%",objectFit:"contain" }}/>
                  : <span style={{ fontSize:20,fontWeight:900,color:"#fff" }}>{brand.logoText.slice(0,2).toUpperCase()}</span>
                }
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:"block",background:"#EEF2FF",color:"#6366F1",border:"1.5px dashed #C7D2FE",borderRadius:9,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"center",marginBottom:7 }}>
                  📁 Upload Logo (PNG / JPG)
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => setF({ logoUrl:ev.target.result });
                    reader.readAsDataURL(file);
                  }}/>
                </label>
                {brand.logoUrl && (
                  <button onClick={()=>setF({ logoUrl:null })} style={{ width:"100%",background:"#FEF2F2",color:"#EF4444",border:"1px solid #FECACA",borderRadius:8,padding:"6px",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                    🗑 Remove Logo
                  </button>
                )}
                {!brand.logoUrl && <div style={{ fontSize:10,color:"#94A3B8",textAlign:"center" }}>Recommended: 200×200px, max 2MB</div>}
              </div>
            </div>
          </div>

          {/* Logo fallback initials */}
          <div>
            <label style={{ fontSize:10,fontWeight:800,color:"#64748B",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:0.8 }}>Fallback Initials {brand.logoUrl && <span style={{ color:"#94A3B8",fontWeight:400,textTransform:"none" }}>(used when no logo)</span>}</label>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:50,height:50,borderRadius:12,background:`linear-gradient(135deg,${brand.primaryColor},${brand.accentColor})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#fff",flexShrink:0,opacity:brand.logoUrl?0.4:1 }}>{brand.logoText.slice(0,2).toUpperCase()}</div>
              <input value={brand.logoText} onChange={e=>setF({logoText:e.target.value.slice(0,3).toUpperCase()})} maxLength={3} placeholder="VN"
                style={{ flex:1,padding:"9px 12px",borderRadius:8,border:"1.5px solid #E2E8F0",fontSize:16,fontWeight:800,fontFamily:"inherit",outline:"none",letterSpacing:2,textTransform:"uppercase" }}/>
            </div>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div style={{ marginTop:20,background:"#F8FAFC",borderRadius:12,padding:16,border:"1px solid #F1F5F9" }}>
        <div style={{ fontSize:11,fontWeight:800,color:"#64748B",marginBottom:12,textTransform:"uppercase",letterSpacing:0.8 }}>Live Preview</div>
        <div style={{ display:"flex",gap:0,borderRadius:12,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.1)",maxWidth:400,height:120 }}>
          <div style={{ width:100,background:themePreview[brand.sidebarTheme].sidebar,padding:"10px 8px",display:"flex",flexDirection:"column",gap:6 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
              <div style={{ width:22,height:22,borderRadius:6,background:brand.logoUrl?"#fff":`linear-gradient(135deg,${brand.primaryColor},${brand.accentColor})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff",overflow:"hidden",flexShrink:0 }}>{brand.logoUrl?<img src={brand.logoUrl} style={{ width:"100%",height:"100%",objectFit:"contain" }} alt=""/>:brand.logoText.slice(0,2)}</div>
              <span style={{ fontSize:9,fontWeight:800,color:themePreview[brand.sidebarTheme].text }}>Vikashana</span>
            </div>
            {["Students","Attendance","Fees"].map(item=>(
              <div key={item} style={{ fontSize:8,color:"rgba(255,255,255,0.4)",padding:"3px 5px",borderRadius:4 }}>{item}</div>
            ))}
          </div>
          <div style={{ flex:1,background:"#F0F4F8",padding:10 }}>
            <div style={{ height:8,borderRadius:4,background:brand.primaryColor,marginBottom:8,width:"60%" }}/>
            <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:5 }}>
              {[brand.primaryColor,brand.accentColor,"#F59E0B","#EF4444"].map((c,i)=>(
                <div key={i} style={{ height:24,borderRadius:6,background:c+"22",border:`1px solid ${c}44`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <div style={{ width:10,height:10,borderRadius:2,background:c }}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:"flex",justifyContent:"flex-end",marginTop:16 }}>
        <button onClick={save} disabled={saving||loading}
          style={{ background:saving||loading?"#A5B4FC":`linear-gradient(135deg,${brand.primaryColor},${brand.accentColor})`,color:"#fff",border:"none",borderRadius:9,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:saving||loading?"not-allowed":"pointer",boxShadow:`0 2px 8px ${brand.primaryColor}44` }}>
          {saving ? "Saving…" : "✓ Apply Branding"}
        </button>
      </div>
    </SectionCard>
  );
}

// ── Backup & Export Section ───────────────────────────────────

// Safely escape a CSV cell value
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g,'""')}"`;
  return s;
}
function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines   = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(headers.map(h => csvCell(row[h])).join(','));
  return lines.join('\r\n');
}
function downloadCSV(csv, filename) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Fetch helpers — return flat array of all records
async function fetchAllStudents() {
  const res  = await apiFetch('/students?per_page=9999&page=1');
  return (res.data || []).map(s => ({
    ID: s.id, Admission_No: s.admission_no, Name: s.name,
    DOB: s.dob, Gender: s.gender, Blood_Group: s.blood_group,
    Class: s.class, Section: s.section, Status: s.status,
    Parent_Name: s.parent_name, Parent_Phone: s.parent_phone,
    Parent_Email: s.parent_email, Parent_Relation: s.parent_relation,
    Address: s.address, City: s.city, State: s.state, Pincode: s.pincode,
    Aadhar_No: s.aadhar_no, Previous_School: s.previous_school,
  }));
}
async function fetchAllTeachers() {
  const res = await apiFetch('/teachers?per_page=9999&page=1');
  return (res.data || []).map(t => ({
    ID: t.id, Employee_ID: t.empId, Name: t.name,
    Gender: t.gender, DOB: t.dob, Blood_Group: t.bloodGroup,
    Phone: t.phone, Email: t.email, Designation: t.designation,
    Qualification: t.qualification, Join_Date: t.joinDate,
    Status: t.status, Address: t.address, City: t.city, State: t.state,
  }));
}
async function fetchAllFees() {
  const res = await apiFetch('/fees/invoices?per_page=9999&page=1');
  return (res.data || []).map(f => ({
    ID: f.id, Invoice_No: f.invoice_no,
    Student_Name: f.student?.name || f.student_id,
    Month: f.month, Total: f.total, Paid: f.paid,
    Discount: f.discount, Balance: (f.total - f.paid - (f.discount||0)),
    Status: f.status, Due_Date: f.due_date, Notes: f.notes,
  }));
}
async function fetchAllAttendance() {
  const res = await apiFetch('/attendance?per_page=9999');
  return (res.data || []).map(a => ({
    Student_ID: a.student_id, Student_Name: a.student_name || '',
    Date: a.date, Status: a.status, Note: a.note,
  }));
}
async function fetchAllAdmissions() {
  const res = await apiFetch('/admissions/enquiries?per_page=9999&page=1');
  return (res.data || []).map(a => ({
    ID: a.id, Student_Name: a.student_name, DOB: a.dob,
    Gender: a.gender, Apply_Class: a.apply_class,
    Parent_Name: a.parent_name, Parent_Phone: a.parent_phone,
    Parent_Email: a.parent_email, Address: a.address,
    Source: a.source, Stage: a.stage, Notes: a.notes,
    Follow_Up_Date: a.follow_up_date, Enquiry_Date: a.date,
  }));
}
async function fetchAllExams() {
  const res = await apiFetch('/exams?per_page=9999');
  return (res.data || []).map(e => ({
    ID: e.id, Name: e.name, Type: e.type,
    Class: e.class, Status: e.status,
    Start_Date: e.start_date, End_Date: e.end_date,
    Academic_Year: e.academic_year, Subjects_Count: e.subjects_count,
  }));
}

const EXPORT_CONFIG = {
  students:   { icon:'👨‍🎓', label:'Students Data',       desc:'All student records, contact info, class details',  fetch: fetchAllStudents   },
  teachers:   { icon:'👨‍🏫', label:'Teachers Data',       desc:'Staff info, subjects, class assignments',            fetch: fetchAllTeachers   },
  fees:       { icon:'💰',   label:'Fee Invoices',        desc:'All fee invoices, payments and balances',            fetch: fetchAllFees       },
  attendance: { icon:'📅',   label:'Attendance Records',  desc:'Daily attendance records',                           fetch: fetchAllAttendance  },
  admissions: { icon:'🎓',   label:'Admission Enquiries', desc:'All enquiry records and conversion status',          fetch: fetchAllAdmissions  },
  exams:      { icon:'📊',   label:'Exams & Results',     desc:'Exam list with class, type, and dates',              fetch: fetchAllExams      },
};

function BackupExport({ showToast, isMobile }) {
  const [exporting, setExporting]   = useState(null);
  const [counts,    setCounts]      = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Load real counts on mount
  useEffect(() => {
    async function loadCounts() {
      try {
        const [students, teachers, fees, admissions, exams] = await Promise.allSettled([
          apiFetch('/students?per_page=1&page=1'),
          apiFetch('/teachers?per_page=1&page=1'),
          apiFetch('/fees/invoices?per_page=1&page=1'),
          apiFetch('/admissions/enquiries?per_page=1&page=1'),
          apiFetch('/exams?per_page=1&page=1'),
        ]);
        const attRes = await apiFetch('/attendance?per_page=9999').catch(() => ({ data: [] }));
        setCounts({
          students:   students.status   === 'fulfilled' ? (students.value?.meta?.total   ?? students.value?.data?.length   ?? 0) : 0,
          teachers:   teachers.status   === 'fulfilled' ? (teachers.value?.meta?.total   ?? teachers.value?.data?.length   ?? 0) : 0,
          fees:       fees.status       === 'fulfilled' ? (fees.value?.meta?.total       ?? fees.value?.data?.length       ?? 0) : 0,
          admissions: admissions.status === 'fulfilled' ? (admissions.value?.meta?.total ?? admissions.value?.data?.length ?? 0) : 0,
          exams:      exams.status      === 'fulfilled' ? (exams.value?.meta?.total      ?? exams.value?.data?.length      ?? 0) : 0,
          attendance: (attRes.data || []).length,
        });
      } finally { setLoadingCounts(false); }
    }
    loadCounts();
  }, []);

  const doExport = async (key) => {
    const cfg = EXPORT_CONFIG[key];
    setExporting(key);
    try {
      const rows = await cfg.fetch();
      if (!rows.length) { showToast(`No ${cfg.label} data found.`); return; }
      const csv  = toCSV(rows);
      downloadCSV(csv, `vikashana_${key}_${new Date().toISOString().split('T')[0]}.csv`);
      showToast(`${cfg.label} — ${rows.length} records exported ✅`);
    } catch(e) {
      showToast(`Export failed: ${e.message}`);
    } finally { setExporting(null); }
  };

  const doExportAll = async () => {
    setExporting('all');
    try {
      let total = 0;
      for (const key of Object.keys(EXPORT_CONFIG)) {
        const rows = await EXPORT_CONFIG[key].fetch().catch(() => []);
        if (rows.length) {
          downloadCSV(toCSV(rows), `vikashana_${key}_${new Date().toISOString().split('T')[0]}.csv`);
          total += rows.length;
        }
      }
      showToast(`All data exported — ${total} total records ✅`);
    } catch(e) {
      showToast(`Export failed: ${e.message}`);
    } finally { setExporting(null); }
  };

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <SectionCard title="Backup & Export" icon="💾" isMobile={isMobile}>
      <div style={{ background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",border:"1px solid #6EE7B7",borderRadius:12,padding:isMobile?"12px":"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:isMobile?10:14,flexWrap:isMobile?"wrap":"nowrap" }}>
        <div style={{ fontSize:28 }}>✅</div>
        <div>
          <div style={{ fontWeight:800,fontSize:14,color:"#065F46" }}>Export your school data as CSV files</div>
          <div style={{ fontSize:12,color:"#059669",marginTop:2 }}>
            {loadingCounts ? 'Loading counts…' : `${totalRecords} total records across ${Object.keys(EXPORT_CONFIG).length} modules`}
          </div>
        </div>
        <button onClick={doExportAll} disabled={exporting==='all'}
          style={{ marginLeft:"auto",background:exporting==='all'?"#6EE7B7":"#10B981",color:"#fff",border:"none",borderRadius:9,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:exporting==='all'?"not-allowed":"pointer",boxShadow:"0 2px 8px rgba(16,185,129,0.3)",whiteSpace:"nowrap" }}>
          {exporting==='all' ? '⏳ Exporting…' : '📦 Export All'}
        </button>
      </div>

      <div style={{ fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:12 }}>📤 Export Individual Datasets</div>
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginBottom:16 }}>
        {Object.entries(EXPORT_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:"#F8FAFC",borderRadius:11,border:"1px solid #F1F5F9" }}>
            <div style={{ width:42,height:42,borderRadius:10,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{cfg.icon}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:700,fontSize:12,color:"#0F172A" }}>{cfg.label}</div>
              <div style={{ fontSize:10,color:"#94A3B8",marginTop:1 }}>
                {loadingCounts ? '…' : `${counts[key] ?? 0} records`}
              </div>
            </div>
            <button onClick={()=>doExport(key)} disabled={!!exporting}
              style={{ background:exporting===key?"#F1F5F9":"#EEF2FF",color:exporting===key?"#94A3B8":"#6366F1",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:exporting===key?"not-allowed":"pointer",whiteSpace:"nowrap" }}>
              {exporting===key ? '⏳…' : '⬇️ CSV'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background:"linear-gradient(135deg,#0F172A,#1E293B)",borderRadius:12,padding:"18px 22px",display:"flex",alignItems:"center",gap:16 }}>
        <div>
          <div style={{ fontWeight:800,fontSize:14,color:"#fff" }}>📦 Export All Data</div>
          <div style={{ fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:2 }}>
            {loadingCounts ? 'Loading…' : `${totalRecords} records across ${Object.keys(EXPORT_CONFIG).length} modules — one CSV per module`}
          </div>
        </div>
        <button onClick={doExportAll} disabled={!!exporting}
          style={{ marginLeft:"auto",background:exporting==="all"?"#334155":"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",border:"none",borderRadius:9,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:exporting==="all"?"not-allowed":"pointer",whiteSpace:"nowrap",boxShadow:"0 2px 10px rgba(99,102,241,0.4)" }}>
          {exporting==="all" ? "⏳ Exporting…" : "📦 Export All"}
        </button>
      </div>
    </SectionCard>
  );
}

// ── Subscription Section ───────────────────────────────────────
const PLAN_TABLE = [
  { feature:'Max Students',  pro:'Unlimited', premium:'Unlimited', enterprise:'Unlimited' },
  { feature:'Max Teachers',  pro:'Unlimited', premium:'Unlimited', enterprise:'Unlimited' },
  { feature:'Price / student',pro:'₹25',      premium:'₹40',       enterprise:'Custom'   },
  { feature:'Mobile App',    pro:'✅',        premium:'✅',         enterprise:'✅'       },
  { feature:'Reports',       pro:'✅',        premium:'✅',         enterprise:'✅'       },
  { feature:'Payroll',       pro:'❌',        premium:'✅',         enterprise:'✅'       },
  { feature:'Priority Support',pro:'✅',      premium:'24×7',       enterprise:'Dedicated'},
];
const PLAN_COLOR  = { pro:'#6366F1', premium:'#8B5CF6', enterprise:'#F59E0B' };
const PLAN_LABEL  = { pro:'Pro', premium:'Premium', enterprise:'Enterprise' };
const STATUS_COLOR= { active:'#22C55E', trial:'#F59E0B', overdue:'#EF4444', cancelled:'#94A3B8', expired:'#DC2626' };

function UsageBar({ used, max, label }) {
  const pct   = max >= 999999 ? 0 : Math.min(100, (used / max) * 100);
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#22C55E';
  const maxLabel = max >= 999999 ? 'Unlimited' : max;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
        <span>{label}</span>
        <span style={{ color: pct >= 90 ? '#EF4444' : '#64748B' }}>
          {used} <span style={{ fontWeight:400, color:'#94A3B8' }}>of {maxLabel}</span>
        </span>
      </div>
      {max < 999999 && (
        <div style={{ height:8, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:99, transition:'width 0.4s ease' }}/>
        </div>
      )}
    </div>
  );
}

function SubscriptionSection({ showToast, isMobile, onOpenFeedback }) {
  const sub = useSubscriptionStore();
  const { user } = useAuthStore();
  const schoolName = user?.school?.name || 'my school';
  const [counts, setCounts] = useState({ students:0, teachers:0 });
  const [annualBilling, setAnnualBilling] = useState(false);
  const [subTab, setSubTab] = useState('overview'); // 'overview' | 'invoices' | 'plans'
  const [invoices, setInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [expandedInv, setExpandedInv] = useState(null);

  const loadInvoices = () => {
    setInvLoading(true);
    apiFetch('/my-invoices')
      .then(r => setInvoices(r.data || []))
      .catch(() => {})
      .finally(() => setInvLoading(false));
  };

  useEffect(() => {
    // Refresh subscription from server so plan changes by superadmin reflect immediately
    apiFetch('/auth/me')
      .then(r => { if (r.data?.subscription) sub.setSubscription(r.data.subscription) })
      .catch(() => {});
    apiFetch('/dashboard/stats')
      .then(r => setCounts({ students: r.data?.students?.total ?? 0, teachers: r.data?.teachers?.total ?? 0 }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (subTab === 'invoices') loadInvoices();
  }, [subTab]);

  const trialDaysLeft = sub.trialEndsAt
    ? Math.ceil((new Date(sub.trialEndsAt) - new Date()) / 86400000)
    : null;

  const planCols = ['pro','premium','enterprise'];

  const PLANS = [
    {
      id: 'pro',
      name: 'Pro',
      price: 25,
      unit: 'per student / month',
      annualPrice: 20.83,
      color: '#6366F1',
      bg: '#EEF2FF',
      badge: 'Most Popular',
      mobile: true,
      features: [
        '✅ Unlimited students & teachers',
        '✅ All web modules',
        '✅ Parent mobile app',
        '✅ Teacher mobile app',
        '✅ Push notifications',
        '✅ Priority support',
        '✅ Annual billing discount',
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 40,
      unit: 'per student / month',
      annualPrice: 33.33,
      color: '#8B5CF6',
      bg: '#F5F3FF',
      badge: null,
      mobile: true,
      features: [
        '✅ Everything in Pro',
        '✅ Teacher payroll',
        '✅ Transport + GPS tracking',
        '✅ Dedicated support',
        '✅ Custom reports',
        '🔜 More coming soon',
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      unit: 'custom pricing',
      annualPrice: null,
      color: '#F59E0B',
      bg: '#FFFBEB',
      badge: null,
      mobile: true,
      features: [
        '✅ Fully customizable',
        '✅ Multi-campus support',
        '✅ Custom integrations',
        '✅ Dedicated account manager',
        '✅ SLA guarantee',
        '✅ On-premise option',
      ]
    }
  ];

  // Monthly price per student (annual = per_student_annual)
  const pricePerStudent = (p) => {
    if (!p.price) return null;
    return annualBilling ? p.annualPrice : p.price;
  };

  const planCards = PLANS.map(p => ({
    id: p.id, name: p.name, color: p.color, mobile: p.mobile ? '✅' : '❌',
    highlight: p.badge === 'Most Popular',
  }));

  const invStatusColor = { sent:'#3B82F6', partial:'#F59E0B', paid:'#22C55E', overdue:'#EF4444', cancelled:'#94A3B8' };
  const invStatusLabel = { sent:'Sent', partial:'Partial', paid:'Paid', overdue:'Overdue', cancelled:'Cancelled' };
  const fmtAmt = (n) => parseFloat(n||0).toLocaleString('en-IN', {minimumFractionDigits:2});
  const fmtD   = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';

  return (
    <SectionCard title="📋 Subscription & Plan">
      {/* Sub-tab navigation */}
      <div style={{ display:'flex', gap:4, borderBottom:'2px solid #F1F5F9', marginBottom:24 }}>
        {[['overview','Overview'],['invoices','Invoices'],['plans','Plans']].map(([key,label]) => (
          <button key={key} onClick={() => setSubTab(key)}
            style={{ padding:'8px 16px', border:'none', cursor:'pointer', fontWeight:700, fontSize:13,
              background:'none', borderBottom: subTab===key ? '2px solid #6366F1' : '2px solid transparent',
              color: subTab===key ? '#6366F1' : '#64748B', marginBottom:-2 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {subTab === 'overview' && <>
      {/* Current plan overview */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        {[
          { label:'Current Plan', value: <span style={{ background: PLAN_COLOR[sub.plan]+'22', color: PLAN_COLOR[sub.plan], padding:'3px 12px', borderRadius:99, fontWeight:700, fontSize:13 }}>{PLAN_LABEL[sub.plan] || sub.plan}</span> },
          { label:'Status',       value: <span style={{ background: STATUS_COLOR[sub.status]+'22', color: STATUS_COLOR[sub.status], padding:'3px 12px', borderRadius:99, fontWeight:700, fontSize:13, textTransform:'capitalize' }}>{sub.status}</span> },
          { label:'Mobile Access',value: <span style={{ fontWeight:700, fontSize:13 }}>{sub.mobileEnabled ? '✅ Enabled' : '❌ Disabled'}</span> },
          { label: sub.status === 'trial' ? 'Trial Ends' : 'Renewal Date',
            value: (() => {
              const d = sub.status === 'trial' ? sub.trialEndsAt : sub.renewalDate;
              if (!d) return <span style={{ color:'#94A3B8' }}>—</span>;
              const fmt = new Date(d).toLocaleDateString('en-IN',{ day:'numeric', month:'short', year:'numeric' });
              return (
                <span style={{ fontWeight:600, fontSize:13, color: trialDaysLeft !== null && trialDaysLeft <= 7 ? '#EF4444' : '#374151' }}>
                  {fmt}{trialDaysLeft !== null && trialDaysLeft >= 0 ? ` (${trialDaysLeft}d left)` : ''}
                </span>
              );
            })()
          },
        ].map(({ label, value }) => (
          <div key={label} style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:12, padding:'12px 18px', minWidth:130, flex:1 }}>
            <div style={{ fontSize:11, color:'#94A3B8', fontWeight:600, marginBottom:6 }}>{label}</div>
            <div>{value}</div>
          </div>
        ))}
      </div>

      {/* Usage bars */}
      <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:12, padding:'16px 20px', marginBottom:24 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:14 }}>Usage</div>
        <UsageBar used={counts.students} max={sub.limits.max_students} label="Students" />
        <UsageBar used={counts.teachers} max={sub.limits.max_teachers} label="Teachers" />
      </div>

      {/* Annual billing toggle */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Billing:</span>
        <div style={{ display:'flex', background:'#F1F5F9', borderRadius:8, padding:2 }}>
          <button onClick={() => setAnnualBilling(false)}
            style={{ padding:'6px 16px', borderRadius:6, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', background: !annualBilling ? '#6366F1' : 'transparent', color: !annualBilling ? '#fff' : '#64748B', transition:'all 0.15s' }}>
            Monthly
          </button>
          <button onClick={() => setAnnualBilling(true)}
            style={{ padding:'6px 16px', borderRadius:6, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', background: annualBilling ? '#6366F1' : 'transparent', color: annualBilling ? '#fff' : '#64748B', transition:'all 0.15s' }}>
            🎁 Pay annually — save 2 months (16% off)
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:14, marginBottom:28 }}>
        {PLANS.map(p => {
          const isCurrent = p.id === sub.plan;
          const displayPrice = pricePerStudent(p);
          const waMsg = encodeURIComponent(`Hi Vikashana Team, I'm admin of ${schoolName}. Current plan: ${sub.plan}. I'd like to upgrade to ${p.id}. Student count: ${counts.students}`)
          return (
            <div key={p.id} style={{ border:`2px solid ${isCurrent ? p.color : '#E2E8F0'}`, borderRadius:14, padding:'18px 14px', background: isCurrent ? p.color+'10' : p.bg, position:'relative', textAlign:'center' }}>
              {p.badge && <span style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:p.color, color:'#fff', fontSize:9, fontWeight:800, padding:'2px 10px', borderRadius:99, whiteSpace:'nowrap' }}>⭐ {p.badge}</span>}
              {isCurrent && <span style={{ position:'absolute', top:-10, right:8, background:p.color, color:'#fff', fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:99 }}>▲ Current</span>}
              <div style={{ fontSize:13, fontWeight:800, color: p.color, marginBottom:6 }}>{p.name}</div>
              <div style={{ fontSize:22, fontWeight:900, color: isCurrent ? p.color : '#0F172A', marginBottom:2 }}>
                {displayPrice == null ? 'Custom' : `₹${displayPrice}`}
              </div>
              {displayPrice != null && <div style={{ fontSize:10, color:'#94A3B8', marginBottom:10 }}>{p.unit}</div>}
              <div style={{ textAlign:'left', marginBottom:14 }}>
                {p.features.map((f, i) => (
                  <div key={i} style={{ fontSize:11, color:'#374151', marginBottom:3 }}>{f}</div>
                ))}
              </div>
              {!isCurrent && (
                <button
                  onClick={() => window.open(`https://wa.me/919XXXXXXXXX?text=${waMsg}`, '_blank')}
                  style={{ width:'100%', padding:'8px 0', background:p.color, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  Upgrade to {p.name}
                </button>
              )}
              {isCurrent && (
                <div style={{ fontSize:11, color:p.color, fontWeight:700, padding:'6px 0' }}>✓ Your current plan</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upgrade info */}
      <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:12, padding:'14px 18px', marginBottom:20, fontSize:13, color:'#1E40AF', lineHeight:1.6 }}>
        <span style={{ fontWeight:700 }}>💡 To upgrade your plan</span>, contact us via WhatsApp. Our team will activate your new plan within 24 hours.
        {annualBilling && <span style={{ display:'block', marginTop:4, fontWeight:600, color:'#059669' }}>✨ Annual billing saves you 2 months (16% off)!</span>}
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:28 }}>
        <button onClick={onOpenFeedback}
          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', background:'#6366F1', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer' }}>
          <span style={{ fontSize:16 }}>✉️</span> Contact Support
        </button>
      </div>
      </> /* end overview tab */}

      {/* ── Invoices tab ── */}
      {subTab === 'invoices' && (
        invLoading ? (
          <p style={{ color:'#94A3B8', textAlign:'center', padding:'30px 0' }}>Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#94A3B8' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🧾</div>
            <div style={{ fontWeight:700, marginBottom:4 }}>No invoices yet</div>
            <div style={{ fontSize:13 }}>Your subscription invoices will appear here once generated by the admin team.</div>
          </div>
        ) : (
          <div>
            {invoices.map(inv => {
              const bal     = parseFloat(inv.balance || 0);
              const isOver  = inv.status === 'overdue';
              const isPaid  = inv.status === 'paid';
              const expanded = expandedInv === inv.id;
              const waMsg = encodeURIComponent([
                `Hi Vikashana Team,`,
                `I've made payment for invoice ${inv.invoice_no}.`,
                `Period: ${inv.period_label}`,
                `Amount: ₹${fmtAmt(inv.total)}`,
                `School: ${schoolName}`,
                `Reference: [please add your ref here]`,
                ``,
                `Kindly update the payment status.`,
              ].join('\n'));
              return (
                <div key={inv.id} style={{ border:`1px solid ${isOver ? '#FECACA' : isPaid ? '#BBF7D0' : '#E2E8F0'}`, borderRadius:10, marginBottom:12, overflow:'hidden', background: isOver ? '#FEF2F2' : '#fff' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', cursor:'pointer', flexWrap:'wrap', gap:8 }}
                    onClick={() => setExpandedInv(expanded ? null : inv.id)}>
                    <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:14, color:'#1E293B' }}>{inv.invoice_no}</div>
                        <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{inv.period_label}</div>
                      </div>
                      <span style={{ background: (invStatusColor[inv.status]||'#94A3B8')+'22', color: invStatusColor[inv.status]||'#94A3B8', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                        {invStatusLabel[inv.status] || inv.status}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontWeight:800, fontSize:15, color:'#1E293B' }}>₹{fmtAmt(inv.total)}</div>
                        {bal > 0 && <div style={{ fontSize:11, color:'#EF4444', fontWeight:600 }}>Due: ₹{fmtAmt(bal)}</div>}
                        {isPaid && <div style={{ fontSize:11, color:'#22C55E', fontWeight:600 }}>✅ Fully Paid</div>}
                      </div>
                      {!isPaid && (
                        <a href={`https://wa.me/919000000000?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                          style={{ padding:'7px 14px', background:'#25D366', color:'#fff', borderRadius:8, fontWeight:700, fontSize:12, textDecoration:'none' }}
                          onClick={e => e.stopPropagation()}>
                          Pay via WhatsApp
                        </a>
                      )}
                      <span style={{ color:'#94A3B8', fontSize:16 }}>{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expanded && (
                    <div style={{ padding:'0 16px 16px', borderTop:'1px solid #F1F5F9' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px', marginTop:12, fontSize:13 }}>
                        {[
                          ['Students', inv.student_count],
                          ['Billing', inv.billing_cycle],
                          ['Due Date', fmtD(inv.due_date)],
                          ['Subtotal', `₹${fmtAmt(inv.subtotal)}`],
                          ['GST (18%)', `₹${fmtAmt(inv.gst_amount)}`],
                          ['Total', `₹${fmtAmt(inv.total)}`],
                          ['Paid', `₹${fmtAmt(inv.total_paid)}`],
                          ['Balance', `₹${fmtAmt(bal)}`],
                          ['Period', inv.period_label],
                        ].map(([l,v]) => (
                          <div key={l}>
                            <div style={{ fontSize:10, color:'#94A3B8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{l}</div>
                            <div style={{ fontWeight:700, color:'#1E293B' }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {inv.payments && inv.payments.length > 0 && (
                        <div style={{ marginTop:12, borderTop:'1px solid #F1F5F9', paddingTop:10 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Payment History</div>
                          {inv.payments.map(p => (
                            <div key={p.id} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#475569', padding:'3px 0' }}>
                              <span>{fmtD(p.payment_date)} · {p.method?.toUpperCase()}</span>
                              <span style={{ fontWeight:700, color:'#22C55E' }}>₹{fmtAmt(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Plans tab ── */}
      {subTab === 'plans' && <>
      {/* Plan comparison table */}
      <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:12 }}>Plan Comparison</div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr>
              <th style={{ padding:'10px 14px', textAlign:'left', background:'#F8FAFC', borderBottom:'2px solid #E2E8F0', color:'#64748B', fontWeight:700 }}>Feature</th>
              {planCols.map(p => (
                <th key={p} style={{ padding:'10px 14px', textAlign:'center', background: p === sub.plan ? PLAN_COLOR[p]+'18' : '#F8FAFC', borderBottom:`2px solid ${p === sub.plan ? PLAN_COLOR[p] : '#E2E8F0'}`, color: p === sub.plan ? PLAN_COLOR[p] : '#64748B', fontWeight:700, whiteSpace:'nowrap' }}>
                  {PLAN_LABEL[p]}{p === sub.plan && <span style={{ display:'block', fontSize:9, fontWeight:600, opacity:0.8 }}>▲ Current</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_TABLE.map((row, i) => (
              <tr key={row.feature} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                <td style={{ padding:'10px 14px', color:'#374151', fontWeight:600, borderBottom:'1px solid #F1F5F9' }}>{row.feature}</td>
                {planCols.map(p => (
                  <td key={p} style={{ padding:'10px 14px', textAlign:'center', borderBottom:'1px solid #F1F5F9', background: p === sub.plan ? PLAN_COLOR[p]+'0D' : 'transparent', color: p === sub.plan ? PLAN_COLOR[p] : '#374151', fontWeight: p === sub.plan ? 700 : 400 }}>
                    {row[p]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>}

    </SectionCard>
  );
}

// ══════════════════════════════════════════════════════════════
export default function Settings() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const location = useLocation()
  const [activeSection, setActiveSection] = useState(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    return tab || "school"
  });
  const [toast, setToast] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const SECTIONS = [
    { id:"school",       icon:"🏫", label:"School Info"      },
    { id:"academic",     icon:"📅", label:"Academic Years"   },
    { id:"users",        icon:"👤", label:"Users & Roles"    },
    { id:"fees",         icon:"💰", label:"Fee Config"       },
    { id:"branding",     icon:"🎨", label:"Branding"         },
    { id:"subscription", icon:"📋", label:"Subscription"     },
    { id:"invoices",     icon:"🧾", label:"Invoices"         },
    { id:"backup",       icon:"💾", label:"Backup & Export"  },
  ];

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif",background:"#F0F4F8",minHeight:"100vh",display:"flex",flexDirection:isMobile?"column":"row" }}>
      {/* Settings sidebar */}
      <div style={{ width:isMobile?"100%":200,background:"#fff",borderRight:isMobile?"none":"1px solid #F1F5F9",borderBottom:isMobile?"1px solid #F1F5F9":"none",padding:isMobile?"12px 12px 8px":"24px 12px",flexShrink:0,position:isMobile?"static":"sticky",top:0,height:isMobile?"auto":"100vh",overflowY:isMobile?"visible":"auto",overflowX:isMobile?"auto":"visible" }}>
        {!isMobile && <div style={{ fontWeight:900,fontSize:16,color:"#0F172A",marginBottom:20,paddingLeft:8 }}>⚙️ Settings</div>}
        <nav style={{ display:"flex",flexDirection:isMobile?"row":"column",gap:isMobile?4:2,overflowX:isMobile?"auto":"visible",paddingBottom:isMobile?4:0 }}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setActiveSection(s.id)}
              style={{ display:"flex",alignItems:"center",gap:isMobile?5:9,padding:isMobile?"8px 10px":"9px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:isMobile?11:13,fontWeight:600,textAlign:"left",background:activeSection===s.id?"#EEF2FF":"transparent",color:activeSection===s.id?"#6366F1":"#64748B",transition:"all 0.15s",whiteSpace:"nowrap",flexShrink:0 }}>
              <span style={{ fontSize:isMobile?16:15 }}>{s.icon}</span>
              {!isMobile && <span>{s.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div style={{ flex:1,padding:isMobile?12:28,overflowY:"auto",minWidth:0 }}>
        <div style={{ maxWidth:860 }}>
          {activeSection==="school"       && <SchoolInfo        showToast={showToast} isMobile={isMobile}/>}
          {activeSection==="academic"     && <AcademicYears    showToast={showToast} isMobile={isMobile}/>}
          {activeSection==="users"        && <UsersRoles       showToast={showToast} isMobile={isMobile}/>}
          {activeSection==="fees"         && <FeeConfig        showToast={showToast} isMobile={isMobile}/>}
          {activeSection==="branding"     && <Branding         showToast={showToast} isMobile={isMobile}/>}
          {activeSection==="subscription" && <SubscriptionSection showToast={showToast} isMobile={isMobile} onOpenFeedback={() => setShowFeedback(true)}/>}
          {activeSection==="invoices"     && <MyInvoicesSection showToast={showToast} isMobile={isMobile}/>}
          {activeSection==="backup"       && <BackupExport     showToast={showToast} isMobile={isMobile}/>}
        </div>
      </div>

      <Toast toast={toast}/>

      {/* Inline feedback modal (for "Contact Support" from Subscription section) */}
      {showFeedback && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowFeedback(false) }}>
          <FeedbackModal onClose={() => setShowFeedback(false)} showToast={showToast}/>
        </div>
      )}
    </div>
  );
}

function MyInvoicesSection({ isMobile }) {
  const sub  = useSubscriptionStore();
  const { user } = useAuthStore();
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/my-invoices')
      .then(r => setInvoices(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const STATUS_COLOR = { sent:'#3B82F6', partial:'#F59E0B', paid:'#22C55E', overdue:'#EF4444', cancelled:'#94A3B8', draft:'#94A3B8' };
  const fmt = (n) => parseFloat(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';

  const waPhone = '918760609670';
  const waPayMsg = (inv) => encodeURIComponent(
    `Hi Vikashana Team! I'd like to make payment for Invoice ${inv.invoice_no} (${inv.period_label}) - Amount: ₹${fmt(inv.total)}. School: ${user?.school?.name || ''}`
  );

  const totalDue = invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).reduce((s, i) => s + (i.balance || 0), 0);

  return (
    <div>
      <div style={{ fontWeight:800, fontSize:18, color:'#0F172A', marginBottom:4 }}>🧾 Invoices</div>
      <p style={{ fontSize:13, color:'#64748B', marginBottom:20 }}>Your subscription billing history from Vikashana</p>

      {/* Summary */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:120, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:12, padding:'14px 18px' }}>
          <div style={{ fontSize:11, color:'#3B82F6', fontWeight:700, textTransform:'uppercase' }}>Total Invoices</div>
          <div style={{ fontSize:24, fontWeight:800, color:'#1E40AF', margin:'4px 0 0' }}>{invoices.length}</div>
        </div>
        <div style={{ flex:1, minWidth:120, background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:12, padding:'14px 18px' }}>
          <div style={{ fontSize:11, color:'#F59E0B', fontWeight:700, textTransform:'uppercase' }}>Amount Due</div>
          <div style={{ fontSize:24, fontWeight:800, color:'#B45309', margin:'4px 0 0' }}>₹{fmt(totalDue)}</div>
        </div>
        <div style={{ flex:1, minWidth:120, background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:12, padding:'14px 18px' }}>
          <div style={{ fontSize:11, color:'#22C55E', fontWeight:700, textTransform:'uppercase' }}>Current Plan</div>
          <div style={{ fontSize:18, fontWeight:800, color:'#15803D', margin:'4px 0 0', textTransform:'capitalize' }}>{sub.plan || '—'}</div>
        </div>
      </div>

      {loading ? (
        <p style={{ color:'#94A3B8', fontSize:13 }}>Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:12, padding:28, textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🧾</div>
          <p style={{ color:'#64748B', fontSize:13, margin:0 }}>No invoices found. Contact your Vikashana account manager to get started.</p>
          <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer"
            style={{ display:'inline-block', marginTop:14, padding:'9px 20px', background:'#25D366', color:'#fff', borderRadius:8, fontWeight:700, fontSize:13, textDecoration:'none' }}>
            💬 Contact Support
          </a>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {invoices.map(inv => {
            const sc = STATUS_COLOR[inv.status] || '#94A3B8';
            const isPending = ['sent','partial','overdue'].includes(inv.status);
            return (
              <div key={inv.id} style={{ background:'#fff', border:`1px solid ${inv.status==='overdue'?'#FECACA':'#E2E8F0'}`, borderRadius:12, padding:isMobile?'14px':'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:15, color:'#1E293B' }}>{inv.invoice_no}</div>
                    <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{inv.period_label} · {inv.billing_cycle}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:sc+'22', color:sc }}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                    <div style={{ fontSize:13, fontWeight:800, color:'#1E293B', marginTop:4 }}>₹{fmt(inv.total)}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:16, marginTop:10, fontSize:12, color:'#64748B', flexWrap:'wrap' }}>
                  <span>Students: <strong style={{ color:'#1E293B' }}>{inv.student_count}</strong></span>
                  <span>Due: <strong style={{ color: inv.status==='overdue' ? '#EF4444' : '#1E293B' }}>{fmtD(inv.due_date)}</strong></span>
                  <span>Paid: <strong style={{ color:'#22C55E' }}>₹{fmt(inv.total_paid)}</strong></span>
                  {(inv.balance||0) > 0 && <span>Balance: <strong style={{ color:'#EF4444' }}>₹{fmt(inv.balance)}</strong></span>}
                </div>
                {isPending && (
                  <div style={{ marginTop:12 }}>
                    <a href={`https://wa.me/${waPhone}?text=${waPayMsg(inv)}`} target="_blank" rel="noreferrer"
                      style={{ display:'inline-block', padding:'7px 16px', background:'#25D366', color:'#fff', borderRadius:8, fontWeight:700, fontSize:12, textDecoration:'none' }}>
                      💬 Pay via WhatsApp
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeedbackModal({ onClose, showToast }) {
  const [form, setForm] = useState({ category:'query', title:'', body:'', priority:'medium' });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE}/feedback`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json', Accept:'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast('Feedback sent! We will respond within 24 hours.');
      onClose();
    } catch {
      showToast('Failed to send. Please try again.', 'error');
    } finally { setSaving(false); }
  };
  const inStyle = { width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' };
  const lbStyle = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 };
  return (
    <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:460, boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
      <div style={{ fontWeight:800, fontSize:16, color:'#0F172A', marginBottom:4 }}>💬 Send Feedback / Report Issue</div>
      <div style={{ fontSize:12, color:'#94A3B8', marginBottom:20 }}>Our team will respond within 24 hours</div>
      <div style={{ marginBottom:14 }}>
        <label style={lbStyle}>Category</label>
        <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} style={inStyle}>
          <option value="query">❓ Query</option>
          <option value="bug">🐛 Bug Report</option>
          <option value="feature">✨ Feature Request</option>
          <option value="complaint">⚠️ Complaint</option>
        </select>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={lbStyle}>Subject</label>
        <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Brief description..." style={inStyle}/>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={lbStyle}>Details</label>
        <textarea value={form.body} onChange={e => setForm(f=>({...f,body:e.target.value}))} placeholder="Describe the issue or suggestion..." rows={4} style={{...inStyle, resize:'vertical'}}/>
      </div>
      <div style={{ marginBottom:20 }}>
        <label style={lbStyle}>Priority</label>
        <select value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))} style={inStyle}>
          <option value="low">🟢 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🔴 High</option>
          <option value="critical">🚨 Critical</option>
        </select>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose} style={{ flex:1, padding:11, borderRadius:10, border:'1px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:700, color:'#64748B', cursor:'pointer' }}>Cancel</button>
        <button onClick={submit} disabled={saving || !form.title.trim()} style={{ flex:2, padding:11, borderRadius:10, border:'none', background:'#6366F1', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', opacity:(saving||!form.title.trim())?0.6:1 }}>
          {saving ? 'Sending…' : '✓ Submit Feedback'}
        </button>
      </div>
    </div>
  );
}
