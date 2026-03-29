import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useParentStore from '../../store/parentStore'
import { logout } from '../../api/auth'

const PARENT_NAV = [
  { path: '/parent/dashboard', icon: '🏠', label: 'Home'     },
  { path: '/parent/fees',      icon: '💰', label: 'Fees'     },
  { path: '/parent/marks',     icon: '📊', label: 'Marks'    },
  { path: '/parent/homework',  icon: '📚', label: 'Homework' },
  { path: '/parent/profile',   icon: '👤', label: 'Profile'  },
]

const palette = ['#6366F1', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function MiniAvatar({ name, photo, size = 28 }) {
  const bg = palette[(name || 'A').charCodeAt(0) % palette.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: photo ? '#F8FAFC' : bg, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 900, color: '#fff',
      border: '2px solid #E2E8F0',
    }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials(name)
      }
    </div>
  )
}

export default function ParentLayout() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const activeStudent  = useParentStore(s => s.activeStudent)
  const children       = useParentStore(s => s.children)
  const clearParent    = useParentStore(s => s.clearParent)
  const schoolPhone    = useAuthStore.getState().user?.school?.phone

  // ── Notifications (must be declared before any early return) ─
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [notifs,        setNotifs]        = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [notifsLoading, setNotifsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setNotifsLoading(true)
    try {
      const res  = await fetch('/api/v1/notifications', {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) {
        setNotifs(json.data)
        setUnreadCount(json.unread_count)
      }
    } catch (_) {}
    finally { setNotifsLoading(false) }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => { if (!e.target.closest('[data-notif-dropdown]')) setNotifOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = () => { setNotifs(p => p.map(n => ({ ...n, unread: false }))); setUnreadCount(0) }

  // Student selection screen is full-page — render outlet only, no chrome
  if (location.pathname === '/parent/select') {
    return <Outlet />
  }

  const handleLogout = async () => {
    try { await logout() } catch (_) {}
    clearAuth()
    clearParent()
    navigate('/login', { replace: true })
  }

  const whatsappMsg = activeStudent
    ? encodeURIComponent(
        `Hi, I'm ${user?.name || 'Parent'}, parent of ${activeStudent.name} (Class ${activeStudent.class}-${activeStudent.section}, Roll: ${activeStudent.admission_no}). I have a query regarding `
      )
    : ''

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", background: '#F0F4F8', minHeight: '100vh' }}>

      {/* ── Topbar ───────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        padding: '0 10px', height: 52,
        display: 'flex', alignItems: 'center', gap: 6,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Left: logo (hidden on very small screens when student is active) */}
        <div style={{
          fontWeight: 800, fontSize: 13, color: '#0F172A', flexShrink: 0, whiteSpace: 'nowrap',
          display: activeStudent ? 'none' : 'block',
        }}>
          🏫 Vikashana
        </div>

        {/* Center: active student info — takes all available space */}
        {activeStudent && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            flex: 1, minWidth: 0,
          }}>
            <MiniAvatar name={activeStudent.name} photo={activeStudent.photo} size={28} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#0F172A',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {activeStudent.name}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                Cl. {activeStudent.class}-{activeStudent.section}
              </div>
            </div>
          </div>
        )}

        {/* Right: actions only (no parent name — saves space) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 'auto' }}>
          {children.length > 1 && (
            <button
              onClick={() => navigate('/parent/select', { state: { force: true } })}
              style={{
                background: '#EEF2FF', color: '#6366F1',
                border: 'none', borderRadius: 6,
                padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Switch
            </button>
          )}

          {/* ── Notification bell ── */}
          <div data-notif-dropdown style={{ position: 'relative' }}>
            <button
              onClick={() => { const opening = !notifOpen; setNotifOpen(opening); if (opening) fetchNotifications() }}
              style={{
                background: notifOpen ? '#EEF2FF' : '#F8FAFC',
                border: `1px solid ${notifOpen ? '#C7D2FE' : '#E2E8F0'}`,
                borderRadius: 8, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 15, position: 'relative',
              }}
            >
              🔔
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  minWidth: 15, height: 15, background: '#EF4444',
                  borderRadius: 99, border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 7, fontWeight: 900, color: '#fff', padding: '0 2px',
                }}>{unreadCount}</div>
              )}
            </button>

            {notifOpen && (
              <div data-notif-dropdown style={{
                position: 'fixed', top: 58, right: 8, left: 8,
                background: '#fff', borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #E2E8F0',
                zIndex: 200, animation: 'notifFade 0.15s ease',
              }}>
                <style>{`@keyframes notifFade { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A' }}>🔔 Notifications</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: 10, color: '#6366F1', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Mark all read</button>
                    )}
                    <span style={{ fontSize: 9, background: '#EEF2FF', color: '#6366F1', fontWeight: 800, padding: '2px 7px', borderRadius: 99 }}>{unreadCount} new</span>
                  </div>
                </div>
                {/* Items */}
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifsLoading ? (
                    [1, 2, 3].map(i => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid #F8FAFC' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F1F5F9', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 10, background: '#F1F5F9', borderRadius: 4, marginBottom: 6, width: '65%' }} />
                          <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, width: '85%' }} />
                        </div>
                      </div>
                    ))
                  ) : notifs.length === 0 ? (
                    <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24 }}>🔔</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5, fontWeight: 600 }}>All caught up!</div>
                    </div>
                  ) : notifs.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { setNotifs(p => p.map(x => x.id === n.id ? { ...x, unread: false } : x)); setNotifOpen(false); navigate(n.link) }}
                      style={{ display: 'flex', gap: 10, padding: '10px 14px', cursor: 'pointer', background: n.unread ? '#FAFBFF' : '#fff', borderBottom: '1px solid #F8FAFC' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = n.unread ? '#FAFBFF' : '#fff'}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: n.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{n.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: n.unread ? 700 : 600, color: '#0F172A', lineHeight: 1.3 }}>{n.title}</div>
                          {n.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.color, flexShrink: 0, marginTop: 3 }} />}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
                        <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div style={{ padding: '8px 14px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <button
                    onClick={() => { setNotifOpen(false); navigate('/parent/notifications') }}
                    style={{ fontSize: 11, color: '#6366F1', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={`Sign out (${user?.name})`}
            style={{
              background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA',
              borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Page content ─────────────────────────────────────────── */}
      <div style={{ paddingBottom: 70, minHeight: 'calc(100vh - 52px)' }}>
        <Outlet />
      </div>

      {/* ── WhatsApp contact button (fixed, above bottom nav) ─────── */}
      {activeStudent && (
        <a
          href={schoolPhone
            ? `https://wa.me/${schoolPhone.replace(/\D/g, '')}?text=${whatsappMsg}`
            : `https://wa.me/?text=${whatsappMsg}`}
          target="_blank"
          rel="noreferrer"
          style={{
            position: 'fixed', bottom: 70, right: 16,
            width: 46, height: 46, borderRadius: '50%',
            background: '#25D366', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
            zIndex: 40, textDecoration: 'none',
          }}
          title="Contact school on WhatsApp"
        >
          📞
        </a>
      )}

      {/* ── Bottom navigation ────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 60,
        background: '#fff', borderTop: '1px solid #E2E8F0',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        display: 'flex', zIndex: 50,
      }}>
        {PARENT_NAV.map(tab => {
          const active = location.pathname === tab.path
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                background: 'none', border: 'none', cursor: 'pointer',
                borderTop: active ? '3px solid #6366F1' : '3px solid transparent',
                transition: 'transform 0.1s',
                padding: 0,
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
              onMouseUp={e => { e.currentTarget.style.transform = '' }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
              onTouchEnd={e => { e.currentTarget.style.transform = '' }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#6366F1' : '#94A3B8' }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
