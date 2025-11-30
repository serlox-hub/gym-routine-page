import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import RoutineDetail from './pages/RoutineDetail.jsx'
import DayDetail from './pages/DayDetail.jsx'
import WorkoutSession from './pages/WorkoutSession.jsx'
import History from './pages/History.jsx'
import SessionDetail from './pages/SessionDetail.jsx'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface text-primary">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/routine/:routineId" element={<RoutineDetail />} />
          <Route path="/routine/:routineId/day/:dayId" element={<DayDetail />} />
          <Route path="/routine/:routineId/day/:dayId/workout" element={<WorkoutSession />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:sessionId" element={<SessionDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
