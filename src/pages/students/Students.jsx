import { useState, useCallback, useRef, useEffect } from "react";
import { useBreakpoint } from '../../hooks/responsive.jsx'
import useSubscriptionStore from '../../store/subscriptionStore'
import useAuthStore from '../../store/authStore'

// ── Constants ─────────────────────────────────────────────────
const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const GENDERS      = ["Male","Female","Other"];
const PAGE_SIZE    = 8;

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

function normalizeStudent(s) {
  return {
    id:               s.id,
    admission_no:     s.admission_no    || '',
    name:             s.name            || '',
    class:            s.class           || '',
    section:          s.section         || '',
    class_id:         s.class_id,
    section_id:       s.section_id,
    gender:           s.gender          || '',
    dob:              s.dob             || '',
    guardian:         s.parent_name     || '',
    phone:            s.parent_phone    || '',
    guardianEmail:    s.parent_email    || '',
    guardianRelation: s.parent_relation || '',
    status:           s.status          || 'Active',
    bloodGroup:       s.blood_group     || '',
    rollNo:           '',
    address:          s.address         || '',
    city:             s.city            || '',
    state:            s.state           || '',
    pincode:          s.pincode         || '',
    aadharNo:         s.aadhar_no       || '',
    previousSchool:   s.previous_school || '',
    photo:            s.photo           || null,
    photoFile:        null,
    docs:             (s.documents || []).map(d => ({
      name: d.name, size: d.size || 0, url: d.url || null, file: null, existing: true,
    })),
    login:          s.login          || null,
    admission_date: s.admission_date || null,
  };
}

const EMPTY = {
  firstName:"", lastName:"", dob:"", gender:"", bloodGroup:"",
  class:"", section:"", classId:"", sectionId:"", admission_no:"",
  address:"", city:"", state:"", pincode:"",
  guardianName:"", guardianRelation:"", guardianPhone:"",
  guardianEmail:"", previousSchool:"", aadharNo:"",
  status: "Active",
  photo:     null,
  photoFile: null,
  docs:      [],
};

// ── Helpers ────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";

// ─────────────────────────────────────────────────────────────
// All sub-components OUTSIDE main component to prevent remount
// ─────────────────────────────────────────────────────────────

function Avatar({ name, photo, size=32 }) {
  const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
  const bg = palette[name.charCodeAt(0) % palette.length];
  if (photo) return (
    <img src={photo} alt={name}
      style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover",
        flexShrink:0, border:"2px solid #fff", boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}/>
  );
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
  const err = toast.type === "error";
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
      background:err?"#FEF2F2":"#F0FDF4", border:`1px solid ${err?"#FECACA":"#86EFAC"}`,
      color:err?"#DC2626":"#16A34A", padding:"12px 20px", borderRadius:10,
      fontSize:13, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
      {err ? "❌" : "✅"} {toast.msg}
    </div>
  );
}

// ── FormField — key fix: defined outside so React never remounts it ──
function FormField({ label, field, type="text", opts, value, onChange, required, error }) {
  const base = {
    width:"100%", padding:"9px 12px", borderRadius:8,
    border:`1.5px solid ${error ? "#EF4444" : "#E2E8F0"}`, fontSize:13, outline:"none",
    boxSizing:"border-box", fontFamily:"inherit", background:"#fff",
    transition:"border-color 0.15s, box-shadow 0.15s", color:"#1A202C",
  };
  return (
    <div>
      <label style={{ fontSize:10, fontWeight:800, color:"#64748B", display:"block",
        marginBottom:5, textTransform:"uppercase", letterSpacing:0.8 }}>
        {label}{required && <span style={{ color:"#EF4444", marginLeft:2 }}>*</span>}
      </label>
      {opts
        ? <select value={value} onChange={e => onChange(field, e.target.value)} style={base}>
            <option value="">Select…</option>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(field, e.target.value)}
            onFocus={e => { e.target.style.borderColor=error?"#EF4444":"#6366F1"; e.target.style.boxShadow=error?"0 0 0 3px rgba(239,68,68,0.1)":"0 0 0 3px rgba(99,102,241,0.1)"; }}
            onBlur={e  => { e.target.style.borderColor=error?"#EF4444":"#E2E8F0"; e.target.style.boxShadow="none"; }}
            style={base} />
      }
      {error && <div style={{ fontSize:10, color:"#EF4444", marginTop:3, fontWeight:600 }}>{error}</div>}
    </div>
  );
}

