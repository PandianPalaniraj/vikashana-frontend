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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// status → color/bg
const STATUS_STYLE = {
  Present: { color: '#10B981', bg: '#ECFDF5', dot: '#10B981' },
  Absent:  { color: '#EF4444', bg: '#FEF2F2', dot: '#EF4444' },
  Late:    { color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
}

export default function ParentAttendance() {
  const navigate = useNavigate()
  const activeStudent = useParentStore(s => s.activeStudent)

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)  // 1-based
  const [data,  setData]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!activeStudent) { navigate('/parent/select', { replace: true }); return }
    load()
  }, [activeStudent, month, year])

  function load() {
    setLoading(true); setError(null)
    parentApi.getAttendance(activeStudent.student_id, month, year)
      .then(res => {
        if (!res.success) throw new Error()
        setData(res.data)
      })
      .catch(() => setError('Could not load attendance. Please try again.'))
      .finally(() => setLoading(false))
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const today = new Date()
    if (year > today.getFullYear() || (year === today.getFullYear() && month >= today.getMonth() + 1)) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  // Build calendar grid
  function buildCalendar(records) {
    const byDate = {}
    records.forEach(r => { byDate[String(r.date).slice(0, 10)] = r.status })

    const firstDay = new Date(year, month - 1, 1)
    const daysInMonth = new Date(year, month, 0).getDate()
    // Monday-based offset: (0=Sun→6, 1=Mon→0, ..., 6=Sat→5)
    const startOffset = (firstDay.getDay() + 6) % 7

    const cells = []
    // Empty cells before day 1
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      cells.push({ day: d, date: dateStr, status: byDate[dateStr] || null })
    }
    return cells
  }

  if (!activeStudent) return null

  const p = 16
  const records = data?.records || []
  const summary = data?.summary || {}
  const cells   = data ? buildCalendar(records) : []
  const absentDays = records.filter(r => r.status === 'Absent')
  const today = new Date()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  return (
    <div style={{ padding: p }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginBottom: 16 }}>
        {activeStudent.name}'s Attendance
      </div>

      {/* Month selector */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 8px rgba(0,0,0,0.07)', marginBottom: 14,
      }}>
        <button
          onClick={prevMonth}
          style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 16, cursor: 'pointer', fontWeight: 700 }}
        >‹</button>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>{monthLabel}</div>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          style={{
            background: isCurrentMonth ? '#F8FAFC' : '#F1F5F9',
            border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 16,
            cursor: isCurrentMonth ? 'default' : 'pointer', fontWeight: 700,
            color: isCurrentMonth ? '#CBD5E1' : '#0F172A',
          }}
        >›</button>
      </div>

      {error && <ErrorBanner msg={error} onRetry={load} />}

      {loading && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Skeleton h={72} />
          <Skeleton h={280} />
        </div>
      )}

      {!loading && data && (
        <div style={{ display: 'grid', gap: 14 }}>

          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { label: 'Present', value: summary.present ?? 0, color: '#10B981', bg: '#ECFDF5' },
              { label: 'Absent',  value: summary.absent  ?? 0, color: '#EF4444', bg: '#FEF2F2' },
              { label: 'Late',    value: summary.late    ?? 0, color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Pct.',    value: `${summary.percentage ?? 0}%`, color: '#6366F1', bg: '#EEF2FF' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, borderRadius: 12, padding: '10px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: s.color, opacity: 0.75 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Calendar */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 12px', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 6 }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94A3B8', paddingBottom: 4 }}>{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
              {cells.map((cell, i) => {
                if (!cell) return <div key={`e-${i}`} />
                const st = cell.status ? STATUS_STYLE[cell.status] : null
                const isToday = isCurrentMonth && cell.day === today.getDate()
                const isFuture = isCurrentMonth && cell.day > today.getDate()
                return (
                  <div
                    key={cell.date}
                    title={cell.status || ''}
                    style={{
                      height: 36, borderRadius: 8,
                      background: st ? st.bg : isFuture ? 'transparent' : '#F8FAFC',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 2,
                      border: isToday ? '2px solid #6366F1' : '2px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: isToday ? 900 : 700, color: st ? st.color : isFuture ? '#CBD5E1' : '#94A3B8' }}>
                      {cell.day}
                    </span>
                    {st && <div style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot }} />}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_STYLE).map(([label, s]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: s.bg, border: `1.5px solid ${s.color}` }} />
                  <span style={{ color: '#64748B', fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Absent days list */}
          {absentDays.length > 0 && (
            <div style={{ background: '#FEF2F2', borderRadius: 14, padding: '14px 16px', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#DC2626', marginBottom: 8 }}>
                Absent on {absentDays.length} day{absentDays.length > 1 ? 's' : ''} this month:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {absentDays.map(r => (
                  <span key={r.date} style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: '#fff', padding: '2px 10px', borderRadius: 20, border: '1px solid #FECACA' }}>
                    {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {records.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No attendance records for this month</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
