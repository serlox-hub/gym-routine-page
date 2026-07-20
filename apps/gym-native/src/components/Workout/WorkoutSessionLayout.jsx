import { useState, useMemo } from 'react'
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
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
import { calculateExerciseLevelProgress, getExistingSupersetIds, transformSessionExercises, useSessionPRDetection, useSessionTimer, ExpandedExerciseProvider, buildWorkoutSummaryFromEndSession, useSelectedGym, useSetSelectedGym, updateSessionGym, getGymDisplayName } from '@gym/shared'
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
  const setSessionGym = useWorkoutStore(state => state.setSessionGym)

  const { gyms, hasMultiple } = useSelectedGym()
  const { setSelectedGym } = useSetSelectedGym()
  const [showGymSelector, setShowGymSelector] = useState(false)

  useWakeLock()

  const hasCompletedSets = Object.keys(completedSets).length > 0
  const { data: sessionExercises, isLoading, error } = useSessionExercises(sessionId)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [showConverter, setShowConverter] = useState(false)

  const completeSetMutation = useCompleteSet()
  const uncompleteSetMutation = useUncompleteSet()
  const { prSets, prNotification, dismissPR } = useSessionPRDetection()
  const { value: weightUnit } = usePreference('weight_unit')
  const endSessionMutation = useEndSession({
    onSuccess: ({ session, detectedPRs }) => {
      if (!navigationRef.isReady()) return
      const completedSetsSnapshot = useWorkoutStore.getState().completedSets
      const summaryData = buildWorkoutSummaryFromEndSession(
        session,
        detectedPRs,
        completedSetsSnapshot,
        sessionExercises,
        { weightUnit },
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
    onReplace: (sessionExerciseId, newExerciseId) => {
      replaceSessionExerciseMutation.mutate({ sessionExerciseId, newExerciseId })
    },
    onReorder: (currentIndex, newIndex) => {
      if (currentIndex === newIndex) return
      const newOrder = [...flatExercises]
      const [removed] = newOrder.splice(currentIndex, 1)
      newOrder.splice(newIndex, 0, removed)
      const orderedIds = newOrder.map(e => e.sessionExerciseId)
      reorderSessionExercisesMutation.mutate(orderedIds)
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

  const handleConfirmEnd = ({ overallFeeling, notes }) => {
    endSessionMutation.mutate({ overallFeeling, notes })
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
      onSuccess: () => setShowAddExercise(false),
    })
  }

  const hasExercises = flatExercises.length > 0

  const handleSelectGym = async (gymId) => {
    setSessionGym(gymId)
    setSelectedGym(gymId)
    try {
      await updateSessionGym({ sessionId, gymId })
    } catch { /* la sesión local ya refleja el cambio */ }
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
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
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
                onReorder={handlers.onReorder}
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
        </ScrollView>
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
    </SafeAreaView>
  )
}
