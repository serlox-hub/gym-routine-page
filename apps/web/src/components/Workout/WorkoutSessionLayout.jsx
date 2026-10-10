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
  useAddSessionExerciseFlow,
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
import { calculateExerciseLevelProgress, getExerciseName, getExistingSupersetIds, mergeBlockOrder, transformSessionExercises, useSessionPRDetection, useSessionTimer, ExpandedExerciseProvider, buildWorkoutSummaryFromEndSession, useLastSetAt, usePreference, useUserExerciseDistanceUnits, useSessionWeightUnitByExercise, useSelectedGym, useChangeSessionGym, getGymDisplayName } from '@gym/shared'

function WorkoutSessionLayout({ title, fallbackRoute = '/' }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const sessionId = useWorkoutStore(state => state.sessionId)
  const startRestTimer = useWorkoutStore(state => state.startRestTimer)
  const completedSets = useWorkoutStore(state => state.completedSets)
  const exerciseSetCounts = useWorkoutStore(state => state.exerciseSetCounts)
  const sessionGymId = useWorkoutStore(state => state.gymId)

  const { gyms, hasMultiple } = useSelectedGym()
  const { changeGym } = useChangeSessionGym()

  useWakeLock()

  const hasCompletedSets = Object.keys(completedSets).length > 0

  const { data: sessionExercises, isLoading, error } = useSessionExercises(sessionId)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showConverter, setShowConverter] = useState(false)
  const [showGymSelector, setShowGymSelector] = useState(false)
  const [navigateToOnEnd, setNavigateToOnEnd] = useState(null)
  const { value: weightUnit } = usePreference('weight_unit')
  const { data: distanceUnitByExerciseId } = useUserExerciseDistanceUnits()
  const weightUnitByExerciseId = useSessionWeightUnitByExercise(sessionExercises)

  const completeSetMutation = useCompleteSet()
  const uncompleteSetMutation = useUncompleteSet()
  const { prSets, prNotification, dismissPR } = useSessionPRDetection()
  const { lastSetAt, isResolved: isLastSetResolved } = useLastSetAt({ enabled: showEndModal })
  const endSessionMutation = useEndSession()
  const abandonSessionMutation = useAbandonSession()
  const addFlow = useAddSessionExerciseFlow()
  const addFailedMessage = addFlow.isFailed ? t('workout:exercise.addFailed') : null
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
    // Not in an effect: `useMutation` returns a new object every render, so the effect would reset
    // on every render. It cannot be pending here: the modal cannot close while pending.
    endSessionMutation.reset()
    setShowEndModal(true)
  }

  const handleConfirmEnd = ({ overallFeeling, notes, completedAt }) => {
    endSessionMutation.mutate({ overallFeeling, notes, completedAt }, {
      onSuccess: ({ session, detectedPRs }) => {
        const completedSetsSnapshot = useWorkoutStore.getState().completedSets
        const summaryData = buildWorkoutSummaryFromEndSession(
          session,
          detectedPRs,
          completedSetsSnapshot,
          sessionExercises,
          { weightUnit, weightUnitByExerciseId, distanceUnitByExerciseId },
        )
        setNavigateToOnEnd({ to: '/workout/summary', state: { summaryData } })
      }
    })
  }

  const handleAbandonWorkout = () => {
    setShowCancelModal(false)
    abandonSessionMutation.mutate()
  }

  const handleRemoveExercise = (sessionExerciseId) => {
    removeSessionExerciseMutation.mutate(sessionExerciseId)
  }

  const handleReplaceExercise = (sessionExerciseId, newExercise, applyToRoutine) => {
    replaceSessionExerciseMutation.mutate({ sessionExerciseId, newExercise, applyToRoutine })
  }

  // Cambio de gym optimista (ver useChangeSessionGym): si la unidad cambia en el gym destino,
  // convierte los pesos ya registrados en local al instante y avisa por toast; persiste en 2º plano.
  const handleSelectGym = (newGymId) => {
    const gym = gyms.find(g => String(g.id) === String(newGymId))
    changeGym(newGymId, gym ? getGymDisplayName(gym, t('common:gym.defaultName')) : undefined)
  }

  const currentGym = gyms.find(g => String(g.id) === String(sessionGymId))
  const currentGymName = currentGym ? getGymDisplayName(currentGym, t('common:gym.defaultName')) : null

  const handleReorderBlock = (isWarmup, blockItems) => {
    reorderSessionExercisesMutation.mutate(mergeBlockOrder(flatExercises, isWarmup, blockItems))
  }

  const hasExercises = flatExercises.length > 0

  return (
    <>
      <RestTimer />
      <PRNotification notification={prNotification} onDismiss={dismissPR} />
      <div className="p-4 max-w-2xl mx-auto pb-32">
        <PageHeader
          title={title}
          fallbackTo={fallbackRoute}
          menuItems={[
            { icon: ArrowRightLeft, label: t('workout:set.weightConverter'), onClick: () => setShowConverter(true) },
            { icon: X, label: t('workout:session.abandon'), onClick: () => setShowCancelModal(true), danger: true },
          ]}
        >
          <ExerciseProgressBar
            setsCompleted={progress.setsCompleted}
            setsTotal={progress.setsTotal}
            segments={progress.segments}
            elapsedTime={elapsedTime}
            gymSlot={hasMultiple && currentGymName ? (
              // The button is the 44px box (touch target); the pill inside keeps its size.
              <button
                onClick={() => setShowGymSelector(true)}
                className="min-h-11 inline-flex items-center max-w-[50vw] hover:opacity-80 transition-opacity"
                title={t('common:gym.changeForSession')}
              >
                <span
                  className="inline-flex items-center gap-1 min-w-0 pl-2 pr-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
                >
                  <span style={{ color: colors.textMuted, fontSize: 12, fontWeight: 600 }}>{t('common:gym.label')}:</span>
                  <span className="truncate" style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}>{currentGymName}</span>
                  <ChevronDown size={12} style={{ color: colors.textMuted }} />
                </span>
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
              onClick={addFlow.openModal}
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
            onReorderBlock={handleReorderBlock}
            isReordering={reorderSessionExercisesMutation.isPending}
            existingSupersets={existingSupersets}
          />
        )}
      </main>
      </ExpandedExerciseProvider>
      </PRProvider>

      {hasExercises && (
        <button
          onClick={addFlow.openModal}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold mt-6"
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textLight,
            fontSize: 15,
          }}
        >
          <Plus size={18} />
          {t('workout:addExercise.toSession')}
        </button>
      )}

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
        isOpen={addFlow.isModalOpen}
        onClose={addFlow.closeModal}
        onSubmit={addFlow.submitModal}
        isPending={addFlow.isPending}
        saveStatus
        error={addFailedMessage}
        onBackToPicker={addFlow.backToPicker}
        mode="session"
        existingSupersets={existingSupersets}
      />

      <ConfirmModal
        isOpen={!!addFlow.pendingAdd}
        title={t('workout:exercise.addScopeTitle')}
        message={t('workout:exercise.addScopeMessage', { name: getExerciseName(addFlow.pendingAdd?.exercise) })}
        cancelText={t('workout:exercise.addOnlyToday')}
        confirmText={t('workout:exercise.addAlsoRoutine')}
        variant="primary"
        onCancel={() => addFlow.chooseScope(false)}
        onConfirm={() => addFlow.chooseScope(true)}
        onDismiss={addFlow.dismissScope}
        isLoading={addFlow.isPending}
        loadingButton={addFlow.attempt?.addToRoutine ? 'confirm' : 'cancel'}
        saveStatus
        error={addFailedMessage}
        dismissibleWhileLoading
      />

      <EndSessionModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onConfirm={handleConfirmEnd}
        isPending={endSessionMutation.isPending}
        error={endSessionMutation.isError ? t('workout:session.endFailed') : null}
        setsPending={progress.setsPending}
        lastSetAt={lastSetAt}
        isLastSetResolved={isLastSetResolved}
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
