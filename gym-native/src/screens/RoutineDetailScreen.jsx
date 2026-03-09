import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus } from 'lucide-react-native'
import {
  useRoutine, useRoutineDays, useRoutineAllExercises,
  useCreateRoutineDay, useDeleteRoutine, useDeleteRoutineDay,
  useReorderRoutineDays,
} from '../hooks/useRoutines'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal } from '../components/ui'
import { DayCard, AddDayModal, RoutineHeader, MoveToDayModal } from '../components/Routine'
import { moveItemToPosition } from '../lib/arrayUtils'
import useWorkoutStore from '../stores/workoutStore'
import { colors } from '../lib/styles'

export default function RoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params
  const [isEditing, setIsEditing] = useState(false)
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)

  const [showAddDay, setShowAddDay] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dayToDelete, setDayToDelete] = useState(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [exerciseToMove, setExerciseToMove] = useState(null)
  const [movingFromDayId, setMovingFromDayId] = useState(null)

  const { data: routine, isLoading: loadingRoutine, error: routineError } = useRoutine(routineId)
  const { data: days, isLoading: loadingDays, error: daysError } = useRoutineDays(routineId)
  const { data: allRoutineExercises } = useRoutineAllExercises(routineId)
  const createDay = useCreateRoutineDay()
  const deleteRoutine = useDeleteRoutine()
  const deleteDay = useDeleteRoutineDay()
  const reorderDays = useReorderRoutineDays()

  const isLoading = loadingRoutine || loadingDays
  const error = routineError || daysError

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const maxDayNumber = days?.reduce((max, day) => Math.max(max, day.sort_order), 0) || 0
  const nextDayNumber = maxDayNumber + 1

  const handleAddDay = async (day) => {
    try {
      await createDay.mutateAsync({ routineId: parseInt(routineId), day })
      setShowAddDay(false)
    } catch { /* handled by TanStack Query */ }
  }

  const handleDeleteRoutine = async () => {
    try {
      await deleteRoutine.mutateAsync(parseInt(routineId))
      navigation.goBack()
    } catch { /* handled by TanStack Query */ }
  }

  const handleDeleteDay = async () => {
    if (!dayToDelete) return
    try {
      await deleteDay.mutateAsync({ dayId: dayToDelete.id, routineId })
      setDayToDelete(null)
    } catch { /* handled by TanStack Query */ }
  }

  const handleReorderDay = async (dayId, newIndex) => {
    if (!days) return
    const newDays = moveItemToPosition(days, dayId, newIndex)
    if (!newDays) return
    try {
      await reorderDays.mutateAsync({ routineId, days: newDays })
    } catch { /* handled by TanStack Query */ }
  }

  const handleOpenMoveModal = (routineExercise, dayId) => {
    setExerciseToMove(routineExercise)
    setMovingFromDayId(dayId)
    setShowMoveModal(true)
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <RoutineHeader
        routine={routine}
        routineId={routineId}
        isEditing={isEditing}
        onEditStart={() => setIsEditing(true)}
        onEditEnd={() => setIsEditing(false)}
        onDelete={() => setShowDeleteConfirm(true)}
        navigation={navigation}
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {days?.length === 0 && !isEditing ? (
          <Text className="text-secondary">No hay días configurados</Text>
        ) : (
          days?.map((day, index) => (
            <DayCard
              key={day.id}
              day={day}
              routineId={routineId}
              routineName={routine?.name}
              isEditing={isEditing}
              onAddExercise={(dayId, supersets) => {
                // TODO: Abrir AddExerciseModal (Fase 4b)
              }}
              onAddWarmup={(dayId, supersets) => {
                // TODO: Abrir AddExerciseModal warmup (Fase 4b)
              }}
              onEditExercise={(re, dayId, supersets) => {
                // TODO: Abrir EditRoutineExerciseModal (Fase 4b)
              }}
              onReplaceExercise={(re, dayId) => {
                // TODO: Abrir EditRoutineExerciseModal replace (Fase 4b)
              }}
              onDuplicateExercise={(re, dayId) => {
                // TODO: Duplicar ejercicio (Fase 4b)
              }}
              onMoveExerciseToDay={handleOpenMoveModal}
              onDelete={(dayId) => setDayToDelete(days.find(d => d.id === dayId))}
              currentIndex={index}
              totalDays={days.length}
              hasActiveSession={hasActiveSession}
              activeRoutineDayId={activeRoutineDayId}
              navigation={navigation}
            />
          ))
        )}

        {isEditing && (
          <Card
            className="p-4 mb-2"
            style={{ borderStyle: 'dashed' }}
            onPress={() => setShowAddDay(true)}
          >
            <View className="flex-row items-center gap-2 justify-center">
              <Plus size={20} color={colors.textSecondary} />
              <Text className="text-secondary">Añadir día {nextDayNumber}</Text>
            </View>
          </Card>
        )}
      </ScrollView>

      <AddDayModal
        isOpen={showAddDay}
        onClose={() => setShowAddDay(false)}
        onSubmit={handleAddDay}
        nextDayNumber={nextDayNumber}
        isPending={createDay.isPending}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Eliminar rutina"
        message={`¿Seguro que quieres eliminar "${routine?.name}"? Se eliminarán todos los días y ejercicios asociados.`}
        confirmText="Eliminar"
        onConfirm={handleDeleteRoutine}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={!!dayToDelete}
        title="Eliminar día"
        message={`¿Seguro que quieres eliminar "${dayToDelete?.name}"? Se eliminarán todos los ejercicios del día.`}
        confirmText="Eliminar"
        onConfirm={handleDeleteDay}
        onCancel={() => setDayToDelete(null)}
      />

      <MoveToDayModal
        isOpen={showMoveModal}
        onClose={() => {
          setShowMoveModal(false)
          setExerciseToMove(null)
          setMovingFromDayId(null)
        }}
        onSubmit={() => {}}
        days={days}
        currentDayId={movingFromDayId}
        exerciseName={exerciseToMove?.exercise?.name}
        isPending={false}
      />
    </SafeAreaView>
  )
}
