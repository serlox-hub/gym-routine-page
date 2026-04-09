import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import PrivateRoute from '@/components/Auth/PrivateRoute'
import { ActiveSessionBanner, LoadingSpinner } from './components/ui/index.js'
import Toast from './components/ui/Toast.jsx'
import BottomTabBar from './components/ui/BottomTabBar.jsx'
import OfflineBanner from './components/ui/OfflineBanner.jsx'
import { useAuth } from './hooks/useAuth.js'
import { colors } from './lib/styles.js'
import { useRestoreActiveSession, useSyncPendingSets } from './hooks/useWorkout.js'
import { useLanguageSync } from '@gym/shared'

const Landing = lazy(() => import('./pages/Landing.jsx'))
const Home = lazy(() => import('./pages/Home.jsx'))
const RoutineDetail = lazy(() => import('./pages/RoutineDetail.jsx'))
const WorkoutSession = lazy(() => import('./pages/WorkoutSession.jsx'))
const FreeWorkoutSession = lazy(() => import('./pages/FreeWorkoutSession.jsx'))
const History = lazy(() => import('./pages/History.jsx'))
const SessionDetail = lazy(() => import('./pages/SessionDetail.jsx'))
const Exercises = lazy(() => import('./pages/Exercises.jsx'))
const ExerciseProgress = lazy(() => import('./pages/ExerciseProgress.jsx'))
const NewRoutine = lazy(() => import('./pages/NewRoutine.jsx'))
const Routines = lazy(() => import('./pages/Routines.jsx'))
const BodyMetrics = lazy(() => import('./pages/BodyMetrics.jsx'))
const Preferences = lazy(() => import('./pages/Preferences.jsx'))
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))

function HomeOrLanding() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p style={{ color: colors.textSecondary }}></p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <Home /> : <Landing />
}

function PasswordRecoveryRedirect({ children }) {
  const { isPasswordRecovery, clearPasswordRecovery } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isPasswordRecovery) {
      clearPasswordRecovery()
      navigate('/reset-password', { replace: true })
    }
  }, [isPasswordRecovery, clearPasswordRecovery, navigate])

  return children
}

function LanguageSync() {
  useLanguageSync()
  return null
}

function SessionRestorer() {
  useRestoreActiveSession()
  useSyncPendingSets()
  return null
}

const HIDE_TAB_BAR_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/workout', '/preferences', '/admin', '/routine/', '/routines/new', '/exercises']

function ConditionalTabBar() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return null
  if (HIDE_TAB_BAR_PATHS.some(p => location.pathname.startsWith(p))) return null

  return <BottomTabBar />
}

function App() {
  return (
    <BrowserRouter>
      <PasswordRecoveryRedirect>
        <LanguageSync />
        <SessionRestorer />
        <div className="min-h-screen bg-surface text-primary pb-16">
          <OfflineBanner />
          <ActiveSessionBanner />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route path="/" element={<HomeOrLanding />} />
            <Route path="/routines/new" element={<PrivateRoute><NewRoutine /></PrivateRoute>} />
            <Route path="/routine/:routineId" element={<PrivateRoute><RoutineDetail /></PrivateRoute>} />
            <Route path="/routine/:routineId/edit" element={<PrivateRoute><RoutineDetail /></PrivateRoute>} />
            <Route path="/routine/:routineId/day/:dayId/workout" element={<PrivateRoute><WorkoutSession /></PrivateRoute>} />
            <Route path="/workout/free" element={<PrivateRoute><FreeWorkoutSession /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/history/:sessionId" element={<PrivateRoute><SessionDetail /></PrivateRoute>} />
            <Route path="/exercises" element={<PrivateRoute><Exercises /></PrivateRoute>} />
            <Route path="/exercises/:exerciseId/progress" element={<PrivateRoute><ExerciseProgress /></PrivateRoute>} />
            <Route path="/routines" element={<PrivateRoute><Routines /></PrivateRoute>} />
            <Route path="/body-metrics" element={<PrivateRoute><BodyMetrics /></PrivateRoute>} />
            <Route path="/preferences" element={<PrivateRoute><Preferences /></PrivateRoute>} />
            <Route path="/admin/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
            </Routes>
          </Suspense>
          <ConditionalTabBar />
        </div>
      </PasswordRecoveryRedirect>
      <Toast />
    </BrowserRouter>
  )
}

export default App
