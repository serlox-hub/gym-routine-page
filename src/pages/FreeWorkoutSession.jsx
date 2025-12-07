import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCompleteSet,
  useUncompleteSet,
  useEndSession,
  useAbandonSession,
  useSessionExercises,
  useAddSessionExercise,
  useRemoveSessionExercise,
  useReorderSessionExercises,
} from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal } from '../components/ui/index.js'
import { RestTimer, SessionHeader, BlockExerciseList, ReorderableExerciseList } from '../components/Workout/index.js'
import { AddExerciseModal } from '../components/Routine/index.js'
import useWorkoutStore from '../stores/workoutStore.js'
import { transformSessionExercises } from '../lib/workoutTransforms.js'
import { getExistingSupersetIds } from '../lib/supersetUtils.js'

function FreeWorkoutSession() {
  const navigate = useNavigate()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const startRestTimer = useWorkoutStore(state => state.startRestTimer)

  const { data: sessionExercises, isLoading, error } = useSessionExercises(sessionId)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  const completeSetMutation = useCompleteSet()
  const uncompleteSetMutation = useUncompleteSet()
  const endSessionMutation = useEndSession()
  const abandonSessionMutation = useAbandonSession()
  const addSessionExerciseMutation = useAddSessionExercise()
  const removeSessionExerciseMutation = useRemoveSessionExercise()
  const reorderSessionExercisesMutation = useReorderSessionExercises()

  const { exercisesByBlock, flatExercises } = useMemo(
    () => transformSessionExercises(sessionExercises),
    [sessionExercises]
  )

  const existingSupersets = useMemo(
    () => getExistingSupersetIds(sessionExercises || []),
    [sessionExercises]
  )

  useEffect(() => {
    if (!sessionId) {
      navigate('/')
    }
  }, [sessionId, navigate])

  if (!sessionId) return null

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
      { overallFeeling: null, notes: null },
      { onSuccess: () => navigate('/history') }
    )
  }

  const handleAbandonWorkout = () => {
    setShowCancelModal(false)
    abandonSessionMutation.mutate(undefined, {
      onSuccess: () => navigate('/')
    })
  }

  const handleAddExercise = (data) => {
    addSessionExerciseMutation.mutate({
      exercise: data.exercise,
      series: data.series,
      reps: data.reps,
      rir: data.rir,
      rest_seconds: data.rest_seconds,
      notes: data.notes,
      tempo: data.tempo,
      superset_group: data.superset_group,
    }, {
      onSuccess: () => setShowAddExercise(false)
    })
  }

  const handleRemoveExercise = (sessionExerciseId) => {
    removeSessionExerciseMutation.mutate(sessionExerciseId)
  }

  const handleMoveExercise = (index, direction) => {
    const newOrder = [...flatExercises]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex < 0 || newIndex >= newOrder.length) return

    const temp = newOrder[index]
    newOrder[index] = newOrder[newIndex]
    newOrder[newIndex] = temp

    const orderedIds = newOrder.map(e => e.sessionExerciseId)
    reorderSessionExercisesMutation.mutate(orderedIds)
  }

  const hasExercises = flatExercises.length > 0

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <SessionHeader
        dayName="Entrenamiento Libre"
        isReordering={isReordering}
        onToggleReorder={hasExercises ? () => setIsReordering(!isReordering) : undefined}
        onAddExercise={() => setShowAddExercise(true)}
      />

      <main className="space-y-4">
        {!hasExercises ? (
          <div className="text-center py-12">
            <p className="text-secondary mb-4">No hay ejercicios todavía</p>
            <Button
              variant="primary"
              onClick={() => setShowAddExercise(true)}
            >
              Añadir primer ejercicio
            </Button>
          </div>
        ) : isReordering ? (
          <ReorderableExerciseList
            exercises={flatExercises}
            onMove={handleMoveExercise}
            onRemove={handleRemoveExercise}
            onCompleteSet={handleCompleteSet}
            onUncompleteSet={handleUncompleteSet}
          />
        ) : (
          <BlockExerciseList
            exercisesByBlock={exercisesByBlock}
            onCompleteSet={handleCompleteSet}
            onUncompleteSet={handleUncompleteSet}
            onRemove={handleRemoveExercise}
          />
        )}
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{ backgroundColor: '#0d1117', borderTop: '1px solid #30363d' }}
      >
        <div className="max-w-2xl mx-auto flex gap-3">
          {isReordering ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setIsReordering(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => setIsReordering(false)}
              >
                Listo
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="danger"
                onClick={() => setShowCancelModal(true)}
                disabled={abandonSessionMutation.isPending}
              >
                {abandonSessionMutation.isPending ? 'Cancelando...' : 'Cancelar'}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleEndWorkout}
                disabled={endSessionMutation.isPending || !hasExercises}
              >
                {endSessionMutation.isPending ? 'Guardando...' : 'Finalizar'}
              </Button>
            </>
          )}
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

      <AddExerciseModal
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onSubmit={handleAddExercise}
        isPending={addSessionExerciseMutation.isPending}
        mode="session"
        existingSupersets={existingSupersets}
      />

      <RestTimer />
    </div>
  )
}

export default FreeWorkoutSession
