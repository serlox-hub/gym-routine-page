import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoutineDay, useRoutineBlocks } from '../hooks/useRoutines.js'
import { useCompleteSet, useUncompleteSet, useEndSession, useAbandonSession } from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal } from '../components/ui/index.js'
import { WorkoutExerciseCard, RestTimer } from '../components/Workout/index.js'
import useWorkoutStore from '../stores/workoutStore.js'

function WorkoutSession() {
  const { routineId, dayId } = useParams()
  const navigate = useNavigate()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const startRestTimer = useWorkoutStore(state => state.startRestTimer)

  const { data: day, isLoading: loadingDay, error: dayError } = useRoutineDay(dayId)
  const { data: blocks, isLoading: loadingBlocks, error: blocksError } = useRoutineBlocks(dayId)

  const [showCancelModal, setShowCancelModal] = useState(false)

  const completeSetMutation = useCompleteSet()
  const uncompleteSetMutation = useUncompleteSet()
  const endSessionMutation = useEndSession()
  const abandonSessionMutation = useAbandonSession()

  const isLoading = loadingDay || loadingBlocks
  const error = dayError || blocksError

  if (!sessionId) {
    navigate(`/routine/${routineId}/day/${dayId}`)
    return null
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleCompleteSet = (setData, descansoSeg) => {
    completeSetMutation.mutate(setData, {
      onSuccess: () => {
        if (descansoSeg && descansoSeg > 0) {
          startRestTimer(descansoSeg)
        }
      }
    })
  }

  const handleUncompleteSet = (setData) => {
    uncompleteSetMutation.mutate(setData)
  }

  const handleEndWorkout = () => {
    endSessionMutation.mutate(
      { sensacionGeneral: null, notas: null },
      {
        onSuccess: () => {
          navigate(`/routine/${routineId}`)
        }
      }
    )
  }

  const handleAbandonWorkout = () => {
    setShowCancelModal(false)
    abandonSessionMutation.mutate(undefined, {
      onSuccess: () => {
        navigate(`/routine/${routineId}/day/${dayId}`)
      }
    })
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <header className="mb-6">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span
              className="text-sm font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(63, 185, 80, 0.15)', color: '#3fb950' }}
            >
              En progreso
            </span>
            <h1 className="text-xl font-bold">{day?.nombre}</h1>
          </div>
          {day?.duracion_estimada_min && (
            <span className="text-sm text-muted">
              ~{day.duracion_estimada_min} min
            </span>
          )}
        </div>
      </header>

      <main className="space-y-6">
        {blocks?.map(block => (
          <section key={block.id} className="space-y-3">
            <div
              className="flex items-center justify-between px-3 py-2 rounded border-l-4"
              style={{
                backgroundColor: '#21262d',
                borderLeftColor: '#a371f7'
              }}
            >
              <div className="flex items-center gap-2">
                <h3
                  className="text-sm font-semibold uppercase tracking-wide"
                  style={{ color: '#a371f7' }}
                >
                  {block.nombre}
                </h3>
                <span className="text-xs text-muted">
                  ({block.routine_exercises.length})
                </span>
              </div>
              {block.duracion_min && (
                <span className="text-xs text-muted">
                  ~{block.duracion_min} min
                </span>
              )}
            </div>
            <div className="space-y-3">
              {block.routine_exercises.map(routineExercise => (
                <WorkoutExerciseCard
                  key={routineExercise.id}
                  routineExercise={routineExercise}
                  onCompleteSet={handleCompleteSet}
                  onUncompleteSet={handleUncompleteSet}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{ backgroundColor: '#0d1117', borderTop: '1px solid #30363d' }}
      >
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="danger"
            size="lg"
            onClick={() => setShowCancelModal(true)}
            disabled={abandonSessionMutation.isPending}
          >
            {abandonSessionMutation.isPending ? 'Cancelando...' : 'Cancelar'}
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleEndWorkout}
            disabled={endSessionMutation.isPending}
          >
            {endSessionMutation.isPending ? 'Guardando...' : 'Finalizar Entrenamiento'}
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showCancelModal}
        title="Cancelar entrenamiento"
        message="¿Seguro que quieres cancelar? Se perderán todas las series registradas."
        confirmText="Sí, cancelar"
        cancelText="Continuar"
        onConfirm={handleAbandonWorkout}
        onCancel={() => setShowCancelModal(false)}
      />

      <RestTimer />
    </div>
  )
}

export default WorkoutSession
