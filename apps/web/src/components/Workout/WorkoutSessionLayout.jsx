import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import PRNotification from './PRNotification.jsx'
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
import { Plus, ArrowRightLeft } from 'lucide-react'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal, BottomActions, PageHeader } from '../ui/index.js'
import RestTimer from './RestTimer.jsx'
import BlockExerciseList from './BlockExerciseList.jsx'
import EndSessionModal from './EndSessionModal.jsx'
import SessionTimer from './SessionTimer.jsx'
import { AddExerciseModal } from '../Routine/index.js'
import WeightConverterModal from './WeightConverterModal.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { calculateExerciseProgress, getExistingSupersetIds, transformSessionExercises, useSessionPRDetection } from '@gym/shared'

function WorkoutSessionLayout({ title, fallbackRoute = '/' }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

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
  const [showConverter, setShowConverter] = useState(false)
  const [navigateToOnEnd, setNavigateToOnEnd] = useState(null)

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
    if (!sessionId) {
      navigate(navigateToOnEnd || fallbackRoute)
    }
  }, [sessionId, navigate, fallbackRoute, navigateToOnEnd])

  if (!sessionId) return null

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <ErrorMessage message={error.message} className="mb-4" />
        <button
          onClick={() => abandonSessionMutation.mutate()}
          disabled={abandonSessionMutation.isPending}
          className="w-full py-3 rounded-lg font-medium"
          style={{ backgroundColor: colors.danger, color: colors.white }}
        >
          {abandonSessionMutation.isPending ? t('common:buttons.loading') : t('workout:session.abandon')}
        </button>
      </div>
    )
  }

  const handleCompleteSet = (setData, descansoSeg) => {
    if (descansoSeg && descansoSeg > 0) {
      startRestTimer(descansoSeg)
    }
    completeSetMutation.mutate(setData, {
      onSuccess: () => {
        try { checkSetForPR(setData) } catch { /* PR check no critico */ }
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
      onSuccess: () => {
        setNavigateToOnEnd('/')
      }
    })
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
            { icon: Plus, label: t('workout:addExercise.toSession'), onClick: () => setShowAddExercise(true) },
            { icon: ArrowRightLeft, label: t('workout:converter'), onClick: () => setShowConverter(true) },
          ]}
        />

      <PRProvider value={prSets}>
      <main className="space-y-4">
        {!hasExercises ? (
          <div className="text-center py-12 px-4">
            <p className="text-secondary text-sm mb-6">
              {t('exercise:noExercises')}
            </p>
            <Button
              variant="primary"
              onClick={() => setShowAddExercise(true)}
            >
              {t('workout:addExercise.toSession')}
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
            existingSupersets={existingSupersets}
          />
        )}
      </main>
      </PRProvider>

      <BottomActions
        secondary={{
          label: abandonSessionMutation.isPending ? t('common:buttons.loading') : t('common:buttons.cancel'),
          onClick: () => setShowCancelModal(true),
          disabled: abandonSessionMutation.isPending,
          danger: true,
        }}
        center={<SessionTimer />}
        primary={{
          label: endSessionMutation.isPending ? t('common:buttons.loading') : t('common:buttons.done'),
          onClick: handleEndWorkout,
          disabled: endSessionMutation.isPending || !hasCompletedSets,
        }}
      />

      <ConfirmModal
        isOpen={showCancelModal}
        title={t('workout:session.abandonConfirm')}
        message={t('workout:session.abandonMessage')}
        confirmText={t('workout:session.abandon')}
        cancelText={t('common:buttons.continue')}
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

      <WeightConverterModal
        isOpen={showConverter}
        onClose={() => setShowConverter(false)}
      />

    </div>
    </>
  )
}

export default WorkoutSessionLayout
