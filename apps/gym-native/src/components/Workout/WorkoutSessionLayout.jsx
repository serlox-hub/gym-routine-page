import { useState, useMemo } from 'react'
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import Animated, { useAnimatedRef } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Plus, ArrowRightLeft, X, Flag, ChevronDown } from 'lucide-react-native'
import {
  useCompleteSet, useUncompleteSet, useEndSession, useAbandonSession,
  useSessionExercises, useAddSessionExercise, useRemoveSessionExercise,
  useReplaceSessionExercise, useReorderSessionExercises, useWakeLock,
} from '../../hooks/useWorkout'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal, PageHeader } from '../ui'
import RestTimer from './RestTimer'
import BlockExerciseList from './BlockExerciseList'
import EndSessionModal from './EndSessionModal'
import ExerciseProgressBar from './ExerciseProgressBar'
import GymSelector from './GymSelector'
import { AddExerciseModal } from '../Routine'
import WeightConverterModal from './WeightConverterModal'
import PRNotification from './PRNotification'
import useWorkoutStore from '../../stores/workoutStore'
import { calculateExerciseLevelProgress, getExerciseName, getExistingSupersetIds, mergeBlockOrder, transformSessionExercises, useSessionPRDetection, useSessionTimer, ExpandedExerciseProvider, buildWorkoutSummaryFromEndSession, useLastSetAt, useUserExerciseDistanceUnits, useSelectedGym, useChangeSessionGym, getGymDisplayName } from '@gym/shared'
import { usePreference } from '../../hooks/usePreferences'
import { PRProvider } from './PRContext'
import { useStableHandlers } from '../../hooks/useStableHandlers'
import { navigationRef } from '../../navigation/navigationRef'
import { colors } from '../../lib/styles'

