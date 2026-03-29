// ─────────────────────────────────────────────────────────────
// MOBILE APP INTEGRATION NOTES:
// - Replace localStorage.getItem('token') with:
//     import * as SecureStore from 'expo-secure-store'
//     await SecureStore.getItemAsync('token')
// - Replace BASE with: 'https://yourproductiondomain.com/api/v1'
// - All endpoints are identical between web and mobile.
// - Response shape is always: { success, data, meta }
// - Authentication is always: Bearer token in Authorization header
// - No cookies, no sessions, no CSRF tokens needed.
// - For React Native bottom nav, use @react-navigation/bottom-tabs
//   with the same 5 tabs and icons.
// ─────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1'

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
})

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(), ...options })
  if (res.status === 401) {
    window.location.href = '/login'
    return { success: false, data: null }
  }
  return res.json()
}

const parentApi = {
  getChildren: () =>
    apiFetch('/parents/my-children'),

  getDashboard: (studentId) =>
    apiFetch(`/parents/student/${studentId}/dashboard`),

  getAttendance: (studentId, month, year) =>
    apiFetch(`/students/${studentId}/attendance?month=${year}-${String(month).padStart(2, '0')}`),

  getFees: (studentId) =>
    apiFetch(`/students/${studentId}/fees`),

  getMarks: (studentId) =>
    apiFetch(`/students/${studentId}/marks`),

  getHomework: (classId, sectionId) =>
    apiFetch(`/homework?class_id=${classId}&section_id=${sectionId}&status=Active`),

  getExams: (classId) =>
    apiFetch(`/exams?class_id=${classId}`),

  getExamDetail: (examId) =>
    apiFetch(`/exams/${examId}`),

  getTimetable: (classId, sectionId) =>
    apiFetch(`/timetable?class_id=${classId}&section_id=${sectionId}`),

  getAnnouncements: () =>
    apiFetch('/announcements'),

  // Leaves
  getLeaves: (studentId) =>
    apiFetch(`/leaves?student_id=${studentId}`),

  applyLeave: (data) =>
    apiFetch('/leaves', { method: 'POST', body: JSON.stringify(data) }),

  cancelLeave: (id) =>
    apiFetch(`/leaves/${id}`, { method: 'DELETE' }),

  // Quiz
  getQuizClasses: () =>
    apiFetch('/quiz/classes'),

  getQuizSubjects: (classId) =>
    apiFetch(`/quiz/subjects?class_id=${classId}`),

  getQuizQuestions: (classId, subjectId, limit = 20) =>
    apiFetch(`/quiz/questions?class_id=${classId}&subject_id=${subjectId}&limit=${limit}`),

  checkQuizAnswer: (questionId, answer) =>
    apiFetch('/quiz/check', { method: 'POST', body: JSON.stringify({ question_id: questionId, answer }) }),
}

export default parentApi

// ── Legacy named exports for ParentDashboard.jsx backwards-compat ─────────────
// ParentDashboard uses axios-style res.data.data — wrap fetch response to match.
// Do not remove these exports.
export const getMyChildren = () =>
  parentApi.getChildren().then(data => ({ data }))

export const getStudentDashboard = (studentId) =>
  parentApi.getDashboard(studentId).then(data => ({ data }))
