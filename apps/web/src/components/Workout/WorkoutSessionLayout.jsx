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
} from '../../hooks/useWorkout.js'
import { Plus, ArrowRightLeft, X, Flag, ChevronDown } from 'lucide-react'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal, PageHeader } from '../ui/index.js'
import RestTimer from './RestTimer.jsx'
import BlockExerciseList from './BlockExerciseList.jsx'
import EndSessionModal from './EndSessionModal.jsx'
import ExerciseProgressBar from './ExerciseProgressBar.jsx'
import GymSelector from './GymSelector.jsx'
import { AddExerciseModal } from '../Routine/index.js'
import WeightConverterModal from './WeightConverterModal.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { calculateExerciseLevelProgress, getExistingSupersetIds, transformSessionExercises, useSessionPRDetection, useSessionTimer, ExpandedExerciseProvider, buildWorkoutSummaryFromEndSession, usePreference, useSelectedGym, useSetSelectedGym, updateSessionGym, getGymDisplayName } from '@gym/shared'

function WorkoutSessionLayout({ title, fallbackRoute = '/' }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const startRestTimer = useWorkoutStore(state => state.startRestTimer)
  const completedSets = useWorkoutStore(state => state.completedSets)
  const exerciseSetCounts = useWorkoutStore(state => state.exerciseSetCounts)
  const sessionGymId = useWorkoutStore(state => state.gymId)
  const setSessionGym = useWorkoutStore(state => state.setSessionGym)

  const { gyms, hasMultiple } = useSelectedGym()
  const { setSelectedGym } = useSetSelectedGym()

  useWakeLock()

  const hasCompletedSets = Object.keys(completedSets).length > 0

  const { data: sessionExercises, isLoading, error } = useSessionExercises(sessionId)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [showConverter, setShowConverter] = useState(false)
  const [showGymSelector, setShowGymSelector] = useState(false)
  const [navigateToOnEnd, setNavigateToOnEnd] = useState(null)
  const { value: weightUnit } = usePreference('weight_unit')

  const completeSetMutation = useCompleteSet()
  const uncompleteSetMutation = useUncompleteSet()
  const { prSets, prNotification, dismissPR } = useSessionPRDetection()
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
    () => calculateExerciseLevelProgress(flatExercises, completedSets, exerciseSetCounts),
    [flatExercises, completedSets, exerciseSetCounts]
  )

  const firstExerciseKey = useMemo(() => {
    const first = flatExercises.find(e => !e.isWarmup)
    return first ? (first.sessionExerciseId || first.id) : null
  }, [flatExercises])

  const { formatted: elapsedTime } = useSessionTimer()

  useEffect(() => {
    if (sessionId) return
    if (navigateToOnEnd) {
      navigate(navigateToOnEnd.to, { state: navigateToOnEnd.state, replace: true })
    } else {
      navigate(fallbackRoute, { replace: true })
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

  const handleCompleteSet = (setData, descansoSeg, context) => {
    if (descansoSeg && descansoSeg > 0) {
      startRestTimer(descansoSeg, context)
    }
    // El PR (trofeo + toast) se detecta de forma derivada al cambiar completedSets.
    completeSetMutation.mutate(setData)
  }

  const handleUncompleteSet = (setData) => {
    uncompleteSetMutation.mutate(setData)
    // El trofeo se recalcula solo al desaparecer la serie de completedSets (prSets derivado).
  }

  const handleEndWorkout = () => {
    setShowEndModal(true)
  }

  const handleConfirmEnd = ({ overallFeeling, notes }) => {
    endSessionMutation.mutate({ overallFeeling, notes }, {
      onSuccess: ({ session, detectedPRs }) => {
        const completedSetsSnapshot = useWorkoutStore.getState().completedSets
        const summaryData = buildWorkoutSummaryFromEndSession(
          session,
          detectedPRs,
          completedSetsSnapshot,
          sessionExercises,
          { weightUnit },
        )
        setNavigateToOnEnd({ to: '/workout/summary', state: { summaryData } })
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

  const handleSelectGym = async (gymId) => {
    setSessionGym(gymId)
    setSelectedGym(gymId)
    try {
      await updateSessionGym({ sessionId, gymId })
    } catch { /* la sesión local ya refleja el cambio */ }
  }

  const currentGym = gyms.find(g => String(g.id) === String(sessionGymId))
  const currentGymName = currentGym ? getGymDisplayName(currentGym, t('common:gym.defaultName')) : null

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
      <div className="p-4 max-w-2xl mx-auto pb-32">
        <PageHeader
          title={title}
          onBack={() => navigate(-1)}
          menuItems={[
            { icon: Plus, label: t('workout:addExercise.toSession'), onClick: () => setShowAddExercise(true) },
            { icon: ArrowRightLeft, label: t('workout:set.weightConverter'), onClick: () => setShowConverter(true) },
            { icon: X, label: t('workout:session.abandon'), onClick: () => setShowCancelModal(true), danger: true },
          ]}
        >
          <ExerciseProgressBar
            completed={progress.completed}
            total={progress.total}
            pct={progress.setsTotal > 0 ? Math.round((progress.setsCompleted / progress.setsTotal) * 100) : 0}
            elapsedTime={elapsedTime}
            gymSlot={hasMultiple && currentGymName ? (
              <button
                onClick={() => setShowGymSelector(true)}
                className="inline-flex items-center gap-1 max-w-[50vw] pl-2 pr-1.5 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
                title={t('common:gym.changeForSession')}
              >
                <span style={{ color: colors.textMuted, fontSize: 12, fontWeight: 600 }}>{t('common:gym.label')}:</span>
                <span className="truncate" style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}>{currentGymName}</span>
                <ChevronDown size={12} style={{ color: colors.textMuted }} />
              </button>
            ) : null}
          />
        </PageHeader>

      <PRProvider value={prSets}>
      <ExpandedExerciseProvider defaultKey={firstExerciseKey}>
      <main className="space-y-4">
        {!hasExercises ? (
          <div className="text-center py-12 px-4">
            <p className="text-secondary text-sm mb-6">
              {t('workout:addExercise.noExercises')}
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
      </ExpandedExerciseProvider>
      </PRProvider>

      <button
        onClick={handleEndWorkout}
        disabled={endSessionMutation.isPending || !hasCompletedSets}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-6 disabled:opacity-40"
        style={{
          backgroundColor: 'transparent',
          border: `1px solid ${colors.success}`,
          color: colors.success,
          fontSize: 15,
        }}
      >
        <Flag size={18} />
        {endSessionMutation.isPending ? t('common:buttons.loading') : t('workout:session.finishWorkout')}
      </button>

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

      <GymSelector
        isOpen={showGymSelector}
        onClose={() => setShowGymSelector(false)}
        selectedGymId={sessionGymId}
        onSelect={handleSelectGym}
      />

    </div>
    </>
  )
}

export default WorkoutSessionLayout
