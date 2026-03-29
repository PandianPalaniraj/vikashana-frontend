import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useParentStore from '../../store/parentStore'
import { useBreakpoint } from '../../hooks/responsive.jsx'
import { getMyChildren, getStudentDashboard } from '../../api/parent'
import { logout } from '../../api/auth'

const palette = ['#6366F1', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ name, photo, size = 54 }) {
  const bg = palette[(name || 'A').charCodeAt(0) % palette.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: photo ? '#F8FAFC' : bg, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 900, color: '#fff',
      border: '3px solid rgba(255,255,255,0.3)',
    }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials(name)
      }
    </div>
  )
}

export default function ParentDashboard() {
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  const { user, clearAuth } = useAuthStore()
  const activeStudent  = useParentStore(s => s.activeStudent)
  const children       = useParentStore(s => s.children)
  const setActiveStudent = useParentStore(s => s.setActiveStudent)
  const setChildren    = useParentStore(s => s.setChildren)
  const clearParent    = useParentStore(s => s.clearParent)
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const switcherRef = useRef()

  // Direct localStorage read as a synchronous fallback — guards against
  // Zustand rehydration not having propagated to this component yet.
  const storedChildren = (() => {
    try { return JSON.parse(localStorage.getItem('parentChildren') || '[]') } catch { return [] }
  })()
  const displayChildren = children.length > 0 ? children : storedChildren
  const childCount = displayChildren.length

  // Close switcher on outside click
  useEffect(() => {
    const handler = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setShowSwitcher(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // On mount: always fetch children so the switcher is populated,
  // and handle routing if activeStudent is not set (e.g. after page refresh).
  useEffect(() => {
    getMyChildren()
      .then(res => {
        const kids = res.data.data || []
        setChildren(kids)
        // Only redirect if we don't already have an active student in the store
        if (!useParentStore.getState().activeStudent) {
          if (kids.length === 1) {
            setActiveStudent(kids[0])
          } else {
            navigate('/parent/select', { replace: true })
          }
        }
      })
      .catch(() => {
        if (!useParentStore.getState().activeStudent) {
          navigate('/parent/select', { replace: true })
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch dashboard data whenever the active student changes
  useEffect(() => {
    if (!activeStudent) return
    setLoading(true)
    setData(null)
    getStudentDashboard(activeStudent.student_id)
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeStudent])

  const handleLogout = async () => {
    try { await logout() } catch (_) {}
    clearAuth()
    clearParent()
    navigate('/login', { replace: true })
  }

  // Children are always populated by the mount fetch, so just toggle
  const handleSwitcherOpen = () => setShowSwitcher(s => !s)

  // Only block render when we have no active student at all.
  // If activeStudent is set from localStorage, render immediately
  // while the children fetch runs in the background.
  if (!activeStudent) return null

  return (
    <div style={{
      fontFamily: "'Segoe UI',sans-serif",
      background: '#F0F4F8', minHeight: '100vh',
    }}>
      {/* Top nav bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        padding: '0 20px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>
          🏫 Vikashana
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
            {user?.name}
          </span>
          <button onClick={handleLogout} style={{
            background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA',
            borderRadius: 7, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: isMobile ? 12 : 24 }}>
        {/* Student header with switcher */}
        <div style={{
          background: 'linear-gradient(135deg,#0F172A 0%,#1E3A5F 55%,#6366F1 100%)',
          borderRadius: 20, padding: isMobile ? '16px' : '24px 28px',
          marginBottom: 20, color: '#fff', position: 'relative',
          // NOTE: NO overflow:hidden here — it would clip the switcher dropdown.
          // The decorative circle is clipped by its own sibling container below.
        }}>
          {/* Decorative background — isolated overflow:hidden so it doesn't clip dropdown */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={activeStudent.name} photo={activeStudent.photo} size={54} />
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 2 }}>
                  Viewing dashboard for
                </div>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, letterSpacing: -0.5 }}>
                  {activeStudent.name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  Class {activeStudent.class}-{activeStudent.section} · {activeStudent.admission_no}
                </div>
              </div>
            </div>

            {/* Switch child button */}
            {childCount > 1 && (
              <div ref={switcherRef} style={{ position: 'relative' }}>
                <button
                  onClick={handleSwitcherOpen}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff', borderRadius: 10,
                    padding: '8px 16px', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  🔄 Switch Child
                  <span style={{
                    background: 'rgba(255,255,255,0.25)', borderRadius: 20,
                    padding: '0 6px', fontSize: 10, fontWeight: 800,
                  }}>
                    {childCount}
                  </span>
                </button>

                {showSwitcher && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: '#fff', borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    zIndex: 100, minWidth: 230, overflow: 'hidden',
                  }}>
                    <div style={{ padding: '8px 14px 6px', fontSize: 9, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Your Children
                    </div>
                    {displayChildren.map(child => {
                      const isActive = child.student_id === activeStudent.student_id
                      return (
                        <div
                          key={child.student_id}
                          onClick={() => { setActiveStudent(child); setShowSwitcher(false) }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer',
                            background: isActive ? '#EEF2FF' : '#fff',
                            display: 'flex', alignItems: 'center', gap: 10,
                            borderTop: '1px solid #F1F5F9',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC' }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#fff' }}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: palette[child.name.charCodeAt(0) % palette.length],
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 900, color: '#fff', overflow: 'hidden',
                          }}>
                            {child.photo
                              ? <img src={child.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : initials(child.name)
                            }
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#6366F1' : '#0F172A' }}>
                              {child.name}
                            </div>
                            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                              Class {child.class}-{child.section}
                            </div>
                          </div>
                          {isActive && <span style={{ fontSize: 12, color: '#6366F1', fontWeight: 800 }}>✓</span>}
                        </div>
                      )
                    })}
                    <div
                      onClick={() => { localStorage.removeItem('activeStudentId'); navigate('/parent/select') }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#6366F1', fontWeight: 700 }}
                    >
                      ← All Students
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: '#fff', borderRadius: 14, height: 90, animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          </div>
        )}

        {/* Dashboard content */}
        {!loading && data && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* KPI widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14 }}>
              {[
                { icon: '📅', label: 'Attendance', value: `${data.attendance_pct}%`, color: '#10B981', bg: '#ECFDF5' },
                {
                  icon: '💰', label: 'Fees Due',
                  value: data.pending_fees > 0
                    ? `₹${data.pending_fees >= 1000 ? `${(data.pending_fees / 1000).toFixed(1)}k` : data.pending_fees}`
                    : 'Clear',
                  color: data.pending_fees > 0 ? '#EF4444' : '#10B981',
                  bg: data.pending_fees > 0 ? '#FEF2F2' : '#ECFDF5',
                },
                { icon: '📚', label: 'Homework', value: data.homework?.length || 0, color: '#F59E0B', bg: '#FFFBEB' },
                { icon: '📝', label: 'Exams Soon', value: data.exams?.length || 0, color: '#6366F1', bg: '#EEF2FF' },
              ].map(w => (
                <div key={w.label} style={{
                  background: '#fff', borderRadius: 14, padding: '14px 16px',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: `1px solid ${w.color}18`,
                }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{w.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: w.color, lineHeight: 1 }}>{w.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 4 }}>{w.label}</div>
                </div>
              ))}
            </div>

            {/* Homework + Exams */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              {/* Upcoming Homework */}
              <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 14 : 20, boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', marginBottom: 14 }}>📚 Upcoming Homework</div>
                {data.homework?.length > 0 ? data.homework.map(hw => {
                  const days = Math.ceil((new Date(hw.due_date) - new Date()) / 86400000)
                  const urgent = days <= 1
                  return (
                    <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F8FAFC' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hw.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{hw.subject?.name}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                        color: urgent ? '#EF4444' : '#F59E0B',
                        background: urgent ? '#FEF2F2' : '#FFFBEB',
                        padding: '2px 8px', borderRadius: 20,
                      }}>
                        {days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                      </span>
                    </div>
                  )
                }) : (
                  <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: 20 }}>No pending homework 🎉</div>
                )}
              </div>

              {/* Upcoming Exams */}
              <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 14 : 20, boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', marginBottom: 14 }}>📝 Upcoming Exams</div>
                {data.exams?.length > 0 ? data.exams.map(ex => (
                  <div key={ex.id} style={{ padding: '10px 14px', borderRadius: 10, background: '#F8FAFC', marginBottom: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', marginBottom: 2 }}>{ex.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{ex.type}</span>
                      <span style={{ fontSize: 11, color: '#6366F1', fontWeight: 700 }}>
                        {new Date(ex.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: 20 }}>No upcoming exams</div>
                )}
              </div>
            </div>

            {/* Recent Attendance */}
            <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 14 : 20, boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', marginBottom: 14 }}>
                📅 Recent Attendance
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>
                  {data.attendance_pct}% present
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.attendance_recent?.map((a, i) => {
                  const c = a.status === 'Present' ? '#10B981' : a.status === 'Absent' ? '#EF4444' : '#F59E0B'
                  const bg = a.status === 'Present' ? '#ECFDF5' : a.status === 'Absent' ? '#FEF2F2' : '#FFFBEB'
                  return (
                    <div key={i} title={`${a.date} — ${a.status}`} style={{
                      width: 32, height: 32, borderRadius: 8, background: bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: c,
                    }}>
                      {new Date(a.date).getDate()}
                    </div>
                  )
                })}
                {(!data.attendance_recent || data.attendance_recent.length === 0) && (
                  <div style={{ color: '#94A3B8', fontSize: 13 }}>No attendance records yet</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
                {[['Present', '#10B981', '#ECFDF5'], ['Absent', '#EF4444', '#FEF2F2'], ['Late', '#F59E0B', '#FFFBEB']].map(([l, c, bg]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1.5px solid ${c}` }} />
                    <span style={{ color: '#64748B', fontWeight: 600 }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Marks */}
            {data.marks?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 14 : 20, boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', marginBottom: 14 }}>📊 Recent Marks</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {data.marks.slice(0, 5).map((m, i) => {
                    const score = m.marks_obtained || 0
                    const c = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{m.subject?.name}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{m.exam?.name}</div>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: c }}>{m.marks_obtained}</div>
                        {m.grade && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: c, background: `${c}18`, padding: '2px 8px', borderRadius: 20 }}>
                            {m.grade}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
