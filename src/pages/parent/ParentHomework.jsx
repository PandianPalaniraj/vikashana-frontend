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

const SUBJECT_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6']

function subjectColor(name) {
  let h = 0
  for (let i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xFFFF
  return SUBJECT_COLORS[h % SUBJECT_COLORS.length]
}

function DueBadge({ days }) {
  if (days < 0)  return <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '2px 8px', borderRadius: 20 }}>Overdue</span>
  if (days === 0) return <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', padding: '2px 8px', borderRadius: 20 }}>Due Today</span>
  if (days === 1) return <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', background: '#F5F3FF', padding: '2px 8px', borderRadius: 20 }}>Tomorrow</span>
  return <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: 20 }}>{days}d left</span>
}

function HomeworkCard({ hw }) {
  const [expanded, setExpanded] = useState(false)
  const days = Math.floor((new Date(hw.due_date) - new Date()) / 86400000)
  const sc   = subjectColor(hw.subject?.name || '')
  return (
    <div style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${sc}`,
    }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 14px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: `${sc}18`, padding: '2px 8px', borderRadius: 20 }}>
                {hw.subject?.name || 'General'}
              </span>
              {hw.teacher && <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{hw.teacher?.name || hw.teacher}</span>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>{hw.title}</div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
              Due: {new Date(hw.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <DueBadge days={days} />
            <span style={{ fontSize: 14, color: '#94A3B8' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && hw.description && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {hw.description}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ParentHomework() {
  const navigate = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)
  const [homework, setHomework] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    if (!activeStudent) { navigate('/parent/select', { replace: true }); return }
    load()
  }, [activeStudent])

  function load() {
    setLoading(true); setError(null)
    parentApi.getHomework(activeStudent.class_id, activeStudent.section_id)
      .then(res => {
        if (!res.success) throw new Error()
        // Support both paginated and direct array response
        setHomework(res.data?.data || res.data || [])
      })
      .catch(() => setError('Could not load homework. Please try again.'))
      .finally(() => setLoading(false))
  }

  if (!activeStudent) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const categorised = {
    all:     homework,
    pending: homework.filter(hw => new Date(hw.due_date) >= today),
    today:   homework.filter(hw => {
      const d = new Date(hw.due_date); d.setHours(0,0,0,0)
      return d.getTime() === today.getTime()
    }),
    overdue: homework.filter(hw => new Date(hw.due_date) < today),
  }
  const displayed = categorised[tab] || []

  const TABS = [
    { key: 'all',     label: `All (${categorised.all.length})`         },
    { key: 'pending', label: `Pending (${categorised.pending.length})`  },
    { key: 'today',   label: `Today (${categorised.today.length})`      },
    { key: 'overdue', label: `Overdue (${categorised.overdue.length})`  },
  ]

  return (
    <div style={{ padding: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginBottom: 16 }}>
        {activeStudent.name}'s Homework
      </div>

      {error && <ErrorBanner msg={error} onRetry={load} />}

      {!loading && !error && (
        /* Summary row */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Total',   value: categorised.all.length,     color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Pending', value: categorised.pending.length,  color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Overdue', value: categorised.overdue.length,  color: '#EF4444', bg: '#FEF2F2' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: s.color, opacity: 0.75 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flexShrink: 0, padding: '7px 14px', border: 'none', borderRadius: 20,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: tab === t.key ? '#6366F1' : '#fff',
              color: tab === t.key ? '#fff' : '#64748B',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'grid', gap: 10 }}>
          {[1,2,3].map(i => <Skeleton key={i} h={90} />)}
        </div>
      )}

      {!loading && !error && displayed.length === 0 && (
        <div style={{ textAlign: 'center', padding: 50, color: '#94A3B8' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>
            {tab === 'pending' ? '🎉' : tab === 'overdue' ? '✅' : '📚'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {tab === 'pending' ? 'No pending homework!' :
             tab === 'overdue' ? 'No overdue homework!' :
             tab === 'today'   ? 'Nothing due today'    :
             'No homework found'}
          </div>
        </div>
      )}

      {!loading && !error && displayed.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {displayed.map(hw => <HomeworkCard key={hw.id} hw={hw} />)}
        </div>
      )}
    </div>
  )
}
