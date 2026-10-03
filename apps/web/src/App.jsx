import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import PrivateRoute from '@/components/Auth/PrivateRoute'
import DevAutoLogin from '@/components/Auth/DevAutoLogin'
import { ActiveSessionBanner, LoadingSpinner } from './components/ui/index.js'
import Toast from './components/ui/Toast.jsx'
import BottomTabBar from './components/ui/BottomTabBar.jsx'
import OfflineBanner from './components/ui/OfflineBanner.jsx'
import { useAuth } from './hooks/useAuth.js'
import { useIsTabBarVisible } from './hooks/useTabBar.js'
import { colors } from './lib/styles.js'
import { useRestoreActiveSession, useSyncPendingSets, useSyncPendingGymChange, useTimerEngine } from './hooks/useWorkout.js'
import { useLanguageSync } from '@gym/shared'
import { takePendingSharedRoutinePath } from './lib/pendingSharedRoutine.js'

const Landing = lazy(() => import('./pages/Landing.jsx'))
const Home = lazy(() => import('./pages/Home.jsx'))
const RoutineDetail = lazy(() => import('./pages/RoutineDetail.jsx'))
const RoutineEditRedirect = lazy(() => import('./pages/RoutineEditRedirect.jsx'))
const WorkoutSession = lazy(() => import('./pages/WorkoutSession.jsx'))
const FreeWorkoutSession = lazy(() => import('./pages/FreeWorkoutSession.jsx'))
const WorkoutSummary = lazy(() => import('./pages/WorkoutSummary.jsx'))
const History = lazy(() => import('./pages/History.jsx'))
const Routines = lazy(() => import('./pages/Routines.jsx'))
const BodyMetrics = lazy(() => import('./pages/BodyMetrics.jsx'))
const Preferences = lazy(() => import('./pages/Preferences.jsx'))
const Gyms = lazy(() => import('./pages/Gyms.jsx'))
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'))
const AdminFeedback = lazy(() => import('./pages/AdminFeedback.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const SharedRoutine = lazy(() => import('./pages/SharedRoutine.jsx'))

function HomeOrLanding() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  // Back from signing up or logging in on a shared routine's page (`pages/SharedRoutine.jsx`). Here
  // and not at the app root: every way in lands on home with a session (Login's default target,
  // Google's redirect, the signup confirmation link), and at the root Login's own redirect to home
  // would run after this one and win.
  useEffect(() => {
    if (!isAuthenticated) return
    const pendingPath = takePendingSharedRoutinePath()
    if (pendingPath) navigate(pendingPath, { replace: true })
  }, [isAuthenticated, navigate])

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
  useSyncPendingGymChange()
  // El motor del temporizador se monta aquí (nivel global, siempre montado) y
  // no dentro de la sesión, para que el descanso siga contando y el pill de
  // ActiveSessionBanner se actualice también fuera de la página de sesión.
  useTimerEngine()
  return null
}

function ConditionalTabBar() {
  return useIsTabBarVisible() ? <BottomTabBar /> : null
}

function App() {
  return (
    <BrowserRouter>
      <PasswordRecoveryRedirect>
        {import.meta.env.DEV && <DevAutoLogin />}
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
              <Route path="/r/:token" element={<SharedRoutine />} />

            {/* Protected routes */}
            <Route path="/" element={<HomeOrLanding />} />
            <Route path="/routine/:routineId" element={<PrivateRoute><RoutineDetail /></PrivateRoute>} />
            <Route path="/routine/:routineId/edit" element={<PrivateRoute><RoutineEditRedirect /></PrivateRoute>} />
            <Route path="/routine/:routineId/day/:dayId/workout" element={<PrivateRoute><WorkoutSession /></PrivateRoute>} />
            <Route path="/workout/free" element={<PrivateRoute><FreeWorkoutSession /></PrivateRoute>} />
            <Route path="/workout/summary" element={<PrivateRoute><WorkoutSummary /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/routines" element={<PrivateRoute><Routines /></PrivateRoute>} />
            <Route path="/body-metrics" element={<PrivateRoute><BodyMetrics /></PrivateRoute>} />
            <Route path="/preferences" element={<PrivateRoute><Preferences /></PrivateRoute>} />
            <Route path="/gyms" element={<PrivateRoute><Gyms /></PrivateRoute>} />
            <Route path="/admin/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
            <Route path="/admin/feedback" element={<PrivateRoute><AdminFeedback /></PrivateRoute>} />
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
