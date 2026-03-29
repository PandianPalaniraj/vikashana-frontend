import api from './axios'

// GET /attendance?class_id=1&section=A&date=2024-03-01
export const getAttendance    = (params)   => api.get('/attendance', { params })

// POST /attendance  body: { class_id, section, date, records: [{student_id, status}] }
export const markAttendance   = (data)     => api.post('/attendance', data)

// PUT /attendance/:id
export const updateAttendance = (id, data) => api.put(`/attendance/${id}`, data)

// GET /attendance/report?class_id=1&section=A&from=2024-03-01&to=2024-03-31
export const getReport        = (params)   => api.get('/attendance/report', { params })

// GET /attendance/student/:studentId?month=2024-03
export const getStudentReport = (studentId, params) => api.get(`/attendance/student/${studentId}`, { params })
