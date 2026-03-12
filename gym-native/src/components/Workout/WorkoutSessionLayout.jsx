import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus } from 'lucide-react-native'
import {
  useCompleteSet, useUncompleteSet, useEndSession, useAbandonSession,
  useSessionExercises, useAddSessionExercise, useRemoveSessionExercise,
  useWakeLock,
} from '../../hooks/useWorkout'
import { LoadingSpinner, ErrorMessage, Button, ConfirmModal, PageHeader } from '../ui'
import RestTimer from './RestTimer'
import BlockExerciseList from './BlockExerciseList'
import EndSessionModal from './EndSessionModal'
import SessionTimer from './SessionTimer'
import { AddExerciseModal } from '../Routine'
import useWorkoutStore from '../../stores/workoutStore'
import { transformSessionExercises } from '../../lib/workoutTransforms'
import { getExistingSupersetIds } from '../../lib/supersetUtils'
import { calculateExerciseProgress } from '../../lib/workoutCalculations'
import { colors } from '../../lib/styles'

export default function WorkoutSessionLayout({ title, navigation, fallbackRoute = 'Home' }) {
  const sessionId = useWorkoutStore(state => state.sessionId)
  const startRestTimer = useWorkoutStore(state => state.startRestTimer)
  const completedSets = useWorkoutStore(state => state.completedSets)
  const exerciseSetCounts = useWorkoutStore(state => state.exerciseSetCounts)

  useWakeLock()

  const hasCompletedSets = Object.keys(completedSets).length > 0
  const { data: sessionExercises, isLoading, error } = useSessionExercises(sessionId)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)

  const completeSetMutation = useCompleteSet()
  const uncompleteSetMutation = useUncompleteSet()
  const endSessionMutation = useEndSession()
  const abandonSessionMutation = useAbandonSession()
  const addSessionExerciseMutation = useAddSessionExercise()
  const removeSessionExerciseMutation = useRemoveSessionExercise()

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
          {abandonSessionMutation.isPending ? 'Cancelando...' : 'Cancelar sesión'}
        </Button>
      </SafeAreaView>
    )
  }

  const handleCompleteSet = (setData, descansoSeg) => {
    completeSetMutation.mutate(setData, {
      onSuccess: () => {
        if (descansoSeg && descansoSeg > 0) {
          startRestTimer(descansoSeg)
        }
      },
    })
  }

  const handleUncompleteSet = (setData) => {
    uncompleteSetMutation.mutate(setData)
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
      tempo: data.tempo,
      superset_group: data.superset_group,
    }, {
      onSuccess: () => setShowAddExercise(false),
    })
  }

  const handleRemoveExercise = (sessionExerciseId) => {
    removeSessionExerciseMutation.mutate(sessionExerciseId)
  }

  const hasExercises = flatExercises.length > 0
  const titleWithProgress = progress.total > 0
    ? `${title}  ${progress.completed}/${progress.total}`
    : title

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <RestTimer />

      <PageHeader
        title={titleWithProgress}
        onBack={() => useWorkoutStore.getState().hideWorkout()}
        menuItems={[
          { icon: Plus, label: 'Añadir ejercicio', onPress: () => setShowAddExercise(true) },
        ]}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {!hasExercises ? (
          <View className="items-center py-12 px-4">
            <Text className="text-secondary text-sm mb-6">
              No hay ejercicios. Añade los que quieras hacer.
            </Text>
            <Button onPress={() => setShowAddExercise(true)}>Añadir ejercicio</Button>
          </View>
        ) : (
          <BlockExerciseList
            exercisesByBlock={exercisesByBlock}
            onCompleteSet={handleCompleteSet}
            onUncompleteSet={handleUncompleteSet}
            onRemove={handleRemoveExercise}
          />
        )}
      </ScrollView>

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
          Cancelar
        </Button>
        <SessionTimer />
        <Button
          onPress={() => setShowEndModal(true)}
          disabled={endSessionMutation.isPending || !hasCompletedSets}
          loading={endSessionMutation.isPending}
          className="flex-1"
        >
          Finalizar
        </Button>
      </View>

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
    </SafeAreaView>
  )
}
