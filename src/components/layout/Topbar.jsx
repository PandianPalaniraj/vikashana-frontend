import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const fetchNotifs = () => {
  const token = localStorage.getItem('token')
  return fetch(`${BASE}/notifications`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  }).then(r => r.json())
}

const PAGE_TITLES = {
  '/dashboard':      { title: 'Dashboard',            sub: 'School overview & quick stats',           icon: '🏠'  },
  '/students':       { title: 'Student Management',   sub: 'Manage student enrollment & profiles',    icon: '👨‍🎓' },
  '/attendance':     { title: 'Attendance',           sub: 'Mark & track daily attendance',           icon: '📅'  },
  '/exams':          { title: 'Exams',                sub: 'Timetables, admit cards & schedules',     icon: '📝'  },
  '/marks':          { title: 'Marks & Report Cards', sub: 'Enter exam marks & generate report cards',icon: '📊'  },
  '/fees':           { title: 'Fee Management',       sub: 'Invoices · Payments · Receipts',          icon: '💰'  },
  '/teachers':       { title: 'Teacher Management',   sub: 'Manage teaching staff',                   icon: '👨‍🏫' },
  '/classes':        { title: 'Class Management',     sub: 'Configure classes and sections',           icon: '🏫'  },
  '/homework':       { title: 'Homework',             sub: 'Assign and track homework',               icon: '📚'  },
  '/communications': { title: 'Communications',       sub: 'Announcements, broadcasts & templates',   icon: '📢'  },
  '/admissions':     { title: 'Admission Enquiries',  sub: 'Track and convert admission leads',       icon: '🎓'  },
  '/settings':       { title: 'System Settings',      sub: 'School info, roles, configuration',       icon: '⚙️'  },
  '/profile':        { title: 'My Profile',           sub: 'Manage your account and preferences',     icon: '👤'  },
}

// Persist read IDs in sessionStorage (resets on tab close — intentional for web)
const NOTIF_READ_KEY = 'topbar_read_notif_ids'
const getReadIds = () => { try { return new Set(JSON.parse(sessionStorage.getItem(NOTIF_READ_KEY) || '[]')) } catch { return new Set() } }
const saveReadIds = (ids) => { try { sessionStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...ids])) } catch {} }

const TYPE_META = {
  alert:   { c:'#EF4444', bg:'#FEF2F2' },
  warning: { c:'#F59E0B', bg:'#FFFBEB' },
  info:    { c:'#3B82F6', bg:'#EFF6FF' },
  success: { c:'#10B981', bg:'#ECFDF5' },
}

const ANIM = `@keyframes fadeSlideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`

function NotifPanel({ notifs, setNotifs, readIdsRef, onClose, navigate }) {
  const unread = notifs.filter(n => !n.read).length

  const markAllRead = () => {
    const ids = new Set(notifs.map(n => n.id))
    readIdsRef.current = new Set([...readIdsRef.current, ...ids])
    saveReadIds(readIdsRef.current)
    setNotifs(p => p.map(n => ({ ...n, read: true })))
  }
  const markRead = id => {
    readIdsRef.current.add(id)
    saveReadIds(readIdsRef.current)
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  }
  const deleteNotif = id  => setNotifs(p => p.filter(n => n.id !== id))
  const handleClick = n   => { markRead(n.id); navigate(n.link); onClose() }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:998 }}/>
      <div style={{ position:'absolute',top:'calc(100% + 8px)',right:0,zIndex:999,background:'#fff',borderRadius:16,width:360,boxShadow:'0 8px 40px rgba(0,0,0,0.14)',border:'1px solid #F1F5F9',overflow:'hidden',animation:'fadeSlideDown 0.15s ease' }}>
        <div style={{ padding:'16px 18px 10px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:800,fontSize:15,color:'#0F172A' }}>🔔 Notifications</div>
            {unread > 0 && <div style={{ fontSize:11,color:'#94A3B8',marginTop:1 }}>{unread} unread</div>}
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background:'#EEF2FF',color:'#6366F1',border:'none',borderRadius:7,padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer' }}>✓ Mark all read</button>
            )}
            <button onClick={onClose} style={{ background:'#F1F5F9',border:'none',borderRadius:7,width:26,height:26,cursor:'pointer',fontSize:14,color:'#64748B',display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
          </div>
        </div>
        <div style={{ maxHeight:400,overflowY:'auto' }}>
          {notifs.length === 0
            ? <div style={{ padding:40,textAlign:'center',color:'#94A3B8',fontSize:13 }}>
                <div style={{ fontSize:36,marginBottom:8 }}>🎉</div>All caught up!
              </div>
            : notifs.map((n, i) => {
                const tm = TYPE_META[n.type] || TYPE_META.info
                return (
                  <div key={n.id}
                    style={{ display:'flex',gap:12,padding:'12px 16px',borderBottom:i<notifs.length-1?'1px solid #F8FAFC':'none',background:n.read?'#fff':'#FAFBFF',cursor:'pointer',transition:'background 0.1s',position:'relative' }}
                    onClick={() => handleClick(n)}
                    onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                    onMouseLeave={e=>e.currentTarget.style.background=n.read?'#fff':'#FAFBFF'}>
                    {!n.read && <div style={{ position:'absolute',left:5,top:'50%',transform:'translateY(-50%)',width:5,height:5,borderRadius:'50%',background:'#6366F1' }}/>}
                    <div style={{ width:38,height:38,borderRadius:10,background:tm.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0,border:`1px solid ${tm.c}22` }}>{n.icon}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:12,fontWeight:n.read?600:800,color:'#0F172A',lineHeight:1.3 }}>{n.title}</div>
                      <div style={{ fontSize:11,color:'#64748B',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{n.body}</div>
                      <div style={{ fontSize:10,color:'#94A3B8',marginTop:3,display:'flex',alignItems:'center',gap:6 }}>
                        <span>{n.time}</span>
                        <span style={{ background:tm.bg,color:tm.c,padding:'1px 6px',borderRadius:5,fontWeight:700,fontSize:9 }}>{n.type}</span>
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();deleteNotif(n.id)}}
                      style={{ background:'none',border:'none',cursor:'pointer',color:'#CBD5E1',fontSize:16,flexShrink:0,padding:'0 2px',lineHeight:1 }}
                      onMouseEnter={e=>e.currentTarget.style.color='#EF4444'}
                      onMouseLeave={e=>e.currentTarget.style.color='#CBD5E1'}>×</button>
                  </div>
                )
              })
          }
        </div>
        {notifs.length > 0 && (
          <div style={{ padding:'10px 16px',borderTop:'1px solid #F1F5F9',textAlign:'center' }}>
            <button onClick={()=>{navigate('/settings');onClose()}} style={{ background:'none',border:'none',color:'#6366F1',fontSize:12,fontWeight:700,cursor:'pointer' }}>
              Notification Settings →
            </button>
          </div>
        )}
      </div>
      <style>{ANIM}</style>
    </>
  )
}

