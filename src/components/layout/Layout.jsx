import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useAppStore from '../../store/appStore'
import useSubscriptionStore from '../../store/subscriptionStore'
import { logout } from '../../api/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// ── Breakpoint hook ───────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    const w = window.innerWidth
    return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
  })
  useEffect(() => {
    const fn = () => {
      const w = window.innerWidth
      setBp(w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop')
    }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return bp
}

// ── Nav items (with role visibility) ──────────────────────────
const NAV = [
  { to:'/dashboard',      icon:'🏠',   label:'Dashboard',      roles:['admin','super_admin','teacher','staff']                      },
  { to:'/notifications',  icon:'🔔',   label:'Notifications',  roles:['admin','super_admin','teacher','staff']                      },
  { to:'/students',       icon:'👨‍🎓', label:'Students',       roles:['admin','super_admin','teacher','staff']                      },
  { to:'/attendance',     icon:'📅',   label:'Attendance',     roles:['admin','super_admin','teacher']                              },
  { to:'/fees',           icon:'💰',   label:'Fees',           roles:['admin','super_admin']                                        },
  { to:'/teachers',       icon:'👨‍🏫', label:'Teachers',       roles:['admin','super_admin']                                        },
  { to:'/classes',        icon:'🏫',   label:'Classes',        roles:['admin','super_admin','teacher','staff']                      },
  { to:'/homework',       icon:'📚',   label:'Homework',       roles:['admin','super_admin','teacher']                              },
  { to:'/leaves',         icon:'📋',   label:'Leaves',         roles:['admin','super_admin','teacher','staff']                      },
  { to:'/exams',          icon:'📝',   label:'Exams',          roles:['admin','super_admin','teacher']                              },
  { to:'/marks',          icon:'📊',   label:'Marks',          roles:['admin','super_admin','teacher']                              },
  { to:'/admissions',     icon:'🎓',   label:'Admissions',     roles:['admin','super_admin','teacher','staff']                      },
  { to:'/communications', icon:'📢',   label:'Communications', roles:['admin','super_admin','teacher','staff']                      },
  { to:'/settings',       icon:'⚙️',   label:'Settings',       roles:['admin','super_admin']                                        },
]

// Bottom nav — role-specific sets
const BOTTOM_NAV_DEFAULT = [
  { to:'/dashboard',  icon:'🏠',   label:'Home'       },
  { to:'/students',   icon:'👨‍🎓', label:'Students'   },
  { to:'/attendance', icon:'📅',   label:'Attendance' },
  { to:'/fees',       icon:'💰',   label:'Fees'       },
  { to:'/homework',   icon:'📚',   label:'Homework'   },
]
const BOTTOM_NAV_STAFF = [
  { to:'/dashboard',      icon:'🏠',   label:'Home'       },
  { to:'/admissions',     icon:'🎓',   label:'Admissions' },
  { to:'/students',       icon:'👨‍🎓', label:'Students'   },
  { to:'/communications', icon:'📢',   label:'Comms'      },
  { to:'/notifications',  icon:'🔔',   label:'Alerts'     },
]

const PAGE_TITLES = {
  '/dashboard':      { title:'Dashboard',            icon:'🏠'  },
  '/notifications':  { title:'Notifications',         icon:'🔔'  },
  '/students':       { title:'Students',             icon:'👨‍🎓' },
  '/attendance':     { title:'Attendance',           icon:'📅'  },
  '/exams':          { title:'Exams',                icon:'📝'  },
  '/marks':          { title:'Marks',                icon:'📊'  },
  '/fees':           { title:'Fee Management',       icon:'💰'  },
  '/teachers':       { title:'Teachers',             icon:'👨‍🏫' },
  '/classes':        { title:'Classes',              icon:'🏫'  },
  '/homework':       { title:'Homework',             icon:'📚'  },
  '/leaves':         { title:'Leave Requests',       icon:'📋'  },
  '/communications': { title:'Communications',       icon:'📢'  },
  '/admissions':     { title:'Admissions',           icon:'🎓'  },
  '/settings':       { title:'Settings',             icon:'⚙️'  },
  '/profile':        { title:'My Profile',           icon:'👤'  },
}

const SIDEBAR_BG = {
  dark:   '#0F172A',
  light:  '#F8FAFC',
  indigo: '#312E81',
}
const SIDEBAR_TEXT = {
  dark:   { active:'#A5B4FC', muted:'rgba(255,255,255,0.5)', sub:'#64748B', border:'rgba(255,255,255,0.08)', loggedIn:'#475569' },
  light:  { active:'#6366F1', muted:'rgba(15,23,42,0.5)',   sub:'#94A3B8', border:'rgba(15,23,42,0.08)',    loggedIn:'#94A3B8'  },
  indigo: { active:'#C7D2FE', muted:'rgba(255,255,255,0.5)', sub:'#818CF8', border:'rgba(255,255,255,0.1)', loggedIn:'#818CF8'  },
}

// ── Sidebar content (shared by desktop + drawer) ──────────────
function SidebarContent({ collapsed, onClose, user, branding }) {
  const location = useLocation()
  const theme    = branding?.sidebarTheme || 'dark'
  const visibleNav = NAV.filter(n => !user?.role || n.roles.includes(user.role))
  const colors   = SIDEBAR_TEXT[theme] || SIDEBAR_TEXT.dark
  const primary  = branding?.primaryColor || '#6366F1'
  const accent   = branding?.accentColor  || '#10B981'
  const logoText = branding?.logoText     || 'VN'
  const logoUrl  = branding?.logoUrl      || null

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Logo */}
      <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0, display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {collapsed
          ? <img src="/logo.svg" alt="Vikashana" style={{ width:32, height:32, objectFit:'contain', filter:'brightness(0) invert(1)' }} />
          : <img src="/logo-horizontal.svg" alt="Vikashana" style={{ height:38, width:'auto', filter:'brightness(0) invert(1)' }} />
        }
        {onClose && (
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:7, width:28, height:28, cursor:'pointer', color:'rgba(255,255,255,0.6)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding: collapsed ? '0 8px' : '0 10px', display:'flex', flexDirection:'column', gap:2 }}>
        {visibleNav.map(n => (
          <NavLink key={n.to} to={n.to} onClick={onClose}
            title={collapsed ? n.label : undefined}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '9px 10px',
              borderRadius:8, textDecoration:'none',
              fontSize:13, fontWeight:600,
              background: isActive ? `${primary}33` : 'transparent',
              color: isActive ? colors.active : colors.muted,
              transition:'all 0.15s',
            })}>
            <span style={{ fontSize: collapsed ? 20 : 16 }}>{n.icon}</span>
            {!collapsed && <span>{n.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      {!collapsed && (
        <div style={{ borderTop:`1px solid ${colors.border}`, padding:'14px 14px 14px', flexShrink:0 }}>
          <div style={{ fontSize:11, color:colors.loggedIn }}>Logged in as</div>
          <div style={{ fontSize:13, fontWeight:700, color:'#94A3B8', marginTop:2 }}>{user?.name || 'Admin'}</div>
          <div style={{ fontSize:11, color:primary, fontWeight:600 }}>{user?.role || 'Super Admin'}</div>
        </div>
      )}
      {collapsed && (
        <div style={{ padding:'12px 0', display:'flex', justifyContent:'center', borderTop:`1px solid ${colors.border}`, flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${primary},${accent})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff' }}>
            {(user?.name||'A').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Mobile Drawer ─────────────────────────────────────────────
function MobileDrawer({ open, onClose, user, branding }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const sidebarBg = SIDEBAR_BG[branding?.sidebarTheme] || SIDEBAR_BG.dark

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition:'opacity 0.25s',
      }}/>
      {/* Drawer */}
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, width:260, background:sidebarBg,
        zIndex:201, transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow:'4px 0 24px rgba(0,0,0,0.3)',
      }}>
        <SidebarContent collapsed={false} onClose={onClose} user={user} branding={branding}/>
      </div>
    </>
  )
}

// ── Bottom Nav (mobile) ───────────────────────────────────────
function BottomNav({ role }) {
  const location = useLocation()
  const items = role === 'staff' ? BOTTOM_NAV_STAFF : BOTTOM_NAV_DEFAULT
  return (
    <nav style={{
      position:'fixed', bottom:0, left:0, right:0, height:60,
      background:'#fff', borderTop:'1px solid #E2E8F0', zIndex:150,
      display:'flex', alignItems:'stretch',
      boxShadow:'0 -2px 12px rgba(0,0,0,0.08)',
    }}>
      {items.map(n => {
        const isActive = location.pathname === n.to
        return (
          <NavLink key={n.to} to={n.to} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:2, textDecoration:'none',
            color: isActive ? '#6366F1' : '#94A3B8',
            background: isActive ? '#EEF2FF' : 'transparent',
            borderTop: isActive ? '2px solid #6366F1' : '2px solid transparent',
            transition:'all 0.15s',
          }}>
            <span style={{ fontSize:20 }}>{n.icon}</span>
            <span style={{ fontSize:9, fontWeight:700 }}>{n.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

// ── Topbar ────────────────────────────────────────────────────
function Topbar({ bp, onMenuOpen, user, clearAuth, navigate }) {
  const location = useLocation()
  const meta     = PAGE_TITLES[location.pathname] || { title:'Vikashana', icon:'🏫' }
  const initials = (user?.name||'Admin').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  const [notifOpen,    setNotifOpen]    = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [notifs,       setNotifs]       = useState([])
  const [unreadCount,  setUnreadCount]  = useState(0)
  const [notifsLoading,setNotifsLoading]= useState(false)
  const [sysAnnouncements, setSysAnnouncements] = useState([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback,     setFeedback]     = useState({ category:'query', title:'', body:'', priority:'medium' })
  const [submitting,   setSubmitting]   = useState(false)
  const [fbToast,      setFbToast]      = useState(null)

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setNotifsLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/notifications`, {
        headers: { Accept:'application/json', Authorization:`Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) {
        setNotifs(json.data)
        setUnreadCount(json.unread_count)
      }
    } catch (_) {}
    finally { setNotifsLoading(false) }
  }, [])

  // Load on mount + auto-refresh every 5 minutes
  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  // Fetch system announcements once on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API_BASE}/system-announcements`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => { if (json.success) setSysAnnouncements(json.data) })
      .catch(() => {})
  }, [])

  // Close both dropdowns when clicking outside
  useEffect(() => {
    const handler = e => {
      if (!e.target.closest('[data-dropdown]')) {
        setNotifOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = () => { setNotifs(p => p.map(n => ({ ...n, unread:false }))); setUnreadCount(0) }
  const markRead    = id => {
    setNotifs(p => p.map(n => n.id===id ? { ...n, unread:false } : n))
    setUnreadCount(p => Math.max(0, p - 1))
  }

  const submitFeedback = async () => {
    if (!feedback.title.trim()) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/json', Accept:'application/json' },
        body: JSON.stringify(feedback),
      })
      if (!res.ok) throw new Error()
      setShowFeedback(false)
      setFeedback({ category:'query', title:'', body:'', priority:'medium' })
      setFbToast({ msg:'Feedback sent! We will respond within 24 hours.', type:'success' })
      setTimeout(() => setFbToast(null), 4000)
    } catch {
      setFbToast({ msg:'Failed to send feedback. Try again.', type:'error' })
      setTimeout(() => setFbToast(null), 4000)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    setProfileOpen(false)
    try { await logout() } catch (_) {}
    clearAuth()
    navigate('/login')
  }

  // Dropdown panel shared styles
  const panel = {
    position:'absolute', top:'calc(100% + 10px)',
    background:'#fff', borderRadius:14,
    boxShadow:'0 8px 32px rgba(0,0,0,0.14)', border:'1px solid #E2E8F0',
    zIndex:500, minWidth:300,
    animation:'fadeSlideDown 0.15s ease',
  }

  return (
    <header style={{
      height:56, background:'#fff', borderBottom:'1px solid #E2E8F0',
      display:'flex', alignItems:'center', padding:'0 16px',
      justifyContent:'space-between', flexShrink:0,
      boxShadow:'0 1px 4px rgba(0,0,0,0.05)', zIndex:100, position:'relative',
    }}>
      {/* CSS for dropdown animation */}
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.45; }
        }
      `}</style>

      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {(bp === 'mobile' || bp === 'tablet') && (
          <button onClick={onMenuOpen} style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:9, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:18, flexShrink:0 }}>☰</button>
        )}
        <span style={{ fontSize: bp === 'mobile' ? 18 : 20 }}>{meta.icon}</span>
        <div style={{ fontWeight:800, fontSize: bp === 'mobile' ? 14 : 15, color:'#0F172A' }}>{meta.title}</div>
      </div>

      {/* Right side */}
      <div style={{ display:'flex', alignItems:'center', gap: bp === 'mobile' ? 8 : 10 }}>

        {/* ── Help / Feedback button ── */}
        <button
          onClick={() => { setShowFeedback(true); setNotifOpen(false); setProfileOpen(false) }}
          title="Send feedback or report an issue"
          style={{ width:32, height:32, borderRadius:'50%', background:'#F1F5F9', border:'1px solid #E2E8F0', fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', fontWeight:900, flexShrink:0 }}>
          ?
        </button>

        {/* ── Notification bell ── */}
        <div data-dropdown style={{ position:'relative' }}>
          <button
            onClick={() => { const opening = !notifOpen; setNotifOpen(opening); setProfileOpen(false); if (opening) fetchNotifications() }}
            style={{ background: notifOpen ? '#EEF2FF' : '#F8FAFC', border:`1px solid ${notifOpen ? '#C7D2FE' : '#E2E8F0'}`, borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, position:'relative', transition:'all 0.15s' }}>
            🔔
            {(unreadCount + sysAnnouncements.length) > 0 && (
              <div style={{ position:'absolute', top:-4, right:-4, minWidth:17, height:17, background:'#EF4444', borderRadius:99, border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'#fff', padding:'0 3px' }}>{unreadCount + sysAnnouncements.length}</div>
            )}
          </button>

          {/* Notification dropdown — viewport-centered on mobile, centered under bell on desktop */}
          {notifOpen && (
            <div data-dropdown style={{ ...panel,
              ...(bp === 'mobile'
                ? { position:'fixed', top:66, left:16, right:16, width:'auto' }
                : { width:340, left:'calc(50% - 170px)' })
            }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', borderBottom:'1px solid #F1F5F9' }}>
                <div style={{ fontWeight:800, fontSize:14, color:'#0F172A' }}>🔔 Notifications</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ fontSize:11, color:'#6366F1', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:0 }}>Mark all read</button>
                  )}
                  <span style={{ fontSize:10, background:'#EEF2FF', color:'#6366F1', fontWeight:800, padding:'2px 8px', borderRadius:99 }}>{unreadCount} new</span>
                </div>
              </div>
              {/* Items */}
              <div style={{ maxHeight:380, overflowY:'auto' }}>
                {sysAnnouncements.length > 0 && sysAnnouncements.map(ann => (
                  <div key={`sys-${ann.id}`} style={{
                    display:'flex', gap:11, padding:'11px 16px',
                    background:'linear-gradient(135deg,#1E3A5F,#6366F1)',
                    borderBottom:'1px solid rgba(255,255,255,0.1)',
                  }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📣</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#fff', lineHeight:1.3 }}>{ann.title}</div>
                        <span style={{ background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'1px 7px', fontSize:9, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>📣 Vikashana</span>
                      </div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ann.body}</div>
                    </div>
                  </div>
                ))}
                {notifsLoading ? (
                  [1,2,3].map(i => (
                    <div key={i} style={{ display:'flex', gap:11, padding:'11px 16px', borderBottom:'1px solid #F8FAFC' }}>
                      <div style={{ width:34, height:34, borderRadius:9, background:'#F1F5F9', flexShrink:0, animation:'pulse 1.2s ease infinite' }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ height:11, background:'#F1F5F9', borderRadius:5, marginBottom:7, width:'70%', animation:'pulse 1.2s ease infinite' }}/>
                        <div style={{ height:9,  background:'#F1F5F9', borderRadius:5, width:'90%', animation:'pulse 1.2s ease infinite' }}/>
                      </div>
                    </div>
                  ))
                ) : notifs.length === 0 ? (
                  <div style={{ padding:'28px 16px', textAlign:'center' }}>
                    <div style={{ fontSize:28 }}>🔔</div>
                    <div style={{ fontSize:12, color:'#94A3B8', marginTop:6, fontWeight:600 }}>All caught up!</div>
                    <div style={{ fontSize:11, color:'#CBD5E1', marginTop:2 }}>No new notifications</div>
                  </div>
                ) : notifs.map(n => (
                  <div key={n.id}
                    onClick={() => { markRead(n.id); setNotifOpen(false); navigate(n.link) }}
                    style={{ display:'flex', gap:11, padding:'11px 16px', cursor:'pointer', background: n.unread ? '#FAFBFF' : '#fff', borderBottom:'1px solid #F8FAFC', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = n.unread ? '#FAFBFF' : '#fff'}>
                    <div style={{ width:34, height:34, borderRadius:9, background:n.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{n.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6 }}>
                        <div style={{ fontSize:12, fontWeight: n.unread ? 700 : 600, color:'#0F172A', lineHeight:1.3 }}>{n.title}</div>
                        {n.unread && <div style={{ width:7, height:7, borderRadius:'50%', background:n.color, flexShrink:0, marginTop:3 }}/>}
                      </div>
                      <div style={{ fontSize:11, color:'#64748B', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>
                      <div style={{ fontSize:10, color:'#94A3B8', marginTop:3 }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Footer */}
              <div style={{ padding:'10px 16px', borderTop:'1px solid #F1F5F9', textAlign:'center' }}>
                <button
                  onClick={() => {
                    setNotifOpen(false)
                    navigate(user?.role === 'parent' ? '/parent/notifications' : '/notifications')
                  }}
                  style={{ fontSize:12, color:'#6366F1', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Profile button + dropdown ── */}
        <div data-dropdown style={{ position:'relative' }}>
          <button
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false) }}
            style={{ display:'flex', alignItems:'center', gap: bp === 'mobile' ? 0 : 8, background: profileOpen ? '#EEF2FF' : '#F8FAFC', border:`1px solid ${profileOpen ? '#C7D2FE' : '#E2E8F0'}`, borderRadius:10, padding: bp === 'mobile' ? '3px' : '5px 10px 5px 5px', cursor:'pointer', transition:'all 0.15s' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#10B981)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'#fff' }}>{initials}</div>
            {bp !== 'mobile' && (
              <>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0F172A', lineHeight:1.2 }}>{user?.name||'Admin'}</div>
                  <div style={{ fontSize:10, color:'#94A3B8' }}>{user?.role||'Super Admin'}</div>
                </div>
                <span style={{ fontSize:10, color:'#94A3B8', marginLeft:2 }}>{profileOpen ? '▲' : '▼'}</span>
              </>
            )}
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div data-dropdown style={{ ...panel, right:0, width:220 }}>
              {/* User info header */}
              <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid #F1F5F9' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#10B981)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:'#fff', flexShrink:0 }}>{initials}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:'#0F172A' }}>{user?.name||'Admin'}</div>
                    <div style={{ fontSize:11, color:'#6366F1', fontWeight:600 }}>{user?.role||'Super Admin'}</div>
                    <div style={{ fontSize:10, color:'#94A3B8', marginTop:1 }}>{user?.email||'admin@vidyaniketan.edu.in'}</div>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div style={{ padding:'6px 8px' }}>
                {[
                  { icon:'👤', label:'My Profile',     action:() => { navigate('/profile'); setProfileOpen(false) } },
                  ...(['admin','super_admin'].includes(user?.role) ? [{ icon:'⚙️', label:'Settings', action:() => { navigate('/settings'); setProfileOpen(false) } }] : []),
                  { icon:'🔒', label:'Change Password', action:() => { navigate('/profile?tab=security'); setProfileOpen(false) } },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151', textAlign:'left', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:15 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div style={{ padding:'6px 8px 8px', borderTop:'1px solid #F1F5F9' }}>
                <button onClick={handleLogout}
                  style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:700, color:'#EF4444', textAlign:'left', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#FEF2F2'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <span style={{ fontSize:15 }}>🚪</span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Feedback modal ── */}
      {showFeedback && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowFeedback(false) }}>
          <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:460, boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight:800, fontSize:16, color:'#0F172A', marginBottom:4 }}>💬 Send Feedback / Report Issue</div>
            <div style={{ fontSize:12, color:'#94A3B8', marginBottom:20 }}>Our team will respond within 24 hours</div>

            {[
              { label:'Category', field:'category', type:'select', opts:[['query','❓ Query'],['bug','🐛 Bug Report'],['feature','✨ Feature Request'],['complaint','⚠️ Complaint']] },
              { label:'Priority', field:'priority', type:'select', opts:[['low','🟢 Low'],['medium','🟡 Medium'],['high','🔴 High'],['critical','🚨 Critical']] },
            ].map(({ label, field, opts }) => (
              <div key={field} style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>{label}</label>
                <select value={feedback[field]} onChange={e => setFeedback(f => ({ ...f, [field]:e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:13, background:'#fff', outline:'none', boxSizing:'border-box' }}>
                  {opts.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                </select>
              </div>
            ))}

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Subject</label>
              <input value={feedback.title} onChange={e => setFeedback(f => ({ ...f, title:e.target.value }))}
                placeholder="Brief description..."
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Details</label>
              <textarea value={feedback.body} onChange={e => setFeedback(f => ({ ...f, body:e.target.value }))}
                placeholder="Describe the issue or suggestion..."
                rows={4}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #E2E8F0', borderRadius:10, fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowFeedback(false)}
                style={{ flex:1, padding:11, borderRadius:10, border:'1px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:700, color:'#64748B', cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={submitFeedback} disabled={submitting || !feedback.title.trim()}
                style={{ flex:2, padding:11, borderRadius:10, border:'none', background:'#6366F1', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', opacity:(submitting || !feedback.title.trim()) ? 0.6 : 1 }}>
                {submitting ? 'Sending…' : '✓ Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback toast ── */}
      {fbToast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:10000,
          background: fbToast.type === 'error' ? '#EF4444' : '#22C55E',
          color:'#fff', padding:'12px 24px', borderRadius:12, fontSize:13, fontWeight:700,
          boxShadow:'0 8px 24px rgba(0,0,0,0.18)', whiteSpace:'nowrap' }}>
          {fbToast.type === 'error' ? '⚠️' : '✓'} {fbToast.msg}
        </div>
      )}

    </header>
  )
}

// ── Subscription Banner ────────────────────────────────────────
function SubscriptionBanner() {
  const { isBlocked, isGracePeriod, graceDaysLeft, status, isTrial, trialDaysLeft } = useSubscriptionStore()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  const getBanner = () => {
    if (isBlocked) return {
      bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C',
      msg: '🔴 Subscription expired. Contact Vikashana to reactivate.',
      cta: 'Contact Support',
      ctaAction: () => window.open('https://wa.me/919XXXXXXXXX?text=Hi, my Vikashana subscription needs reactivation.'),
      dismissible: false,
    }

    if (isGracePeriod) return {
      bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C',
      msg: `🚨 Payment overdue! Service continues for ${graceDaysLeft} more days. Please pay to avoid interruption.`,
      cta: 'Pay Now',
      ctaAction: () => navigate('/settings?tab=subscription'),
      dismissible: false,
    }

    if (status === 'overdue') return {
      bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C',
      msg: '💰 Payment overdue. Please settle to avoid service interruption.',
      cta: 'View Invoice',
      ctaAction: () => navigate('/settings?tab=subscription'),
      dismissible: false,
    }

    if (isTrial && trialDaysLeft <= 3) return {
      bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C',
      msg: `⚠️ Trial expires in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}! Upgrade to keep access.`,
      cta: 'Upgrade Now',
      ctaAction: () => navigate('/settings?tab=subscription'),
      dismissible: false,
    }

    if (isTrial && trialDaysLeft <= 7) return {
      bg: '#FFFBEB', border: '#FCD34D', color: '#92400E',
      msg: `⏰ Trial ends in ${trialDaysLeft} days. Upgrade to continue.`,
      cta: 'View Plans',
      ctaAction: () => navigate('/settings?tab=subscription'),
      dismissible: true,
    }

    if (isTrial) return {
      bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8',
      msg: `🎉 30-day Pro trial — ${trialDaysLeft} days remaining. All features unlocked!`,
      cta: 'View Plans',
      ctaAction: () => navigate('/settings?tab=subscription'),
      dismissible: true,
    }

    return null
  }

  const b = getBanner()
  if (!b) return null
  if (b.dismissible && dismissed) return null

  return (
    <div style={{ background: b.bg, borderBottom: `1px solid ${b.border}`, padding: '9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13, fontWeight: 600 }}>
      <span style={{ color: b.color }}>{b.msg}</span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={b.ctaAction} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1', fontWeight: 700, fontSize: 13, padding: 0, whiteSpace: 'nowrap' }}>
          {b.cta} →
        </button>
        {b.dismissible && (
          <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 16 }}>✕</button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
export default function Layout() {
  const bp                    = useBreakpoint()
  const [drawerOpen, setDrawer] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(bp === 'tablet')
  const { user, clearAuth }   = useAuthStore()
  const { branding, setBranding } = useAppStore()
  const navigate              = useNavigate()
  const location              = useLocation()
  const [studentCount, setStudentCount] = useState(0)
  const [teacherCount, setTeacherCount] = useState(0)

  // Load branding from API on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API_BASE}/settings`, {
      headers: { Accept:'application/json', Authorization:`Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        const s = json.data?.settings || {}
        setBranding({
          primaryColor: s.primary_color || '#6366F1',
          accentColor:  s.accent_color  || '#10B981',
          sidebarTheme: s.sidebar_theme || 'dark',
          logoText:     s.logo_text     || 'VN',
          logoUrl:      json.data?.logo  || null,
        })
      })
      .catch(() => {})
  }, [])

  // Fetch student/teacher counts for subscription banner
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` }
    fetch(`${API_BASE}/dashboard/stats`, { headers })
      .then(r => r.json())
      .then(json => {
        setStudentCount(json.data?.students?.total ?? 0)
        setTeacherCount(json.data?.teachers?.total ?? 0)
      })
      .catch(() => {})
  }, [])

  // Auto-collapse sidebar on tablet, expand on desktop
  useEffect(() => {
    if (bp === 'tablet')  setSidebarCollapsed(true)
    if (bp === 'desktop') setSidebarCollapsed(false)
    if (bp === 'mobile')  setDrawer(false)
  }, [bp])

  // Close drawer on route change
  useEffect(() => { setDrawer(false) }, [location.pathname])

  const isMobile  = bp === 'mobile'
  const isTablet  = bp === 'tablet'
  const isDesktop = bp === 'desktop'

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'Segoe UI',sans-serif" }}>

      {/* ── Desktop / Tablet sidebar ── */}
      {!isMobile && (
        <aside style={{
          width: sidebarCollapsed ? 60 : 220,
          background: SIDEBAR_BG[branding?.sidebarTheme] || SIDEBAR_BG.dark, color:'#fff',
          display:'flex', flexDirection:'column',
          flexShrink:0, overflow:'hidden',
          transition:'width 0.22s cubic-bezier(0.4,0,0.2,1)',
          position:'relative',
        }}>
          <SidebarContent collapsed={sidebarCollapsed} user={user} branding={branding}/>
          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            style={{
              position:'absolute', bottom:60, right: sidebarCollapsed ? '50%' : 10,
              transform: sidebarCollapsed ? 'translateX(50%)' : 'none',
              background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'50%',
              width:24, height:24, cursor:'pointer', color:'rgba(255,255,255,0.4)',
              fontSize:12, display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.2s',
            }}>
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </aside>
      )}

      {/* ── Mobile drawer ── */}
      {isMobile && (
        <MobileDrawer open={drawerOpen} onClose={() => setDrawer(false)} user={user} branding={branding}/>
      )}

      {/* ── Main area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar
          bp={bp}
          onMenuOpen={() => isMobile ? setDrawer(true) : setSidebarCollapsed(c => !c)}
          user={user}
          clearAuth={clearAuth}
          navigate={navigate}
        />
        <SubscriptionBanner />
        <main style={{
          flex:1, overflowY:'auto',
          padding: isMobile ? '16px 12px' : isTablet ? '20px 16px' : '24px',
          background:'#F0F4F8',
          paddingBottom: isMobile ? 76 : (isTablet ? 20 : 24), // room for bottom nav on mobile
        }}>
          <Outlet/>
        </main>
      </div>

      {/* ── Bottom nav (mobile only) ── */}
      {isMobile && <BottomNav role={user?.role}/>}
    </div>
  )
}