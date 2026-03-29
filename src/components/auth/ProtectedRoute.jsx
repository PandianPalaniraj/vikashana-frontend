import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuthStore()
  const location = useLocation()

  if (!token) return <Navigate to="/login" replace />

  // If a parent tries to access the admin/teacher dashboard, redirect to parent dashboard
  if (user?.role === 'parent' && location.pathname === '/dashboard') {
    return <Navigate to="/parent/dashboard" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    // Parents who somehow land on a role-restricted page go to their dashboard
    if (user.role === 'parent') return <Navigate to="/parent/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }

  return children
}