function ProfileDropdown({ user, onClose, onLogout, navigate }) {
  const initials = (user?.name || 'Admin').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const menuItems = [
    { icon:'👤', label:'My Profile',            action: ()=>{navigate('/profile');onClose()} },
    { icon:'🔔', label:'Notification Settings', action: ()=>{navigate('/settings');onClose()} },
    { icon:'⚙️', label:'Account Settings',      action: ()=>{navigate('/settings');onClose()} },
  ]
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:998 }}/>
      <div style={{ position:'absolute',top:54,right:20,zIndex:999,background:'#fff',borderRadius:16,width:280,boxShadow:'0 8px 40px rgba(0,0,0,0.14)',border:'1px solid #F1F5F9',overflow:'hidden',animation:'fadeSlideDown 0.15s ease' }}>
        <div style={{ background:'linear-gradient(135deg,#0F172A,#1E3A5F,#6366F1)',padding:'18px 20px 14px',position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute',top:10,right:12,background:'rgba(255,255,255,0.1)',border:'none',borderRadius:'50%',width:26,height:26,cursor:'pointer',color:'#fff',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#10B981)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:'#fff',border:'3px solid rgba(255,255,255,0.2)',flexShrink:0 }}>{initials}</div>
            <div>
              <div style={{ fontWeight:800,fontSize:14,color:'#fff' }}>{user?.name||'Admin User'}</div>
              <div style={{ fontSize:10,color:'rgba(255,255,255,0.55)',marginTop:1 }}>{user?.email||'admin@vidyaniketan.edu.in'}</div>
              <span style={{ background:'rgba(99,102,241,0.4)',color:'#C7D2FE',padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700,marginTop:4,display:'inline-block' }}>{user?.role||'Super Admin'}</span>
            </div>
          </div>
        </div>
        <div style={{ background:'#F8FAFC',padding:'9px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:8 }}>
          <span style={{ fontSize:15 }}>🏫</span>
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:'#374151' }}>Vidya Niketan School</div>
            <div style={{ fontSize:9,color:'#94A3B8' }}>Academic Year 2025-26</div>
          </div>
        </div>
        <div style={{ padding:'6px 0' }}>
          {menuItems.map((item,i)=>(
            <button key={i} onClick={item.action}
              style={{ width:'100%',display:'flex',alignItems:'center',gap:11,padding:'10px 18px',background:'none',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151',textAlign:'left' }}
              onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <span style={{ fontSize:15,width:20,textAlign:'center' }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
        <div style={{ height:1,background:'#F1F5F9',margin:'0 14px' }}/>
        <div style={{ padding:'6px 0 8px' }}>
          <button onClick={onLogout}
            style={{ width:'100%',display:'flex',alignItems:'center',gap:11,padding:'10px 18px',background:'none',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,color:'#EF4444',textAlign:'left' }}
            onMouseEnter={e=>e.currentTarget.style.background='#FEF2F2'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <span style={{ fontSize:15,width:20,textAlign:'center' }}>🚪</span>Sign Out
          </button>
        </div>
      </div>
      <style>{ANIM}</style>
    </>
  )
}

export default function Topbar() {
  const location            = useLocation()
  const navigate            = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [openPanel, setPanel] = useState(null)
  const [notifs, setNotifs]   = useState([])
  const readIdsRef = useRef(getReadIds())

  const loadNotifs = useCallback(async () => {
    try {
      const res = await fetchNotifs()
      if (res.success && Array.isArray(res.data)) {
        // Map backend shape to panel shape; keep existing read state
        const readIds = readIdsRef.current
        setNotifs(res.data.map(n => ({
          id:   String(n.id),
          icon: n.icon  ?? '🔔',
          title:n.title ?? 'Notification',
          body: n.body  ?? '',
          time: n.time  ?? '',
          type: n.type  === 'fee' ? 'warning'
              : n.type  === 'attendance' ? 'alert'
              : n.type  === 'exam' || n.type === 'exams' ? 'info'
              : n.type  === 'admission' ? 'info'
              : 'info',
          read: !n.unread || readIds.has(String(n.id)),
          link: n.link  ?? '/notifications',
        })))
      }
    } catch { /* keep existing */ }
  }, [])

  useEffect(() => {
    loadNotifs()
    const interval = setInterval(loadNotifs, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadNotifs])

  const meta     = PAGE_TITLES[location.pathname] || { title:'Vikashana', sub:'School Management System', icon:'🏫' }
  const initials = (user?.name||'Admin').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const unread   = notifs.filter(n => !n.read).length

  const handleLogout = () => { clearAuth(); navigate('/login') }
  useEffect(()=>{ setPanel(null) }, [location.pathname])

  return (
    <header style={{ height:58,background:'#fff',borderBottom:'1px solid #E2E8F0',display:'flex',alignItems:'center',padding:'0 24px',justifyContent:'space-between',flexShrink:0,boxShadow:'0 1px 4px rgba(0,0,0,0.05)',position:'relative',zIndex:100 }}>
      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
        <span style={{ fontSize:20 }}>{meta.icon}</span>
        <div>
          <div style={{ fontWeight:800,fontSize:15,color:'#0F172A',lineHeight:1.2 }}>{meta.title}</div>
          <div style={{ fontSize:11,color:'#94A3B8' }}>{meta.sub}</div>
        </div>
      </div>
      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
        {/* Bell */}
        <div style={{ position:'relative' }}>
          <button onClick={()=>setPanel(p=>p==='notif'?null:'notif')}
            style={{ background:openPanel==='notif'?'#EEF2FF':'#F8FAFC',border:`1px solid ${openPanel==='notif'?'#C7D2FE':'#E2E8F0'}`,borderRadius:10,width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:17,transition:'all 0.15s' }}>
            🔔
          </button>
          {unread > 0 && (
            <div style={{ position:'absolute',top:-4,right:-4,minWidth:18,height:18,background:'#EF4444',borderRadius:99,border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'#fff',padding:'0 3px' }}>
              {unread}
            </div>
          )}
          {openPanel==='notif' && <NotifPanel notifs={notifs} setNotifs={setNotifs} readIdsRef={readIdsRef} onClose={()=>setPanel(null)} navigate={navigate}/>}
        </div>
        {/* Profile */}
        <button onClick={()=>setPanel(p=>p==='profile'?null:'profile')}
          style={{ display:'flex',alignItems:'center',gap:9,background:openPanel==='profile'?'#EEF2FF':'#F8FAFC',border:`1px solid ${openPanel==='profile'?'#C7D2FE':'#E2E8F0'}`,borderRadius:11,padding:'5px 10px 5px 5px',cursor:'pointer',transition:'all 0.15s' }}>
          <div style={{ width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#10B981)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,color:'#fff',flexShrink:0 }}>{initials}</div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:12,fontWeight:700,color:'#0F172A',lineHeight:1.2 }}>{user?.name||'Admin'}</div>
            <div style={{ fontSize:10,color:'#94A3B8' }}>{user?.role||'Super Admin'}</div>
          </div>
          <span style={{ fontSize:9,color:'#94A3B8',marginLeft:2,transform:openPanel==='profile'?'rotate(180deg)':'',transition:'transform 0.2s',display:'inline-block' }}>▼</span>
        </button>
      </div>
      {openPanel==='profile' && <ProfileDropdown user={user} onClose={()=>setPanel(null)} onLogout={handleLogout} navigate={navigate}/>}
    </header>
  )
}