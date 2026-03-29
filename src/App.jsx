import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import useParentStore from './store/parentStore'
import useSubscriptionStore from './store/subscriptionStore'
import { me } from './api/auth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import ParentLayout from './components/parent/ParentLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Students from './pages/students/Students'
import Attendance from './pages/attendance/Attendance'
import Exams from './pages/exams/Exams'
import Marks from './pages/marks/Marks'
import Fees from './pages/fees/Fees'
import Teachers from './pages/teachers/Teachers'
import Classes from './pages/classes/Classes'
import Communications from './pages/communications/Communications'
import Admissions from './pages/admissions/Admissions'
import Homework from './pages/homework/Homework'
import Settings from './pages/settings/Settings'
import FeedbackPage from './pages/settings/Feedback'
import Profile from './pages/profile/Profile'
import StudentSelect from './pages/parent/StudentSelect'
import ParentHome from './pages/parent/ParentHome'
import ParentAttendance from './pages/parent/ParentAttendance'
import ParentFees from './pages/parent/ParentFees'
import ParentMarks from './pages/parent/ParentMarks'
import ParentHomework from './pages/parent/ParentHomework'
import ParentExams from './pages/parent/ParentExams'
import ParentNotifications from './pages/parent/ParentNotifications'
import ParentTimetable from './pages/parent/ParentTimetable'
import ParentProfile from './pages/parent/ParentProfile'
import ParentQuiz from './pages/parent/ParentQuiz'
import ParentLeaves from './pages/parent/ParentLeaves'
import ParentAnnouncements from './pages/parent/ParentAnnouncements'
import Leaves from './pages/leaves/Leaves'
import Notifications from './pages/notifications/Notifications'

function App() {
  const { token, setAuth, clearAuth } = useAuthStore()

  // Restore session if token exists but user object is missing
  useEffect(() => {
    if (token && !useAuthStore.getState().user) {
      me()
        .then(res => {
          const userData = res.data.data
          setAuth(userData, token)
          // Restore subscription state
          if (userData.subscription) {
            useSubscriptionStore.getState().setSubscription(userData.subscription)
          }
          // Restore parent children if applicable
          if (userData.role === 'parent' && userData.children) {
            useParentStore.getState().setChildren(userData.children)
          }
        })
        .catch(() => {
          clearAuth()
          window.location.href = '/login'
        })
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* ── Parent portal — all routes use ParentLayout ─────────── */}
        {/* ParentLayout renders <Outlet /> only for /parent/select   */}
        {/* so StudentSelect stays full-screen with its own background */}
        <Route
          path="/parent"
          element={
            <ProtectedRoute roles={['parent']}>
              <ParentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="select"        element={<StudentSelect />} />
          <Route path="dashboard"     element={<ParentHome />} />
          <Route path="attendance"    element={<ParentAttendance />} />
          <Route path="fees"          element={<ParentFees />} />
          <Route path="marks"         element={<ParentMarks />} />
          <Route path="homework"      element={<ParentHomework />} />
          <Route path="exams"         element={<ParentExams />} />
          <Route path="notifications"  element={<ParentNotifications />} />
          <Route path="announcements" element={<ParentAnnouncements />} />
          <Route path="timetable"     element={<ParentTimetable />} />
          <Route path="profile"       element={<ParentProfile />} />
          <Route path="quiz"          element={<ParentQuiz />} />
          <Route path="leaves"        element={<ParentLeaves />} />
          {/* Default /parent → /parent/dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ── Admin / teacher app — sidebar layout ─────────────────── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"      element={<Dashboard />} />
          <Route path="students"       element={<Students />} />
          <Route path="attendance"     element={<Attendance />} />
          <Route path="exams"          element={<Exams />} />
          <Route path="marks"          element={<Marks />} />
          <Route path="fees"           element={<ProtectedRoute roles={['admin','super_admin']}><Fees /></ProtectedRoute>} />
          <Route path="teachers"       element={<Teachers />} />
          <Route path="classes"        element={<Classes />} />
          <Route path="communications" element={<Communications />} />
          <Route path="admissions"     element={<ProtectedRoute roles={['admin','super_admin','teacher']}><Admissions /></ProtectedRoute>} />
          <Route path="homework"       element={<Homework />} />
          <Route path="leaves"         element={<Leaves />} />
          <Route path="notifications"  element={<Notifications />} />
          <Route path="settings"       element={<ProtectedRoute roles={['admin','super_admin']}><Settings /></ProtectedRoute>} />
          <Route path="feedback"       element={<ProtectedRoute roles={['admin','super_admin']}><FeedbackPage /></ProtectedRoute>} />
          <Route path="profile"        element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
