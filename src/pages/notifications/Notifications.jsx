import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { useBreakpoint } from '../../hooks/responsive.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const TYPE_META = {
  fee:          { label: 'Fees',          icon: '💰', color: '#EF4444' },
  attendance:   { label: 'Attendance',    icon: '📅', color: '#F59E0B' },
  admission:    { label: 'Admissions',    icon: '🎓', color: '#6366F1' },
  exam:         { label: 'Exams',         icon: '📝', color: '#3B82F6' },
  homework:     { label: 'Homework',      icon: '📚', color: '#F59E0B' },
  leave:        { label: 'Leaves',        icon: '📋', color: '#D97706' },
  announcement: { label: 'Announcements', icon: '📣', color: '#10B981' },
}

export default function Notifications() {
  const bp       = useBreakpoint()
  const isMobile = bp === 'mobile'
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [readIds, setReadIds] = useState(new Set())

  useEffect(() => { fetchNotifications() }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/notifications`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          Accept: 'application/json',
        },
      })
      const data = await res.json()
      if (data.success) setNotifications(data.data)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter)

  const unreadCount = notifications.filter(n => n.unread && !readIds.has(n.id)).length

  const markRead    = id  => setReadIds(prev => new Set([...prev, id]))
  const markAllRead = ()  => setReadIds(new Set(notifications.map(n => n.id)))

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", padding: isMobile ? 12 : 24, background: '#F0F4F8', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0 }}>🔔 Notifications</h1>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '4px 0 0', fontWeight: 600 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchNotifications} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#64748B', cursor: 'pointer' }}>
            🔄 Refresh
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: '#6366F1', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              ✓ Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[['all', 'All'], ...Object.entries(TYPE_META).map(([k, v]) => [k, v.label])].map(([key, label]) => {
          const count = key === 'all' ? notifications.length : notifications.filter(n => n.type === key).length
          if (count === 0 && key !== 'all') return null
          return (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              background: filter === key ? '#6366F1' : '#fff',
              color: filter === key ? '#fff' : '#64748B',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              transition: 'all 0.15s',
            }}>
              {label}
              {count > 0 && (
                <span style={{
                  marginLeft: 6, padding: '1px 6px', borderRadius: 10, fontSize: 10,
                  background: filter === key ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: '16px 20px', display: 'flex', gap: 12, borderBottom: '1px solid #F8FAFC' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F1F5F9', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                <div style={{ height: 13, background: '#F1F5F9', borderRadius: 4, width: '60%' }} />
                <div style={{ height: 11, background: '#F1F5F9', borderRadius: 4, width: '80%' }} />
                <div style={{ height: 10, background: '#F1F5F9', borderRadius: 4, width: '30%' }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>All clear!</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>No {filter === 'all' ? '' : filter} notifications</div>
          </div>
        ) : filtered.map((n, i) => {
          const isRead = readIds.has(n.id) || !n.unread
          return (
            <div
              key={n.id}
              onClick={() => { markRead(n.id); navigate(n.link || '/dashboard') }}
              style={{
                display: 'flex', gap: 14, padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid #F8FAFC' : 'none',
                cursor: 'pointer',
                background: isRead ? '#fff' : '#F8FAFF',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = isRead ? '#fff' : '#F8FAFF'}
            >
              <div style={{ width: 42, height: 42, borderRadius: 10, background: n.color + '18', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {n.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: isRead ? 600 : 800, color: '#0F172A', marginBottom: 3 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                  {n.body}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{n.time}</span>
                  {TYPE_META[n.type] && (
                    <span style={{
                      fontSize: 9, fontWeight: 800,
                      color: TYPE_META[n.type].color,
                      background: TYPE_META[n.type].color + '18',
                      padding: '2px 7px', borderRadius: 20,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {TYPE_META[n.type].label}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: '#6366F1', fontWeight: 600 }}>→ {n.link}</span>
                </div>
              </div>
              {!isRead && (
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: n.color, flexShrink: 0, marginTop: 6 }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
