import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoutineDay, useRoutineBlocks } from '../hooks/useRoutines.js'
import { useCompleteSet, useUncompleteSet, useEndSession, useAbandonSession } from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal } from '../components/ui/index.js'
import { RestTimer, SessionHeader, BlockExerciseList, ReorderableExerciseList, FlatExerciseList } from '../components/Workout/index.js'
import { AddExerciseModal } from '../components/Routine/index.js'
import useWorkoutStore from '../stores/workoutStore.js'

function WorkoutSession() {
  const { routineId, dayId } = useParams()
  const navigate = useNavigate()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const startRestTimer = useWorkoutStore(state => state.startRestTimer)
  const exerciseOrder = useWorkoutStore(state => state.exerciseOrder)
  const extraExercises = useWorkoutStore(state => state.extraExercises)
  const initializeExerciseOrder = useWorkoutStore(state => state.initializeExerciseOrder)
  const moveExercise = useWorkoutStore(state => state.moveExercise)
  const addExtraExercise = useWorkoutStore(state => state.addExtraExercise)
  const removeExerciseFromSession = useWorkoutStore(state => state.removeExerciseFromSession)

  const { data: day, isLoading: loadingDay, error: dayError } = useRoutineDay(dayId)
  const { data: blocks, isLoading: loadingBlocks, error: blocksError } = useRoutineBlocks(dayId)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  const completeSetMutation = useCompleteSet()
  const uncompleteSetMutation = useUncompleteSet()
  const endSessionMutation = useEndSession()
  const abandonSessionMutation = useAbandonSession()

  const isLoading = loadingDay || loadingBlocks
  const error = dayError || blocksError

  useEffect(() => {
    if (blocks && blocks.length > 0) {
      initializeExerciseOrder(blocks)
    }
  }, [blocks, initializeExerciseOrder])

  const { exercisesByBlock, flatExercises, hasCustomOrder } = useMemo(() => {
    if (!blocks) return { exercisesByBlock: [], flatExercises: [], hasCustomOrder: false }

    const routineExerciseMap = new Map()
    blocks.forEach(block => {
      block.routine_exercises.forEach(re => {
        routineExerciseMap.set(re.id, {
          ...re,
          blockName: block.name,
          blockOrder: block.sort_order,
          isWarmup: block.name.toLowerCase() === 'calentamiento'
        })
      })
    })

    const grouped = blocks.map(block => ({
      blockName: block.name,
      blockOrder: block.sort_order,
      isWarmup: block.name.toLowerCase() === 'calentamiento',
      durationMin: block.duration_min,
      exercises: block.routine_exercises.map(re => ({
        ...re,
        blockName: block.name,
        isWarmup: block.name.toLowerCase() === 'calentamiento',
        type: 'routine',
      }))
    }))

    // Build default order from blocks
    const defaultOrder = []
    grouped.forEach(group => {
      group.exercises.forEach(ex => defaultOrder.push(ex))
    })

    let flat = []
    let customOrder = false

    if (exerciseOrder.length === 0) {
      flat = defaultOrder
    } else {
      flat = exerciseOrder.map(item => {
        if (item.type === 'routine') {
          const re = routineExerciseMap.get(item.id)
          return re ? { ...re, type: 'routine' } : null
        } else {
          const extra = extraExercises.find(e => e.id === item.id)
          return extra ? { ...extra, type: 'extra', blockName: 'Añadido' } : null
        }
      }).filter(Boolean)

      // Check if order differs from default or has extra exercises
      const hasExtras = extraExercises.length > 0
      const orderChanged = flat.length !== defaultOrder.length ||
        flat.some((ex, i) => defaultOrder[i]?.id !== ex.id)
      customOrder = hasExtras || orderChanged
    }

    return { exercisesByBlock: grouped, flatExercises: flat, hasCustomOrder: customOrder }
  }, [blocks, exerciseOrder, extraExercises])

  useEffect(() => {
    if (!sessionId) {
      navigate(`/routine/${routineId}/day/${dayId}`)
    }
  }, [sessionId, navigate, routineId, dayId])

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
      { onSuccess: () => navigate(`/routine/${routineId}`) }
    )
  }

  const handleAbandonWorkout = () => {
    setShowCancelModal(false)
    abandonSessionMutation.mutate(undefined, {
      onSuccess: () => navigate(`/routine/${routineId}/day/${dayId}`)
    })
  }

  const handleAddExercise = (data) => {
    addExtraExercise(data.exercise, {
      series: data.series,
      reps: data.reps,
      rir: data.rir,
      rest_seconds: data.rest_seconds,
      notes: data.notes,
      tempo: data.tempo,
      tempo_razon: data.tempo_razon,
    })
    setShowAddExercise(false)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <SessionHeader
        dayName={day?.name}
        isReordering={isReordering}
        onToggleReorder={() => setIsReordering(!isReordering)}
        onAddExercise={() => setShowAddExercise(true)}
      />

      <main className="space-y-4">
        {isReordering ? (
          <ReorderableExerciseList
            exercises={flatExercises}
            onMove={moveExercise}
            onRemove={removeExerciseFromSession}
            onCompleteSet={handleCompleteSet}
            onUncompleteSet={handleUncompleteSet}
          />
        ) : hasCustomOrder ? (
          <FlatExerciseList
            exercises={flatExercises}
            onCompleteSet={handleCompleteSet}
            onUncompleteSet={handleUncompleteSet}
            onRemove={removeExerciseFromSession}
          />
        ) : (
          <BlockExerciseList
            exercisesByBlock={exercisesByBlock}
            onCompleteSet={handleCompleteSet}
            onUncompleteSet={handleUncompleteSet}
            onRemove={removeExerciseFromSession}
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
                size="lg"
                onClick={() => setIsReordering(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="lg"
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
        mode="session"
      />

      <RestTimer />
    </div>
  )
}

export default WorkoutSession
