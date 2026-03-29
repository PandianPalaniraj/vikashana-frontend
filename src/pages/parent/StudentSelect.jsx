import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useParentStore from '../../store/parentStore'
import { getMyChildren } from '../../api/parent'

const palette = ['#6366F1', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function StudentSelect() {
  const { user, clearAuth } = useAuthStore()
  const { setActiveStudent, setChildren } = useParentStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [children, setLocalChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // When the user explicitly taps "Switch", force:true is passed in state
  // so we skip the savedId auto-forward and always show the picker.
  const forceShow = location.state?.force === true

  useEffect(() => {
    getMyChildren()
      .then(res => {
        const data = res.data.data || []
        setLocalChildren(data)
        setChildren(data)

        // Auto-forward if only one child (nothing to choose from)
        if (data.length === 1) {
          setActiveStudent(data[0])
          navigate('/parent/dashboard', { replace: true })
          return
        }

        // Skip savedId auto-forward when the user deliberately opened the picker
        if (forceShow) return

        // Restore previously active student if available (e.g. page refresh)
        const savedId = localStorage.getItem('activeStudentId')
        if (savedId && data.length > 0) {
          const match = data.find(c => String(c.student_id) === savedId)
          if (match) {
            setActiveStudent(match)
            navigate('/parent/dashboard', { replace: true })
          }
        }
      })
      .catch(() => setError('Failed to load children. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = (child) => {
    // Always repopulate children before setting active, so the
    // switcher dropdown in ParentDashboard has the full list.
    setChildren(children)
    setActiveStudent(child)
    navigate('/parent/dashboard', { replace: true })
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#6366F1 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32, color: '#fff' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>👨‍👩‍👧‍👦</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px', letterSpacing: -0.5 }}>
            Welcome, {user?.name || 'Parent'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
            Select a student to view their dashboard
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'grid', gap: 12 }}>
            {[1, 2].map(i => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: 16,
                padding: '18px 20px', height: 88,
                animation: 'pulse 1.5s infinite',
              }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            background: '#FEF2F2', borderRadius: 12, padding: '14px 18px',
            color: '#DC2626', fontSize: 13, fontWeight: 600, textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Children list */}
        {!loading && !error && (
          <div style={{ display: 'grid', gap: 12 }}>
            {children.map(child => {
              const bg = palette[child.name.charCodeAt(0) % palette.length]
              const attColor = child.today_attendance === 'Present' ? '#10B981'
                : child.today_attendance === 'Absent' ? '#EF4444' : '#94A3B8'
              const attBg = child.today_attendance === 'Present' ? '#ECFDF5'
                : child.today_attendance === 'Absent' ? '#FEF2F2' : '#F1F5F9'

              return (
                <div
                  key={child.student_id}
                  onClick={() => handleSelect(child)}
                  style={{
                    background: '#fff', borderRadius: 16, padding: '18px 20px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                    background: child.photo ? '#F8FAFC' : bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 900, color: '#fff', overflow: 'hidden',
                  }}>
                    {child.photo
                      ? <img src={child.photo} alt={child.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initials(child.name)
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', marginBottom: 3 }}>
                      {child.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                      Class {child.class}-{child.section} · {child.admission_no}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: attColor,
                        background: attBg, padding: '2px 8px', borderRadius: 20,
                      }}>
                        {child.today_attendance === 'Not Marked' ? '— Not Marked' : child.today_attendance}
                      </span>
                      {child.pending_fees > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: '#EF4444',
                          background: '#FEF2F2', padding: '2px 8px', borderRadius: 20,
                        }}>
                          ₹{child.pending_fees >= 1000
                            ? `${(child.pending_fees / 1000).toFixed(1)}k`
                            : child.pending_fees} due
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{ fontSize: 22, color: '#94A3B8', flexShrink: 0 }}>›</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Logout */}
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.4)', fontSize: 12,
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
