import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useRoutineDay, useRoutineBlocks } from '../hooks/useRoutines.js'
import { useCompleteSet, useUncompleteSet, useEndSession, useAbandonSession } from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal } from '../components/ui/index.js'
import { WorkoutExerciseCard, RestTimer, AddExerciseModal } from '../components/Workout/index.js'
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
  const removeExtraExercise = useWorkoutStore(state => state.removeExtraExercise)

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

  // Initialize exercise order when blocks load
  useEffect(() => {
    if (blocks && blocks.length > 0) {
      initializeExerciseOrder(blocks)
    }
  }, [blocks, initializeExerciseOrder])

  // Build ordered exercise list
  const orderedExercises = useMemo(() => {
    if (!blocks) return []

    // Create a map of routine exercises by id
    const routineExerciseMap = new Map()
    blocks.forEach(block => {
      block.routine_exercises.forEach(re => {
        routineExerciseMap.set(re.id, { ...re, blockName: block.nombre })
      })
    })

    // If no custom order yet, use default from blocks
    if (exerciseOrder.length === 0) {
      const defaultList = []
      blocks.forEach(block => {
        block.routine_exercises.forEach(re => {
          defaultList.push({
            ...re,
            blockName: block.nombre,
            type: 'routine',
          })
        })
      })
      return defaultList
    }

    // Build ordered list
    return exerciseOrder.map(item => {
      if (item.type === 'routine') {
        const re = routineExerciseMap.get(item.id)
        return re ? { ...re, type: 'routine' } : null
      } else {
        const extra = extraExercises.find(e => e.id === item.id)
        return extra ? { ...extra, type: 'extra' } : null
      }
    }).filter(Boolean)
  }, [blocks, exerciseOrder, extraExercises])

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

  const handleAddExercise = (exercise, config) => {
    addExtraExercise(exercise, config)
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReordering(!isReordering)}
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: isReordering ? 'rgba(88, 166, 255, 0.15)' : '#21262d',
                color: isReordering ? '#58a6ff' : '#8b949e',
              }}
            >
              {isReordering ? 'Listo' : 'Reordenar'}
            </button>
            <button
              onClick={() => setShowAddExercise(true)}
              className="p-1.5 rounded hover:opacity-80"
              style={{ backgroundColor: '#21262d' }}
              title="Añadir ejercicio"
            >
              <Plus size={18} style={{ color: '#8b949e' }} />
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-3">
        {orderedExercises.map((routineExercise, index) => (
          <div key={routineExercise.id} className="relative">
            {isReordering && (
              <div
                className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10"
              >
                <button
                  onClick={() => moveExercise(index, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded hover:opacity-80 disabled:opacity-30"
                  style={{ backgroundColor: '#21262d' }}
                >
                  <ChevronUp size={16} style={{ color: '#8b949e' }} />
                </button>
                <button
                  onClick={() => moveExercise(index, 'down')}
                  disabled={index === orderedExercises.length - 1}
                  className="p-1 rounded hover:opacity-80 disabled:opacity-30"
                  style={{ backgroundColor: '#21262d' }}
                >
                  <ChevronDown size={16} style={{ color: '#8b949e' }} />
                </button>
              </div>
            )}

            {routineExercise.type === 'extra' && isReordering && (
              <button
                onClick={() => removeExtraExercise(routineExercise.id)}
                className="absolute -right-2 -top-2 p-1.5 rounded-full z-10 hover:opacity-80"
                style={{ backgroundColor: '#f85149' }}
              >
                <Trash2 size={12} style={{ color: '#ffffff' }} />
              </button>
            )}

            <div className={isReordering ? 'ml-8' : ''}>
              {routineExercise.type === 'extra' && (
                <div
                  className="text-xs font-medium px-2 py-0.5 rounded inline-block mb-1"
                  style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)', color: '#a371f7' }}
                >
                  Añadido
                </div>
              )}
              <WorkoutExerciseCard
                routineExercise={routineExercise}
                onCompleteSet={handleCompleteSet}
                onUncompleteSet={handleUncompleteSet}
              />
            </div>
          </div>
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

      <AddExerciseModal
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onAdd={handleAddExercise}
      />

      <RestTimer />
    </div>
  )
}

export default WorkoutSession
