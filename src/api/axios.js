import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach Bearer token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global 401 handler — handles deactivation & token expiry
const DEACTIVATION_CODES = ['SCHOOL_DEACTIVATED', 'ACCOUNT_DEACTIVATED', 'SCHOOL_NOT_FOUND']

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const data = err.response?.data || {}
      const msg  = DEACTIVATION_CODES.includes(data.code)
        ? data.message
        : null

      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('subscription')

      if (msg) {
        // Show message then redirect so the user knows why they were logged out
        const banner = document.createElement('div')
        banner.textContent = msg
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:#fff;padding:14px 20px;font-size:14px;font-weight:700;text-align:center;'
        document.body.appendChild(banner)
        setTimeout(() => { window.location.href = '/login' }, 2500)
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
