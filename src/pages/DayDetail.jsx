import { useParams, useNavigate } from 'react-router-dom'
import { useRoutineDay, useRoutineBlocks } from '../hooks/useRoutines.js'
import { useStartSession } from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Button } from '../components/ui/index.js'
import { BlockSection } from '../components/Routine/index.js'
import useWorkoutStore from '../stores/workoutStore.js'

function DayDetail() {
  const { routineId, dayId } = useParams()
  const navigate = useNavigate()

  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)

  const { data: day, isLoading: loadingDay, error: dayError } = useRoutineDay(dayId)
  const { data: blocks, isLoading: loadingBlocks, error: blocksError } = useRoutineBlocks(dayId)

  const startSessionMutation = useStartSession()

  const isLoading = loadingDay || loadingBlocks
  const error = dayError || blocksError

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleStartWorkout = () => {
    startSessionMutation.mutate(
      { routineDayId: parseInt(dayId), routineId: parseInt(routineId), blocks },
      {
        onSuccess: () => {
          navigate(`/routine/${routineId}/day/${dayId}/workout`)
        }
      }
    )
  }

  const handleContinueWorkout = () => {
    navigate(`/routine/${routineId}/day/${dayId}/workout`)
  }

  const isThisDayActive = hasActiveSession && activeRoutineDayId === parseInt(dayId)

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <header className="mb-6">
        <button
          onClick={() => navigate(`/routine/${routineId}`)}
          className="text-secondary hover:text-accent mb-2 transition-colors"
        >
          ← Volver
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span
              className="text-sm font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(88, 166, 255, 0.15)', color: '#58a6ff' }}
            >
              Día {day.sort_order}
            </span>
            <h1 className="text-xl font-bold">{day.name}</h1>
          </div>
          {day.estimated_duration_min && (
            <span className="text-sm text-muted">
              {day.estimated_duration_min} min
            </span>
          )}
        </div>
      </header>

      <main className="space-y-6">
        {blocks?.length === 0 ? (
          <p className="text-secondary">No hay ejercicios configurados</p>
        ) : (
          blocks?.map(block => (
            <BlockSection key={block.id} block={block} />
          ))
        )}
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{ backgroundColor: '#0d1117', borderTop: '1px solid #30363d' }}
      >
        <div className="max-w-2xl mx-auto">
          {isThisDayActive ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleContinueWorkout}
            >
              Continuar Entrenamiento
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStartWorkout}
              disabled={startSessionMutation.isPending || (hasActiveSession && !isThisDayActive)}
            >
              {startSessionMutation.isPending ? 'Iniciando...' : 'Iniciar Entrenamiento'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default DayDetail
