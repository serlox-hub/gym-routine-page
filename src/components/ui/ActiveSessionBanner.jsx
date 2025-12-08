import { useNavigate, useLocation } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import useWorkoutStore from '../../stores/workoutStore.js'
import { useRestTimer } from '../../hooks/useWorkout.js'
import { formatSecondsToMMSS } from '../../lib/timeUtils.js'

function ActiveSessionBanner() {
  const navigate = useNavigate()
  const location = useLocation()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const routineId = useWorkoutStore(state => state.routineId)

  const { isActive: restTimerActive, timeRemaining } = useRestTimer()

  if (!sessionId) return null

  // No mostrar en las páginas de sesión activa
  const isOnWorkoutPage = location.pathname.includes('/workout')
  if (isOnWorkoutPage) return null

  const handleContinue = () => {
    if (routineDayId && routineId) {
      navigate(`/routine/${routineId}/day/${routineDayId}/workout`)
    } else {
      navigate('/workout/free')
    }
  }

  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3
  const timerColor = isCritical ? '#f85149' : isWarning ? '#d29922' : '#ffffff'

  // Si el timer de descanso está activo, mostrar banner con timer
  if (restTimerActive) {
    return (
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={handleContinue}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${isCritical ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: '#161b22', border: '1px solid #30363d', color: timerColor }}
        >
          <span className="font-mono font-bold">{formatSecondsToMMSS(timeRemaining)}</span>
          <Undo2 size={10} />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
      <button
        onClick={handleContinue}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
        style={{ backgroundColor: 'rgba(35, 134, 54, 0.95)', color: '#ffffff' }}
      >
        <Undo2 size={10} />
        Volver
      </button>
    </div>
  )
}

export default ActiveSessionBanner
