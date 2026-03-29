import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBreakpoint } from '../../hooks/responsive.jsx'
import useAuthStore from '../../store/authStore'
import { me, updateProfile, changePassword as apiChangePassword, getActivity, logout } from '../../api/auth'

const palette = ["#6366F1","#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];

const ROLE_DISPLAY = {
  'super_admin': 'Super Admin',
  'admin':       'Admin Staff',
  'teacher':     'Teacher',
  'staff':       'Staff',
  'parent':      'Parent',
  'student':     'Student',
};

const ROLE_META = {
  'super_admin': { c:'#6366F1', bg:'#EEF2FF', perms:['Full System Access','Manage Users','All Modules','Settings & Config'] },
  'admin':       { c:'#3B82F6', bg:'#EFF6FF', perms:['Students','Attendance','Fees','Communications'] },
  'teacher':     { c:'#10B981', bg:'#ECFDF5', perms:['Attendance','Homework','Marks','View Students'] },
  'staff':       { c:'#F59E0B', bg:'#FFFBEB', perms:['Fees','Reports','View Students'] },
  'parent':      { c:'#8B5CF6', bg:'#F5F3FF', perms:['View Child Progress','Fee Payments'] },
};

function Toast({ toast }) {
  if (!toast) return null;
  const err = toast.type === 'error';
  return (
    <div style={{ position:'fixed',bottom:24,right:24,zIndex:9999,background:err?'#FEF2F2':'#F0FDF4',border:`1px solid ${err?'#FECACA':'#86EFAC'}`,color:err?'#DC2626':'#16A34A',padding:'12px 20px',borderRadius:10,fontSize:13,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',maxWidth:320 }}>
      {err ? '❌' : '✅'} {toast.msg}
    </div>
  );
}

function groupByDate(logs) {
  const groups = {};
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  logs.forEach(log => {
    const d   = new Date(log.created_at);
    const key = d.toDateString() === today     ? 'Today'
              : d.toDateString() === yesterday ? 'Yesterday'
              : d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  });
  return groups;
}

const ACTION_COLORS = {
  login:        '#6366F1',
  logout:       '#64748B',
  create:       '#10B981',
  update:       '#3B82F6',
  delete:       '#EF4444',
  payment:      '#F59E0B',
  attendance:   '#06B6D4',
};

export default function Profile() {
  const bp       = useBreakpoint();
  const isMobile = bp === 'mobile';
  const navigate = useNavigate();
  const { user, token, setAuth, clearAuth } = useAuthStore();
  const [toast, setToast]   = useState(null);
  const location = useLocation();
  const [tab, setTab]        = useState('profile');
  const [saving, setSaving]  = useState(false);
  const [lastLogin, setLastLogin] = useState(null);
  const [loginIp,   setLoginIp]   = useState(null);
  const [school,    setSchool]    = useState(null);

  // Activity state
  const [actLogs,    setActLogs]    = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const [actOffset,  setActOffset]  = useState(0);
  const [actTotal,   setActTotal]   = useState(0);
  const [actLoaded,  setActLoaded]  = useState(false);
  const LIMIT = 20;

  // Support ?tab=security (or any tab) from navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    if (t && ['profile','security','activity'].includes(t)) setTab(t);
  }, [location.search]);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // Profile form
  const [form, setForm] = useState({
    name:   user?.name  || '',
    email:  user?.email || '',
    phone:  user?.phone || '',
    dept:   '',
    bio:    '',
    joined: '',
  });
  const setF = p => setForm(f => ({...f,...p}));

  const [avatarUrl,  setAvatarUrl]  = useState(user?.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileRef = useRef();

  // Load fresh data from API on mount
  useEffect(() => {
    me().then(res => {
      const u = res.data.data;
      setForm(f => ({
        ...f,
        name:   u.name  || f.name,
        email:  u.email || f.email,
        phone:  u.phone || f.phone,
        dept:   u.dept  || '',
        bio:    u.bio   || '',
        joined: u.created_at || '',
      }));
      setAvatarUrl(u.avatar || null);
      setLastLogin(u.last_login || null);
      setSchool(u.school || null);
    }).catch(() => {});
  }, []);

  // Fetch activity on tab open
  useEffect(() => {
    if (tab === 'activity' && !actLoaded) {
      fetchActivity(0, true);
    }
  }, [tab]);

  const fetchActivity = (offset, reset = false) => {
    setActLoading(true);
    getActivity(LIMIT, offset)
      .then(res => {
        const { data, meta } = res.data;
        setActLogs(prev => reset ? data : [...prev, ...data]);
        setActOffset(offset + data.length);
        setActTotal(meta?.total || 0);
        setActLoaded(true);
      })
      .catch(() => {})
      .finally(() => setActLoading(false));
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const displayRole = ROLE_DISPLAY[user?.role] || user?.role || 'Super Admin';
  const initials    = (form.name || 'A').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const avatarBg    = palette[(form.name||'A').charCodeAt(0) % palette.length];
  const rm          = ROLE_META[user?.role] || ROLE_META['admin'];

  // Security form
  const [pwForm, setPwForm] = useState({ current:'', newPw:'', confirm:'' });
  const [showPw, setShowPw]  = useState({ current:false, newPw:false, confirm:false });

  const handleSaveProfile = async () => {
    if (!form.name.trim()) { showToast('Name is required','error'); return; }
    setSaving(true);
    try {
      let payload;
      if (avatarFile) {
        payload = new FormData();
        payload.append('name',  form.name);
        if (form.phone) payload.append('phone', form.phone);
        if (form.dept  !== undefined) payload.append('dept', form.dept);
        if (form.bio   !== undefined) payload.append('bio',  form.bio);
        payload.append('avatar', avatarFile);
      } else {
        payload = { name: form.name, phone: form.phone || null, dept: form.dept, bio: form.bio };
      }
      const res = await updateProfile(payload);
      const updated = res.data.data;
      setAuth({ ...user, name: updated.name, phone: updated.phone, avatar: updated.avatar }, token);
      setForm(f => ({ ...f, dept: updated.dept || f.dept, bio: updated.bio || f.bio }));
      setAvatarFile(null);
      showToast('Profile updated successfully!');
    } catch(e) {
      showToast(e.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current)                { showToast('Enter current password','error'); return; }
    if (pwForm.newPw.length < 8)        { showToast('New password must be 8+ characters','error'); return; }
    if (pwForm.newPw !== pwForm.confirm) { showToast('Passwords do not match','error'); return; }
    setSaving(true);
    try {
      await apiChangePassword({
        current_password:      pwForm.current,
        password:              pwForm.newPw,
        password_confirmation: pwForm.confirm,
      });
      showToast('Password changed successfully!');
      setPwForm({ current:'', newPw:'', confirm:'' });
    } catch(e) {
      showToast(e.response?.data?.errors?.current_password?.[0] || e.response?.data?.message || 'Failed to change password','error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOutAll = async () => {
    try {
      await logout();
    } catch(_) {}
    clearAuth();
    navigate('/login', { replace: true });
  };

  const lastLoginDisplay = lastLogin
    ? new Date(lastLogin).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })
    : '—';

  const memberSince = form.joined
    ? new Date(form.joined).getFullYear()
    : (user?.school?.settings?.joined_year || '—');

  const stats = [
    { icon:'📅', label:'Member Since', value: memberSince },
    { icon:'🏫', label:'School',        value: school?.name?.split(' ').slice(0,2).join(' ') || 'VN School' },
    { icon:'🔐', label:'Last Login',    value: lastLogin ? new Date(lastLogin).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—' },
    { icon:'🔑', label:'Role',          value: displayRole },
  ];

  return (
    <div style={{ fontFamily:"'Segoe UI',sans-serif", padding:24, background:'#F0F4F8', minHeight:'100vh' }}>

      {/* Hero banner */}
      <div style={{ background:'linear-gradient(135deg,#0F172A 0%,#1E3A5F 55%,#6366F1 100%)', borderRadius:20, padding:isMobile?'16px':'28px 32px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',right:-50,top:-50,width:220,height:220,borderRadius:'50%',background:'rgba(255,255,255,0.04)' }}/>
        <div style={{ position:'absolute',right:60,bottom:-70,width:180,height:180,borderRadius:'50%',background:'rgba(99,102,241,0.12)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:24, position:'relative', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          {/* Avatar */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:86,height:86,borderRadius:'50%',background:avatarUrl?'#F8FAFC':`linear-gradient(135deg,${avatarBg},#10B981)`,border:'4px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                : <span style={{ fontSize:30,fontWeight:900,color:'#fff' }}>{initials}</span>
              }
            </div>
            <button onClick={()=>fileRef.current.click()} style={{ position:'absolute',bottom:0,right:0,width:28,height:28,background:'#6366F1',border:'2px solid #fff',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12 }}>✏️</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarUpload}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:24,fontWeight:900,color:'#fff',letterSpacing:-0.5 }}>{form.name || '—'}</div>
            <div style={{ fontSize:13,color:'rgba(255,255,255,0.6)',marginTop:3 }}>{form.email}</div>
            <div style={{ display:'flex',gap:10,marginTop:10,flexWrap:'wrap',alignItems:'center' }}>
              <span style={{ background:rm.bg,color:rm.c,padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:800 }}>{displayRole}</span>
              {form.dept && (<>
                <span style={{ color:'rgba(255,255,255,0.5)',fontSize:12 }}>·</span>
                <span style={{ color:'rgba(255,255,255,0.6)',fontSize:12 }}>{form.dept}</span>
              </>)}
            </div>
          </div>
          {/* Stat pills */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,flexShrink:0 }}>
            {stats.map(s=>(
              <div key={s.label} style={{ background:'rgba(255,255,255,0.08)',borderRadius:11,padding:'10px 14px',textAlign:'center',backdropFilter:'blur(4px)' }}>
                <div style={{ fontSize:14 }}>{s.icon}</div>
                <div style={{ fontSize:12,fontWeight:800,color:'#fff',marginTop:2 }}>{s.value}</div>
                <div style={{ fontSize:9,color:'rgba(255,255,255,0.45)',fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:0,background:'#fff',borderRadius:12,padding:5,boxShadow:'0 1px 8px rgba(0,0,0,0.07)',marginBottom:20,width:'fit-content' }}>
        {[['profile','👤 My Profile'],['security','🔐 Security'],['activity','📋 Activity Log']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'9px 22px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,transition:'all 0.18s',background:tab===t?'linear-gradient(135deg,#6366F1,#4F46E5)':'transparent',color:tab===t?'#fff':'#64748B',boxShadow:tab===t?'0 2px 8px rgba(99,102,241,0.3)':'none' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {tab==='profile' && (
        <div style={{ display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 300px',gap:16 }}>
          {/* Left — editable fields */}
          <div style={{ display:'grid',gap:14 }}>
            <div style={{ background:'#fff',borderRadius:16,padding:isMobile?12:24,boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ fontWeight:800,fontSize:15,color:'#0F172A',marginBottom:18,paddingBottom:12,borderBottom:'1px solid #F1F5F9' }}>Personal Information</div>
              <div style={{ display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:14 }}>
                {[
                  ['Full Name','name','text','Dr. Anand Kulkarni'],
                  ['Email Address','email','email','email@school.in'],
                  ['Phone Number','phone','tel','10-digit mobile'],
                  ['Department','dept','text','e.g. Administration'],
                ].map(([lbl,key,type,ph])=>(
                  <div key={key}>
                    <label style={{ fontSize:10,fontWeight:800,color:'#64748B',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:0.8 }}>{lbl}</label>
                    <input type={type} value={form[key]} onChange={e=>setF({[key]:e.target.value})}
                      placeholder={ph} readOnly={key==='email'}
                      style={{ width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid #E2E8F0',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',background:key==='email'?'#F8FAFC':'#fff',color:key==='email'?'#94A3B8':'inherit' }}
                      onFocus={e=>{ if(key!=='email') e.target.style.borderColor='#6366F1'; }}
                      onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                  </div>
                ))}
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ fontSize:10,fontWeight:800,color:'#64748B',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:0.8 }}>Bio</label>
                  <textarea value={form.bio} onChange={e=>setF({bio:e.target.value})} rows={3} placeholder="A short bio about yourself…"
                    style={{ width:'100%',padding:'10px 12px',borderRadius:9,border:'1.5px solid #E2E8F0',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',resize:'vertical',lineHeight:1.6 }}
                    onFocus={e=>e.target.style.borderColor='#6366F1'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                </div>
              </div>
              <div style={{ display:'flex',justifyContent:'flex-end',marginTop:16 }}>
                <button onClick={handleSaveProfile} disabled={saving} style={{ background: saving ? '#A5B4FC' : 'linear-gradient(135deg,#6366F1,#4F46E5)',color:'#fff',border:'none',borderRadius:10,padding:'11px 28px',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',boxShadow:'0 2px 10px rgba(99,102,241,0.35)' }}>
                  {saving ? 'Saving…' : '✓ Save Profile'}
                </button>
              </div>
            </div>

            {/* Avatar section */}
            <div style={{ background:'#fff',borderRadius:16,padding:22,boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ fontWeight:800,fontSize:14,color:'#0F172A',marginBottom:14 }}>Profile Photo</div>
              <div style={{ display:'flex',alignItems:'center',gap:18 }}>
                <div style={{ width:72,height:72,borderRadius:'50%',background:avatarUrl?'#F8FAFC':`linear-gradient(135deg,${avatarBg},#10B981)`,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',border:'3px solid #E2E8F0',flexShrink:0 }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                    : <span style={{ fontSize:24,fontWeight:900,color:'#fff' }}>{initials}</span>
                  }
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ display:'block',background:'#EEF2FF',color:'#6366F1',border:'1.5px dashed #C7D2FE',borderRadius:9,padding:'9px 14px',fontSize:12,fontWeight:700,cursor:'pointer',textAlign:'center',marginBottom:8 }}>
                    📁 Upload Photo (PNG / JPG)
                    <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarUpload}/>
                  </label>
                  {avatarUrl && (
                    <button onClick={()=>{ setAvatarUrl(null); setAvatarFile(null); }} style={{ width:'100%',background:'#FEF2F2',color:'#EF4444',border:'1px solid #FECACA',borderRadius:8,padding:'6px',fontSize:11,fontWeight:700,cursor:'pointer' }}>
                      🗑 Remove Photo
                    </button>
                  )}
                  {!avatarUrl && <div style={{ fontSize:10,color:'#94A3B8',textAlign:'center' }}>Recommended: 200×200px, max 2MB</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Right — role + school */}
          <div style={{ display:'grid',gap:14,alignContent:'start' }}>
            <div style={{ background:'#fff',borderRadius:16,padding:22,boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ fontWeight:800,fontSize:14,color:'#0F172A',marginBottom:14 }}>🔐 Role & Permissions</div>
              <div style={{ background:rm.bg,borderRadius:11,padding:'12px 14px',border:`1px solid ${rm.c}22`,marginBottom:14 }}>
                <div style={{ fontSize:11,color:'#94A3B8',marginBottom:4 }}>Current Role</div>
                <div style={{ fontWeight:900,fontSize:16,color:rm.c }}>{displayRole}</div>
              </div>
              <div style={{ fontSize:11,fontWeight:800,color:'#64748B',marginBottom:10,textTransform:'uppercase',letterSpacing:0.8 }}>Permissions</div>
              <div style={{ display:'grid',gap:7 }}>
                {rm.perms.map(p=>(
                  <div key={p} style={{ display:'flex',alignItems:'center',gap:9,padding:'8px 11px',background:'#F8FAFC',borderRadius:8,border:'1px solid #F1F5F9' }}>
                    <span style={{ color:'#10B981',fontSize:12,fontWeight:800 }}>✓</span>
                    <span style={{ fontSize:12,fontWeight:600,color:'#374151' }}>{p}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14,padding:'10px 12px',background:'#FFFBEB',borderRadius:9,border:'1px solid #FCD34D',fontSize:11,color:'#92400E',fontWeight:600 }}>
                ⚠️ Role can only be changed by a Super Admin.
              </div>
            </div>

            {/* School card */}
            <div style={{ background:'linear-gradient(135deg,#0F172A,#1E293B)',borderRadius:16,padding:20,boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ fontWeight:800,fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:12,textTransform:'uppercase',letterSpacing:0.8 }}>School</div>
              <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
                {school?.logo
                  ? <img src={school.logo} alt="logo" style={{ width:42,height:42,borderRadius:11,objectFit:'cover' }}/>
                  : <div style={{ width:42,height:42,borderRadius:11,background:'linear-gradient(135deg,#6366F1,#10B981)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🏫</div>
                }
                <div>
                  <div style={{ fontWeight:800,fontSize:14,color:'#fff' }}>{school?.name || 'Your School'}</div>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,0.45)' }}>{school?.address || 'India'}</div>
                </div>
              </div>
              {[
                ['Phone', school?.phone || '—'],
                ['Academic Year', school?.settings?.current_year || '2025-26'],
                ['Last Login', lastLoginDisplay],
              ].map(([k,v])=>(
                <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>{k}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Security Tab ── */}
      {tab==='security' && (
        <div style={{ display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:14 }}>
          {/* Change password */}
          <div style={{ background:'#fff',borderRadius:16,padding:isMobile?12:24,boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
            <div style={{ fontWeight:800,fontSize:15,color:'#0F172A',marginBottom:18,paddingBottom:12,borderBottom:'1px solid #F1F5F9' }}>🔑 Change Password</div>
            {['teacher','parent','staff'].includes(user?.role) && (
              <div style={{ background:'#EFF6FF',borderRadius:9,padding:'10px 14px',fontSize:11,color:'#1D4ED8',marginBottom:16,lineHeight:1.6 }}>
                📱 Your login username is your registered mobile number: <strong>{user?.phone || '—'}</strong><br/>
                Your initial password was your date of birth in <strong>ddmmyyyy</strong> format.
              </div>
            )}
            <div style={{ display:'grid',gap:14 }}>
              {[['Current Password','current'],['New Password','newPw'],['Confirm New Password','confirm']].map(([lbl,key])=>(
                <div key={key}>
                  <label style={{ fontSize:10,fontWeight:800,color:'#64748B',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:0.8 }}>{lbl}</label>
                  <div style={{ position:'relative' }}>
                    <input type={showPw[key]?'text':'password'} value={pwForm[key]} onChange={e=>setPwForm(f=>({...f,[key]:e.target.value}))} placeholder="••••••••"
                      style={{ width:'100%',padding:'10px 40px 10px 12px',borderRadius:9,border:'1.5px solid #E2E8F0',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit' }}
                      onFocus={e=>e.target.style.borderColor='#6366F1'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                    <button onClick={()=>setShowPw(p=>({...p,[key]:!p[key]}))} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:15,color:'#94A3B8' }}>
                      {showPw[key]?'🙈':'👁'}
                    </button>
                  </div>
                  {key==='newPw' && pwForm.newPw && (
                    <div style={{ marginTop:6,display:'flex',gap:4,alignItems:'center' }}>
                      {[1,2,3,4].map(i=>{
                        const strength = pwForm.newPw.length >= i*2 ? (i<=2?'#F59E0B':'#10B981') : '#E2E8F0';
                        return <div key={i} style={{ flex:1,height:3,borderRadius:99,background:strength,transition:'background 0.2s' }}/>;
                      })}
                      <span style={{ fontSize:9,color:'#94A3B8',marginLeft:4,whiteSpace:'nowrap' }}>
                        {pwForm.newPw.length<4?'Weak':pwForm.newPw.length<8?'Fair':'Strong'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop:8,padding:'10px 12px',background:'#EEF2FF',borderRadius:9,fontSize:11,color:'#6366F1',fontWeight:600,marginBottom:16 }}>
              💡 Password must be at least 8 characters long
            </div>
            <button onClick={handleChangePassword} disabled={saving} style={{ width:'100%',background: saving ? '#A5B4FC' : 'linear-gradient(135deg,#6366F1,#4F46E5)',color:'#fff',border:'none',borderRadius:10,padding:'12px',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',boxShadow:'0 2px 10px rgba(99,102,241,0.3)' }}>
              {saving ? 'Saving…' : '🔑 Change Password'}
            </button>
          </div>

          {/* Security info */}
          <div style={{ display:'grid',gap:14,alignContent:'start' }}>
            <div style={{ background:'#fff',borderRadius:16,padding:22,boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ fontWeight:800,fontSize:14,color:'#0F172A',marginBottom:14 }}>🛡️ Account Security</div>
              {[
                ['Last Login',      lastLoginDisplay,              '✅','#10B981','#ECFDF5'],
                ['Login IP',        loginIp || 'Not recorded',    '🌐','#3B82F6','#EFF6FF'],
                ['2FA Status',      'Not Enabled',                 '⚠️','#F59E0B','#FFFBEB'],
                ['Active Sessions', '1 Device',                    '📱','#6366F1','#EEF2FF'],
              ].map(([k,v,ico,c,bg])=>(
                <div key={k} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:bg,borderRadius:9,border:`1px solid ${c}22`,marginBottom:8 }}>
                  <span style={{ fontSize:16,flexShrink:0 }}>{ico}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11,color:'#94A3B8',fontWeight:600 }}>{k}</div>
                    <div style={{ fontSize:13,fontWeight:700,color:c }}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:'#FEF2F2',borderRadius:16,padding:20,border:'1px solid #FECACA' }}>
              <div style={{ fontWeight:800,fontSize:13,color:'#DC2626',marginBottom:10 }}>⚠️ Danger Zone</div>
              <div style={{ fontSize:12,color:'#EF4444',marginBottom:12,lineHeight:1.5 }}>This will sign you out and invalidate your current session token.</div>
              <button style={{ width:'100%',background:'#EF4444',color:'#fff',border:'none',borderRadius:9,padding:'10px',fontSize:12,fontWeight:700,cursor:'pointer' }}
                onClick={handleSignOutAll}>
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Activity Log Tab ── */}
      {tab==='activity' && (
        <div style={{ background:'#fff',borderRadius:16,padding:isMobile?12:24,boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight:800,fontSize:15,color:'#0F172A',marginBottom:18,paddingBottom:12,borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            📋 Activity Log
            <span style={{ fontSize:11,fontWeight:600,color:'#94A3B8' }}>{actTotal} total actions</span>
          </div>

          {actLoading && actLogs.length === 0 && (
            <div style={{ display:'grid',gap:12 }}>
              {[1,2,3,4,5].map(i=>(
                <div key={i} style={{ display:'flex',gap:14,padding:'14px 0',borderBottom:'1px solid #F8FAFC',alignItems:'flex-start' }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:'#F1F5F9',flexShrink:0,animation:'pulse 1.5s infinite' }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ height:13,background:'#F1F5F9',borderRadius:6,marginBottom:6,width:'60%' }}/>
                    <div style={{ height:10,background:'#F8FAFC',borderRadius:6,width:'35%' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!actLoading && actLoaded && actLogs.length === 0 && (
            <div style={{ textAlign:'center',padding:'48px 0',color:'#94A3B8' }}>
              <div style={{ fontSize:40,marginBottom:10 }}>📋</div>
              <div style={{ fontSize:14,fontWeight:600 }}>No activity recorded yet</div>
              <div style={{ fontSize:12,marginTop:4 }}>Actions you perform will appear here</div>
            </div>
          )}

          {actLogs.length > 0 && (() => {
            const grouped = groupByDate(actLogs);
            return (
              <div>
                {Object.entries(grouped).map(([dateLabel, entries]) => (
                  <div key={dateLabel}>
                    <div style={{ fontSize:10,fontWeight:800,color:'#94A3B8',textTransform:'uppercase',letterSpacing:1,padding:'8px 0 6px',marginTop:4 }}>{dateLabel}</div>
                    {entries.map((a, i) => {
                      const dotColor = ACTION_COLORS[a.action] || '#6366F1';
                      return (
                        <div key={a.id || i} style={{ display:'flex',gap:14,padding:'12px 0',borderBottom:'1px solid #F8FAFC',alignItems:'flex-start' }}>
                          <div style={{ width:36,height:36,borderRadius:9,background:dotColor+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>
                            {a.icon || '📝'}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13,fontWeight:700,color:'#0F172A' }}>{a.description}</div>
                            <div style={{ display:'flex',gap:8,alignItems:'center',marginTop:3 }}>
                              <span style={{ fontSize:10,color:'#94A3B8' }}>
                                {new Date(a.created_at).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',hour12:true})}
                              </span>
                              {a.module && (
                                <span style={{ fontSize:9,fontWeight:700,color:dotColor,background:dotColor+'18',padding:'1px 7px',borderRadius:99,textTransform:'uppercase',letterSpacing:0.5 }}>
                                  {a.module}
                                </span>
                              )}
                              {a.ip_address && (
                                <span style={{ fontSize:10,color:'#CBD5E1' }}>· {a.ip_address}</span>
                              )}
                            </div>
                          </div>
                          <div style={{ width:7,height:7,borderRadius:'50%',background:dotColor,marginTop:8,flexShrink:0 }}/>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {actLogs.length < actTotal && (
                  <div style={{ textAlign:'center',marginTop:20 }}>
                    <button
                      onClick={() => fetchActivity(actOffset)}
                      disabled={actLoading}
                      style={{ background:'#EEF2FF',color:'#6366F1',border:'none',borderRadius:9,padding:'10px 28px',fontSize:13,fontWeight:700,cursor:actLoading?'not-allowed':'pointer' }}>
                      {actLoading ? 'Loading…' : `Load More (${actTotal - actLogs.length} remaining)`}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <Toast toast={toast}/>
    </div>
  );
}
