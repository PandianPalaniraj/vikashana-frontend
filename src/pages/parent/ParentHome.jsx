import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useParentStore from '../../store/parentStore'
import parentApi from '../../api/parent'

const palette = ['#6366F1', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function StudentAvatar({ name, photo, size = 56 }) {
  const bg = palette[(name || 'A').charCodeAt(0) % palette.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: photo ? '#F8FAFC' : bg, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 900, color: '#fff',
      border: '3px solid rgba(255,255,255,0.35)',
    }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials(name)
      }
    </div>
  )
}

function Skeleton({ h = 80, r = 14 }) {
  return <div style={{ background: '#E2E8F0', borderRadius: r, height: h, animation: 'pulse 1.5s infinite' }} />
}

function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12,
      padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>⚠️ {msg}</span>
      <button onClick={onRetry} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  )
}

export default function ParentHome() {
  const navigate = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeStudent) { navigate('/parent/select', { replace: true }); return }
    load()
  }, [activeStudent])

  function load() {
    setLoading(true); setError(null)
    parentApi.getDashboard(activeStudent.student_id)
      .then(res => {
        if (!res.success) throw new Error('Failed to load')
        setData(res.data)
      })
      .catch(() => setError('Could not load dashboard. Please try again.'))
      .finally(() => setLoading(false))
  }

  if (!activeStudent) return null

  const p = 16

  return (
    <div style={{ padding: p }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Student banner */}
      <div style={{
        background: 'linear-gradient(135deg,#0F172A 0%,#1E3A5F 55%,#6366F1 100%)',
        borderRadius: 20, padding: '20px 20px', marginBottom: 16, color: '#fff',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <StudentAvatar name={activeStudent.name} photo={activeStudent.photo} size={56} />
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Student Dashboard
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>{activeStudent.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
              Class {activeStudent.class}-{activeStudent.section} · {activeStudent.admission_no}
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorBanner msg={error} onRetry={load} />}

      {loading && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {[1,2,3,4].map(i => <Skeleton key={i} h={88} />)}
          </div>
          <Skeleton h={140} />
          <Skeleton h={120} />
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'grid', gap: 14 }}>

          {/* KPI widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {[
              {
                icon: '📅', label: 'Attendance', to: '/parent/attendance',
                value: `${data.attendance_pct ?? 0}%`,
                color: (data.attendance_pct ?? 0) >= 75 ? '#10B981' : '#EF4444',
                bg: (data.attendance_pct ?? 0) >= 75 ? '#ECFDF5' : '#FEF2F2',
              },
              {
                icon: '💰', label: 'Fees Due', to: '/parent/fees',
                value: data.pending_fees > 0
                  ? `₹${data.pending_fees >= 1000 ? `${(data.pending_fees / 1000).toFixed(1)}k` : data.pending_fees}`
                  : 'Clear',
                color: data.pending_fees > 0 ? '#EF4444' : '#10B981',
                bg: data.pending_fees > 0 ? '#FEF2F2' : '#ECFDF5',
              },
              {
                icon: '📚', label: 'Homework', to: '/parent/homework',
                value: data.homework?.length || 0,
                color: '#F59E0B', bg: '#FFFBEB',
              },
              {
                icon: '📝', label: 'Exams Soon', to: '/parent/exams',
                value: data.exams?.length || 0,
                color: '#6366F1', bg: '#EEF2FF',
              },
            ].map(w => (
              <div
                key={w.label}
                onClick={() => navigate(w.to)}
                style={{
                  background: '#fff', borderRadius: 14, padding: '14px 14px',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: `1px solid ${w.color}22`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 36, height: 36, background: w.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>{w.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: w.color, lineHeight: 1 }}>{w.value}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 4 }}>{w.label}</div>
              </div>
            ))}
          </div>

          {/* Recent attendance mini-grid */}
          {data.attendance_recent?.length > 0 && (
            <div
              onClick={() => navigate('/parent/attendance')}
              style={{ background: '#fff', borderRadius: 16, padding: '16px 16px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                📅 Recent Attendance
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{data.attendance_pct}% this month</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {data.attendance_recent.slice(-14).map((a, i) => {
                  const c  = a.status === 'Present' ? '#10B981' : a.status === 'Absent' ? '#EF4444' : '#F59E0B'
                  const bg = a.status === 'Present' ? '#ECFDF5' : a.status === 'Absent' ? '#FEF2F2' : '#FFFBEB'
                  return (
                    <div key={i} title={`${a.date} — ${a.status}`} style={{
                      width: 32, height: 32, borderRadius: 8, background: bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, color: c,
                    }}>
                      {new Date(a.date).getDate()}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upcoming homework preview */}
          {data.homework?.length > 0 && (
            <div
              onClick={() => navigate('/parent/homework')}
              style={{ background: '#fff', borderRadius: 16, padding: '16px 16px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                📚 Upcoming Homework
                <span style={{ marginLeft: 8, fontSize: 10, color: '#6366F1', fontWeight: 700 }}>View all →</span>
              </div>
              {data.homework.slice(0, 3).map(hw => {
                const days = Math.ceil((new Date(hw.due_date) - new Date()) / 86400000)
                return (
                  <div key={hw.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{hw.title}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{hw.subject?.name}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                      color: days <= 0 ? '#EF4444' : days === 1 ? '#F59E0B' : '#10B981',
                      background: days <= 0 ? '#FEF2F2' : days === 1 ? '#FFFBEB' : '#ECFDF5',
                      padding: '2px 8px', borderRadius: 20,
                    }}>
                      {days <= 0 ? 'Overdue' : days === 1 ? 'Tomorrow' : `${days}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Upcoming exams */}
          {data.exams?.length > 0 && (
            <div
              onClick={() => navigate('/parent/exams')}
              style={{ background: '#fff', borderRadius: 16, padding: '16px 16px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                📝 Upcoming Exams
                <span style={{ marginLeft: 8, fontSize: 10, color: '#6366F1', fontWeight: 700 }}>View all →</span>
              </div>
              {data.exams.slice(0, 2).map(ex => (
                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: 10, marginBottom: 6, border: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{ex.name}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{ex.type}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#6366F1', fontWeight: 700 }}>
                    {new Date(ex.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Quick nav shortcuts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { icon: '🗓️', label: 'Timetable', to: '/parent/timetable'    },
              { icon: '📢', label: 'Notices',   to: '/parent/announcements' },
              { icon: '📋', label: 'Leaves',    to: '/parent/leaves'        },
              { icon: '🧠', label: 'Quiz',      to: '/parent/quiz'          },
            ].map(s => (
              <div
                key={s.label}
                onClick={() => navigate(s.to)}
                style={{
                  background: '#fff', borderRadius: 14, padding: '14px 10px',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.07)', textAlign: 'center', cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{s.label}</div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
