import api from './axios'

export const login          = (credentials) => api.post('/auth/login', credentials)
export const selectSchool   = (data)        => api.post('/auth/select-school', data)
export const logout         = ()            => api.post('/auth/logout')
export const me             = ()            => api.get('/auth/me')
export const changePassword = (data)        => api.put('/auth/password', data)
export const updateProfile  = (data)        => {
  if (data instanceof FormData) {
    return api.post('/auth/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } })
  }
  return api.put('/auth/profile', data)
}
export const getActivity    = (limit = 20, offset = 0) => api.get(`/auth/activity?limit=${limit}&offset=${offset}`)
