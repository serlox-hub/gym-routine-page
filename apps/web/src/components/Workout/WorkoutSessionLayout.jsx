import { useState, useEffect, useMemo } from 'react'
import { colors } from '../../lib/styles.js'
import { useNavigate } from 'react-router-dom'
import { PRProvider } from './PRContext.jsx'
import {
  useCompleteSet,
  useUncompleteSet,
  useEndSession,
  useAbandonSession,
  useSessionExercises,
  useAddSessionExercise,
  useRemoveSessionExercise,
  useReplaceSessionExercise,
  useReorderSessionExercises,
  useWakeLock,
  useTimerEngine,
} from '../../hooks/useWorkout.js'
import { Plus } from 'lucide-react'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal, BottomActions, PageHeader } from '../ui/index.js'
import RestTimer from './RestTimer.jsx'
import BlockExerciseList from './BlockExerciseList.jsx'
import EndSessionModal from './EndSessionModal.jsx'
import SessionTimer from './SessionTimer.jsx'
import { AddExerciseModal } from '../Routine/index.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { calculateExerciseProgress, getExistingSupersetIds, transformSessionExercises, useSessionPRDetection } from '@gym/shared'

function WorkoutSessionLayout({ title, fallbackRoute = '/' }) {
  const navigate = useNavigate()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const startRestTimer = useWorkoutStore(state => state.startRestTimer)
  const completedSets = useWorkoutStore(state => state.completedSets)
  const exerciseSetCounts = useWorkoutStore(state => state.exerciseSetCounts)

  useWakeLock()
  useTimerEngine()

  const hasCompletedSets = Object.keys(completedSets).length > 0

  const { data: sessionExercises, isLoading, error } = useSessionExercises(sessionId)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [navigateToOnEnd, setNavigateToOnEnd] = useState(null)
  const [sessionPRSummary, setSessionPRSummary] = useState(null)

  const completeSetMutation = useCompleteSet()
  const uncompleteSetMutation = useUncompleteSet()
  const { checkSetForPR, clearSetPR, prSets, prNotification, dismissPR } = useSessionPRDetection()
  const endSessionMutation = useEndSession()
  const abandonSessionMutation = useAbandonSession()
  const addSessionExerciseMutation = useAddSessionExercise()
  const removeSessionExerciseMutation = useRemoveSessionExercise()
  const replaceSessionExerciseMutation = useReplaceSessionExercise()
  const reorderSessionExercisesMutation = useReorderSessionExercises()

  const { exercisesByBlock, flatExercises } = useMemo(
    () => transformSessionExercises(sessionExercises),
    [sessionExercises]
  )

  const existingSupersets = useMemo(
    () => getExistingSupersetIds(sessionExercises || []),
    [sessionExercises]
  )

  const progress = useMemo(
    () => calculateExerciseProgress(flatExercises, completedSets, exerciseSetCounts),
    [flatExercises, completedSets, exerciseSetCounts]
  )

  useEffect(() => {
    if (!sessionId && !sessionPRSummary) {
      navigate(navigateToOnEnd || fallbackRoute)
    }
  }, [sessionId, navigate, fallbackRoute, navigateToOnEnd, sessionPRSummary])

  if (!sessionId && !sessionPRSummary) return null

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <ErrorMessage message={error.message} className="mb-4" />
        <button
          onClick={() => abandonSessionMutation.mutate()}
          disabled={abandonSessionMutation.isPending}
          className="w-full py-3 rounded-lg font-medium"
          style={{ backgroundColor: colors.danger, color: '#ffffff' }}
        >
          {abandonSessionMutation.isPending ? 'Cancelando...' : 'Cancelar sesión'}
        </button>
      </div>
    )
  }

  const handleCompleteSet = (setData, descansoSeg) => {
    completeSetMutation.mutate(setData, {
      onSuccess: () => {
        if (descansoSeg && descansoSeg > 0) {
          startRestTimer(descansoSeg)
        }
        checkSetForPR(setData)
      }
    })
  }

  const handleUncompleteSet = (setData) => {
    uncompleteSetMutation.mutate(setData)
    clearSetPR(setData.sessionExerciseId, setData.setNumber)
  }

  const handleEndWorkout = () => {
    setShowEndModal(true)
  }

  const handleConfirmEnd = ({ overallFeeling, notes }) => {
    endSessionMutation.mutate({ overallFeeling, notes }, {
      onSuccess: (data) => {
        if (data?.detectedPRs?.length > 0) {
          setSessionPRSummary(data.detectedPRs)
        } else {
          setNavigateToOnEnd('/history')
        }
      }
    })
  }

  const handleDismissPRSummary = () => {
    setSessionPRSummary(null)
    setNavigateToOnEnd('/history')
  }

  const handleAbandonWorkout = () => {
    setShowCancelModal(false)
    abandonSessionMutation.mutate()
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

  const handleReplaceExercise = (sessionExerciseId, newExerciseId) => {
    replaceSessionExerciseMutation.mutate({ sessionExerciseId, newExerciseId })
  }

  const handleReorderExercise = (currentIndex, newIndex) => {
    if (currentIndex === newIndex) return

    const newOrder = [...flatExercises]
    const [removed] = newOrder.splice(currentIndex, 1)
    newOrder.splice(newIndex, 0, removed)

    const orderedIds = newOrder.map(e => e.sessionExerciseId)
    reorderSessionExercisesMutation.mutate(orderedIds)
  }

  const hasExercises = flatExercises.length > 0

  return (
    <>
      <RestTimer />
      <PRNotification notification={prNotification} onDismiss={dismissPR} />
      <div className="p-4 max-w-2xl mx-auto pb-24">
        <PageHeader
          title={title}
          titleExtra={
            progress.total > 0 && (
              <span className="text-sm font-normal" style={{ color: colors.textSecondary }}>
                {progress.completed}/{progress.total}
              </span>
            )
          }
          onBack={() => navigate(-1)}
          menuItems={[
            { icon: Plus, label: 'Añadir ejercicio', onClick: () => setShowAddExercise(true) }
          ]}
        />

      <PRProvider value={prSets}>
      <main className="space-y-4">
        {!hasExercises ? (
          <div className="text-center py-12 px-4">
            <p className="text-secondary text-sm mb-6">
              No hay ejercicios. Añade los que quieras hacer.
            </p>
            <Button
              variant="primary"
              onClick={() => setShowAddExercise(true)}
            >
              Añadir ejercicio
            </Button>
          </div>
        ) : (
          <BlockExerciseList
            exercisesByBlock={exercisesByBlock}
            onCompleteSet={handleCompleteSet}
            onUncompleteSet={handleUncompleteSet}
            onRemove={handleRemoveExercise}
            onReplace={handleReplaceExercise}
            flatExercises={flatExercises}
            onReorder={handleReorderExercise}
            isReordering={reorderSessionExercisesMutation.isPending}
          />
        )}
      </main>
      </PRProvider>

      <BottomActions
        secondary={{
          label: abandonSessionMutation.isPending ? 'Cancelando...' : 'Cancelar',
          onClick: () => setShowCancelModal(true),
          disabled: abandonSessionMutation.isPending,
          danger: true,
        }}
        center={<SessionTimer />}
        primary={{
          label: endSessionMutation.isPending ? 'Guardando...' : 'Finalizar',
          onClick: handleEndWorkout,
          disabled: endSessionMutation.isPending || !hasCompletedSets,
        }}
      />

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

      <PRSummaryModal
        prs={sessionPRSummary}
        onDismiss={handleDismissPRSummary}
      />

    </div>
    </>
  )
}

