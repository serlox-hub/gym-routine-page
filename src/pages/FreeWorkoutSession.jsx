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
  useWakeLock,
} from '../hooks/useWorkout.js'
import { ArrowUpDown, Plus } from 'lucide-react'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal, BottomActions, PageHeader } from '../components/ui/index.js'
import { RestTimer, BlockExerciseList, ReorderableExerciseList, EndSessionModal } from '../components/Workout/index.js'
import { AddExerciseModal } from '../components/Routine/index.js'
import useWorkoutStore from '../stores/workoutStore.js'
import { transformSessionExercises } from '../lib/workoutTransforms.js'
import { getExistingSupersetIds } from '../lib/supersetUtils.js'
import { calculateExerciseProgress } from '../lib/workoutCalculations.js'

function FreeWorkoutSession() {
  const navigate = useNavigate()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const startRestTimer = useWorkoutStore(state => state.startRestTimer)
  const completedSets = useWorkoutStore(state => state.completedSets)
  const exerciseSetCounts = useWorkoutStore(state => state.exerciseSetCounts)

  // Mantener pantalla encendida durante la sesión
  useWakeLock()

  const hasCompletedSets = Object.keys(completedSets).length > 0

  const { data: sessionExercises, isLoading, error } = useSessionExercises(sessionId)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
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

  // Calcular progreso de series
  const progress = useMemo(
    () => calculateExerciseProgress(flatExercises, completedSets, exerciseSetCounts),
    [flatExercises, completedSets, exerciseSetCounts]
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
    setShowEndModal(true)
  }

  const handleConfirmEnd = ({ overallFeeling, notes }) => {
    endSessionMutation.mutate(
      { overallFeeling, notes },
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
    <>
      <RestTimer />
      <div className="p-4 max-w-2xl mx-auto pb-24">
        <PageHeader
          title="Entrenamiento Libre"
          titleExtra={
            progress.total > 0 && (
              <span className="text-sm font-normal" style={{ color: '#8b949e' }}>
                {progress.completed}/{progress.total}
              </span>
            )
          }
          onBack={() => navigate(-1)}
          menuItems={[
            hasExercises && { icon: ArrowUpDown, label: isReordering ? 'Listo' : 'Reordenar', onClick: () => setIsReordering(!isReordering) },
            { icon: Plus, label: 'Añadir ejercicio', onClick: () => setShowAddExercise(true) }
          ].filter(Boolean)}
        />

      <main className="space-y-4">
        {!hasExercises ? (
          <div className="text-center py-12 px-4">
            <h2 className="text-lg font-medium mb-2">Entrenamiento sin rutina</h2>
            <p className="text-secondary text-sm mb-6">
              Añade los ejercicios que quieras hacer hoy. Puedes registrar series, peso y repeticiones de forma libre.
            </p>
            <Button
              variant="primary"
              onClick={() => setShowAddExercise(true)}
            >
              Añadir ejercicio
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

      {isReordering ? (
        <BottomActions
          secondary={{ label: 'Cancelar', onClick: () => setIsReordering(false) }}
          primary={{ label: 'Listo', onClick: () => setIsReordering(false) }}
        />
      ) : (
        <BottomActions
          secondary={{
            label: abandonSessionMutation.isPending ? 'Cancelando...' : 'Cancelar',
            onClick: () => setShowCancelModal(true),
            disabled: abandonSessionMutation.isPending,
            danger: true,
          }}
          primary={{
            label: endSessionMutation.isPending ? 'Guardando...' : 'Finalizar',
            onClick: handleEndWorkout,
            disabled: endSessionMutation.isPending || !hasCompletedSets,
          }}
        />
      )}

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

      <EndSessionModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onConfirm={handleConfirmEnd}
        isPending={endSessionMutation.isPending}
      />

    </div>
    </>
  )
}

export default FreeWorkoutSession
