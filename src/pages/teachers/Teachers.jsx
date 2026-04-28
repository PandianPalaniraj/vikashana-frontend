import { useState, useCallback, useEffect, useRef } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'
import useSubscriptionStore from '../../store/subscriptionStore'
import useToast from '../../hooks/useToast'
import { SUBJECTS, SECTIONS, BLOOD_GROUPS, GENDERS, SCHOOL } from '../../constants'
import ToastUI from '../../components/ui/Toast'

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

// ── Teachers-specific constants ───────────────────────────────
const CLASSES        = ["8","9","10","11"];
const DESIGNATIONS   = ["Teacher","Senior Teacher","Head of Department","Vice Principal","Principal","Lab Assistant","Librarian","Sports Coach"];
const QUALIFICATIONS = ["B.Ed","M.Ed","B.Sc B.Ed","M.Sc B.Ed","B.A B.Ed","M.A B.Ed","Ph.D","D.Ed","Other"];

const EMPTY_FORM = {
  name:"", gender:"", dob:"", bloodGroup:"", phone:"", email:"",
  address:"", city:"", state:"", pincode:"",
  empId:"", designation:"", qualification:"", joinDate:"",
  subjects:[], classes:[], sections:[], status:"Active",
  photo:null, docs:[], password:"",
};

// ── Helpers ───────────────────────────────────────────────────
const fmtDate  = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const todayStr = () => new Date().toISOString().slice(0,10);
const openWA   = (phone,msg) => window.open(`https://wa.me/91${phone.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`,"whatsapp_school");

// ── Shared atoms ──────────────────────────────────────────────

function Avatar({ name, photo, size=36 }) {
  const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
  const bg = palette[name.charCodeAt(0) % palette.length];
  if (photo) return <img src={photo} alt={name} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"2px solid #fff", boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}/>;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:800, color:"#fff" }}>
      {name.split(" ").map(w=>w[0]).join("").slice(0,2)}
    </div>
  );
}