export default function WorkoutSessionLayout({ title }) {
  const { t } = useTranslation()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const startRestTimer = useWorkoutStore(state => state.startRestTimer)
  const completedSets = useWorkoutStore(state => state.completedSets)
  const exerciseSetCounts = useWorkoutStore(state => state.exerciseSetCounts)
  const sessionGymId = useWorkoutStore(state => state.gymId)
  const routineDayId = useWorkoutStore(state => state.routineDayId)

  const { gyms, hasMultiple } = useSelectedGym()
  const { changeGym } = useChangeSessionGym()
  const [showGymSelector, setShowGymSelector] = useState(false)

  useWakeLock()

  const hasCompletedSets = Object.keys(completedSets).length > 0
  const { data: sessionExercises, isLoading, error } = useSessionExercises(sessionId)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  // Add form already submitted in a routine session, waiting for "only today" / "also in the routine".
  const [pendingAdd, setPendingAdd] = useState(null)
  const [showConverter, setShowConverter] = useState(false)

  const completeSetMutation = useCompleteSet()
  const uncompleteSetMutation = useUncompleteSet()
  const { prSets, prNotification, dismissPR } = useSessionPRDetection()
  const { value: weightUnit } = usePreference('weight_unit')
  const { data: distanceUnitByExerciseId } = useUserExerciseDistanceUnits()
  const { lastSetAt, isResolved: isLastSetResolved } = useLastSetAt({ enabled: showEndModal })
  const endSessionMutation = useEndSession({
    onSuccess: ({ session, detectedPRs }) => {
      if (!navigationRef.isReady()) return
      const completedSetsSnapshot = useWorkoutStore.getState().completedSets
      const summaryData = buildWorkoutSummaryFromEndSession(
        session,
        detectedPRs,
        completedSetsSnapshot,
        sessionExercises,
        { weightUnit, distanceUnitByExerciseId },
      )
      navigationRef.reset({
        index: 1,
        routes: [
          { name: 'MainTabs', state: { routes: [{ name: 'Home' }] } },
          { name: 'WorkoutSummary', params: { summaryData } },
        ],
      })
    },
  })
  const abandonSessionMutation = useAbandonSession()
  const addSessionExerciseMutation = useAddSessionExercise()
  const removeSessionExerciseMutation = useRemoveSessionExercise()
  const replaceSessionExerciseMutation = useReplaceSessionExercise()
  const reorderSessionExercisesMutation = useReorderSessionExercises()

  const { exercisesByBlock, flatExercises } = useMemo(
    () => transformSessionExercises(sessionExercises),
    [sessionExercises],
  )

  const existingSupersets = useMemo(
    () => getExistingSupersetIds(sessionExercises || []),
    [sessionExercises],
  )

  const progress = useMemo(
    () => calculateExerciseLevelProgress(flatExercises, completedSets, exerciseSetCounts),
    [flatExercises, completedSets, exerciseSetCounts],
  )

  const firstExerciseKey = useMemo(() => {
    const first = flatExercises.find(e => !e.isWarmup)
    return first ? (first.sessionExerciseId || first.id) : null
  }, [flatExercises])

  const { formatted: elapsedTime } = useSessionTimer()
  // `DraggableList` auto-scrolls (and keeps the dragged row under the finger) with `scrollTo` from
  // the UI thread, which needs an `Animated.ScrollView` behind a `useAnimatedRef`: on a plain
  // `ScrollView` it silently does nothing.
  const scrollRef = useAnimatedRef()

  const handlers = useStableHandlers({
    onCompleteSet: (setData, descansoSeg, context) => {
      if (descansoSeg && descansoSeg > 0) {
        startRestTimer(descansoSeg, context)
      }
      // El PR (trofeo + toast) se detecta de forma derivada al cambiar completedSets.
      completeSetMutation.mutate(setData)
    },
    onUncompleteSet: (setData) => {
      uncompleteSetMutation.mutate(setData)
      // El trofeo se recalcula solo al desaparecer la serie de completedSets (prSets derivado).
    },
    onRemove: (sessionExerciseId) => {
      removeSessionExerciseMutation.mutate(sessionExerciseId)
    },
    onReplace: (sessionExerciseId, newExercise, applyToRoutine) => {
      replaceSessionExerciseMutation.mutate({ sessionExerciseId, newExercise, applyToRoutine })
    },
    onReorderBlock: (isWarmup, blockItems) => {
      reorderSessionExercisesMutation.mutate(mergeBlockOrder(flatExercises, isWarmup, blockItems))
    },
  })

  if (!sessionId) return null

  if (isLoading && !sessionExercises) return <LoadingSpinner />
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface p-4">
        <ErrorMessage message={error.message} className="mb-4" />
        <Button
          variant="danger"
          onPress={() => abandonSessionMutation.mutate()}
          loading={abandonSessionMutation.isPending}
        >
          {abandonSessionMutation.isPending ? t('common:buttons.loading') : t('workout:session.abandon')}
        </Button>
      </SafeAreaView>
    )
  }

  const handleConfirmEnd = ({ overallFeeling, notes, completedAt }) => {
    endSessionMutation.mutate({ overallFeeling, notes, completedAt })
  }

  const handleAbandonWorkout = () => {
    setShowCancelModal(false)
    abandonSessionMutation.mutate()
  }

  // A free session has no routine to ask about: the exercise goes to the session only.
  const handleAddExercise = (data) => {
    if (routineDayId == null) {
      addSessionExerciseMutation.mutate({ ...data, addToRoutine: false }, {
        onSuccess: () => setShowAddExercise(false),
      })
      return
    }
    setShowAddExercise(false)
    setPendingAdd(data)
  }

  const confirmAdd = (addToRoutine) => {
    addSessionExerciseMutation.mutate({ ...pendingAdd, addToRoutine })
    setPendingAdd(null)
  }

  const hasExercises = flatExercises.length > 0

  // Cambio de gym optimista (ver useChangeSessionGym): si la unidad cambia en el gym destino,
  // convierte los pesos ya registrados en local al instante y avisa por toast; persiste en 2º plano.
  const handleSelectGym = (newGymId) => {
    const gym = gyms.find(g => String(g.id) === String(newGymId))
    changeGym(newGymId, gym ? getGymDisplayName(gym, t('common:gym.defaultName')) : undefined)
  }

  const currentGym = gyms.find(g => String(g.id) === String(sessionGymId))
  const currentGymName = currentGym ? getGymDisplayName(currentGym, t('common:gym.defaultName')) : null

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <RestTimer />
      <PRNotification notification={prNotification} onDismiss={dismissPR} />

      <PageHeader
        title={title}
        onBack={() => useWorkoutStore.getState().hideWorkout()}
        menuItems={[
          { icon: ArrowRightLeft, label: t('workout:set.weightConverter'), onClick: () => setShowConverter(true) },
          { icon: X, label: t('workout:session.abandon'), onClick: () => setShowCancelModal(true), danger: true },
        ]}
      />

      <View className="px-4">
        <ExerciseProgressBar
          setsCompleted={progress.setsCompleted}
          setsTotal={progress.setsTotal}
          segments={progress.segments}
          elapsedTime={elapsedTime}
          gymSlot={hasMultiple && currentGymName ? (
            <Pressable
              onPress={() => setShowGymSelector(true)}
              className="active:opacity-80"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 180,
                paddingLeft: 8, paddingRight: 6, paddingVertical: 2,
                borderRadius: 999, backgroundColor: colors.bgTertiary,
                borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>{t('common:gym.label')}:</Text>
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', flexShrink: 1 }}>{currentGymName}</Text>
              <ChevronDown size={12} color={colors.textMuted} />
            </Pressable>
          ) : null}
        />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <PRProvider value={prSets}>
        <ExpandedExerciseProvider defaultKey={firstExerciseKey}>
        {/* `style`, not `className`: NativeWind drops `className` on `Animated.*` without a warning. */}
        <Animated.ScrollView ref={scrollRef} style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {!hasExercises ? (
            <View className="items-center py-12 px-4">
              <Text className="text-secondary text-sm mb-6">
                {t('workout:addExercise.noExercises')}
              </Text>
              <Button onPress={() => setShowAddExercise(true)}>{t('workout:addExercise.toSession')}</Button>
            </View>
          ) : (
            <>
              <BlockExerciseList
                exercisesByBlock={exercisesByBlock}
                onCompleteSet={handlers.onCompleteSet}
                onUncompleteSet={handlers.onUncompleteSet}
                onRemove={handlers.onRemove}
                onReplace={handlers.onReplace}
                flatExercises={flatExercises}
                onReorderBlock={handlers.onReorderBlock}
                scrollRef={scrollRef}
                isReordering={reorderSessionExercisesMutation.isPending}
                existingSupersets={existingSupersets}
              />
              <Pressable onPress={() => setShowAddExercise(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingVertical: 14, borderRadius: 12, marginTop: 24,
                  borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent',
                }}>
                <Plus size={18} color={colors.textLight} />
                <Text style={{ color: colors.textLight, fontSize: 15, fontWeight: '600' }}>
                  {t('workout:addExercise.toSession')}
                </Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={() => setShowEndModal(true)}
            disabled={endSessionMutation.isPending || !hasCompletedSets}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: 14, borderRadius: 12, marginTop: 24,
              borderWidth: 1, borderColor: colors.success, backgroundColor: 'transparent',
              opacity: (endSessionMutation.isPending || !hasCompletedSets) ? 0.4 : 1,
            }}>
            <Flag size={18} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: 15, fontWeight: '600' }}>
              {endSessionMutation.isPending ? t('common:buttons.loading') : t('workout:session.finishWorkout')}
            </Text>
          </Pressable>
        </Animated.ScrollView>
        </ExpandedExerciseProvider>
        </PRProvider>
      </KeyboardAvoidingView>

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

      <ConfirmModal
        isOpen={!!pendingAdd}
        title={t('workout:exercise.addScopeTitle')}
        message={t('workout:exercise.addScopeMessage', { name: getExerciseName(pendingAdd?.exercise) })}
        cancelText={t('workout:exercise.addOnlyToday')}
        confirmText={t('workout:exercise.addAlsoRoutine')}
        variant="primary"
        onCancel={() => confirmAdd(false)}
        onConfirm={() => confirmAdd(true)}
        // Closing without choosing (backdrop, Android back) adds to today only. Unlike replace,
        // where closing aborts on purpose: replacing destroys the completed sets, adding destroys
        // nothing, the user already pressed "Add", and the session is the narrow, safe scope.
        onDismiss={() => confirmAdd(false)}
      />

      <EndSessionModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onConfirm={handleConfirmEnd}
        isPending={endSessionMutation.isPending}
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
    </SafeAreaView>
  )
}
