import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../api/auth'
import useAuthStore from '../../store/authStore'
import useParentStore from '../../store/parentStore'
import useSubscriptionStore from '../../store/subscriptionStore'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const { setChildren } = useParentStore()
  const { setSubscription } = useSubscriptionStore()

  // Redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) navigate('/dashboard', { replace: true })
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Send identifier as-is — backend detects phone vs email
      const res = await login({ email: identifier, password })
      const { user, token } = res.data.data
      setAuth(user, token)
      if (user.subscription) setSubscription(user.subscription)

      if (user.role === 'parent') {
        // Store children if returned in login response, then go to select screen
        if (user.children) setChildren(user.children)
        navigate('/parent/select', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.message ||
        'Invalid credentials'
      )
    } finally {
      setLoading(false)
    }
  }

  const isPhone = /^[0-9]/.test(identifier)

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F4F8' }}>
      <div style={{ background:'#fff', padding:40, borderRadius:16, width:400, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:28 }}>
          <img src="/logo-primary.svg" alt="Vikashana" style={{ height:110, width:'auto' }} />
        </div>

        {error && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
              Mobile Number / Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              placeholder="10-digit mobile or admin email"
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #E2E8F0', fontSize:14, outline:'none', boxSizing:'border-box' }}
            />
            <p style={{ margin:'5px 0 0', fontSize:11, color:'#94A3B8' }}>
              {isPhone
                ? '📱 Logging in as teacher / parent'
                : '📧 Logging in as admin'}
            </p>
          </div>

          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #E2E8F0', fontSize:14, outline:'none', boxSizing:'border-box' }}
            />
            <p style={{ margin:'5px 0 0', fontSize:11, color:'#94A3B8' }}>
              Teachers &amp; Parents: initial password is date of birth in <strong>ddmmyyyy</strong> format
              &nbsp;·&nbsp; e.g. <code style={{ background:'#F1F5F9', padding:'1px 5px', borderRadius:4 }}>14031985</code> for 14 Mar 1985
            </p>
          </div>

          <button type="submit" disabled={loading}
            style={{ background:'linear-gradient(135deg,#6366F1,#4F46E5)', color:'#fff', border:'none', borderRadius:8, padding:'12px', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, marginTop:4 }}>
            {loading ? 'Logging in…' : 'Login →'}
          </button>
        </form>
      </div>
    </div>
  )
}
