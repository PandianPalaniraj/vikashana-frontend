import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useParentStore from '../../store/parentStore'
import parentApi from '../../api/parent'

function Skeleton({ h = 80, r = 12 }) {
  return <div style={{ background: '#E2E8F0', borderRadius: r, height: h, animation: 'pulse 1.5s infinite' }} />
}

function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>⚠️ {msg}</span>
      <button onClick={onRetry} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
    </div>
  )
}

const AUDIENCE_STYLE = {
  all:      { color: '#6366F1', bg: '#EEF2FF', label: 'All'      },
  students: { color: '#10B981', bg: '#ECFDF5', label: 'Students' },
  parents:  { color: '#F59E0B', bg: '#FFFBEB', label: 'Parents'  },
  class:    { color: '#3B82F6', bg: '#EFF6FF', label: 'Class'    },
  section:  { color: '#8B5CF6', bg: '#F5F3FF', label: 'Section'  },
  teachers: { color: '#EC4899', bg: '#FDF2F8', label: 'Teachers' },
  staff:    { color: '#64748B', bg: '#F8FAFC', label: 'Staff'    },
}

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function AnnouncementCard({ ann, readSet, onRead }) {
  const [expanded, setExpanded] = useState(false)
  const isRead   = readSet.has(ann.id)
  const audience = AUDIENCE_STYLE[ann.audience] || AUDIENCE_STYLE.all

  const handleClick = () => {
    if (!isRead) onRead(ann.id)
    setExpanded(e => !e)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background: '#fff', borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 1px 8px rgba(0,0,0,0.07)', cursor: 'pointer',
        border: !isRead ? '2px solid #6366F133' : '2px solid transparent',
        opacity: isRead ? 0.85 : 1,
      }}
    >
      <div style={{ padding: '14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {ann.is_pinned && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#6366F1', background: '#EEF2FF', padding: '2px 8px', borderRadius: 20 }}>📌 Pinned</span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: audience.color, background: audience.bg, padding: '2px 8px', borderRadius: 20 }}>
            {audience.label}
          </span>
          {!isRead && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366F1', display: 'inline-block', marginLeft: 2 }} />
          )}
          <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginLeft: 'auto' }}>{timeAgo(ann.created_at)}</span>
        </div>

        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>{ann.title}</div>

        <div style={{
          fontSize: 13, color: '#374151', lineHeight: 1.6,
          overflow: expanded ? 'visible' : 'hidden',
          display: expanded ? 'block' : '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {ann.body}
        </div>

        {ann.created_by && (
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 6 }}>
            Posted by {ann.created_by.name}
          </div>
        )}

        {ann.body && ann.body.length > 100 && (
          <div style={{ fontSize: 11, color: '#6366F1', fontWeight: 700, marginTop: 6 }}>
            {expanded ? 'Show less ▲' : 'Read more ▼'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ParentAnnouncements() {
  const navigate      = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)

  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tab, setTab]         = useState('all')
  const [readSet, setReadSet] = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('readAnnouncements') || '[]')) }
    catch { return new Set() }
  })

  useEffect(() => {
    if (!activeStudent) { navigate('/parent/select', { replace: true }); return }
    load()
  }, [activeStudent])

  function load() {
    setLoading(true); setError(null)
    parentApi.getAnnouncements()
      .then(res => {
        if (!res.success) throw new Error()
        setAnnouncements(res.data?.data || res.data || [])
      })
      .catch(() => setError('Could not load announcements. Please try again.'))
      .finally(() => setLoading(false))
  }

  function markRead(id) {
    setReadSet(prev => {
      const next = new Set(prev)
      next.add(id)
      sessionStorage.setItem('readAnnouncements', JSON.stringify([...next]))
      return next
    })
  }

  if (!activeStudent) return null

  const pinned   = announcements.filter(a => a.is_pinned)
  const general  = announcements.filter(a => !a.is_pinned && ['all', 'students', 'parents'].includes(a.audience))
  const classAnn = announcements.filter(a => !a.is_pinned && ['class', 'section'].includes(a.audience))
  const unread   = announcements.filter(a => !readSet.has(a.id))

  const tabMap = { all: announcements, pinned, class: classAnn, general }
  const displayed = tabMap[tab] || []

  const TABS = [
    { key: 'all',     label: `All (${announcements.length})` },
    { key: 'pinned',  label: `Pinned (${pinned.length})`     },
    { key: 'class',   label: `Class (${classAnn.length})`    },
    { key: 'general', label: `General (${general.length})`   },
  ]

  return (
    <div style={{ padding: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>📢 Notices</div>
        {unread.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', background: '#EEF2FF', padding: '3px 10px', borderRadius: 20 }}>
            {unread.length} unread
          </span>
        )}
      </div>

      {error && <ErrorBanner msg={error} onRetry={load} />}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flexShrink: 0, padding: '7px 14px', border: 'none', borderRadius: 20,
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: tab === t.key ? '#6366F1' : '#fff',
            color: tab === t.key ? '#fff' : '#64748B',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'grid', gap: 10 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} h={100} />)}
        </div>
      )}

      {!loading && !error && displayed.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📢</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No notices yet</div>
        </div>
      )}

      {!loading && !error && displayed.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {tab === 'all' && pinned.map(ann => (
            <AnnouncementCard key={ann.id} ann={ann} readSet={readSet} onRead={markRead} />
          ))}
          {displayed
            .filter(a => tab !== 'all' || !a.is_pinned)
            .map(ann => (
              <AnnouncementCard key={ann.id} ann={ann} readSet={readSet} onRead={markRead} />
            ))}
        </div>
      )}
    </div>
  )
}