function FormField({ label, field, type="text", opts, value, onChange, required, placeholder }) {
  const base = { width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #E2E8F0",
    fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit",
    background:"#fff", color:"#1A202C", transition:"border-color 0.15s" };
  return (
    <div>
      <label style={{ fontSize:10, fontWeight:800, color:"#64748B", display:"block",
        marginBottom:5, textTransform:"uppercase", letterSpacing:0.8 }}>
        {label}{required && <span style={{ color:"#EF4444", marginLeft:2 }}>*</span>}
      </label>
      {opts
        ? <select value={value} onChange={e=>onChange(field,e.target.value)} style={base}>
            <option value="">Select…</option>
            {opts.map(o=><option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={value} placeholder={placeholder||""}
            onChange={e=>onChange(field,e.target.value)}
            onFocus={e=>{e.target.style.borderColor="#6366F1";e.target.style.boxShadow="0 0 0 3px rgba(99,102,241,0.1)";}}
            onBlur={e=>{e.target.style.borderColor="#E2E8F0";e.target.style.boxShadow="none";}}
            style={base}/>
      }
    </div>
  );
}

function PhotoUpload({ value, onChange }) {
  const ref = useRef();
  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange("photo", ev.target.result);
    reader.readAsDataURL(file); e.target.value="";
  };
  return (
    <div>
      <label style={{ fontSize:10, fontWeight:800, color:"#64748B", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>Teacher Photo</label>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <div onClick={()=>ref.current.click()}
          style={{ width:84, height:84, borderRadius:14, flexShrink:0, overflow:"hidden",
            border:`2px dashed ${value?"#10B981":"#CBD5E1"}`, background:value?"#F0FDF4":"#F8FAFC",
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
            transition:"all 0.2s", position:"relative" }}
          onMouseEnter={e=>e.currentTarget.style.borderColor="#6366F1"}
          onMouseLeave={e=>e.currentTarget.style.borderColor=value?"#10B981":"#CBD5E1"}>
          {value ? <img src={value} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> :
            <div style={{ textAlign:"center" }}><div style={{ fontSize:26 }}>📷</div><div style={{ fontSize:9, color:"#94A3B8", marginTop:2, fontWeight:700 }}>Upload photo</div></div>}
          {value && <div style={{ position:"absolute", top:5, right:5, width:18, height:18, background:"#10B981", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", fontWeight:800 }}>✓</div>}
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:"#374151" }}>Passport-size photo</div>
          <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>JPG or PNG · Max 2 MB</div>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button type="button" onClick={()=>ref.current.click()} style={{ background:"#EEF2FF", color:"#6366F1", border:"none", borderRadius:7, padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{value?"Change":"Choose Photo"}</button>
            {value && <button type="button" onClick={()=>onChange("photo",null)} style={{ background:"#FEF2F2", color:"#EF4444", border:"none", borderRadius:7, padding:"6px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Remove</button>}
          </div>
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }}/>
    </div>
  );
}

function DocsUpload({ value, onChange }) {
  const ref = useRef();
  const addFiles = files => {
    const arr = Array.from(files);
    Promise.all(arr.map(f=>new Promise(res=>{
      const r=new FileReader(); r.onload=ev=>res({name:f.name,size:f.size,url:ev.target.result}); r.readAsDataURL(f);
    }))).then(docs=>onChange("docs",[...value,...docs]));
  };
  const fmtSz = b => b>1048576 ? `${(b/1048576).toFixed(1)} MB` : `${Math.round(b/1024)} KB`;
  return (
    <div>
      <label style={{ fontSize:10, fontWeight:800, color:"#64748B", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>
        Documents <span style={{ fontWeight:500, color:"#94A3B8", textTransform:"none", fontSize:11 }}>— Certificates, ID proof, etc.</span>
      </label>
      <div onClick={()=>ref.current.click()}
        style={{ border:"2px dashed #CBD5E1", borderRadius:10, padding:"16px", textAlign:"center", cursor:"pointer", background:"#F8FAFC", transition:"all 0.2s", marginBottom:value.length?10:0 }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366F1";e.currentTarget.style.background="#F5F3FF";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="#CBD5E1";e.currentTarget.style.background="#F8FAFC";}}>
        <div style={{ fontSize:22, marginBottom:4 }}>📂</div>
        <div style={{ fontSize:12, fontWeight:700, color:"#374151" }}>Click to upload documents</div>
        <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>PDF, JPG, PNG · Multiple files</div>
      </div>
      {value.length>0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {value.map((doc,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:9, padding:"9px 13px" }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{doc.name.endsWith(".pdf")?"📄":"🖼️"}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.name}</div>
                <div style={{ fontSize:10, color:"#94A3B8" }}>{fmtSz(doc.size)}</div>
              </div>
              <button type="button" onClick={()=>onChange("docs",value.filter((_,j)=>j!==i))}
                style={{ background:"#FEF2F2", color:"#EF4444", border:"none", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <input ref={ref} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>{addFiles(e.target.files);e.target.value="";}} style={{ display:"none" }}/>
    </div>
  );
}

function StatusToggle({ status, onToggle }) {
  const opts = [
    { val:"Active",   label:"✓ Active",   c:"#059669", bg:"#10B981" },
    { val:"On Leave", label:"⏸ On Leave", c:"#D97706", bg:"#F59E0B" },
    { val:"Resigned", label:"✕ Resigned", c:"#DC2626", bg:"#EF4444" },
  ];
  return (
    <div style={{ display:"inline-flex", background:"#F1F5F9", borderRadius:22, padding:3, gap:2 }}>
      {opts.map(o=>{
        const active = status===o.val;
        return (
          <button key={o.val} type="button" onClick={()=>onToggle(o.val)}
            style={{ padding:"5px 14px", borderRadius:18, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:700, transition:"all 0.18s",
              background:active?o.bg:"transparent", color:active?"#fff":"#94A3B8",
              boxShadow:active?`0 2px 6px rgba(0,0,0,0.2)`:"none" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MultiToggle({ label, options, value, onChange, color="#6366F1" }) {
  const toggle = v => onChange(value.includes(v) ? value.filter(x=>x!==v) : [...value,v]);
  return (
    <div>
      <label style={{ fontSize:10, fontWeight:800, color:"#64748B", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</label>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {options.map(o=>{
          const sel = value.includes(o);
          return (
            <button key={o} type="button" onClick={()=>toggle(o)}
              style={{ padding:"5px 14px", borderRadius:20, border:"2px solid", cursor:"pointer",
                fontSize:12, fontWeight:700, transition:"all 0.15s",
                borderColor:sel?color:"#E2E8F0",
                background:sel?color:"#fff",
                color:sel?"#fff":"#94A3B8" }}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ID Card Modal ─────────────────────────────────────────────
function IDCardModal({ teacher, onClose }) {
  const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
  const avatarBg = palette[teacher.name.charCodeAt(0) % palette.length];
  const handlePrint = () => {
    const el = document.getElementById("teacher-id-card");
    const win = window.open("","_blank","width=420,height=680");
    win.document.write(`<html><head><title>ID Card — ${teacher.name}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#e2e8f0;font-family:'Segoe UI',sans-serif;}
      @media print{body{background:white;}@page{size:85.6mm 54mm landscape;margin:0;}}</style></head>
      <body>${el.innerHTML}
      <script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    win.document.close();
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:480, boxShadow:"0 24px 60px rgba(0,0,0,0.3)", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#0F172A,#6366F1)", padding:"16px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", color:"#fff" }}>
          <div><div style={{ fontWeight:800, fontSize:15 }}>🪪 Teacher ID Card</div><div style={{ fontSize:11, opacity:0.65, marginTop:2 }}>Preview before printing</div></div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.12)", border:"none", borderRadius:8, color:"#fff", width:30, height:30, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>✕</button>
        </div>
        <div style={{ padding:"28px 28px 20px", background:"#F0F4F8", display:"flex", justifyContent:"center" }}>
          <div id="teacher-id-card">
            <div style={{ width:340, borderRadius:16, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.18)", fontFamily:"'Segoe UI',sans-serif" }}>
              <div style={{ background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#6366F1 100%)", padding:"14px 16px 12px", color:"#fff", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }}/>
                <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative", zIndex:1 }}>
                  <div style={{ width:36, height:36, background:"rgba(255,255,255,0.15)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🏫</div>
                  <div><div style={{ fontWeight:900, fontSize:13 }}>{SCHOOL.name}</div><div style={{ fontSize:9, opacity:0.7, marginTop:1 }}>{SCHOOL.address}</div></div>
                </div>
                <div style={{ position:"relative", zIndex:1, marginTop:8, paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.12)", textAlign:"center" }}>
                  <span style={{ fontSize:10, fontWeight:800, letterSpacing:2, textTransform:"uppercase", opacity:0.85 }}>Staff Identity Card</span>
                </div>
              </div>
              <div style={{ background:"#fff", padding:"16px 16px 14px", display:"flex", gap:14, alignItems:"flex-start" }}>
                <div style={{ flexShrink:0 }}>
                  {teacher.photo
                    ? <img src={teacher.photo} alt={teacher.name} style={{ width:72, height:88, objectFit:"cover", borderRadius:10, border:"2px solid #E2E8F0" }}/>
                    : <div style={{ width:72, height:88, borderRadius:10, background:`linear-gradient(135deg,${avatarBg},${avatarBg}cc)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, fontWeight:900, color:"#fff", border:"2px solid #E2E8F0" }}>
                        {teacher.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                      </div>
                  }
                  <div style={{ marginTop:6, background:"#0F172A", borderRadius:6, padding:"3px 0", textAlign:"center" }}>
                    <div style={{ fontSize:9, fontWeight:800, color:"#fff", letterSpacing:0.5 }}>{teacher.empId}</div>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:900, fontSize:15, color:"#0F172A", lineHeight:1.2, marginBottom:2 }}>{teacher.name}</div>
                  <div style={{ fontSize:10, color:"#6366F1", fontWeight:700, marginBottom:10 }}>{teacher.designation}</div>
                  {[
                    ["Subjects", (teacher.subjects||[]).slice(0,2).join(", ")+((teacher.subjects||[]).length>2?` +${teacher.subjects.length-2}`:"")],
                    ["Classes",  (teacher.classes||[]).map(c=>`Cls ${c}`).join(", ")],
                    ["Phone",    teacher.phone],
                    ["Joined",   fmtDate(teacher.joinDate)],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:"flex", gap:6, marginBottom:4, alignItems:"baseline" }}>
                      <span style={{ fontSize:9, fontWeight:800, color:"#94A3B8", textTransform:"uppercase", letterSpacing:0.5, minWidth:48, flexShrink:0 }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:"linear-gradient(135deg,#0F172A,#1E3A5F)", padding:"8px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div><div style={{ fontSize:8, color:"rgba(255,255,255,0.5)", fontWeight:600 }}>VALID</div><div style={{ fontSize:10, color:"#fff", fontWeight:800 }}>2024–25</div></div>
                <div style={{ display:"flex", gap:1, alignItems:"flex-end" }}>
                  {[3,5,2,7,4,6,3,8,5,2,6,4,7,3,5,2,6,4,8,3,5,7,2,6].map((h,i)=>(
                    <div key={i} style={{ width:2, height:h*2, background:"rgba(255,255,255,0.7)", borderRadius:1 }}/>
                  ))}
                </div>
                <div style={{ textAlign:"right" }}><div style={{ fontSize:8, color:"rgba(255,255,255,0.5)", fontWeight:600 }}>CONTACT</div><div style={{ fontSize:9, color:"#fff", fontWeight:700 }}>{SCHOOL.phone}</div></div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding:"0 28px 24px", display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:"#F1F5F9", color:"#64748B", border:"none", borderRadius:10, padding:11, fontSize:13, fontWeight:600, cursor:"pointer" }}>Close</button>
          <button onClick={handlePrint} style={{ flex:2, background:"linear-gradient(135deg,#0F172A,#6366F1)", color:"#fff", border:"none", borderRadius:10, padding:11, fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(99,102,241,0.35)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>🖨️ Print ID Card</button>
        </div>
      </div>
    </div>
  );
}

// ── Credentials Modal ─────────────────────────────────────────
function CredentialsModal({ creds, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(`Mobile (Username): ${creds.username}\nInitial Password: ${creds.temp_password}`);
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:24 }}>
      <div style={{ background:"#fff", borderRadius:20, width:420, boxShadow:"0 24px 60px rgba(0,0,0,0.3)", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#059669,#10B981)", padding:"16px 22px", color:"#fff" }}>
          <div style={{ fontWeight:800, fontSize:15 }}>✅ Teacher Login Created</div>
          <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>Share these credentials with the teacher</div>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ background:"#F0FDF4", border:"1px solid #A7F3D0", borderRadius:12, padding:"16px 18px", marginBottom:14 }}>
            {[
              ["📱 Mobile Number (Username)", creds.username],
              ["🔑 Initial Password (DOB)", creds.temp_password],
            ].map(([k,v])=>(
              <div key={k} style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#059669", textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>{k}</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#0F172A", fontFamily:"monospace", letterSpacing:1, background:"#fff", borderRadius:7, padding:"8px 12px", border:"1px solid #D1FAE5" }}>{v ?? '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"#EFF6FF", borderRadius:9, padding:"10px 14px", fontSize:11, color:"#1D4ED8", marginBottom:14, lineHeight:1.6 }}>
            💡 Teacher can login with their <strong>mobile number</strong> as username.<br/>
            Initial password is their <strong>date of birth</strong> in ddmmyyyy format.<br/>
            They can change it from Profile → Security tab after first login.
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={copy} style={{ flex:1, background:copied?"#ECFDF5":"#EEF2FF", color:copied?"#059669":"#6366F1", border:"none", borderRadius:9, padding:11, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
            <button onClick={onClose} style={{ flex:2, background:"#6366F1", color:"#fff", border:"none", borderRadius:9, padding:11, fontSize:13, fontWeight:700, cursor:"pointer" }}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────
function DeleteModal({ name, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:24 }}>
      <div style={{ background:"#fff", borderRadius:16, width:360, padding:28, boxShadow:"0 24px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize:32, textAlign:"center", marginBottom:12 }}>🗑️</div>
        <div style={{ fontWeight:800, fontSize:16, textAlign:"center", color:"#0F172A", marginBottom:8 }}>Delete Teacher</div>
        <div style={{ fontSize:13, color:"#64748B", textAlign:"center", marginBottom:24 }}>
          Remove <strong>{name}</strong> permanently? This cannot be undone.
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, background:"#F1F5F9", color:"#64748B", border:"none", borderRadius:9, padding:11, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, background:"#EF4444", color:"#fff", border:"none", borderRadius:9, padding:11, fontSize:13, fontWeight:700, cursor:"pointer" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Attendance helpers ────────────────────────────────────────
const ATT = {
  P:{ label:"Present",  c:"#059669", bg:"#D1FAE5", border:"#6EE7B7" },
  A:{ label:"Absent",   c:"#DC2626", bg:"#FEE2E2", border:"#FCA5A5" },
  L:{ label:"On Leave", c:"#D97706", bg:"#FEF3C7", border:"#FCD34D" },
};
const CYCLE_ATT = ["P","A","L"];

const isWeekday  = d => { const day = new Date(d).getDay(); return day !== 0 && day !== 6; };
const fmtShort   = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—";

function getWeekdays(n) {
  const days=[]; let d=new Date();
  while (days.length < n) {
    const s = d.toISOString().slice(0,10);
    if (isWeekday(s)) days.push(s);
    d.setDate(d.getDate()-1);
  }
  return days.reverse();
}

// ── Teacher Attendance Report ─────────────────────────────────
function TeacherReportView({ teachers, showToast, isMobile }) {
  const [rangeMode,   setRangeMode]   = useState("month");
  const [customFrom,  setCustomFrom]  = useState(todayStr());
  const [customTo,    setCustomTo]    = useState(todayStr());
  const [monthReport, setMonthReport] = useState([]);
  const [dailyRecs,   setDailyRecs]   = useState([]);
  const [loading,     setLoading]     = useState(false);

  const now = new Date();

  const getReportDays = () => {
    if (rangeMode === "week")   return getWeekdays(5);
    if (rangeMode === "custom" && customFrom && customTo) {
      const days=[]; let d=new Date(customFrom);
      const end=new Date(customTo);
      while(d<=end){ days.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
      return days.filter(isWeekday);
    }
    return [];
  };
  const reportDays = getReportDays();

  const getStatus = (teacherId, date) => {
    const rec = dailyRecs.find(r => r.teacher_id === teacherId && r.date === date);
    return rec?.status || null;
  };

  const pctDays = (teacherId) => {
    const marked = reportDays.filter(d => getStatus(teacherId, d));
    if (!marked.length) return null;
    const present = marked.filter(d => getStatus(teacherId, d) === 'P').length;
    return Math.round((present / marked.length) * 100);
  };

  useEffect(() => {
    if (rangeMode === "month") {
      setLoading(true);
      apiFetch(`/teachers/attendance/report?month=${now.getMonth()+1}&year=${now.getFullYear()}`)
        .then(r => { if (r?.data) setMonthReport(r.data); })
        .catch(e => showToast(e.message, "error"))
        .finally(() => setLoading(false));
    }
  }, [rangeMode]);

  useEffect(() => {
    if (rangeMode === "week" || (rangeMode === "custom" && customFrom && customTo)) {
      const days = getReportDays();
      if (!days.length) return;
      setLoading(true);
      apiFetch(`/teachers/attendance/daily?from=${days[0]}&to=${days[days.length-1]}`)
        .then(r => { if (r?.data) setDailyRecs(Array.isArray(r.data) ? r.data : Object.values(r.data)); })
        .catch(e => showToast(e.message, "error"))
        .finally(() => setLoading(false));
    }
  }, [rangeMode, customFrom, customTo]);

  return (
    <div>
      {/* Range selector */}
      <div style={{ background:"#fff", borderRadius:12, padding:"14px 18px", marginBottom:16,
        border:"1px solid #E2E8F0", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <span style={{ fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.5 }}>Date Range:</span>
        {[["week","This Week"],["month","This Month"],["custom","Custom"]].map(([mode,label]) => (
          <button key={mode} onClick={() => setRangeMode(mode)}
            style={{ padding:"6px 16px", borderRadius:8, border:"1px solid", fontSize:12, fontWeight:700,
              cursor:"pointer", borderColor:rangeMode===mode?"#6366F1":"#E2E8F0",
              background:rangeMode===mode?"#6366F1":"#fff", color:rangeMode===mode?"#fff":"#64748B" }}>
            {label}
          </button>
        ))}
        {rangeMode === "custom" && (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ padding:"6px 10px", borderRadius:7, border:"1px solid #E2E8F0", fontSize:12, outline:"none", fontFamily:"inherit" }}/>
            <span style={{ fontSize:11, color:"#94A3B8" }}>to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ padding:"6px 10px", borderRadius:7, border:"1px solid #E2E8F0", fontSize:12, outline:"none", fontFamily:"inherit" }}/>
          </div>
        )}
        <div style={{ marginLeft:"auto", fontSize:12, color:"#94A3B8", fontWeight:600 }}>
          {rangeMode === "month"
            ? now.toLocaleString("en-IN",{month:"long",year:"numeric"})
            : `${reportDays.length} working day${reportDays.length!==1?"s":""}`}
        </div>
      </div>

      {/* Monthly summary table */}
      {rangeMode === "month" && (
        <div style={{ background:"#fff", borderRadius:13, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden", overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                {["Teacher","Emp ID","Days Marked","Present","Absent","On Leave","Attendance %"].map(h => (
                  <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:10, fontWeight:800,
                    color:"#64748B", textTransform:"uppercase", letterSpacing:0.6, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:13 }}>Loading…</td></tr>
                : monthReport.length === 0
                  ? <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:13 }}>No attendance data for this month yet.</td></tr>
                  : monthReport.map(r => {
                      const lowAtt = r.total > 0 && r.percent < 75;
                      const p = r.percent;
                      return (
                        <tr key={r.teacher_id} style={{ borderBottom:"1px solid #F1F5F9", background:lowAtt?"#FFFBEB":"" }}
                          onMouseEnter={e => e.currentTarget.style.background = lowAtt?"#FEF9C3":"#FAFBFC"}
                          onMouseLeave={e => e.currentTarget.style.background = lowAtt?"#FFFBEB":""}>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                              <Avatar name={r.name} size={30}/>
                              <div style={{ fontWeight:700, fontSize:12, display:"flex", gap:5, alignItems:"center" }}>
                                {r.name}
                                {lowAtt && <span style={{ background:"#FEF2F2", color:"#DC2626", fontSize:9, fontWeight:800,
                                  padding:"1px 6px", borderRadius:8, border:"1px solid #FECACA" }}>⚠️ &lt;75%</span>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"10px 14px", fontSize:11, color:"#94A3B8" }}>{r.employee_id||"—"}</td>
                          <td style={{ padding:"10px 14px", fontSize:12, color:"#64748B", fontWeight:600, textAlign:"center" }}>{r.total}</td>
                          <td style={{ padding:"10px 14px", textAlign:"center" }}>
                            <span style={{ background:"#D1FAE5", color:"#059669", padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:800 }}>{r.present}</span>
                          </td>
                          <td style={{ padding:"10px 14px", textAlign:"center" }}>
                            <span style={{ background:"#FEE2E2", color:"#DC2626", padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:800 }}>{r.absent}</span>
                          </td>
                          <td style={{ padding:"10px 14px", textAlign:"center" }}>
                            <span style={{ background:"#FEF3C7", color:"#D97706", padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:800 }}>{r.on_leave}</span>
                          </td>
                          <td style={{ padding:"10px 14px", textAlign:"center" }}>
                            {r.total > 0 ? (
                              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                                <span style={{ fontSize:13, fontWeight:900, color:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}>{p}%</span>
                                <div style={{ width:48, background:"#F1F5F9", borderRadius:99, height:4 }}>
                                  <div style={{ width:`${p}%`, height:"100%", borderRadius:99,
                                    background:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}/>
                                </div>
                              </div>
                            ) : <span style={{ color:"#CBD5E1", fontSize:11 }}>Not marked</span>}
                          </td>
                        </tr>
                      );
                    })
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Daily grid (week / custom) */}
      {rangeMode !== "month" && (
        <div style={{ background:"#fff", borderRadius:13, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden", overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:480 }}>
            <thead>
              <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                <th style={{ padding:"11px 14px", textAlign:"left", fontSize:10, fontWeight:800,
                  color:"#64748B", textTransform:"uppercase", minWidth:180, position:"sticky", left:0, background:"#F8FAFC" }}>
                  Teacher
                </th>
                {reportDays.map(d => (
                  <th key={d} style={{ padding:"11px 10px", textAlign:"center", fontSize:10,
                    fontWeight:800, color:"#64748B", textTransform:"uppercase", minWidth:52, whiteSpace:"nowrap" }}>
                    {fmtShort(d)}
                  </th>
                ))}
                <th style={{ padding:"11px 14px", textAlign:"center", fontSize:10, fontWeight:800,
                  color:"#64748B", textTransform:"uppercase", minWidth:70 }}>Avg %</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={reportDays.length+2} style={{ padding:40, textAlign:"center", color:"#94A3B8", fontSize:13 }}>Loading…</td></tr>
                : teachers.map(t => {
                    const p = pctDays(t.id);
                    const lowAtt = p !== null && p < 75;
                    return (
                      <tr key={t.id} style={{ borderBottom:"1px solid #F1F5F9", background:lowAtt?"#FFFBEB":"" }}
                        onMouseEnter={e => e.currentTarget.style.background = lowAtt?"#FEF9C3":"#FAFBFC"}
                        onMouseLeave={e => e.currentTarget.style.background = lowAtt?"#FFFBEB":""}>
                        <td style={{ padding:"10px 14px", position:"sticky", left:0, background:"inherit", borderRight:"1px solid #F1F5F9" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                            <Avatar name={t.name} size={28}/>
                            <div style={{ fontWeight:700, fontSize:12 }}>{t.name}</div>
                          </div>
                        </td>
                        {reportDays.map(d => {
                          const v = getStatus(t.id, d);
                          const m = v ? ATT[v] : null;
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
                          {p !== null
                            ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                                <span style={{ fontSize:13, fontWeight:900,
                                  color:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}>{p}%</span>
                                <div style={{ width:40, background:"#F1F5F9", borderRadius:99, height:4 }}>
                                  <div style={{ width:`${p}%`, height:"100%", borderRadius:99,
                                    background:p>=75?"#10B981":p>=50?"#F59E0B":"#EF4444" }}/>
                                </div>
                              </div>
                            : <span style={{ color:"#CBD5E1" }}>—</span>
                          }
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
          {/* Legend */}
          <div style={{ padding:"10px 16px", borderTop:"1px solid #F1F5F9", background:"#FAFBFC",
            display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
            {Object.entries(ATT).map(([k,v]) => (
              <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ background:v.bg, color:v.c, padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:800 }}>{k}</span>
                <span style={{ fontSize:11, color:"#64748B" }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Attendance mark sub-view ──────────────────────────────────
function AttendanceView({ teachers, showToast, isMobile }) {
  const [attTab, setAttTab] = useState("mark"); // "mark" | "report"

  // ── Mark state ────────────────────────────────────────────────
  const [date, setDate]     = useState(todayStr());
  const [att, setAtt]       = useState({});
  const [saving, setSaving] = useState(false);
  const getA = (id,d)       => att[`${id}__${d}`]||"";
  const setA = (id,d,v)     => setAtt(p=>({...p,[`${id}__${d}`]:v}));
  const cycle = (id,d)      => { const c=getA(id,d)||"P"; setA(id,d,CYCLE_ATT[(CYCLE_ATT.indexOf(c)+1)%CYCLE_ATT.length]); };
  const markAll = v         => teachers.forEach(t=>setA(t.id,date,v));
  const stats = { P:0,A:0,L:0 };
  teachers.forEach(t=>{ const v=getA(t.id,date); if(v) stats[v]=(stats[v]||0)+1; });

  const saveAtt = async () => {
    const records = teachers
      .filter(t => getA(t.id, date))
      .map(t => ({ id: t.id, status: getA(t.id, date) }));
    if (!records.length) { showToast("No attendance marked", "error"); return; }
    setSaving(true);
    try {
      await apiFetch('/teachers/attendance', { method:'POST', body:{ date, records } });
      showToast(`Attendance saved — ${fmtDate(date)}`);
    } catch(e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:4, background:"#E2E8F0", borderRadius:9, padding:3, marginBottom:16, width:"fit-content" }}>
        {[["mark","✏️ Mark Attendance"],["report","📊 Report"]].map(([k,l]) => (
          <button key={k} onClick={() => setAttTab(k)}
            style={{ padding:"7px 18px", borderRadius:7, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
              background:attTab===k?"#fff":"transparent", color:attTab===k?"#6366F1":"#64748B",
              boxShadow:attTab===k?"0 1px 6px rgba(0,0,0,0.1)":"none" }}>{l}</button>
        ))}
      </div>

      {attTab === "report" && <TeacherReportView teachers={teachers} showToast={showToast} isMobile={isMobile}/>}
      {attTab === "mark" && (<div>
      <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center", flexWrap:"wrap" }}>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{ padding:"8px 12px", borderRadius:9, border:"1px solid #E2E8F0", fontSize:13, background:"#fff", outline:"none", fontFamily:"inherit" }}/>
        <span style={{ fontSize:12, fontWeight:700, color:"#64748B" }}>Mark All:</span>
        {Object.entries(ATT).map(([k,v])=>(
          <button key={k} onClick={()=>markAll(k)}
            style={{ background:v.bg, color:v.c, border:`1px solid ${v.border}`, borderRadius:7, padding:isMobile?"5px 10px":"6px 14px", fontSize:isMobile?11:12, fontWeight:700, cursor:"pointer" }}>
            {isMobile?k:`${k} — ${v.label}`}
          </button>
        ))}
        <button onClick={saveAtt} disabled={saving}
          style={{ marginLeft:"auto", background:saving?"#A5B4FC":"#6366F1", color:"#fff", border:"none", borderRadius:8, padding:"7px 18px", fontSize:12, fontWeight:700, cursor:saving?"not-allowed":"pointer", boxShadow:"0 2px 8px rgba(99,102,241,0.3)" }}>
          {saving ? "Saving…" : "💾 Save"}
        </button>
      </div>
      <div style={{ display:"flex", gap:isMobile?8:12, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
        {Object.entries(stats).map(([k,v])=>(
          <div key={k} style={{ background:ATT[k].bg, borderRadius:10, padding:isMobile?"8px 14px":"10px 18px", border:`1px solid ${ATT[k].border}`, textAlign:"center", minWidth:isMobile?70:80, flexShrink:0 }}>
            <div style={{ fontSize:isMobile?18:22, fontWeight:900, color:ATT[k].c }}>{v}</div>
            <div style={{ fontSize:10, color:ATT[k].c, fontWeight:700 }}>{ATT[k].label}</div>
          </div>
        ))}
        <div style={{ background:"#F8FAFC", borderRadius:10, padding:isMobile?"8px 14px":"10px 18px", border:"1px solid #E2E8F0", textAlign:"center", minWidth:isMobile?70:80, flexShrink:0 }}>
          <div style={{ fontSize:isMobile?18:22, fontWeight:900, color:"#64748B" }}>{teachers.length}</div>
          <div style={{ fontSize:10, color:"#64748B", fontWeight:700 }}>Total</div>
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:13, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:isMobile?480:"auto" }}>
          <thead>
            <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
              {(isMobile?["Teacher","Status","WhatsApp"]:["#","Teacher","Designation","Subjects","Status","WhatsApp"]).map(h=>(
                <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:10, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.6, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teachers.map((t,i)=>{
              const cur  = getA(t.id,date);
              const meta = cur ? ATT[cur] : null;
              return (
                <tr key={t.id} style={{ borderBottom:"1px solid #F1F5F9" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#FAFBFC"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  {!isMobile && <td style={{ padding:"10px 14px", fontSize:12, color:"#94A3B8", fontWeight:600 }}>{i+1}</td>}
                  <td style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Avatar name={t.name} photo={t.photo} size={34}/>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{t.name}</div>
                        <div style={{ fontSize:10, color:"#94A3B8" }}>{isMobile?t.designation:t.empId}</div>
                      </div>
                    </div>
                  </td>
                  {!isMobile && <td style={{ padding:"10px 14px", fontSize:12, color:"#64748B" }}>{t.designation}</td>}
                  {!isMobile && <td style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {(t.subjects||[]).slice(0,2).map(s=>(
                        <span key={s} style={{ background:"#EEF2FF", color:"#6366F1", padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700 }}>{s}</span>
                      ))}
                      {(t.subjects||[]).length>2 && <span style={{ background:"#F1F5F9", color:"#94A3B8", padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700 }}>+{t.subjects.length-2}</span>}
                    </div>
                  </td>}
                  <td style={{ padding:"10px 14px" }}>
                    <button onClick={()=>cycle(t.id,date)}
                      style={{ background:meta?meta.bg:"#F1F5F9", color:meta?meta.c:"#94A3B8",
                        border:`1.5px solid ${meta?meta.border:"#E2E8F0"}`, borderRadius:9,
                        padding:"6px 20px", fontSize:13, fontWeight:900, cursor:"pointer", minWidth:56 }}>
                      {cur||"—"}
                    </button>
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    {cur==="A"
                      ? <button onClick={()=>{openWA(t.phone,`Dear ${t.name}, you have been marked ABSENT on ${fmtDate(date)}. Please contact the school administration. — ${SCHOOL.name}`); showToast(`WhatsApp sent to ${t.name}`);}}
                          style={{ background:"#DCFCE7", color:"#16A34A", border:"1px solid #86EFAC", borderRadius:7, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                          📱 Notify
                        </button>
                      : <span style={{ color:"#CBD5E1", fontSize:11 }}>—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>)}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Teachers() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'
  const [toast, showToast] = useToast()
  const { limits, plan } = useSubscriptionStore()

  // ── State ─────────────────────────────────────────────────────
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [meta, setMeta]         = useState({ page:1, total:0, per_page:20, last_page:1 })
  const [saving, setSaving]     = useState(false)

  // ── Dynamic form options ───────────────────────────────────────
  const [subjectOpts, setSubjectOpts] = useState([])
  const [classOpts,   setClassOpts]   = useState([])
  const [sectionOpts, setSectionOpts] = useState([])

  const [view, setView]         = useState("list");
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);
  const [step, setStep]         = useState(1);
  const [sel, setSel]           = useState(null);
  const [showIdCard, setIdCard] = useState(false);
  const [search, setSearch]     = useState("");
  const [fStatus, setFStatus]   = useState("");
  const [page, setPage]         = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const [credentials, setCredentials] = useState(null);

  const handleChange = useCallback((field,value)=>{ setForm(f=>({...f,[field]:value})); },[]);

  // ── Fetch ─────────────────────────────────────────────────────
  const fetchTeachers = useCallback(async (p = 1) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page:p, per_page:20 });
      if (search)  params.set('search', search);
      if (fStatus) params.set('status', fStatus);
      const res = await apiFetch(`/teachers?${params}`);
      setTeachers(res.data);
      setMeta(res.meta);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, fStatus]);

  useEffect(() => { fetchTeachers(page); }, [page, search, fStatus]);

  // ── Load form option lists once on mount ──────────────────────
  useEffect(() => {
    Promise.all([
      apiFetch('/subjects'),
      apiFetch('/classes'),
      apiFetch('/sections'),
    ]).then(([sr, cr, secr]) => {
      if (sr?.data)   setSubjectOpts([...new Set(sr.data.map(s => s.name))]);
      if (cr?.data)   setClassOpts(cr.data.map(c => c.name));
      if (secr?.data) setSectionOpts([...new Set(secr.data.map(s => s.name))]);
    }).catch(() => {});
  }, []);

  // ── Widgets ───────────────────────────────────────────────────
  const widgets = [
    { icon:"👨‍🏫", label:"Total Staff",    value:meta.total,                                                c:"#6366F1", bg:"#EEF2FF", sub:"All designations" },
    { icon:"✅",   label:"Active",          value:teachers.filter(t=>t.status==="Active").length,           c:"#10B981", bg:"#ECFDF5", sub:"Currently teaching" },
    { icon:"⏸️",  label:"On Leave",        value:teachers.filter(t=>t.status==="On Leave").length,         c:"#F59E0B", bg:"#FFFBEB", sub:"Today" },
    { icon:"📚",   label:"Subjects Covered",value:new Set(teachers.flatMap(t=>t.subjects||[])).size,        c:"#3B82F6", bg:"#EFF6FF", sub:"This page" },
  ];

  const TABS = [["list","👨‍🏫 All Staff"],["attendance","📅 Attendance"]];

  // ── Open edit ─────────────────────────────────────────────────
  const openEdit = t => {
    setForm({
      name:t.name, gender:t.gender||"", dob:t.dob||"", bloodGroup:t.bloodGroup||"",
      phone:t.phone||"", email:t.email||"", address:t.address||"",
      city:t.city||"", state:t.state||"", pincode:t.pincode||"",
      empId:t.empId||"", designation:t.designation||"", qualification:t.qualification||"",
      joinDate:t.joinDate||"", subjects:[...(t.subjects||[])], classes:[...(t.classes||[])],
      sections:[...(t.sections||[])], status:t.status||"Active",
      photo:t.photo||null, docs:t.docs||[], password:"",
    });
    setStep(1); setEditId(t.id); setView("form");
  };

  const openAdd = () => { setForm(EMPTY_FORM); setStep(1); setEditId(null); setView("form"); };

  // ── Save ──────────────────────────────────────────────────────
  const save = async () => {
    if (!form.name || !form.phone || !form.designation) {
      showToast("Fill required fields (Name, Phone, Designation)", "error"); return;
    }
    setSaving(true);
    try {
      const body = {
        name:form.name, gender:form.gender, dob:form.dob||null, bloodGroup:form.bloodGroup,
        phone:form.phone, email:form.email||null,
        address:form.address, city:form.city, state:form.state, pincode:form.pincode,
        empId:form.empId, designation:form.designation, qualification:form.qualification,
        joinDate:form.joinDate||null, subjects:form.subjects, classes:form.classes,
        sections:form.sections, status:form.status, photo:form.photo,
        docs:form.docs, password:form.password||null,
      };

      if (editId) {
        const res = await apiFetch(`/teachers/${editId}`, { method:'PUT', body });
        setTeachers(ts => ts.map(t => t.id === editId ? res.data : t));
        showToast(`${form.name} updated!`);
      } else {
        const res = await apiFetch('/teachers', { method:'POST', body });
        setTeachers(ts => [res.data, ...ts]);
        showToast(`${form.name} added!`);
        if (res.credentials) setCredentials(res.credentials);
      }

      setForm(EMPTY_FORM); setStep(1); setEditId(null); setView("list");
    } catch(e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Status update (from detail) ───────────────────────────────
  const updateStatus = async (id, status) => {
    try {
      const res = await apiFetch(`/teachers/${id}`, { method:'PUT', body:{ status } });
      setTeachers(ts => ts.map(t => t.id === id ? res.data : t));
      if (sel?.id === id) setSel(res.data);
      showToast(`Status → ${status}`);
    } catch(e) {
      showToast(e.message, "error");
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const confirmDelete = async () => {
    try {
      await apiFetch(`/teachers/${deleteId}`, { method:'DELETE' });
      setTeachers(ts => ts.filter(t => t.id !== deleteId));
      setMeta(m => ({ ...m, total: m.total - 1 }));
      showToast("Teacher deleted");
      setDeleteId(null);
      if (view === "detail") setView("list");
    } catch(e) {
      showToast(e.message, "error");
    }
  };

  // ── Skeleton ──────────────────────────────────────────────────
  const skeletonCard = i => (
    <div key={i} style={{ background:"#fff", borderRadius:14, overflow:"hidden", boxShadow:"0 1px 8px rgba(0,0,0,0.07)", border:"1px solid #F1F5F9", height:180, animation:"pulse 1.5s ease-in-out infinite" }}>
      <div style={{ height:5, background:"#E2E8F0" }}/>
      <div style={{ padding:16 }}>
        <div style={{ display:"flex", gap:12, marginBottom:12 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:"#E2E8F0", flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ height:14, background:"#E2E8F0", borderRadius:6, marginBottom:6, width:"60%" }}/>
            <div style={{ height:10, background:"#F1F5F9", borderRadius:6, width:"40%" }}/>
          </div>
        </div>
        <div style={{ height:10, background:"#F1F5F9", borderRadius:6, marginBottom:8, width:"80%" }}/>
        <div style={{ height:10, background:"#F1F5F9", borderRadius:6, width:"50%" }}/>
      </div>
    </div>
  );

  // ── DETAIL VIEW ───────────────────────────────────────────────
  if (view==="detail" && sel) {
    const t = teachers.find(x=>x.id===sel.id)||sel;
    const statusColor = t.status==="Active"?"#10B981":t.status==="On Leave"?"#F59E0B":"#EF4444";
    const statusBg    = t.status==="Active"?"rgba(16,185,129,0.25)":t.status==="On Leave"?"rgba(245,158,11,0.25)":"rgba(239,68,68,0.25)";
    return (
      <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>
        <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={()=>setView("list")} style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:600, color:"#475569" }}>← Back</button>
          <div style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"6px 14px" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#64748B" }}>STATUS</span>
            <StatusToggle status={t.status} onToggle={st=>updateStatus(t.id, st)}/>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button onClick={()=>openWA(t.phone,`Hi ${t.name}, this is a message from ${SCHOOL.name}.`)}
              style={{ background:"#DCFCE7", color:"#16A34A", border:"1px solid #86EFAC", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:700 }}>
              📱 WhatsApp
            </button>
            <button onClick={()=>setIdCard(true)}
              style={{ background:"linear-gradient(135deg,#0F172A,#6366F1)", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:700, boxShadow:"0 2px 8px rgba(99,102,241,0.3)" }}>
              🪪 Print ID Card
            </button>
            <button onClick={()=>openEdit(t)}
              style={{ background:"#6366F1", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, cursor:"pointer", fontWeight:700, boxShadow:"0 2px 8px rgba(99,102,241,0.3)" }}>
              ✏️ Edit
            </button>
            <button onClick={async()=>{
              try {
                const res = await apiFetch(`/teachers/${t.id}/reset-password`, { method:'POST' });
                showToast(`Password reset to: ${res.data?.temp_password}`);
              } catch(e) { showToast(e.message,'error'); }
            }} style={{ background:"#FFF7ED", color:"#D97706", border:"1px solid #FDE68A", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:700 }}>
              🔑 Reset Password
            </button>
            <button onClick={()=>{setDeleteId(t.id);setDeleteName(t.name);}}
              style={{ background:"#FEF2F2", color:"#EF4444", border:"1px solid #FECACA", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:700 }}>
              🗑️ Delete
            </button>
          </div>
        </div>

        <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 8px rgba(0,0,0,0.08)", overflow:"hidden" }}>
          <div style={{ background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#6366F1 100%)", padding:"28px 32px", color:"#fff", display:"flex", gap:20, alignItems:"center" }}>
            {t.photo
              ? <img src={t.photo} alt={t.name} style={{ width:72, height:72, borderRadius:"50%", objectFit:"cover", border:"3px solid rgba(255,255,255,0.35)", flexShrink:0 }}/>
              : <Avatar name={t.name} size={72}/>
            }
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:900, fontSize:22 }}>{t.name}</div>
              <div style={{ opacity:0.65, fontSize:13, marginTop:3 }}>{t.designation} · {t.empId}</div>
              <div style={{ opacity:0.55, fontSize:12, marginTop:2 }}>{t.qualification} · Joined {fmtDate(t.joinDate)}</div>
            </div>
            <span style={{ background:statusBg, color:statusColor, padding:"5px 16px", borderRadius:20, fontSize:12, fontWeight:800 }}>{t.status}</span>
          </div>

          <div style={{ padding:24 }}>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":isTablet?"1fr 1fr":"repeat(3,1fr)", gap:12, marginBottom:20 }}>
              {[
                ["Employee ID", t.empId],["Gender",t.gender],["Date of Birth",fmtDate(t.dob)],
                ["Blood Group",t.bloodGroup||"—"],["Phone",t.phone],["Email",t.email||"—"],
                ["Qualification",t.qualification],["Join Date",fmtDate(t.joinDate)],
                ["Address",t.address||"—"],["City",t.city||"—"],["State",t.state||"—"],["Pincode",t.pincode||"—"],
              ].map(([k,v])=>(
                <div key={k} style={{ background:"#F8FAFC", borderRadius:10, padding:"12px 16px", border:"1px solid #F1F5F9" }}>
                  <div style={{ fontSize:9, color:"#94A3B8", fontWeight:800, textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A202C" }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>Subjects Taught</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {(t.subjects||[]).map(s=><span key={s} style={{ background:"#EEF2FF", color:"#6366F1", padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700, border:"1px solid #C7D2FE" }}>{s}</span>)}
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>Classes Assigned</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {(t.classes||[]).map(c=>(
                  <div key={c} style={{ background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:10, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#059669" }}>
                    Class {c} — Sec {(t.sections||[]).join(", ")}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop:"1px solid #F1F5F9", paddingTop:16 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>
                📎 Documents {t.docs && t.docs.length > 0 ? `(${t.docs.length})` : ""}
              </div>
              {t.docs && t.docs.length > 0 ? (
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {t.docs.map((doc,i)=>(
                    <a key={i} href={doc.url} download={doc.name} target="_blank" rel="noreferrer"
                      style={{ display:"flex", alignItems:"center", gap:8, background:"#F8FAFC",
                        border:"1px solid #E2E8F0", borderRadius:9, padding:"9px 14px",
                        textDecoration:"none", cursor:"pointer", transition:"background 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#EEF2FF"}
                      onMouseLeave={e=>e.currentTarget.style.background="#F8FAFC"}>
                      <span style={{ fontSize:18 }}>{doc.name.match(/\.(jpg|jpeg|png)$/i)?"🖼️":"📄"}</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#374151" }}>{doc.name}</div>
                        {doc.size > 0 && (
                          <div style={{ fontSize:10, color:"#94A3B8" }}>
                            {doc.size > 1048576 ? `${(doc.size/1048576).toFixed(1)} MB` : `${Math.round(doc.size/1024)} KB`}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize:10, color:"#6366F1", fontWeight:700, marginLeft:4 }}>⬇</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ color:"#94A3B8", fontSize:13, fontWeight:500 }}>No documents uploaded.</div>
              )}
            </div>
          </div>
        </div>
        {showIdCard && <IDCardModal teacher={t} onClose={()=>setIdCard(false)}/>}
        {deleteId && <DeleteModal name={deleteName} onConfirm={confirmDelete} onCancel={()=>setDeleteId(null)}/>}
        <ToastUI toast={toast}/>
      </div>
    );
  }

  // ── FORM VIEW ─────────────────────────────────────────────────
  if (view==="form") {
    const STEPS = ["Personal Info","Assignments","Documents"];
    return (
      <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center" }}>
            {STEPS.map((label,i)=>{
              const s=i+1;
              return (
                <div key={s} style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:10, background:step===s?"#EEF2FF":step>s?"#ECFDF5":"transparent" }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0, background:step>s?"#10B981":step===s?"#6366F1":"#E2E8F0", color:step>=s?"#fff":"#94A3B8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900 }}>{step>s?"✓":s}</div>
                    <span style={{ fontSize:12, fontWeight:700, color:step===s?"#6366F1":step>s?"#10B981":"#94A3B8" }}>{label}</span>
                  </div>
                  {s<3 && <div style={{ width:24, height:2, borderRadius:2, background:step>s?"#10B981":"#E2E8F0" }}/>}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:12, fontWeight:700, padding:"6px 16px", borderRadius:20, color:editId?"#F59E0B":"#6366F1", background:editId?"#FFFBEB":"#EEF2FF", border:`1px solid ${editId?"#FCD34D":"#C7D2FE"}` }}>
            {editId?"✏️ Editing Teacher":"➕ Add Teacher"}
          </div>
        </div>

        <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 8px rgba(0,0,0,0.08)", padding:28 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#0F172A", marginBottom:4 }}>{STEPS[step-1]}</div>
          <div style={{ fontSize:12, color:"#94A3B8", marginBottom:22, paddingBottom:16, borderBottom:"1px solid #F1F5F9" }}>
            {["Personal details, photo and contact info","Subject, class, section assignments and status","Certificates and supporting documents"][step-1]}
          </div>

          {step===1 && (
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16 }}>
              <div style={{ gridColumn:"1/-1", display:"grid", gridTemplateColumns:isMobile?"1fr":"auto 1fr", gap:isMobile?16:24, alignItems:"start", background:"#F8FAFC", borderRadius:12, padding:"18px 20px", border:"1px solid #F1F5F9" }}>
                <PhotoUpload value={form.photo} onChange={handleChange}/>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14 }}>
                  <FormField label="Full Name *"   field="name"        required  value={form.name}        onChange={handleChange}/>
                  <FormField label="Employee ID"   field="empId"                 value={form.empId}       onChange={handleChange} placeholder="e.g. EMP009"/>
                  <FormField label="Designation *" field="designation" required opts={DESIGNATIONS}       value={form.designation} onChange={handleChange}/>
                  <FormField label="Qualification" field="qualification"         opts={QUALIFICATIONS}    value={form.qualification} onChange={handleChange}/>
                </div>
              </div>
              <FormField label="Gender"        field="gender"     opts={GENDERS}      value={form.gender}     onChange={handleChange}/>
              <FormField label="Date of Birth" field="dob"        type="date"         value={form.dob}        onChange={handleChange}/>
              <FormField label="Blood Group"   field="bloodGroup" opts={BLOOD_GROUPS} value={form.bloodGroup} onChange={handleChange}/>
              <FormField label="Join Date"     field="joinDate"   type="date"         value={form.joinDate}   onChange={handleChange}/>
              <FormField label="Phone *"       field="phone"      required            value={form.phone}      onChange={handleChange}/>
              <FormField label="Email"         field="email"      type="email"        value={form.email}      onChange={handleChange}/>
              {!editId && (
                <FormField label="Login Password" field="password" type="password" value={form.password}
                  onChange={handleChange} placeholder="Leave blank to auto-generate"/>
              )}
              <div style={{ gridColumn:"1/-1" }}>
                <FormField label="Street Address" field="address" value={form.address} onChange={handleChange} placeholder="House No, Street, Area"/>
              </div>
              <FormField label="City"    field="city"    value={form.city}    onChange={handleChange}/>
              <FormField label="State"   field="state"   value={form.state}   onChange={handleChange}/>
              <FormField label="Pincode" field="pincode" value={form.pincode} onChange={handleChange} placeholder="e.g. 600001"/>
            </div>
          )}

          {step===2 && (
            <div style={{ display:"grid", gap:20 }}>
              <MultiToggle label="Subjects Taught *" options={subjectOpts.length ? subjectOpts : SUBJECTS} value={form.subjects}
                onChange={v=>handleChange("subjects",v)} color="#6366F1"/>
              <MultiToggle label="Classes Assigned" options={classOpts.length ? classOpts : CLASSES} value={form.classes}
                onChange={v=>handleChange("classes",v)} color="#10B981"/>
              <MultiToggle label="Sections" options={sectionOpts.length ? sectionOpts : SECTIONS} value={form.sections}
                onChange={v=>handleChange("sections",v)} color="#3B82F6"/>
              {editId && (
                <div style={{ background:"#F8FAFC", borderRadius:10, padding:"16px 18px", border:"1px solid #F1F5F9" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>Employment Status</div>
                  <StatusToggle status={form.status} onToggle={v=>handleChange("status",v)}/>
                </div>
              )}
            </div>
          )}

          {step===3 && (
            <DocsUpload value={form.docs} onChange={handleChange}/>
          )}

          <div style={{ display:"flex", justifyContent:"space-between", marginTop:26, paddingTop:20, borderTop:"1px solid #F1F5F9" }}>
            <button onClick={()=>step>1?setStep(s=>s-1):setView("list")}
              style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:9, padding:"10px 22px", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569" }}>
              {step>1?"← Back":"Cancel"}
            </button>
            {step<3
              ? <button onClick={()=>setStep(s=>s+1)}
                  style={{ background:"#6366F1", color:"#fff", border:"none", borderRadius:9, padding:"10px 26px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px rgba(99,102,241,0.3)" }}>
                  Next →
                </button>
              : <button onClick={save} disabled={saving}
                  style={{ background:saving?"#9CA3AF":editId?"#F59E0B":"#10B981", color:"#fff", border:"none", borderRadius:9, padding:"10px 26px", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
                  {saving ? "Saving…" : editId?"✓ Save Changes":"✓ Add Teacher"}
                </button>
            }
          </div>
        </div>
        <ToastUI toast={toast}/>
      </div>
    );
  }

  // ── LIST + ATTENDANCE TABS ─────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>

      {/* Widgets */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:isMobile?10:14, marginBottom:22 }}>
        {widgets.map(w=>(
          <div key={w.label} style={{ background:"#fff", borderRadius:14, padding:isMobile?"12px 10px":"18px 20px",
            boxShadow:"0 1px 8px rgba(0,0,0,0.07)", display:"flex", alignItems:"center", gap:isMobile?8:14,
            border:`1px solid ${w.c}18`, transition:"transform 0.15s", cursor:"default" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ width:isMobile?36:52, height:isMobile?36:52, background:w.bg, borderRadius:12, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:isMobile?18:26 }}>{w.icon}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:isMobile?20:26, fontWeight:900, color:w.c, lineHeight:1 }}>{w.value}</div>
              <div style={{ fontSize:isMobile?10:12, fontWeight:700, color:"#374151", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{w.label}</div>
              {!isMobile && <div style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>{w.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:6, background:"#E2E8F0", borderRadius:10, padding:4, marginBottom:18, width:"fit-content" }}>
        {TABS.map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)}
            style={{ padding:"7px 18px", borderRadius:7, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, transition:"all 0.18s",
              background:view===v?"#fff":"transparent", color:view===v?"#6366F1":"#64748B",
              boxShadow:view===v?"0 1px 6px rgba(0,0,0,0.1)":"none" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Attendance tab */}
      {view==="attendance" && <AttendanceView teachers={teachers} showToast={showToast} isMobile={isMobile}/>}

      {/* List tab */}
      {view==="list" && (
        <>
          {/* Filters */}
          <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
            <input placeholder="🔍 Search name, ID or phone…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
              style={{ padding:"9px 14px", borderRadius:9, border:"1px solid #E2E8F0", fontSize:13, background:"#fff", outline:"none", minWidth:240 }}/>
            <select value={fStatus} onChange={e=>{setFStatus(e.target.value);setPage(1);}}
              style={{ padding:"9px 12px", borderRadius:9, border:"1px solid #E2E8F0", fontSize:13, background:"#fff", cursor:"pointer", outline:"none" }}>
              <option value="">All Status</option>
              <option>Active</option><option>On Leave</option><option>Resigned</option>
            </select>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ background:"#ECFDF5", color:"#059669", padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:800 }}>{teachers.filter(t=>t.status==="Active").length} Active</div>
              <div style={{ background:"#F1F5F9", color:"#64748B", padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700 }}>{meta.total} Total</div>
              {meta.total >= limits.max_teachers ? (
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10,
                  padding:'9px 14px', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:13, color:'#B91C1C', fontWeight:600 }}>
                    🔒 Teacher limit reached ({limits.max_teachers} on {plan} plan)
                  </span>
                  <a href="/settings?tab=subscription" style={{ fontSize:12, color:'#6366F1', fontWeight:700, textDecoration:'none' }}>
                    Upgrade Plan →
                  </a>
                </div>
              ) : (
                <button onClick={openAdd}
                  style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff", border:"none", borderRadius:9, padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 10px rgba(99,102,241,0.35)" }}>
                  + Add Teacher
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"12px 16px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ color:"#DC2626", fontSize:13, fontWeight:600 }}>⚠️ {error}</span>
              <button onClick={()=>fetchTeachers(page)} style={{ background:"#EF4444", color:"#fff", border:"none", borderRadius:7, padding:"5px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Retry</button>
            </div>
          )}

          {/* Teacher cards grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14, marginBottom:16 }}>
            {loading
              ? Array.from({length:6}, (_,i) => skeletonCard(i))
              : teachers.map(t=>{
                  const statusC = t.status==="Active"?"#059669":t.status==="On Leave"?"#D97706":"#DC2626";
                  const statusBg= t.status==="Active"?"#ECFDF5":t.status==="On Leave"?"#FEF3C7":"#FEF2F2";
                  const statusBd= t.status==="Active"?"#A7F3D0":t.status==="On Leave"?"#FCD34D":"#FECACA";
                  return (
                    <div key={t.id} style={{ background:"#fff", borderRadius:14, overflow:"hidden",
                      boxShadow:"0 1px 8px rgba(0,0,0,0.07)", border:"1px solid #F1F5F9",
                      transition:"transform 0.15s, box-shadow 0.15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.1)";}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,0.07)";}}>

                      <div style={{ height:5, background:`linear-gradient(90deg,#6366F1,#10B981)` }}/>

                      <div style={{ padding:"16px 16px 12px" }}>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                          <Avatar name={t.name} photo={t.photo} size={48}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:800, fontSize:14, color:"#0F172A" }}>{t.name}</div>
                            <div style={{ fontSize:11, color:"#6366F1", fontWeight:700, marginTop:1 }}>{t.designation}</div>
                            <div style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>{t.empId} · {t.qualification}</div>
                          </div>
                          <span style={{ background:statusBg, color:statusC, border:`1px solid ${statusBd}`,
                            padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:800, flexShrink:0 }}>
                            {t.status}
                          </span>
                        </div>

                        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                          {(t.subjects||[]).slice(0,3).map(s=>(
                            <span key={s} style={{ background:"#EEF2FF", color:"#6366F1", padding:"3px 10px", borderRadius:12, fontSize:10, fontWeight:700 }}>{s}</span>
                          ))}
                          {(t.subjects||[]).length>3 && <span style={{ background:"#F1F5F9", color:"#94A3B8", padding:"3px 8px", borderRadius:12, fontSize:10, fontWeight:700 }}>+{t.subjects.length-3}</span>}
                        </div>

                        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
                          {(t.classes||[]).map(c=>(
                            <span key={c} style={{ background:"#F0FDF4", color:"#059669", border:"1px solid #BBF7D0", padding:"2px 8px", borderRadius:8, fontSize:10, fontWeight:700 }}>Cls {c}</span>
                          ))}
                        </div>

                        <div style={{ borderTop:"1px solid #F1F5F9", paddingTop:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <div style={{ fontSize:11, color:"#64748B" }}>📞 {t.phone}</div>
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={()=>openWA(t.phone,`Hi ${t.name}, this is a message from ${SCHOOL.name}.`)}
                              style={{ background:"#DCFCE7", color:"#16A34A", border:"1px solid #86EFAC", borderRadius:7, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>📱</button>
                            <button onClick={()=>{setSel(t);setView("detail");}}
                              style={{ background:"#F1F5F9", color:"#475569", border:"none", borderRadius:7, padding:"5px 10px", fontSize:11, fontWeight:600, cursor:"pointer" }}>👁 View</button>
                            <button onClick={()=>openEdit(t)}
                              style={{ background:"#EEF2FF", color:"#6366F1", border:"none", borderRadius:7, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>✏️ Edit</button>
                            <button onClick={()=>{setDeleteId(t.id);setDeleteName(t.name);}}
                              style={{ background:"#FEF2F2", color:"#EF4444", border:"none", borderRadius:7, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && !loading && (
            <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:12, color:"#64748B", marginRight:6 }}>
                {(page-1)*meta.per_page + 1}–{Math.min(page*meta.per_page, meta.total)} of {meta.total}
              </span>
              {["«","‹"].map((ch,i)=>{
                const dis=page===1;
                return <button key={ch} onClick={()=>setPage(i===0?1:page-1)} disabled={dis}
                  style={{ padding:"6px 10px", borderRadius:7, border:"1px solid #E2E8F0", background:dis?"#F8FAFC":"#fff", color:dis?"#CBD5E1":"#475569", cursor:dis?"not-allowed":"pointer", fontSize:12 }}>{ch}</button>;
              })}
              {Array.from({length:meta.last_page},(_,i)=>i+1).filter(p=>Math.abs(p-page)<=2||p===1||p===meta.last_page).map((p,idx,arr)=>(
                <span key={p}>
                  {idx>0 && arr[idx-1]!==p-1 && <span style={{ color:"#CBD5E1", padding:"0 4px" }}>…</span>}
                  <button onClick={()=>setPage(p)}
                    style={{ padding:"6px 10px", borderRadius:7, border:"1px solid", fontSize:12, fontWeight:p===page?700:400, cursor:"pointer",
                      borderColor:p===page?"#6366F1":"#E2E8F0", background:p===page?"#6366F1":"#fff", color:p===page?"#fff":"#475569" }}>{p}</button>
                </span>
              ))}
              {["›","»"].map((ch,i)=>{
                const dis=page===meta.last_page;
                return <button key={ch} onClick={()=>setPage(i===0?page+1:meta.last_page)} disabled={dis}
                  style={{ padding:"6px 10px", borderRadius:7, border:"1px solid #E2E8F0", background:dis?"#F8FAFC":"#fff", color:dis?"#CBD5E1":"#475569", cursor:dis?"not-allowed":"pointer", fontSize:12 }}>{ch}</button>;
              })}
            </div>
          )}
        </>
      )}

      {credentials && <CredentialsModal creds={credentials} onClose={()=>setCredentials(null)}/>}
      {deleteId && <DeleteModal name={deleteName} onConfirm={confirmDelete} onCancel={()=>setDeleteId(null)}/>}
      <ToastUI toast={toast}/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
