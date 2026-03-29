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

function statusOf(exam) {
  const now   = new Date(); now.setHours(0,0,0,0)
  const start = new Date(exam.start_date); start.setHours(0,0,0,0)
  const end   = exam.end_date ? new Date(exam.end_date) : start; end.setHours(23,59,59,0)
  if (now < start) return 'upcoming'
  if (now > end)   return 'completed'
  return 'ongoing'
}

const STATUS_STYLE = {
  upcoming:  { color: '#6366F1', bg: '#EEF2FF', label: 'Upcoming'  },
  ongoing:   { color: '#F59E0B', bg: '#FFFBEB', label: 'Ongoing'   },
  completed: { color: '#10B981', bg: '#ECFDF5', label: 'Completed' },
}

function daysUntil(dateStr) {
  const d = new Date(dateStr); d.setHours(0,0,0,0)
  const n = new Date();        n.setHours(0,0,0,0)
  return Math.ceil((d - n) / 86400000)
}

function ExamCard({ exam, onSelect, selected }) {
  const status = statusOf(exam)
  const st = STATUS_STYLE[status]
  const days = status === 'upcoming' ? daysUntil(exam.start_date) : null
  return (
    <div
      onClick={() => onSelect(exam)}
      style={{
        background: '#fff', borderRadius: 14, padding: '14px 16px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.07)', cursor: 'pointer',
        border: selected ? '2px solid #6366F1' : '2px solid transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{exam.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 20 }}>
              {st.label}
            </span>
            {exam.type && <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', background: '#F8FAFC', padding: '2px 8px', borderRadius: 20 }}>{exam.type}</span>}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
            {new Date(exam.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {exam.end_date && exam.end_date !== exam.start_date &&
              ` – ${new Date(exam.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
          </div>
        </div>
        {days !== null && (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: days <= 3 ? '#EF4444' : '#6366F1', lineHeight: 1 }}>{days}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8' }}>DAYS</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ParentExams() {
  const navigate = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('upcoming')
  const [selectedExam, setSelectedExam] = useState(null)
  const [ttLoading, setTtLoading] = useState(false)

  useEffect(() => {
    if (!activeStudent) { navigate('/parent/select', { replace: true }); return }
    load()
  }, [activeStudent])

  function load() {
    setLoading(true); setError(null)
    parentApi.getExams(activeStudent.class_id)
      .then(res => {
        if (!res.success) throw new Error()
        const list = res.data?.data || res.data || []
        setExams(list)
        // Auto-select first upcoming exam and load its timetable
        const upcoming = list.filter(e => statusOf(e) === 'upcoming')
        if (upcoming.length > 0) { handleSelectExam(upcoming[0]); setTab('upcoming') }
        else if (list.length > 0) { setTab('completed') }
      })
      .catch(() => setError('Could not load exams. Please try again.'))
      .finally(() => setLoading(false))
  }

  function handleSelectExam(exam) {
    // Toggle off if already selected
    if (selectedExam?.id === exam.id) { setSelectedExam(null); return }
    // If timetable already loaded (has timetable key), just select
    if (exam.timetable !== undefined) { setSelectedExam(exam); return }
    // Fetch full detail to get timetable
    setSelectedExam({ ...exam, timetable: null })  // show loading state
    setTtLoading(true)
    parentApi.getExamDetail(exam.id)
      .then(res => {
        const detail = res.data || res
        const timetable = detail.timetable || []
        const enriched  = { ...exam, timetable, ...detail }
        setSelectedExam(enriched)
        // Also update in the list so re-clicks don't re-fetch
        setExams(prev => prev.map(e => e.id === exam.id ? enriched : e))
      })
      .catch(() => setSelectedExam(exam))  // fallback: show exam without timetable
      .finally(() => setTtLoading(false))
  }

  if (!activeStudent) return null

  const grouped = {
    upcoming:  exams.filter(e => statusOf(e) === 'upcoming'),
    ongoing:   exams.filter(e => statusOf(e) === 'ongoing'),
    completed: exams.filter(e => statusOf(e) === 'completed'),
  }
  const displayed = grouped[tab] || []

  const TABS = [
    { key: 'upcoming',  label: `Upcoming (${grouped.upcoming.length})`   },
    { key: 'ongoing',   label: `Ongoing (${grouped.ongoing.length})`      },
    { key: 'completed', label: `Completed (${grouped.completed.length})`  },
  ]

  // Next upcoming exam countdown
  const nextExam = grouped.upcoming[0]
  const nextDays  = nextExam ? daysUntil(nextExam.start_date) : null

  // Selected exam timetable
  const timetable = selectedExam?.timetable || []

  return (
    <div style={{ padding: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginBottom: 16 }}>
        {activeStudent.name}'s Exams
      </div>

      {error && <ErrorBanner msg={error} onRetry={load} />}

      {/* Countdown banner for next exam */}
      {!loading && nextExam && (
        <div style={{
          background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
          borderRadius: 16, padding: '16px 20px', marginBottom: 14, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>Next Exam</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{nextExam.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {new Date(nextExam.start_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{nextDays}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
              {nextDays === 0 ? 'TODAY!' : nextDays === 1 ? 'day to go' : 'days to go'}
            </div>
          </div>
        </div>
      )}

      {/* Status tabs */}
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
          {[1,2,3].map(i => <Skeleton key={i} h={80} />)}
        </div>
      )}

      {!loading && !error && displayed.length === 0 && (
        <div style={{ textAlign: 'center', padding: 50, color: '#94A3B8' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No {tab} exams</div>
        </div>
      )}

      {!loading && !error && displayed.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {displayed.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              selected={selectedExam?.id === exam.id}
              onSelect={handleSelectExam}
            />
          ))}
        </div>
      )}

      {/* Timetable for selected exam */}
      {selectedExam && (
        <div style={{ background: '#fff', borderRadius: 16, marginTop: 14, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ padding: '14px 16px', fontSize: 13, fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 {selectedExam.name} — Timetable
            {ttLoading && <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Loading…</span>}
          </div>

          {ttLoading && (
            <div style={{ padding: '16px 16px', display: 'grid', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} style={{ background: '#F1F5F9', borderRadius: 8, height: 44, animation: 'pulse 1.5s infinite' }} />)}
            </div>
          )}

          {!ttLoading && timetable.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📅</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Timetable not published yet</div>
            </div>
          )}

          {!ttLoading && timetable.length > 0 && (
            <>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 56px 56px', gap: 8, padding: '8px 16px', background: '#F8FAFC', fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>
                <span>SUBJECT</span>
                <span>DATE</span>
                <span>TIME</span>
                <span style={{ textAlign: 'right' }}>MARKS</span>
              </div>
              {timetable.map((row, i) => {
                const today = new Date(); today.setHours(0,0,0,0)
                const examDate = row.date ? new Date(row.date) : null
                if (examDate) examDate.setHours(0,0,0,0)
                const isToday = examDate && examDate.getTime() === today.getTime()
                const isPast  = examDate && examDate < today
                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 80px 56px 56px', gap: 8,
                      padding: '11px 16px', alignItems: 'center',
                      borderBottom: i < timetable.length - 1 ? '1px solid #F8FAFC' : 'none',
                      background: isToday ? '#FFFBEB' : 'transparent',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isPast ? '#94A3B8' : '#0F172A' }}>
                        {row.subject?.name || row.subject || '—'}
                      </span>
                      {isToday && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: '#F59E0B', background: '#FFFBEB', padding: '1px 6px', borderRadius: 10, border: '1px solid #FDE68A' }}>TODAY</span>}
                      {row.venue && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{row.venue}</div>}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isPast ? '#94A3B8' : '#64748B' }}>
                      {row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>
                      {row.start_time || '—'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', textAlign: 'right' }}>
                      {row.max_marks > 0 ? row.max_marks : '—'}
                    </span>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
