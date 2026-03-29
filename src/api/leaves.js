import api from './axios'

export const getLeaves    = (params = {}) => api.get('/leaves', { params })
export const reviewLeave  = (id, data) => api.put(`/leaves/${id}`, data)
export const deleteLeave  = (id)       => api.delete(`/leaves/${id}`)
export const getClasses   = ()         => api.get('/classes')
