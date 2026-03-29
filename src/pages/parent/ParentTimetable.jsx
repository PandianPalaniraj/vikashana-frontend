import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useParentStore from '../../store/parentStore'
import parentApi from '../../api/parent'

const DAYS_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function todayName() {
  return DAYS_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
}

function Skeleton({ h = 48, r = 10 }) {
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

const PERIOD_COLORS = ['#6366F1','#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6']

export default function ParentTimetable() {
  const navigate = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)
  const [timetable, setTimetable] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeDay, setActiveDay] = useState(todayName())

  useEffect(() => {
    if (!activeStudent) { navigate('/parent/select', { replace: true }); return }
    load()
  }, [activeStudent])

  function load() {
    setLoading(true); setError(null)
    parentApi.getTimetable(activeStudent.class_id, activeStudent.section_id)
      .then(res => {
        if (!res.success) throw new Error()
        setTimetable(res.data || [])
      })
      .catch(() => setError('Could not load timetable. Please try again.'))
      .finally(() => setLoading(false))
  }

  if (!activeStudent) return null

  // Group by day
  const byDay = {}
  timetable.forEach(slot => {
    const d = slot.day || 'Other'
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(slot)
  })
  const availDays = DAYS_ORDER.filter(d => byDay[d]?.length > 0)
  const currentDay = availDays.includes(activeDay) ? activeDay : (availDays[0] || todayName())
  const daySlots = (byDay[currentDay] || []).sort((a, b) => {
    const pa = parseInt(a.period, 10) || 0
    const pb = parseInt(b.period, 10) || 0
    return pa - pb
  })

  // Assign a consistent color per subject name
  const subjectColorMap = {}
  let colorIdx = 0
  timetable.forEach(slot => {
    const name = slot.subject?.name
    if (name && !subjectColorMap[name]) {
      subjectColorMap[name] = PERIOD_COLORS[colorIdx % PERIOD_COLORS.length]
      colorIdx++
    }
  })

  return (
    <div style={{ padding: 16 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>
        Class Timetable
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 16 }}>
        Class {activeStudent.class}-{activeStudent.section}
      </div>

      {error && <ErrorBanner msg={error} onRetry={load} />}

      {loading && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1,2,3,4,5].map(i => <Skeleton key={i} h={34} r={20} />)}
          </div>
          {[1,2,3,4,5].map(i => <Skeleton key={i} h={70} />)}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Day tabs */}
          {availDays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗓️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>No timetable configured</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Contact your school to set up the class timetable.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
                {availDays.map(day => {
                  const isToday  = day === todayName()
                  const isActive = day === currentDay
                  return (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      style={{
                        flexShrink: 0, padding: '8px 16px', border: 'none', borderRadius: 24,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: isActive ? '#6366F1' : isToday ? '#EEF2FF' : '#fff',
                        color: isActive ? '#fff' : isToday ? '#6366F1' : '#64748B',
                        boxShadow: isActive ? '0 2px 10px rgba(99,102,241,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                        position: 'relative',
                      }}
                    >
                      {day.slice(0, 3)}
                      {isToday && (
                        <span style={{
                          position: 'absolute', top: -3, right: -3,
                          width: 8, height: 8, borderRadius: '50%',
                          background: isActive ? '#fff' : '#6366F1',
                          border: isActive ? '1.5px solid #6366F1' : 'none',
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Today label */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {currentDay === todayName() ? '📍 Today' : currentDay}
                <span style={{ marginLeft: 8, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                  · {daySlots.length} period{daySlots.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Period cards */}
              {daySlots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>No classes scheduled</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {daySlots.map((slot, i) => {
                    const subjectName = slot.subject?.name || '—'
                    const color = subjectColorMap[subjectName] || '#94A3B8'
                    return (
                      <div
                        key={slot.id || i}
                        style={{
                          background: '#fff', borderRadius: 14,
                          boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
                          display: 'flex', alignItems: 'center', gap: 14,
                          overflow: 'hidden',
                          borderLeft: `4px solid ${color}`,
                        }}
                      >
                        {/* Period number */}
                        <div style={{
                          width: 48, flexShrink: 0, padding: '16px 0',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          background: `${color}12`,
                        }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{slot.period}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: `${color}aa`, marginTop: 2 }}>PER.</div>
                        </div>

                        {/* Subject + teacher */}
                        <div style={{ flex: 1, padding: '14px 0' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{subjectName}</div>
                          {slot.teacher?.name && (
                            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 2 }}>
                              👤 {slot.teacher.name}
                            </div>
                          )}
                        </div>

                        <div style={{ paddingRight: 16 }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: '50%', background: color,
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Subject legend */}
              {Object.keys(subjectColorMap).length > 0 && (
                <div style={{ marginTop: 20, background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                    Subjects this week
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(subjectColorMap).map(([name, color]) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
