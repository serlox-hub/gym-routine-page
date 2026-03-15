import { useNavigate } from 'react-router-dom'
import { Zap, Star } from 'lucide-react'
import { useStartSession } from '../../hooks/useWorkout.js'
import { Card } from '../ui/index.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { colors } from '../../lib/styles.js'

function QuickActions({ favoriteRoutine }) {
  const navigate = useNavigate()
  const startSessionMutation = useStartSession()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const isFreeSessionActive = hasActiveSession && activeRoutineDayId === null
  const isRoutineSessionActive = hasActiveSession && activeRoutineDayId !== null

  const handleStartFreeWorkout = () => {
    startSessionMutation.mutate(undefined, {
      onSuccess: () => navigate('/workout/free')
    })
  }

  return (
    <section className="mb-6">
      <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Acceso rápido</h2>
      <div className="space-y-2">
        <Card
          className="p-3"
          onClick={
            isFreeSessionActive
              ? () => navigate('/workout/free')
              : isRoutineSessionActive
                ? undefined
                : !startSessionMutation.isPending
                  ? handleStartFreeWorkout
                  : undefined
          }
          style={isRoutineSessionActive ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'rgba(136, 87, 229, 0.15)' }}
            >
              <Zap size={20} style={{ color: '#8957e5' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm" style={{ color: '#8957e5' }}>
                {startSessionMutation.isPending
                  ? 'Iniciando...'
                  : isFreeSessionActive
                    ? 'Continuar Entrenamiento'
                    : 'Entrenamiento Libre'}
              </h3>
              {isRoutineSessionActive && (
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Tienes un entrenamiento de rutina en curso
                </p>
              )}
            </div>
          </div>
        </Card>

        {favoriteRoutine && (
          <Card
            className="p-3"
            onClick={() => navigate(`/routine/${favoriteRoutine.id}`)}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'rgba(210, 153, 34, 0.15)' }}
              >
                <Star size={20} style={{ color: colors.warning }} fill={colors.warning} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm" style={{ color: colors.warning }}>
                  {favoriteRoutine.name}
                </h3>
              </div>
            </div>
          </Card>
        )}
      </div>
    </section>
  )
}

export default QuickActions
