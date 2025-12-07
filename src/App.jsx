import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PrivateRoute from '@/components/Auth/PrivateRoute'
import Home from './pages/Home.jsx'
import RoutineDetail from './pages/RoutineDetail.jsx'
import DayDetail from './pages/DayDetail.jsx'
import WorkoutSession from './pages/WorkoutSession.jsx'
import History from './pages/History.jsx'
import SessionDetail from './pages/SessionDetail.jsx'
import Exercises from './pages/Exercises.jsx'
import NewExercise from './pages/NewExercise.jsx'
import EditExercise from './pages/EditExercise.jsx'
import ExerciseProgress from './pages/ExerciseProgress.jsx'
import NewRoutine from './pages/NewRoutine.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-surface text-primary">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/routines/new" element={<PrivateRoute><NewRoutine /></PrivateRoute>} />
          <Route path="/routine/:routineId" element={<PrivateRoute><RoutineDetail /></PrivateRoute>} />
          <Route path="/routine/:routineId/day/:dayId" element={<PrivateRoute><DayDetail /></PrivateRoute>} />
          <Route path="/routine/:routineId/day/:dayId/workout" element={<PrivateRoute><WorkoutSession /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/history/:sessionId" element={<PrivateRoute><SessionDetail /></PrivateRoute>} />
          <Route path="/exercises" element={<PrivateRoute><Exercises /></PrivateRoute>} />
          <Route path="/exercises/new" element={<PrivateRoute><NewExercise /></PrivateRoute>} />
          <Route path="/exercises/:exerciseId/edit" element={<PrivateRoute><EditExercise /></PrivateRoute>} />
          <Route path="/exercises/:exerciseId/progress" element={<PrivateRoute><ExerciseProgress /></PrivateRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
