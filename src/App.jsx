import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import PrivateRoute from '@/components/Auth/PrivateRoute'
import Landing from './pages/Landing.jsx'
import Home from './pages/Home.jsx'
import RoutineDetail from './pages/RoutineDetail.jsx'
import WorkoutSession from './pages/WorkoutSession.jsx'
import FreeWorkoutSession from './pages/FreeWorkoutSession.jsx'
import History from './pages/History.jsx'
import SessionDetail from './pages/SessionDetail.jsx'
import Exercises from './pages/Exercises.jsx'
import NewExercise from './pages/NewExercise.jsx'
import EditExercise from './pages/EditExercise.jsx'
import ExerciseProgress from './pages/ExerciseProgress.jsx'
import NewRoutine from './pages/NewRoutine.jsx'
import BodyMetrics from './pages/BodyMetrics.jsx'
import Preferences from './pages/Preferences.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import { ActiveSessionBanner } from './components/ui/index.js'
import { useAuth } from './hooks/useAuth.js'
import { useRestoreActiveSession } from './hooks/useWorkout.js'

function HomeOrLanding() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d1117' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p style={{ color: '#8b949e' }}>Cargando...</p>
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

function SessionRestorer() {
  useRestoreActiveSession()
  return null
}

function App() {
  return (
    <BrowserRouter>
      <PasswordRecoveryRedirect>
        <SessionRestorer />
        <div className="min-h-screen bg-surface text-primary">
          <ActiveSessionBanner />
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
          <Route path="/exercises/new" element={<PrivateRoute><NewExercise /></PrivateRoute>} />
          <Route path="/exercises/:exerciseId/edit" element={<PrivateRoute><EditExercise /></PrivateRoute>} />
          <Route path="/exercises/:exerciseId/progress" element={<PrivateRoute><ExerciseProgress /></PrivateRoute>} />
          <Route path="/body-metrics" element={<PrivateRoute><BodyMetrics /></PrivateRoute>} />
          <Route path="/preferences" element={<PrivateRoute><Preferences /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
          </Routes>
        </div>
      </PasswordRecoveryRedirect>
    </BrowserRouter>
  )
}

export default App
