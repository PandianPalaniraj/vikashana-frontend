import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, selectSchool } from '../../api/auth'
import useAuthStore from '../../store/authStore'
import useParentStore from '../../store/parentStore'
import useSubscriptionStore from '../../store/subscriptionStore'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  // Multi-school selection state
  const [schools, setSchools]             = useState([])
  const [showSchoolSelect, setShowSchool] = useState(false)
  const [pendingPassword, setPendingPw]   = useState('')
  const [selectLoading, setSelectLoad]    = useState(null) // user_id being selected

  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const { setChildren } = useParentStore()
  const { setSubscription } = useSubscriptionStore()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) navigate('/dashboard', { replace: true })
  }, [])

  const finishLogin = (user, token) => {
    setAuth(user, token)
    if (user.subscription) setSubscription(user.subscription)
    if (user.role === 'parent') {
      if (user.children) setChildren(user.children)
      navigate('/parent/select', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await login({ login: identifier, password })
      const body = res.data

      if (body.requires_school_selection) {
        // Show school picker modal
        setSchools(body.schools)
        setPendingPw(password)
        setShowSchool(true)
        return
      }

      finishLogin(body.data.user, body.data.token)
    } catch (err) {
      setError(
        err.response?.data?.errors?.login?.[0] ||
        err.response?.data?.message ||
        'Invalid credentials'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSchoolSelect = async (userId) => {
    setSelectLoad(userId)
    setError(null)
    try {
      const res = await selectSchool({ user_id: userId, password: pendingPassword })
      finishLogin(res.data.data.user, res.data.data.token)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to select school')
      setShowSchool(false)
    } finally {
      setSelectLoad(null)
    }
  }

  const isPhone = /^[0-9]/.test(identifier)

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F4F8' }}>
      <div style={{ background:'#fff', padding:40, borderRadius:16, width:400, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:28 }}>
          <img src="/logo.svg" alt="Vikashana" style={{ height:110, width:'auto' }} />
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
              {isPhone ? '📱 Teacher / Parent / Staff' : '📧 Admin login'}
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
            {isPhone && (
              <p style={{ margin:'5px 0 0', fontSize:11, color:'#94A3B8' }}>
                Default password: date of birth in <strong>ddmmyyyy</strong> format &nbsp;·&nbsp;
                e.g. <code style={{ background:'#F1F5F9', padding:'1px 5px', borderRadius:4 }}>14031985</code>
              </p>
            )}
          </div>

          <button type="submit" disabled={loading}
            style={{ background:'linear-gradient(135deg,#6366F1,#4F46E5)', color:'#fff', border:'none', borderRadius:8, padding:'12px', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, marginTop:4 }}>
            {loading ? 'Logging in…' : 'Login →'}
          </button>
        </form>

        <div style={{ marginTop:20, padding:'12px 14px', background:'#F8FAFC', borderRadius:8, fontSize:11, color:'#64748B', lineHeight:1.7 }}>
          🏫 <strong>Admins:</strong> use email address<br />
          👩‍🏫 <strong>Teachers &amp; Staff:</strong> use mobile number<br />
          👨‍👩‍👧 <strong>Parents:</strong> use mobile number<br />
          🔑 Default password: date of birth (ddmmyyyy)
        </div>
      </div>

      {/* ── School Selection Modal ── */}
      {showSchoolSelect && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}
          onClick={() => setShowSchool(false)}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:360, maxWidth:'90vw', boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:28, textAlign:'center', marginBottom:8 }}>🏫</div>
            <h3 style={{ margin:'0 0 6px', fontSize:18, fontWeight:800, color:'#0F172A', textAlign:'center' }}>Select Your School</h3>
            <p style={{ margin:'0 0 20px', fontSize:13, color:'#64748B', textAlign:'center' }}>
              You are registered in multiple schools. Choose one to continue.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {schools.map(s => (
                <button key={s.user_id} onClick={() => handleSchoolSelect(s.user_id)}
                  disabled={!!selectLoading}
                  style={{ padding:'14px 16px', border:'1px solid #E2E8F0', borderRadius:10, textAlign:'left', cursor:selectLoading===s.user_id?'not-allowed':'pointer', background: selectLoading===s.user_id?'#EEF2FF':'#F8FAFC', transition:'background 0.15s', outline:'none' }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>{s.school_name}</div>
                  <div style={{ fontSize:12, color:'#6366F1', textTransform:'capitalize', marginTop:2 }}>
                    {selectLoading===s.user_id ? '⏳ Logging in…' : s.role}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowSchool(false)}
              style={{ marginTop:16, width:'100%', padding:'10px', background:'#F1F5F9', border:'none', borderRadius:8, fontSize:13, color:'#64748B', cursor:'pointer', fontWeight:600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
