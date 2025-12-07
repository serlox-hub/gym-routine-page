import { useNavigate, useLocation } from 'react-router-dom'
import { Play } from 'lucide-react'
import useWorkoutStore from '../../stores/workoutStore.js'

function ActiveSessionBanner() {
  const navigate = useNavigate()
  const location = useLocation()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const routineId = useWorkoutStore(state => state.routineId)

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

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 px-4 py-2"
      style={{ backgroundColor: 'rgba(35, 134, 54, 0.95)', borderBottom: '1px solid #238636' }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <span className="text-sm font-medium text-white">
          Entrenamiento en curso
        </span>
        <button
          onClick={handleContinue}
          className="flex items-center gap-1 px-3 py-1 rounded text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}
        >
          <Play size={14} />
          Continuar
        </button>
      </div>
    </div>
  )
}

export default ActiveSessionBanner