// ── #2a: Photo upload ──────────────────────────────────────────
function PhotoUpload({ value, onChange }) {
  const ref = useRef();
  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      onChange("photo", ev.target.result);
      onChange("photoFile", file);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div>
      <label style={{ fontSize:10, fontWeight:800, color:"#64748B", display:"block",
        marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>
        Student Photo
      </label>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        {/* Preview box */}
        <div onClick={() => ref.current.click()}
          style={{ width:84, height:84, borderRadius:14, flexShrink:0, overflow:"hidden",
            border:`2px dashed ${value ? "#10B981" : "#CBD5E1"}`,
            background:value ? "#F0FDF4" : "#F8FAFC",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", transition:"all 0.2s", position:"relative" }}
          onMouseEnter={e => e.currentTarget.style.borderColor="#6366F1"}
          onMouseLeave={e => e.currentTarget.style.borderColor=value?"#10B981":"#CBD5E1"}>
          {value
            ? <img src={value} alt="preview"
                style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            : <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:26 }}>📷</div>
                <div style={{ fontSize:9, color:"#94A3B8", marginTop:2, fontWeight:700 }}>Upload photo</div>
              </div>
          }
          {value && (
            <div style={{ position:"absolute", top:5, right:5, width:18, height:18,
              background:"#10B981", borderRadius:"50%", display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", fontWeight:800 }}>
              ✓
            </div>
          )}
        </div>
        {/* Info + buttons */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:"#374151" }}>Passport-size photo</div>
          <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>JPG or PNG · Max 2 MB</div>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button type="button" onClick={() => ref.current.click()}
              style={{ background:"#EEF2FF", color:"#6366F1", border:"none", borderRadius:7,
                padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              {value ? "Change" : "Choose Photo"}
            </button>
            {value && (
              <button type="button" onClick={() => { onChange("photo", null); onChange("photoFile", null); }}
                style={{ background:"#FEF2F2", color:"#EF4444", border:"none", borderRadius:7,
                  padding:"6px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }}/>
    </div>
  );
}

// ── #2b: Multi-doc upload ──────────────────────────────────────
function DocsUpload({ value, onChange }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);

  const addFiles = files => {
    const arr = Array.from(files).filter(f =>
      ["application/pdf","image/jpeg","image/png","image/jpg"].includes(f.type) ||
      f.name.match(/\.(pdf|jpg|jpeg|png|doc|docx)$/i)
    );
    const readers = arr.map(file => new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res({ name:file.name, size:file.size, url:ev.target.result, file });
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(newDocs => onChange("docs", [...value, ...newDocs]));
  };

  const handleInput = e => { addFiles(e.target.files); e.target.value = ""; };
  const removeDoc   = idx => onChange("docs", value.filter((_,i) => i !== idx));
  const fmtSz       = b => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${Math.round(b/1024)} KB`;
  const docIcon     = name => {
    const ext = name.split(".").pop().toLowerCase();
    return ["jpg","jpeg","png","webp"].includes(ext) ? "🖼️" : ext === "pdf" ? "📄" : "📎";
  };

  return (
    <div>
      <label style={{ fontSize:10, fontWeight:800, color:"#64748B", display:"block",
        marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>
        Documents &nbsp;
        <span style={{ fontWeight:500, color:"#94A3B8", textTransform:"none", letterSpacing:0, fontSize:11 }}>
          — Aadhar, TC, Birth Certificate, etc.
        </span>
      </label>

      {/* Drop zone */}
      <div
        onClick={() => ref.current.click()}
        onDragOver={e  => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        style={{ border:`2px dashed ${dragging ? "#6366F1" : "#CBD5E1"}`,
          borderRadius:10, padding:"20px 16px", textAlign:"center", cursor:"pointer",
          background:dragging ? "#F5F3FF" : "#F8FAFC", transition:"all 0.2s",
          marginBottom: value.length ? 12 : 0 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor="#6366F1"; e.currentTarget.style.background="#F5F3FF"; }}
        onMouseLeave={e => { if(!dragging){ e.currentTarget.style.borderColor="#CBD5E1"; e.currentTarget.style.background="#F8FAFC"; } }}>
        <div style={{ fontSize:28, marginBottom:6 }}>📂</div>
        <div style={{ fontSize:13, fontWeight:700, color:"#374151" }}>Click or drag files here</div>
        <div style={{ fontSize:11, color:"#94A3B8", marginTop:3 }}>PDF, JPG, PNG · Multiple files allowed</div>
      </div>

      {/* File chips */}
      {value.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {value.map((doc, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
              background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:9, padding:"9px 13px" }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{docIcon(doc.name)}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#374151",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.name}</div>
                <div style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>{fmtSz(doc.size)}</div>
              </div>
              <button type="button" onClick={() => removeDoc(i)}
                style={{ background:"#FEF2F2", color:"#EF4444", border:"none", borderRadius:6,
                  padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700, flexShrink:0 }}>
                ✕
              </button>
            </div>
          ))}
          <div style={{ fontSize:11, color:"#6366F1", fontWeight:600, paddingLeft:2 }}>
            📎 {value.length} file{value.length > 1 ? "s" : ""} attached
          </div>
        </div>
      )}
      <input ref={ref} type="file" multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleInput} style={{ display:"none" }}/>
    </div>
  );
}

// ── #1: Status toggle pill ─────────────────────────────────────
function StatusToggle({ status, onToggle }) {
  return (
    <div style={{ display:"inline-flex", background:"#F1F5F9", borderRadius:22, padding:3, gap:2 }}>
      {["Active","Inactive"].map(s => {
        const active = status === s;
        const green  = s === "Active";
        return (
          <button key={s} type="button" onClick={() => onToggle(s)}
            style={{ padding:"5px 16px", borderRadius:18, border:"none", cursor:"pointer",
              fontSize:12, fontWeight:700, transition:"all 0.18s",
              background: active ? (green ? "#10B981" : "#EF4444") : "transparent",
              color:       active ? "#fff" : "#94A3B8",
              boxShadow:   active ? `0 2px 6px rgba(${green?"16,185,129":"239,68,68"},0.35)` : "none" }}>
            {s === "Active" ? "✓ Active" : "✕ Inactive"}
          </button>
        );
      })}
    </div>
  );
}

// ── ID Card Modal — OUTSIDE main component ────────────────────
function IDCardModal({ student, onClose }) {
  const SCHOOL_NAME    = "Vidya Niketan School";
  const SCHOOL_ADDRESS = "123, MG Road, Pune - 411001";
  const SCHOOL_PHONE   = "020-12345678";
  const SCHOOL_WEBSITE = "www.vidyaniketan.edu.in";
  const VALID_UNTIL    = "March 2026";

  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";

  const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
  const avatarBg = palette[student.name.charCodeAt(0) % palette.length];

  const handlePrint = () => {
    const el = document.getElementById("id-card-print");
    const win = window.open("","_blank","width=420,height=680");
    win.document.write(`
      <html><head><title>ID Card — ${student.name}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { display:flex; justify-content:center; align-items:center; min-height:100vh; background:#e2e8f0; font-family:'Segoe UI',sans-serif; }
        @media print { body { background:white; } @page { size: 85.6mm 54mm landscape; margin:0; } }
      </style></head>
      <body>${el.innerHTML}
      <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:480, boxShadow:"0 24px 60px rgba(0,0,0,0.3)", overflow:"hidden" }}>

        {/* Modal header */}
        <div style={{ background:"linear-gradient(135deg,#0F172A,#6366F1)", padding:"16px 22px",
          display:"flex", alignItems:"center", justifyContent:"space-between", color:"#fff" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15 }}>🪪 Student ID Card</div>
            <div style={{ fontSize:11, opacity:0.65, marginTop:2 }}>Preview before printing</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.12)", border:"none",
            borderRadius:8, color:"#fff", width:30, height:30, fontSize:16, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>✕</button>
        </div>

        {/* Card preview */}
        <div style={{ padding:"28px 28px 20px", background:"#F0F4F8", display:"flex", justifyContent:"center" }}>
          <div id="id-card-print">
            {/* ── The actual ID card ── */}
            <div style={{ width:340, borderRadius:16, overflow:"hidden",
              boxShadow:"0 8px 32px rgba(0,0,0,0.18)", fontFamily:"'Segoe UI',sans-serif" }}>

              {/* Card top — school header */}
              <div style={{ background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#1D4ED8 100%)",
                padding:"14px 16px 12px", color:"#fff", position:"relative", overflow:"hidden" }}>
                {/* Decorative circles */}
                <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80,
                  borderRadius:"50%", background:"rgba(255,255,255,0.06)" }}/>
                <div style={{ position:"absolute", top:10, right:20, width:40, height:40,
                  borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>
                <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative", zIndex:1 }}>
                  <div style={{ width:36, height:36, background:"rgba(255,255,255,0.15)",
                    borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:20, flexShrink:0 }}>🏫</div>
                  <div>
                    <div style={{ fontWeight:900, fontSize:13, letterSpacing:0.3 }}>{SCHOOL_NAME}</div>
                    <div style={{ fontSize:9, opacity:0.7, marginTop:1 }}>{SCHOOL_ADDRESS}</div>
                  </div>
                </div>
                <div style={{ position:"relative", zIndex:1, marginTop:8, paddingTop:8,
                  borderTop:"1px solid rgba(255,255,255,0.12)", textAlign:"center" }}>
                  <span style={{ fontSize:10, fontWeight:800, letterSpacing:2,
                    textTransform:"uppercase", opacity:0.85 }}>Student Identity Card</span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ background:"#fff", padding:"16px 16px 14px",
                display:"flex", gap:14, alignItems:"flex-start" }}>
                {/* Photo */}
                <div style={{ flexShrink:0 }}>
                  {student.photo
                    ? <img src={student.photo} alt={student.name}
                        style={{ width:72, height:88, objectFit:"cover", borderRadius:10,
                          border:"2px solid #E2E8F0", boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}/>
                    : <div style={{ width:72, height:88, borderRadius:10,
                        background:`linear-gradient(135deg,${avatarBg},${avatarBg}cc)`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:26, fontWeight:900, color:"#fff",
                        border:"2px solid #E2E8F0", boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
                        {student.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                      </div>
                  }
                  {/* ID badge under photo */}
                  <div style={{ marginTop:6, background:"#0F172A", borderRadius:6,
                    padding:"3px 0", textAlign:"center" }}>
                    <div style={{ fontSize:9, fontWeight:800, color:"#fff", letterSpacing:0.5 }}>
                      {student.admission_no || student.id}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:900, fontSize:15, color:"#0F172A", lineHeight:1.2,
                    marginBottom:2 }}>{student.name}</div>
                  <div style={{ fontSize:10, color:"#6366F1", fontWeight:700, marginBottom:10 }}>
                    Class {student.class}-{student.section}
                    {student.rollNo && ` · Roll No. ${student.rollNo}`}
                  </div>

                  {/* Detail rows */}
                  {[
                    ["DOB",      fmtDate(student.dob)],
                    ["Blood",    student.bloodGroup || "—"],
                    ["Guardian", student.guardian   || "—"],
                    ["Phone",    student.phone      || "—"],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", gap:6, marginBottom:4, alignItems:"baseline" }}>
                      <span style={{ fontSize:9, fontWeight:800, color:"#94A3B8",
                        textTransform:"uppercase", letterSpacing:0.5, minWidth:44, flexShrink:0 }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#374151",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card footer */}
              <div style={{ background:"linear-gradient(135deg,#0F172A,#1E3A5F)",
                padding:"8px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:8, color:"rgba(255,255,255,0.5)", fontWeight:600 }}>VALID UNTIL</div>
                  <div style={{ fontSize:10, color:"#fff", fontWeight:800 }}>{VALID_UNTIL}</div>
                </div>
                {/* Fake barcode */}
                <div style={{ display:"flex", gap:1, alignItems:"flex-end" }}>
                  {[3,5,2,7,4,6,3,8,5,2,6,4,7,3,5,2,6,4,8,3,5,7,2,6].map((h,i)=>(
                    <div key={i} style={{ width:2, height:h*2, background:"rgba(255,255,255,0.7)", borderRadius:1 }}/>
                  ))}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:8, color:"rgba(255,255,255,0.5)", fontWeight:600 }}>CONTACT</div>
                  <div style={{ fontSize:9, color:"#fff", fontWeight:700 }}>{SCHOOL_PHONE}</div>
                  <div style={{ fontSize:8, color:"rgba(255,255,255,0.4)" }}>{SCHOOL_WEBSITE}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding:"0 28px 24px", display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, background:"#F1F5F9", color:"#64748B", border:"none",
              borderRadius:10, padding:11, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Close
          </button>
          <button onClick={handlePrint}
            style={{ flex:2, background:"linear-gradient(135deg,#0F172A,#1D4ED8)",
              color:"#fff", border:"none", borderRadius:10, padding:11,
              fontSize:13, fontWeight:700, cursor:"pointer",
              boxShadow:"0 4px 12px rgba(29,78,216,0.35)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            🖨️ Print ID Card
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton row ───────────────────────────────────────────────
function SkeletonRows({ cols }) {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} style={{ borderBottom:"1px solid #F1F5F9" }}>
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} style={{ padding:"10px 14px" }}>
          <div style={{ height:14, background:"#F1F5F9", borderRadius:6,
            animation:"pulse 1.5s ease-in-out infinite",
            width: j === 0 ? "80%" : j === cols-1 ? "60%" : "70%" }} />
        </td>
      ))}
    </tr>
  ));
}

// ── DataTable ──────────────────────────────────────────────────
function DataTable({ columns, data, loading, exPage, exLastPage, exTotal, onPageChange }) {
  const [sortCol, setSCol] = useState(null);
  const [sortDir, setSDir] = useState("asc");
  const [intPage, setIntPage] = useState(1);

  // Use external pagination when provided, otherwise internal
  const isExternal = exPage !== undefined && onPageChange !== undefined;
  const page    = isExternal ? exPage    : intPage;
  const setPage = isExternal ? onPageChange : setIntPage;
  const total   = isExternal ? (exLastPage || 1) : Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const displayTotal = isExternal ? (exTotal || 0) : data.length;

  const sorted = sortCol ? [...data].sort((a,b) => {
    const av=a[sortCol], bv=b[sortCol];
    const c = typeof av==="number" ? av-bv : String(av||"").localeCompare(String(bv||""));
    return sortDir==="asc" ? c : -c;
  }) : data;

  const rows = isExternal ? sorted : sorted.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const safe  = Math.min(page, total);
  const pages = Array.from({length:total},(_,i)=>i+1)
    .filter(p => p===1 || p===total || Math.abs(p-safe)<=1)
    .reduce((acc,p,i,arr) => {
      if (i>0 && p-arr[i-1]>1) acc.push("…");
      acc.push(p); return acc;
    }, []);

  const shownFrom = displayTotal === 0 ? 0 : (safe-1)*PAGE_SIZE+1;
  const shownTo   = isExternal ? Math.min(safe*PAGE_SIZE, displayTotal) : Math.min(safe*PAGE_SIZE, sorted.length);

  return (
    <div style={{ overflowX:"auto" }}>
    <div style={{ background:"#fff", borderRadius:13, boxShadow:"0 1px 8px rgba(0,0,0,0.07)", overflow:"hidden" }}>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
              {columns.map(col => (
                <th key={col.key}
                  onClick={col.sortable!==false ? () => {
                    setSCol(col.key);
                    setSDir(d => sortCol===col.key ? (d==="asc"?"desc":"asc") : "asc");
                    if (!isExternal) setIntPage(1);
                  } : undefined}
                  style={{ padding:"11px 14px", textAlign:"left", fontSize:10, fontWeight:800,
                    color:"#64748B", textTransform:"uppercase", letterSpacing:0.6,
                    whiteSpace:"nowrap", cursor:col.sortable!==false?"pointer":"default", userSelect:"none" }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                    {col.label}
                    {col.sortable!==false && (
                      <span style={{ fontSize:9, color:sortCol===col.key?"#6366F1":"#CBD5E1" }}>
                        {sortCol===col.key ? (sortDir==="asc"?"▲":"▼") : "⇅"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? <SkeletonRows cols={columns.length} />
              : rows.length === 0
                ? <tr><td colSpan={columns.length}
                    style={{ padding:48, textAlign:"center", color:"#94A3B8" }}>
                    <div style={{ fontSize:32 }}>🔍</div>
                    <div style={{ marginTop:8, fontWeight:600 }}>No students found</div>
                  </td></tr>
                : rows.map((row, i) => (
                  <tr key={row.id ?? i} style={{ borderBottom:"1px solid #F1F5F9" }}
                    onMouseEnter={e => e.currentTarget.style.background="#FAFBFC"}
                    onMouseLeave={e => e.currentTarget.style.background=""}>
                    {columns.map(col => (
                      <td key={col.key} style={{ padding:"10px 14px", fontSize:13, verticalAlign:"middle" }}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 16px", borderTop:"1px solid #F1F5F9", background:"#FAFBFC" }}>
        <span style={{ fontSize:11, color:"#94A3B8" }}>
          Showing <strong>{shownFrom}</strong>–
          <strong>{shownTo}</strong> of <strong>{displayTotal}</strong>
        </span>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          {[["«",1],["‹",safe-1]].map(([ch,pg]) => {
            const dis = safe===1;
            return <button key={ch} onClick={() => setPage(Math.max(1,pg))} disabled={dis}
              style={{ padding:"4px 8px", borderRadius:5, border:"1px solid #E2E8F0",
                background:dis?"#F8FAFC":"#fff", color:dis?"#CBD5E1":"#475569",
                cursor:dis?"not-allowed":"pointer", fontSize:11 }}>{ch}</button>;
          })}
          {pages.map((p,i) => p==="…"
            ? <span key={`e${i}`} style={{ padding:"0 3px", color:"#94A3B8", fontSize:11 }}>…</span>
            : <button key={p} onClick={() => setPage(p)}
                style={{ padding:"4px 9px", borderRadius:5, border:"1px solid", fontSize:11,
                  fontWeight:p===safe?700:400, cursor:"pointer",
                  borderColor:p===safe?"#6366F1":"#E2E8F0",
                  background:p===safe?"#6366F1":"#fff",
                  color:p===safe?"#fff":"#475569" }}>{p}</button>
          )}
          {[["›",safe+1],["»",total]].map(([ch,pg]) => {
            const dis = safe===total;
            return <button key={ch} onClick={() => setPage(Math.min(total,pg))} disabled={dis}
              style={{ padding:"4px 8px", borderRadius:5, border:"1px solid #E2E8F0",
                background:dis?"#F8FAFC":"#fff", color:dis?"#CBD5E1":"#475569",
                cursor:dis?"not-allowed":"pointer", fontSize:11 }}>{ch}</button>;
          })}
        </div>
      </div>
    </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Students() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'
  const { isBlocked, isGracePeriod } = useSubscriptionStore()
  const { user } = useAuthStore()
  const isStaff   = user?.role === 'staff'
  const isTeacher = user?.role === 'teacher'

  // ── Data state ────────────────────────────────────────────────
  const [students, setStudents]         = useState([]);
  const [classes, setClasses]           = useState([]);
  const [sections, setSections]         = useState([]);
  const [academicYearId, setAcYearId]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [page, setPage]                 = useState(1);
  const [lastPage, setLastPage]         = useState(1);
  const [totalCount, setTotalCount]     = useState(0);
  const [widgetStats, setWidgetStats]   = useState(null);

  // ── UI state ──────────────────────────────────────────────────
  const [view, setView]         = useState("list");
  const [form, setForm]         = useState(EMPTY);
  const [step, setStep]         = useState(1);
  const [editId, setEditId]     = useState(null);
  const [search, setSearch]     = useState("");
  const [fClass, setFClass]     = useState("");
  const [fStatus, setFStatus]   = useState("");
  const [sel, setSel]           = useState(null);
  const [showIdCard, setIdCard] = useState(false);
  const [toast, setToast]       = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [viewFull, setViewFull]       = useState(null);
  const [newCreds, setNewCreds]       = useState(null);  // show after enrollment
  const debounceRef                   = useRef(null);

  const showToast = useCallback((msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleChange = useCallback((field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setFormErrors(prev => { if (prev[field]) { const n = {...prev}; delete n[field]; return n; } return prev; });
  }, []);

  const validateStep = useCallback((stepNum) => {
    const errs = {};
    if (stepNum === 1) {
      if (!form.firstName?.trim()) errs.firstName = 'First name is required';
      if (!form.dob)               errs.dob       = 'Date of birth is required';
      if (!form.gender)            errs.gender    = 'Gender is required';
      if (!form.class)             errs.class     = 'Class is required';
      if (!form.section)           errs.section   = 'Section is required';
      if (!editId && !form.admission_no?.trim()) errs.admission_no = 'Roll number is required';
    }
    if (stepNum === 3) {
      if (!form.guardianName?.trim())  errs.guardianName  = 'Guardian name is required';
      if (!form.guardianPhone?.trim()) errs.guardianPhone = 'Phone is required';
      else if (!/^\d{10}$/.test(form.guardianPhone.replace(/\D/g, '')))
        errs.guardianPhone = 'Enter a valid 10-digit number';
    }
    return errs;
  }, [form, editId]);

  // ── API calls ─────────────────────────────────────────────────
  const fetchStudents = useCallback(async (q, cls, status, pg) => {
    setLoading(true);
    setError(null);
    try {
      const classObj = classes.find(c => c.name === cls);
      const params = new URLSearchParams({ per_page: PAGE_SIZE, page: pg });
      if (q)               params.set('search',   q);
      if (classObj?.id)    params.set('class_id', classObj.id);
      if (status)          params.set('status',   status);
      const res = await apiFetch(`/students?${params}`);
      setStudents((res.data || []).map(normalizeStudent));
      setLastPage(res.meta?.pages || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [classes]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await apiFetch('/classes');
      setClasses((res.data || []).map(c => ({ ...c, active: true })));
    } catch (e) {
      console.error('Failed to load classes', e);
    }
  }, []);

  const fetchSections = useCallback(async (classId = '') => {
    try {
      const qs = classId ? `?class_id=${classId}` : '';
      const res = await apiFetch(`/sections${qs}`);
      setSections(res.data || []);
    } catch (e) {
      console.error('Failed to load sections', e);
    }
  }, []);

  const fetchAcademicYear = useCallback(async () => {
    try {
      const res = await apiFetch('/academic-years');
      const active = (res.data || []).find(y => y.is_current) || res.data?.[0];
      if (active) setAcYearId(active.id);
    } catch (e) {
      console.error('Failed to load academic year', e);
    }
  }, []);

  const fetchWidgetStats = useCallback(async () => {
    try {
      const res = await apiFetch('/dashboard/stats');
      if (res.success) setWidgetStats(res.data);
    } catch (e) {
      console.error('Failed to load widget stats', e);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────
  useEffect(() => {
    fetchClasses();
    fetchSections();
    fetchAcademicYear();
    fetchWidgetStats();
  }, []);

  // Fetch students once classes are loaded (or re-fetch on filter/page changes)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (classes.length === 0 && !didInitRef.current) return;
    didInitRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = search ? 400 : 0;
    debounceRef.current = setTimeout(() => {
      fetchStudents(search, fClass, fStatus, page);
    }, delay);
    return () => clearTimeout(debounceRef.current);
  }, [search, fClass, fStatus, page, classes]);

  // When class filter changes, update sections dropdown
  useEffect(() => {
    const classObj = classes.find(c => c.name === fClass);
    fetchSections(classObj?.id || '');
  }, [fClass, classes]);

  // Compute form sections based on selected class in form
  const formClassObj   = classes.find(c => c.name === form.class);
  const formSections = [...new Set(
    sections
      .filter(s => !formClassObj || s.class_id === formClassObj.id)
      .map(s => s.name)
  )];

  const refetch = useCallback(() => {
    fetchStudents(search, fClass, fStatus, page);
  }, [search, fClass, fStatus, page, fetchStudents]);

  // ── Mutations ─────────────────────────────────────────────────
  const quickToggle = async (id) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    const newStatus = student.status === 'Active' ? 'Inactive' : 'Active';
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    try {
      await apiFetch(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, status: student.status } : s));
      showToast(e.message, 'error');
    }
  };

  const openAdd = () => {
    setForm(EMPTY); setFormErrors({}); setStep(1); setEditId(null); setView("add");
  };

  const openView = useCallback(async (student) => {
    setSel(student);
    setViewFull(null);
    setView("detail");
    try {
      const res = await apiFetch(`/students/${student.id}`);
      setViewFull(normalizeStudent(res.data));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [showToast]);

  const openEdit = useCallback(async (studentOrRow) => {
    setFormErrors({});
    setStep(1);
    setEditId(studentOrRow.id);
    setView("add");
    try {
      const res = await apiFetch(`/students/${studentOrRow.id}`);
      const s = res.data;
      const [firstName, ...rest] = (s.name || '').split(' ');
      const classObj = classes.find(c => c.id === s.class_id);
      fetchSections(classObj?.id || '');
      setForm({
        firstName,
        lastName:         rest.join(' '),
        dob:              s.dob              || '',
        gender:           s.gender           || '',
        bloodGroup:       s.blood_group      || '',
        class:            s.class            || '',
        section:          s.section          || '',
        classId:          s.class_id         || '',
        sectionId:        s.section_id       || '',
        admission_no:     s.admission_no     || '',
        address:          s.address          || '',
        city:             s.city             || '',
        state:            s.state            || '',
        pincode:          s.pincode          || '',
        guardianName:     s.parent_name      || '',
        guardianRelation: s.parent_relation  || '',
        guardianPhone:    s.parent_phone     || '',
        guardianEmail:    s.parent_email     || '',
        previousSchool:   s.previous_school  || '',
        aadharNo:         s.aadhar_no        || '',
        status:           s.status           || 'Active',
        photo:            s.photo            || null,
        photoFile:        null,
        docs:             (s.documents || []).map(d => ({
          name: d.name, size: d.size || 0, url: d.url, file: null, existing: true,
        })),
      });
    } catch (e) {
      showToast(e.message, 'error');
      setEditId(null);
      setView('list');
    }
  }, [classes, fetchSections, showToast]);

  const save = async () => {
    const step3Errs = validateStep(3);
    if (Object.keys(step3Errs).length > 0) { setFormErrors(step3Errs); return; }

    const fullName   = `${form.firstName} ${form.lastName}`.trim();
    const classObj   = classes.find(c => c.name === form.class);
    const sectionObj = sections.find(s => s.name === form.section && (!classObj || s.class_id === classObj.id));

    if (!classObj) { showToast("Select a valid class", "error"); return; }

    const hasFiles = form.photoFile || form.docs.some(d => d.file);

    if (hasFiles) {
      // Use FormData (supports file uploads); PUT via _method spoofing
      const fd = new FormData();
      if (editId) fd.append('_method', 'PUT');
      fd.append('name',            fullName);
      fd.append('dob',             form.dob             || '');
      fd.append('gender',          form.gender          || '');
      fd.append('blood_group',     form.bloodGroup      || '');
      fd.append('address',         form.address         || '');
      fd.append('city',            form.city            || '');
      fd.append('state',           form.state           || '');
      fd.append('pincode',         form.pincode         || '');
      fd.append('aadhar_no',       form.aadharNo        || '');
      fd.append('previous_school', form.previousSchool  || '');
      fd.append('status',          form.status          || 'Active');
      fd.append('class_id',        classObj.id);
      if (sectionObj?.id) fd.append('section_id', sectionObj.id);
      fd.append('parent_name',     form.guardianName    || '');
      fd.append('parent_phone',    form.guardianPhone);
      fd.append('parent_email',    form.guardianEmail   || '');
      fd.append('parent_relation', form.guardianRelation || '');
      if (!editId) {
        fd.append('admission_no',     form.admission_no);
        fd.append('academic_year_id', academicYearId);
      }
      if (form.photoFile) fd.append('photo', form.photoFile);
      form.docs.filter(d => d.file).forEach(d => fd.append('documents[]', d.file));

      const token = localStorage.getItem('token');
      const url = editId ? `${API_BASE}/students/${editId}` : `${API_BASE}/students`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || `HTTP ${res.status}`); }
        const data = await res.json();
        if (!editId && data.credentials) setNewCreds(data.credentials);
        showToast(editId ? `${fullName} updated!` : `${fullName} enrolled!`);
        setForm(EMPTY); setStep(1); setEditId(null); setView("list");
        refetch();
      } catch (e) { showToast(e.message, "error"); }
    } else {
      // JSON path (no files)
      const body = {
        name:            fullName,
        dob:             form.dob             || null,
        gender:          form.gender          || null,
        blood_group:     form.bloodGroup      || null,
        address:         form.address         || null,
        city:            form.city            || null,
        state:           form.state           || null,
        pincode:         form.pincode         || null,
        aadhar_no:       form.aadharNo        || null,
        previous_school: form.previousSchool  || null,
        status:          form.status          || 'Active',
        class_id:        classObj.id,
        section_id:      sectionObj?.id       || null,
        parent_name:     form.guardianName    || null,
        parent_phone:    form.guardianPhone,
        parent_email:    form.guardianEmail   || null,
        parent_relation: form.guardianRelation || null,
      };
      if (!editId) {
        body.admission_no     = form.admission_no;
        body.academic_year_id = academicYearId;
      }
      try {
        if (editId) {
          await apiFetch(`/students/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
        } else {
          const data = await apiFetch('/students', { method: 'POST', body: JSON.stringify(body) });
          if (data.credentials) setNewCreds(data.credentials);
        }
        showToast(editId ? `${fullName} updated!` : `${fullName} enrolled!`);
        setForm(EMPTY); setStep(1); setEditId(null); setView("list");
        refetch();
      } catch (e) { showToast(e.message, "error"); }
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm("Delete this student? This cannot be undone.")) return;
    try {
      await apiFetch(`/students/${id}`, { method: 'DELETE' });
      showToast("Student deleted");
      refetch();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  // ── Widget data ───────────────────────────────────────────────
  const wsStudents   = widgetStats?.students   || {};
  const wsAttendance = widgetStats?.attendance || {};
  const wsFees       = widgetStats?.fees       || {};
  const wsTeachers   = widgetStats?.teachers   || {};

  const widgets = [
    {
      icon:"👨‍🎓", label:"Total Students", value: wsStudents.total ?? "—",
      c:"#6366F1", bg:"#EEF2FF",
      sub: wsStudents.total != null
        ? `${wsStudents.active} active · ${wsStudents.inactive} inactive`
        : "Loading…",
    },
    {
      icon:"👨‍🏫", label:"Total Teachers", value: wsTeachers.total ?? "—",
      c:"#3B82F6", bg:"#EFF6FF",
      sub:"Active teaching staff",
    },
    {
      icon:"✅", label:"Today Present", value: wsAttendance.present_today ?? "—",
      c:"#10B981", bg:"#ECFDF5",
      sub: wsAttendance.percent_today != null
        ? `${wsAttendance.percent_today}% attendance today`
        : "Loading…",
    },
    ...(!isTeacher ? [{
      icon:"💰", label:"Pending Fees", value: wsFees.unpaid_count ?? "—",
      c:"#EF4444", bg:"#FEF2F2",
      sub: wsFees.total_due != null
        ? `₹${Number(wsFees.total_due).toLocaleString('en-IN')} due`
        : "Loading…",
    }] : []),
  ];

  // ── Detail view ────────────────────────────────────────────────
  if (view === "detail" && sel) {
    const s = viewFull || students.find(x => x.id===sel.id) || sel;
    const isLoading = !viewFull;

    const InfoSection = ({ title, icon, items }) => (
      <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 6px rgba(0,0,0,0.06)", overflow:"hidden", marginBottom:14 }}>
        <div style={{ background:"#F8FAFC", padding:"10px 18px", borderBottom:"1px solid #F1F5F9",
          fontSize:11, fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:0.8 }}>
          {icon} {title}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":isTablet?"1fr 1fr":"repeat(3,1fr)", gap:0 }}>
          {items.map(([k, v], i) => (
            <div key={k} style={{ padding:"12px 18px", borderRight:!isMobile&&(i+1)%3!==0?"1px solid #F1F5F9":"none",
              borderBottom:"1px solid #F1F5F9" }}>
              <div style={{ fontSize:9, color:"#94A3B8", fontWeight:800, textTransform:"uppercase", letterSpacing:0.8, marginBottom:3 }}>{k}</div>
              <div style={{ fontSize:13, fontWeight:700, color: v && v!=="—" ? "#1A202C" : "#CBD5E1" }}>{v || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>
        <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={() => { setView("list"); setViewFull(null); }}
            style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:8,
              padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:600, color:"#475569" }}>
            ← Back
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:10, background:"#fff",
            border:"1px solid #E2E8F0", borderRadius:10, padding:"6px 14px" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#64748B" }}>STATUS</span>
            <StatusToggle status={s.status} onToggle={async newSt => {
              setStudents(prev => prev.map(x => x.id===s.id ? {...x, status:newSt} : x));
              setViewFull(prev => prev ? {...prev, status:newSt} : prev);
              showToast(`Status → ${newSt}`);
              try {
                await apiFetch(`/students/${s.id}`, { method:'PUT', body: JSON.stringify({ status: newSt }) });
              } catch (e) { showToast(e.message, 'error'); }
            }}/>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button onClick={() => setIdCard(true)}
              style={{ background:"linear-gradient(135deg,#0F172A,#1D4ED8)", color:"#fff", border:"none",
                borderRadius:8, padding:"9px 18px", fontSize:13, cursor:"pointer", fontWeight:700,
                boxShadow:"0 2px 8px rgba(29,78,216,0.3)", display:"flex", alignItems:"center", gap:6 }}>
              🪪 Print ID Card
            </button>
            <button onClick={() => openEdit(s)}
              style={{ background:"#6366F1", color:"#fff", border:"none",
                borderRadius:8, padding:"9px 18px", fontSize:13, cursor:"pointer", fontWeight:700,
                boxShadow:"0 2px 8px rgba(99,102,241,0.3)" }}>
              ✏️ Edit Student
            </button>
          </div>
        </div>

        {/* Profile header */}
        <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 8px rgba(0,0,0,0.08)", overflow:"hidden", marginBottom:14 }}>
          <div style={{ background:"linear-gradient(135deg,#0F172A 0%,#312E81 55%,#6366F1 100%)",
            padding:isMobile?"16px":"28px 32px", color:"#fff", display:"flex", gap:isMobile?12:20, alignItems:"center", flexWrap:isMobile?"wrap":"nowrap" }}>
            {isLoading
              ? <div style={{ width:70, height:70, borderRadius:"50%", background:"rgba(255,255,255,0.15)", flexShrink:0 }}/>
              : s.photo
                ? <img src={s.photo} alt={s.name}
                    style={{ width:70, height:70, borderRadius:"50%", objectFit:"cover",
                      border:"3px solid rgba(255,255,255,0.35)", flexShrink:0 }}/>
                : <Avatar name={s.name} size={70} />
            }
            <div>
              <div style={{ fontWeight:900, fontSize:isMobile?17:22 }}>{s.name}</div>
              <div style={{ opacity:0.65, fontSize:13, marginTop:4 }}>
                {s.admission_no} · Class {s.class}-{s.section}
                {isLoading && <span style={{ marginLeft:8, opacity:0.5 }}>Loading details…</span>}
              </div>
            </div>
            <span style={{ marginLeft:"auto", padding:"5px 16px", borderRadius:20, fontSize:12, fontWeight:800,
              background:s.status==="Active"?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.25)",
              color:s.status==="Active"?"#10B981":"#EF4444" }}>
              {s.status}
            </span>
          </div>
        </div>

        {/* Section 1: Personal Info */}
        <InfoSection title="Personal Information" icon="👤" items={[
          ["Student ID",    s.admission_no || s.id],
          ["Full Name",     s.name],
          ["Date of Birth", fmtDate(s.dob)],
          ["Gender",        s.gender],
          ["Blood Group",   s.bloodGroup],
          ["Admission Date",s.admission_date ? fmtDate(s.admission_date) : "—"],
        ]}/>

        {/* Section 2: Class Info */}
        <InfoSection title="Class Information" icon="🏫" items={[
          ["Class",    s.class],
          ["Section",  s.section],
          ["Roll No",  s.rollNo || s.admission_no],
          ["Status",   s.status],
        ]}/>

        {/* Section 3: Address */}
        <InfoSection title="Address & Identity" icon="🏠" items={[
          ["Street / Address", s.address],
          ["City",             s.city],
          ["State",            s.state],
          ["Pincode",          s.pincode],
          ["Aadhar No",        s.aadharNo],
          ["Previous School",  s.previousSchool],
        ]}/>

        {/* Section 4: Guardian */}
        <InfoSection title="Guardian / Parent" icon="👨‍👩‍👧" items={[
          ["Name",     s.guardian],
          ["Relation", s.guardianRelation],
          ["Phone",    s.phone],
          ["Email",    s.guardianEmail],
        ]}/>

        {/* Section 5: Documents */}
        {!isLoading && (
          <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 6px rgba(0,0,0,0.06)", overflow:"hidden", marginBottom:14 }}>
            <div style={{ background:"#F8FAFC", padding:"10px 18px", borderBottom:"1px solid #F1F5F9",
              fontSize:11, fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:0.8 }}>
              📎 Documents {s.docs?.length > 0 && `(${s.docs.length})`}
            </div>
            <div style={{ padding:18 }}>
              {s.docs && s.docs.length > 0 ? (
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {s.docs.map((doc, i) => (
                    <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                      style={{ display:"flex", alignItems:"center", gap:7,
                        background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8,
                        padding:"8px 14px", textDecoration:"none" }}>
                      <span style={{ fontSize:18 }}>{doc.name?.match(/\.(jpg|jpeg|png)$/i) ? "🖼️" : "📄"}</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#374151" }}>{doc.name}</div>
                        {doc.size > 0 && <div style={{ fontSize:10, color:"#94A3B8" }}>
                          {doc.size > 1048576 ? `${(doc.size/1048576).toFixed(1)} MB` : `${Math.round(doc.size/1024)} KB`}
                        </div>}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ color:"#94A3B8", fontSize:13, fontWeight:500 }}>No documents uploaded.</div>
              )}
            </div>
          </div>
        )}

        {/* Section 6: Parent Login Credentials */}
        {!isLoading && s.login && (
          <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 6px rgba(0,0,0,0.06)", overflow:"hidden", marginBottom:14 }}>
            <div style={{ background:"#F8FAFC", padding:"10px 18px", borderBottom:"1px solid #F1F5F9",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:0.8 }}>
                🔑 Parent Login
                {s.login.has_login
                  ? <span style={{ marginLeft:8, color:"#10B981", fontWeight:700 }}>● Active</span>
                  : <span style={{ marginLeft:8, color:"#EF4444", fontWeight:700 }}>● No Account</span>}
              </span>
              {s.login.has_login && (
                <button onClick={async()=>{
                  try {
                    const res = await apiFetch(`/students/${s.id}/reset-parent-password`, { method:'POST' });
                    showToast(`Parent password reset to: ${res.data?.temp_password}`);
                  } catch(e) { showToast(e.message,'error'); }
                }} style={{ background:"#FFF7ED", color:"#D97706", border:"1px solid #FDE68A", borderRadius:7, padding:"5px 12px", fontSize:11, cursor:"pointer", fontWeight:700 }}>
                  🔑 Reset Password
                </button>
              )}
            </div>
            <div style={{ padding:18, display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14 }}>
              {[
                ["📱 Mobile Number (Username)", s.login.username],
                ["🔑 Initial Password (Child's DOB)", s.login.temp_password],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize:9, color:"#94A3B8", fontWeight:800, textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A202C", fontFamily:"monospace",
                    background:"#F8FAFC", borderRadius:6, padding:"6px 10px", border:"1px solid #E2E8F0",
                    userSelect:"all" }}>{v ?? '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:"0 18px 14px", fontSize:11, color:"#94A3B8" }}>
              {s.login.note || "Parent logs in with their mobile number. Initial password is child's DOB (ddmmyyyy)."}
            </div>
          </div>
        )}

        <Toast toast={toast} />
        {showIdCard && <IDCardModal student={s} onClose={() => setIdCard(false)} />}
      </div>
    );
  }

  // ── Add / Edit form ────────────────────────────────────────────
  if (view === "add") return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>
      {/* Step indicator */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", flexWrap:isMobile?"wrap":"nowrap", gap:isMobile?6:0 }}>
          {["Personal Info","Address & Docs","Guardian"].map((label, i) => {
            const s = i+1;
            return (
              <div key={s} style={{ display:"flex", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:isMobile?"6px 10px":"8px 14px", borderRadius:10,
                  background: step===s ? "#EEF2FF" : step>s ? "#ECFDF5" : "transparent" }}>
                  <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0,
                    background: step>s ? "#10B981" : step===s ? "#6366F1" : "#E2E8F0",
                    color: step>=s ? "#fff" : "#94A3B8",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900 }}>
                    {step>s ? "✓" : s}
                  </div>
                  {!isMobile && <span style={{ fontSize:12, fontWeight:700,
                    color: step===s ? "#6366F1" : step>s ? "#10B981" : "#94A3B8" }}>{label}</span>}
                </div>
                {s<3 && <div style={{ width:isMobile?12:24, height:2, borderRadius:2,
                  background: step>s ? "#10B981" : "#E2E8F0" }}/>}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:12, fontWeight:700, padding:"6px 16px", borderRadius:20,
          color:editId?"#F59E0B":"#6366F1", background:editId?"#FFFBEB":"#EEF2FF",
          border:`1px solid ${editId?"#FCD34D":"#C7D2FE"}` }}>
          {editId ? "✏️ Editing Student" : "➕ New Enrollment"}
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 8px rgba(0,0,0,0.08)", padding:isMobile?14:28 }}>
        <div style={{ marginBottom:22, paddingBottom:16, borderBottom:"1px solid #F1F5F9" }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#0F172A" }}>
            {["Personal Information","Address & Documents","Guardian Details"][step-1]}
          </div>
          <div style={{ fontSize:12, color:"#94A3B8", marginTop:3 }}>
            {[
              "Basic student details and photo",
              "Residential info and document uploads",
              "Parent / guardian contact details",
            ][step-1]}
          </div>
        </div>

        {/* ── Step 1: Personal + photo ─────────────────────── */}
        {step===1 && (
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16 }}>
            {/* Photo + name row */}
            <div style={{ gridColumn:"1/-1", display:"grid", gridTemplateColumns:isMobile?"1fr":"auto 1fr",
              gap:isMobile?16:24, alignItems:"start", background:"#F8FAFC", borderRadius:12,
              padding:isMobile?"14px":"18px 20px", border:"1px solid #F1F5F9" }}>
              <PhotoUpload value={form.photo} onChange={handleChange} />
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14 }}>
                <FormField label="First Name" field="firstName" required
                  value={form.firstName} onChange={handleChange} error={formErrors.firstName} />
                <FormField label="Last Name" field="lastName"
                  value={form.lastName} onChange={handleChange} />
                <FormField label="Date of Birth" field="dob" type="date"
                  value={form.dob} onChange={handleChange} error={formErrors.dob} />
                <FormField label="Gender" field="gender" opts={GENDERS}
                  value={form.gender} onChange={handleChange} error={formErrors.gender} />
              </div>
            </div>
            <FormField label="Blood Group" field="bloodGroup" opts={BLOOD_GROUPS}
              value={form.bloodGroup} onChange={handleChange} />
            <FormField label="Class" field="class" required
              opts={classes.filter(c=>c.active).map(c=>c.name)}
              value={form.class} onChange={(_field, value) => {
                handleChange('class', value);
                handleChange('section', '');
                const cls = classes.find(c => c.name === value);
                if (cls) fetchSections(cls.id);
              }} error={formErrors.class} />
            <FormField label="Section" field="section" required
              opts={formSections.length ? formSections : ["A","B","C","D"]}
              value={form.section} onChange={handleChange} error={formErrors.section} />
            <FormField label="Roll Number / Admission No" field="admission_no" required
              value={form.admission_no} onChange={handleChange} error={formErrors.admission_no} />
          </div>
        )}

        {/* ── Step 2: Address + document uploads ───────────── */}
        {step===2 && (
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <FormField label="Address" field="address"
                value={form.address} onChange={handleChange} />
            </div>
            <FormField label="City"    field="city"    value={form.city}    onChange={handleChange} />
            <FormField label="State"   field="state"   value={form.state}   onChange={handleChange} />
            <FormField label="Pincode" field="pincode" value={form.pincode} onChange={handleChange} />
            <FormField label="Aadhar No" field="aadharNo" value={form.aadharNo} onChange={handleChange} />
            <div style={{ gridColumn:"1/-1" }}>
              <FormField label="Previous School" field="previousSchool"
                value={form.previousSchool} onChange={handleChange} />
            </div>
            {/* #2b multi-doc upload */}
            <div style={{ gridColumn:"1/-1" }}>
              <DocsUpload value={form.docs} onChange={handleChange} />
            </div>
          </div>
        )}

        {/* ── Step 3: Guardian + status ─────────────────────── */}
        {step===3 && (
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:16 }}>
            <FormField label="Guardian Name"  field="guardianName" required
              value={form.guardianName} onChange={handleChange} error={formErrors.guardianName} />
            <FormField label="Relation"       field="guardianRelation"
              value={form.guardianRelation} onChange={handleChange} />
            <FormField label="Phone"          field="guardianPhone" required
              value={form.guardianPhone} onChange={handleChange} error={formErrors.guardianPhone} />
            <FormField label="Email"          field="guardianEmail"
              value={form.guardianEmail} onChange={handleChange} />

            {/* #1 Status in edit form */}
            {editId && (
              <div style={{ gridColumn:"1/-1", display:"flex", alignItems:"center", gap:16,
                background:"#F8FAFC", borderRadius:10, padding:"16px 18px", border:"1px solid #F1F5F9" }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:"#64748B",
                    textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>
                    Student Status
                  </div>
                  <StatusToggle
                    status={form.status || "Active"}
                    onToggle={newSt => handleChange('status', newSt)}
                  />
                </div>
                <div style={{ fontSize:12, color:"#94A3B8", lineHeight:1.5 }}>
                  Toggle to mark student as Active or Inactive.<br/>
                  Inactive students won't appear in attendance.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:26,
          paddingTop:20, borderTop:"1px solid #F1F5F9", gap:10 }}>
          <button onClick={() => step>1 ? setStep(s=>s-1) : setView("list")}
            style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:9,
              padding:"10px 22px", fontSize:13, fontWeight:600, cursor:"pointer", color:"#475569", flex:isMobile?1:"unset" }}>
            {step>1 ? "← Back" : "Cancel"}
          </button>
          {step<3
            ? <button onClick={() => {
                const errs = validateStep(step);
                if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
                setFormErrors({});
                setStep(s=>s+1);
              }}
                style={{ background:"#6366F1", color:"#fff", border:"none", borderRadius:9,
                  padding:"10px 26px", fontSize:13, fontWeight:700, cursor:"pointer",
                  boxShadow:"0 2px 8px rgba(99,102,241,0.3)", flex:isMobile?2:"unset" }}>
                Next →
              </button>
            : <button onClick={save}
                style={{ background:editId?"#F59E0B":"#10B981", color:"#fff", border:"none",
                  borderRadius:9, padding:"10px 26px", fontSize:13, fontWeight:700, cursor:"pointer",
                  boxShadow:`0 2px 8px rgba(${editId?"245,158,11":"16,185,129"},0.3)`, flex:isMobile?2:"unset" }}>
                {editId ? "✓ Save Changes" : "✓ Enroll Student"}
              </button>
          }
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );

  // ── List view ──────────────────────────────────────────────────
  const cols = [
    { key:"name", label:"Student", render:(v,r) => (
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Avatar name={v} photo={r.photo} size={36} />
        <div>
          <div style={{ fontWeight:700, fontSize:13 }}>{v}</div>
          <div style={{ fontSize:10, color:"#94A3B8" }}>{r.admission_no} · {r.city||"—"}</div>
        </div>
      </div>
    )},
    { key:"class",    label:"Class",   render:(v,r) => <span style={{ fontWeight:700 }}>Cls {v}-{r.section}</span> },
    { key:"gender",   label:"Gender",  render:v => <span style={{ color:"#64748B", fontSize:12 }}>{v}</span> },
    { key:"guardian", label:"Guardian",render:v => <span style={{ fontSize:12 }}>{v}</span> },
    { key:"phone",    label:"Phone",   render:v => <span style={{ fontSize:12, color:"#64748B" }}>{v}</span> },
    { key:"docs",     label:"Docs",    sortable:false, render:v =>
        v?.length
          ? <span style={{ background:"#EEF2FF", color:"#6366F1", padding:"3px 9px",
              borderRadius:12, fontSize:11, fontWeight:700 }}>
              {v.length} file{v.length>1?"s":""}
            </span>
          : <span style={{ color:"#CBD5E1", fontSize:11 }}>—</span>
    },
    // #1 Inline status toggle
    { key:"status", label:"Status", render:(v,r) => (
      <button onClick={() => quickToggle(r.id)}
        style={{ background:v==="Active"?"#ECFDF5":"#FEF2F2",
          color:v==="Active"?"#059669":"#DC2626",
          border:`1px solid ${v==="Active"?"#A7F3D0":"#FECACA"}`,
          borderRadius:20, padding:"4px 13px", fontSize:11,
          fontWeight:700, cursor:"pointer", transition:"all 0.15s",
          display:"inline-flex", alignItems:"center", gap:5 }}
        title="Click to toggle">
        {v==="Active" ? "✓ Active" : "✕ Inactive"}
        <span style={{ fontSize:9, opacity:0.55 }}>⇄</span>
      </button>
    )},
    { key:"actions", label:"Actions", sortable:false, render:(_,r) => (
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => openView(r)}
          style={{ background:"#F1F5F9", color:"#475569", border:"none", borderRadius:6,
            padding:"5px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>
          👁 View
        </button>
        <button onClick={() => openEdit(r)}
          style={{ background:"#EEF2FF", color:"#6366F1", border:"none", borderRadius:6,
            padding:"5px 10px", fontSize:11, cursor:"pointer", fontWeight:700 }}>
          ✏️ Edit
        </button>
        {!isStaff && (
          <button onClick={() => deleteStudent(r.id)}
            style={{ background:"#FEF2F2", color:"#EF4444", border:"none", borderRadius:6,
              padding:"5px 10px", fontSize:11, cursor:"pointer", fontWeight:700 }}>
            🗑 Delete
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:isMobile?12:24, background:"#F0F4F8", minHeight:"100vh" }}>

      {/* #3 New widgets ──────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":isTablet?"repeat(2,1fr)":`repeat(${widgets.length},1fr)`, gap:isMobile?10:14, marginBottom:22 }}>
        {widgets.map(w => (
          <div key={w.label}
            style={{ background:"#fff", borderRadius:14, padding:isMobile?"12px 14px":"18px 20px",
              boxShadow:"0 1px 8px rgba(0,0,0,0.07)", display:"flex", alignItems:"center",
              gap:isMobile?10:14, border:`1px solid ${w.c}18`, transition:"transform 0.15s, box-shadow 0.15s",
              cursor:"default" }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,0.07)"; }}>
            <div style={{ width:isMobile?40:52, height:isMobile?40:52, background:w.bg, borderRadius:isMobile?10:14, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:isMobile?20:26 }}>
              {w.icon}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:isMobile?18:24, fontWeight:900, color:w.c, lineHeight:1 }}>{w.value}</div>
              <div style={{ fontSize:isMobile?11:12, fontWeight:700, color:"#374151", marginTop:3, lineHeight:1.3 }}>{w.label}</div>
              {!isMobile && <div style={{ fontSize:10, color:"#94A3B8", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:isTablet?"normal":"nowrap" }}>{w.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10,
          padding:"12px 18px", marginBottom:14, display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:12 }}>
          <span style={{ fontSize:13, color:"#DC2626", fontWeight:600 }}>⚠️ {error}</span>
          <button onClick={refetch}
            style={{ background:"#EF4444", color:"#fff", border:"none", borderRadius:7,
              padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
            Retry
          </button>
        </div>
      )}

      {/* Filters bar */}
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <input placeholder="🔍 Search by name or ID..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ padding:"9px 14px", borderRadius:9, border:"1px solid #E2E8F0",
            fontSize:13, background:"#fff", outline:"none", minWidth:isMobile?0:220, flex:isMobile?1:"unset", width:isMobile?"100%":"auto" }} />
        <select value={fClass} onChange={e=>{ setFClass(e.target.value); setPage(1); }}
          style={{ padding:"9px 12px", borderRadius:9, border:"1px solid #E2E8F0",
            fontSize:13, background:"#fff", cursor:"pointer", outline:"none" }}>
          <option value="">All Classes</option>
          {classes.filter(c=>c.active).map(c=><option key={c.id} value={c.name}>Class {c.name}</option>)}
        </select>
        <select value={fStatus} onChange={e=>{ setFStatus(e.target.value); setPage(1); }}
          style={{ padding:"9px 12px", borderRadius:9, border:"1px solid #E2E8F0",
            fontSize:13, background:"#fff", cursor:"pointer", outline:"none" }}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <div style={{ marginLeft:isMobile?0:"auto", display:"flex", gap:8, alignItems:"center", width:isMobile?"100%":"auto", justifyContent:isMobile?"space-between":"flex-start" }}>
          <div style={{ background:"#ECFDF5", color:"#059669", padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:800 }}>
            {students.filter(s=>s.status==="Active").length} Active
          </div>
          <div style={{ background:"#F1F5F9", color:"#64748B", padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700 }}>
            {totalCount} Total
          </div>
          {isBlocked ? (
            <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:13,color:'#B91C1C',fontWeight:600}}>
                🔒 Subscription expired — contact Vikashana support
              </span>
            </div>
          ) : (
            <button onClick={openAdd}
              style={{ background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff", border:"none",
                borderRadius:9, padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer",
                boxShadow:"0 2px 10px rgba(99,102,241,0.35)", flex:isMobile?1:"unset" }}>
              + Enroll Student
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={cols}
        data={students}
        loading={loading}
        exPage={page}
        exLastPage={lastPage}
        exTotal={totalCount}
        onPageChange={p => setPage(p)}
      />
      <Toast toast={toast} />

      {newCreds && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:420, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
            <div style={{ fontSize:17, fontWeight:900, color:'#0F172A', marginBottom:6 }}>Student Enrolled!</div>
            <div style={{ fontSize:13, color:'#64748B', marginBottom:20 }}>Share these login credentials with the parent</div>
            <div style={{ background:'#F8FAFC', borderRadius:12, padding:'16px 18px', marginBottom:20, textAlign:'left' }}>
              {[
                ['📱 Mobile Number (Username)', newCreds.username],
                ['🔑 Password', newCreds.temp_password],
              ].map(([label, value]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #F1F5F9' }}>
                  <span style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:14, fontWeight:900, color:'#0F172A', letterSpacing:1 }}>{value || '—'}</span>
                </div>
              ))}
              <div style={{ paddingTop:10, fontSize:11, color:'#94A3B8', fontStyle:'italic' }}>{newCreds.note}</div>
            </div>
            <button onClick={() => setNewCreds(null)} style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:'#6366F1', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer' }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
