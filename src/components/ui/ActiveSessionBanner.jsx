import { useNavigate, useLocation } from 'react-router-dom'
import { Play } from 'lucide-react'
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

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg shadow-lg"
        style={{ backgroundColor: '#161b22', border: '2px solid #58a6ff' }}
      >
        <span className="text-xs font-medium" style={{ color: '#58a6ff' }}>
          Entrenamiento en curso
        </span>
        {restTimerActive && (
          <span
            className={`font-mono font-bold text-lg ${isCritical ? 'animate-pulse' : ''}`}
            style={{ color: timerColor }}
          >
            {formatSecondsToMMSS(timeRemaining)}
          </span>
        )}
        <button
          onClick={handleContinue}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium"
          style={{ backgroundColor: 'rgba(35, 134, 54, 0.95)', color: '#ffffff' }}
        >
          <Play size={14} fill="#ffffff" />
          Volver
        </button>
      </div>
    </div>
  )
}

export default ActiveSessionBanner