function PRSummaryModal({ prs, onDismiss }) {
  if (!prs || prs.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-5"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <h3
          className="text-lg font-bold mb-4 text-center"
          style={{ color: colors.warning }}
        >
          Nuevos records personales
        </h3>
        <div className="space-y-3 mb-5">
          {prs.map((pr) => (
            <div key={pr.exerciseId}>
              <div className="text-sm font-semibold mb-1" style={{ color: colors.textPrimary }}>
                {pr.exerciseName}
              </div>
              {pr.details.map((d) => (
                <div key={d.type} className="flex items-center justify-between text-xs" style={{ color: colors.textSecondary }}>
                  <span>{d.label}</span>
                  <span>
                    <span className="font-bold" style={{ color: colors.warning }}>
                      {d.newValue} {d.unit}
                    </span>
                    {d.oldValue > 0 && (
                      <span className="ml-1">
                        (antes: {d.oldValue} · +{d.improvement}%)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-lg font-medium text-sm"
          style={{ backgroundColor: colors.warning, color: '#000' }}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

function PRNotification({ notification, onDismiss }) {
  if (!notification) return null

  const record = notification.records[0]
  const improvementText = record.previousValue
    ? ` (anterior: ${record.previousValue})`
    : ''

  return (
    <>
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg cursor-pointer max-w-sm w-[calc(100%-2rem)]"
        style={{ backgroundColor: colors.warning, color: '#000', animation: 'pr-slide-down 0.3s ease-out' }}
        onClick={onDismiss}
      >
        <div className="font-bold text-sm">Nuevo PR</div>
        <div className="text-xs">
          {notification.exerciseName}: {record.label} {record.value} {record.unit}{improvementText}
        </div>
      </div>
      <style>{`
        @keyframes pr-slide-down {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </>
  )
}

export default WorkoutSessionLayout
