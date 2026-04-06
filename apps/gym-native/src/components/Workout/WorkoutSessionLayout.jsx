import { useState, useMemo } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Plus, ArrowRightLeft } from 'lucide-react-native'
import {
  useCompleteSet, useUncompleteSet, useEndSession, useAbandonSession,
  useSessionExercises, useAddSessionExercise, useRemoveSessionExercise,
  useReplaceSessionExercise, useReorderSessionExercises, useWakeLock, useTimerEngine,
} from '../../hooks/useWorkout'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal, PageHeader } from '../ui'
import RestTimer from './RestTimer'
import BlockExerciseList from './BlockExerciseList'
import EndSessionModal from './EndSessionModal'
import SessionTimer from './SessionTimer'
import { AddExerciseModal } from '../Routine'
import WeightConverterModal from './WeightConverterModal'
import PRNotification from './PRNotification'
import useWorkoutStore from '../../stores/workoutStore'
import { calculateExerciseProgress, getExistingSupersetIds, transformSessionExercises, useSessionPRDetection } from '@gym/shared'
import { PRProvider } from './PRContext'
import { useStableHandlers } from '../../hooks/useStableHandlers'
import { colors } from '../../lib/styles'

export default function WorkoutSessionLayout({ title, navigation, fallbackRoute: _fallbackRoute = 'Home' }) {
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
    [sessionExercises],
  )

  const existingSupersets = useMemo(
    () => getExistingSupersetIds(sessionExercises || []),
    [sessionExercises],
  )

  const progress = useMemo(
    () => calculateExerciseProgress(flatExercises, completedSets, exerciseSetCounts),
    [flatExercises, completedSets, exerciseSetCounts],
  )

  const handlers = useStableHandlers({
    onCompleteSet: (setData, descansoSeg) => {
      if (descansoSeg && descansoSeg > 0) {
        startRestTimer(descansoSeg)
      }
      completeSetMutation.mutate(setData, {
        onSuccess: () => {
          try { checkSetForPR(setData) } catch { /* PR check no critico */ }
        },
      })
    },
    onUncompleteSet: (setData) => {
      uncompleteSetMutation.mutate(setData)
      clearSetPR(setData.sessionExerciseId, setData.setNumber)
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
    endSessionMutation.mutate({ overallFeeling, notes }, {
      onSuccess: () => {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
      },
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
      onSuccess: () => setShowAddExercise(false),
    })
  }

  const hasExercises = flatExercises.length > 0
  const titleWithProgress = progress.total > 0
    ? `${title}  ${progress.completed}/${progress.total}`
    : title

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <RestTimer />
      <PRNotification notification={prNotification} onDismiss={dismissPR} />

      <PageHeader
        title={titleWithProgress}
        onBack={() => useWorkoutStore.getState().hideWorkout()}
        menuItems={[
          { icon: Plus, label: t('workout:addExercise.toSession'), onPress: () => setShowAddExercise(true) },
          { icon: ArrowRightLeft, label: t('workout:set.weightConverter'), onPress: () => setShowConverter(true) },
        ]}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <PRProvider value={prSets}>
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {!hasExercises ? (
            <View className="items-center py-12 px-4">
              <Text className="text-secondary text-sm mb-6">
                {t('workout:addExercise.noExercises')}
              </Text>
              <Button onPress={() => setShowAddExercise(true)}>{t('workout:addExercise.toSession')}</Button>
            </View>
          ) : (
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
          )}
        </ScrollView>
        </PRProvider>
      </KeyboardAvoidingView>

      <View
        className="flex-row items-center gap-3 px-4 py-3"
        style={{ backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.border }}
      >
        <Button
          variant="danger"
          onPress={() => setShowCancelModal(true)}
          loading={abandonSessionMutation.isPending}
          className="flex-1"
        >
          {t('common:buttons.cancel')}
        </Button>
        <SessionTimer />
        <Button
          onPress={() => setShowEndModal(true)}
          disabled={endSessionMutation.isPending || !hasCompletedSets}
          loading={endSessionMutation.isPending}
          className="flex-1"
        >
          {t('workout:session.end')}
        </Button>
      </View>

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
    </SafeAreaView>
  )
}
