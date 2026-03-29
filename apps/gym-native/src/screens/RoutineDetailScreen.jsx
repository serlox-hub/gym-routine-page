import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react-native'
import {
  useRoutine, useRoutineDays, useRoutineAllExercises,
  useCreateRoutineDay, useDeleteRoutine, useDeleteRoutineDay,
  useReorderRoutineDays, useAddExerciseToDay, useUpdateRoutineExercise,
  useDuplicateRoutineExercise, useMoveRoutineExerciseToDay,
} from '../hooks/useRoutines'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, ActiveSessionBanner } from '../components/ui'
import {
  DayCard, AddDayModal, RoutineHeader, RoutineEditForm, MoveToDayModal,
  AddExerciseModal, EditRoutineExerciseModal, VolumeSummary,
} from '../components/Routine'
import { moveItemToPosition } from '@gym/shared'
import useWorkoutStore from '../stores/workoutStore'
import { colors } from '../lib/styles'

export default function RoutineDetailScreen({ route, navigation }) {
  const { t } = useTranslation()
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

  const [showAddExercise, setShowAddExercise] = useState(false)
  const [addExerciseDayId, setAddExerciseDayId] = useState(null)
  const [addExerciseSupersets, setAddExerciseSupersets] = useState([])
  const [addExerciseIsWarmup, setAddExerciseIsWarmup] = useState(false)

  const [showEditExercise, setShowEditExercise] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  const [editExerciseDayId, setEditExerciseDayId] = useState(null)
  const [editExerciseSupersets, setEditExerciseSupersets] = useState([])
  const [isReplacingExercise, setIsReplacingExercise] = useState(false)

  const { data: routine, isLoading: loadingRoutine, error: routineError } = useRoutine(routineId)
  const { data: days, isLoading: loadingDays, error: daysError } = useRoutineDays(routineId)
  const { data: allRoutineExercises } = useRoutineAllExercises(routineId)
  const createDay = useCreateRoutineDay()
  const deleteRoutine = useDeleteRoutine()
  const deleteDay = useDeleteRoutineDay()
  const reorderDays = useReorderRoutineDays()
  const addExercise = useAddExerciseToDay()
  const updateExercise = useUpdateRoutineExercise()
  const duplicateExercise = useDuplicateRoutineExercise()
  const moveExercise = useMoveRoutineExerciseToDay()

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
        {isEditing && (
          <RoutineEditForm routine={routine} routineId={routineId} />
        )}

        {days?.length === 0 && !isEditing ? (
          <Text className="text-secondary">{t('routine:day.noDays')}</Text>
        ) : (
          days?.map((day, index) => (
            <DayCard
              key={day.id}
              day={day}
              routineId={routineId}
              routineName={routine?.name}
              isEditing={isEditing}
              onAddExercise={(dayId, supersets) => {
                setAddExerciseDayId(dayId)
                setAddExerciseSupersets(supersets)
                setAddExerciseIsWarmup(false)
                setShowAddExercise(true)
              }}
              onAddWarmup={(dayId, supersets) => {
                setAddExerciseDayId(dayId)
                setAddExerciseSupersets(supersets)
                setAddExerciseIsWarmup(true)
                setShowAddExercise(true)
              }}
              onEditExercise={(re, dayId, supersets) => {
                setEditingExercise(re)
                setEditExerciseDayId(dayId)
                setEditExerciseSupersets(supersets)
                setIsReplacingExercise(false)
                setShowEditExercise(true)
              }}
              onReplaceExercise={(re, dayId) => {
                setEditingExercise(re)
                setEditExerciseDayId(dayId)
                setEditExerciseSupersets([])
                setIsReplacingExercise(true)
                setShowEditExercise(true)
              }}
              onDuplicateExercise={async (re, dayId) => {
                try {
                  await duplicateExercise.mutateAsync({ routineExercise: re, dayId })
                } catch { /* handled by TanStack Query */ }
              }}
              onMoveExerciseToDay={handleOpenMoveModal}
              onDelete={(dayId) => setDayToDelete(days.find(d => d.id === dayId))}
              onReorderToPosition={(newIndex) => handleReorderDay(day.id, newIndex)}
              currentIndex={index}
              totalDays={days.length}
              dayNames={days.map(d => d.name)}
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
              <Text className="text-secondary">{t('routine:day.add')} {nextDayNumber}</Text>
            </View>
          </Card>
        )}

        {days?.length > 0 && (
          <VolumeSummary days={days} cycleDays={routine?.cycle_days} />
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
        title={t('routine:delete')}
        message={t('routine:deleteConfirm', { name: routine?.name })}
        confirmText={t('common:buttons.delete')}
        onConfirm={handleDeleteRoutine}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={!!dayToDelete}
        title={t('routine:day.delete')}
        message={t('routine:day.deleteConfirm', { name: dayToDelete?.name })}
        confirmText={t('common:buttons.delete')}
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
        onSubmit={async (targetDayId) => {
          try {
            await moveExercise.mutateAsync({
              routineExercise: exerciseToMove,
              sourceDayId: movingFromDayId,
              targetDayId,
            })
            setShowMoveModal(false)
            setExerciseToMove(null)
            setMovingFromDayId(null)
          } catch { /* handled by TanStack Query */ }
        }}
        days={days}
        currentDayId={movingFromDayId}
        exerciseName={exerciseToMove?.exercise?.name}
        isPending={moveExercise.isPending}
      />

      <AddExerciseModal
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onSubmit={async (data) => {
          try {
            await addExercise.mutateAsync({
              dayId: addExerciseDayId,
              exerciseId: data.exerciseId,
              series: data.series,
              reps: data.reps,
              rir: data.rir,
              rest_seconds: data.rest_seconds,
              notes: data.notes,
              tempo: data.tempo,
              tempo_razon: data.tempo_razon,
              superset_group: data.superset_group,
              esCalentamiento: addExerciseIsWarmup,
            })
            setShowAddExercise(false)
          } catch { /* handled by TanStack Query */ }
        }}
        isPending={addExercise.isPending}
        isWarmup={addExerciseIsWarmup}
        existingSupersets={addExerciseSupersets}
        existingExercises={allRoutineExercises || []}
      />

      <EditRoutineExerciseModal
        isOpen={showEditExercise}
        onClose={() => {
          setShowEditExercise(false)
          setEditingExercise(null)
        }}
        onSubmit={async (data) => {
          try {
            if (isReplacingExercise) {
              await updateExercise.mutateAsync({
                exerciseId: data.exerciseId,
                dayId: editExerciseDayId,
                data: { exercise_id: data.exercise_id },
              })
            } else {
              const { exerciseId, ...updateData } = data
              await updateExercise.mutateAsync({
                exerciseId,
                dayId: editExerciseDayId,
                data: updateData,
              })
            }
            setShowEditExercise(false)
            setEditingExercise(null)
          } catch { /* handled by TanStack Query */ }
        }}
        isPending={updateExercise.isPending}
        routineExercise={editingExercise}
        existingSupersets={editExerciseSupersets}
        isReplacing={isReplacingExercise}
      />

      <ActiveSessionBanner />
    </SafeAreaView>
  )
}
