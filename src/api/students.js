import api from './axios'

export const getStudents    = (params)     => api.get('/students', { params })
export const getStudent     = (id)         => api.get(`/students/${id}`)
export const createStudent  = (data)       => api.post('/students', data)
export const updateStudent  = (id, data)   => api.put(`/students/${id}`, data)
export const deleteStudent  = (id)         => api.delete(`/students/${id}`)
export const searchStudents = (query)      => api.get('/students/search', { params: { q: query } })
