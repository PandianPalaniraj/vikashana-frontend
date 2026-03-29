import { NavLink } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

const NAV = [
  { to: '/dashboard',      icon: '🏠',   label: 'Dashboard'      },
  { to: '/students',       icon: '👨‍🎓', label: 'Students'       },
  { to: '/attendance',     icon: '📅',   label: 'Attendance'     },
  { to: '/exams',          icon: '📝',   label: 'Exams'          },
  { to: '/marks',          icon: '📊',   label: 'Marks'          },
  { to: '/fees',           icon: '💰',   label: 'Fees'           },
  { to: '/teachers',       icon: '👨‍🏫', label: 'Teachers'       },
  { to: '/classes',        icon: '🏫',   label: 'Classes'        },
  { to: '/homework',       icon: '📚',   label: 'Homework'       },
  { to: '/communications', icon: '📢',   label: 'Communications' },
  { to: '/admissions',     icon: '🎓',   label: 'Admissions'     },
  { to: '/feedback',       icon: '💬',   label: 'Feedback'       },
  { to: '/settings',       icon: '⚙️',   label: 'Settings'       },
]

export default function Sidebar() {
  const { user } = useAuthStore()

  return (
    <aside style={{ width: 220, background: '#0F172A', color: '#fff', display: 'flex', flexDirection: 'column', padding: '18px 12px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '0 4px' }}>
        <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366F1,#10B981)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏫</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.3px' }}>Vikashana</div>
          <div style={{ fontSize: 10, color: '#64748B' }}>School Manager</div>
        </div>
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', borderRadius: 8, textDecoration: 'none',
            fontSize: 13, fontWeight: 600,
            background: isActive ? 'rgba(99,102,241,0.22)' : 'transparent',
            color: isActive ? '#A5B4FC' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.15s',
          })}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, marginTop: 14 }}>
        <div style={{ fontSize: 11, color: '#475569' }}>Logged in as</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', marginTop: 2 }}>{user?.name || 'Admin'}</div>
        <div style={{ fontSize: 11, color: '#6366F1', fontWeight: 600 }}>{user?.role || 'Super Admin'}</div>
      </div>
    </aside>
  )
}