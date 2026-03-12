import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Trash2, ChevronRight, Pencil } from 'lucide-react-native'
import { Card, ConfirmModal, DropdownMenu, LoadingSpinner } from '../ui'
import { useRoutineBlocks, useReorderRoutineExercises, useDeleteRoutineExercise, useUpdateRoutineDay } from '../../hooks/useRoutines'
import { useStartSession } from '../../hooks/useWorkout'
import useWorkoutStore from '../../stores/workoutStore'
import { colors } from '../../lib/styles'
import { moveItemToPosition } from '../../lib/arrayUtils'
import { getExistingSupersetIds } from '../../lib/supersetUtils'
import DayEditForm from './DayEditForm'
import BlockSection from './BlockSection'

export default function DayCard({
  day,
  routineId,
  routineName,
  isEditing,
  onAddExercise,
  onAddWarmup,
  onEditExercise,
  onReplaceExercise,
  onDuplicateExercise,
  onMoveExerciseToDay,
  onDelete,
  hasActiveSession,
  activeRoutineDayId,
  navigation,
}) {
  const { id, sort_order, name, estimated_duration_min } = day
  const [isExpanded, setIsExpanded] = useState(false)

  const { data: blocks, isLoading: loadingBlocks } = useRoutineBlocks(id)
  const startSessionMutation = useStartSession()
  const reorderExercises = useReorderRoutineExercises()
  const deleteExercise = useDeleteRoutineExercise()
  const updateDay = useUpdateRoutineDay()
  const [editingDay, setEditingDay] = useState(false)
  const [dayForm, setDayForm] = useState({ name, duration: estimated_duration_min || '' })
  const [exerciseToDelete, setExerciseToDelete] = useState(null)

  const warmupBlock = blocks?.find(b => b.name === 'Calentamiento')
  const mainBlock = blocks?.find(b => b.name === 'Principal')
  const warmupExercises = warmupBlock?.routine_exercises || []
  const mainExercises = mainBlock?.routine_exercises || []
  const allExercises = [...warmupExercises, ...mainExercises]
  const existingSupersets = getExistingSupersetIds(allExercises)

  const isThisDayActive = hasActiveSession && activeRoutineDayId === id

  const handleClick = () => {
    if (!editingDay) setIsExpanded(!isExpanded)
  }

  const handleStartWorkout = () => {
    startSessionMutation.mutate(
      { routineDayId: id, routineId: parseInt(routineId), routineName, dayName: name, blocks }
    )
  }

  const handleContinueWorkout = () => {
    useWorkoutStore.getState().showWorkout()
  }

  const handleReorderWarmup = (exerciseId, newIndex) => {
    const newExercises = moveItemToPosition(warmupExercises, exerciseId, newIndex)
    if (newExercises) reorderExercises.mutate({ dayId: id, exercises: [...newExercises, ...mainExercises] })
  }

  const handleReorderMain = (exerciseId, newIndex) => {
    const newExercises = moveItemToPosition(mainExercises, exerciseId, newIndex)
    if (newExercises) reorderExercises.mutate({ dayId: id, exercises: [...warmupExercises, ...newExercises] })
  }

  const handleDeleteExercise = () => {
    if (!exerciseToDelete) return
    deleteExercise.mutate({ exerciseId: exerciseToDelete.id, dayId: id })
    setExerciseToDelete(null)
  }

  const handleSaveDay = () => {
    const hasChanges = dayForm.name.trim() !== name ||
      (dayForm.duration || null) !== (estimated_duration_min || null)
    if (dayForm.name.trim() && hasChanges) {
      updateDay.mutate({
        dayId: id,
        routineId,
        data: {
          name: dayForm.name.trim(),
          estimated_duration_min: dayForm.duration ? parseInt(dayForm.duration) : null,
        },
      })
    }
    setEditingDay(false)
  }

  return (
    <Card className="p-4 mb-2" onPress={editingDay ? undefined : handleClick}>
      {editingDay ? (
        <DayEditForm
          dayNumber={sort_order}
          form={dayForm}
          setForm={setDayForm}
          onSave={handleSaveDay}
        />
      ) : (
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-3 flex-1">
            <ChevronRight
              size={18}
              color={colors.textSecondary}
              style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
            />
            <Text className="text-primary font-medium" numberOfLines={1}>{name}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            {!isEditing && (
              <Pressable
                onPress={isThisDayActive ? handleContinueWorkout : handleStartWorkout}
                disabled={startSessionMutation.isPending || loadingBlocks || (hasActiveSession && !isThisDayActive)}
                className="px-4 py-1 rounded-full"
                style={{
                  backgroundColor: isThisDayActive ? colors.success : colors.accent,
                  opacity: (hasActiveSession && !isThisDayActive) ? 0.4 : 1,
                }}
              >
                <Text className="text-xs font-semibold uppercase" style={{ color: isThisDayActive ? '#fff' : '#000' }}>
                  {isThisDayActive ? 'Continuar' : 'Iniciar'}
                </Text>
              </Pressable>
            )}
            {isEditing && (
              <DropdownMenu
                items={[
                  {
                    icon: Pencil,
                    label: 'Editar',
                    onClick: () => {
                      setDayForm({ name, duration: estimated_duration_min || '' })
                      setEditingDay(true)
                    },
                  },
                  { icon: Trash2, label: 'Eliminar', onClick: () => onDelete(id), danger: true },
                ]}
              />
            )}
          </View>
        </View>
      )}

      {isExpanded && (
        <View className="mt-3 pt-3 border-t border-border gap-4">
          {loadingBlocks ? (
            <LoadingSpinner />
          ) : isEditing ? (
            <>
              {(warmupBlock || true) && (
                <BlockSection
                  block={warmupBlock || { name: 'Calentamiento', routine_exercises: [] }}
                  isEditing
                  isReordering={reorderExercises.isPending}
                  onAddExercise={() => onAddWarmup(id, existingSupersets)}
                  onEditExercise={(re) => onEditExercise(re, id, existingSupersets)}
                  onReplaceExercise={(re) => onReplaceExercise(re, id)}
                  onReorderExercise={handleReorderWarmup}
                  onDeleteExercise={(re) => setExerciseToDelete(re)}
                  onDuplicateExercise={(re) => onDuplicateExercise(re, id)}
                  onMoveExerciseToDay={(re) => onMoveExerciseToDay(re, id)}
                />
              )}
              {(mainBlock || true) && (
                <BlockSection
                  block={mainBlock || { name: 'Principal', routine_exercises: [] }}
                  isEditing
                  isReordering={reorderExercises.isPending}
                  onAddExercise={() => onAddExercise(id, existingSupersets)}
                  onEditExercise={(re) => onEditExercise(re, id, existingSupersets)}
                  onReplaceExercise={(re) => onReplaceExercise(re, id)}
                  onReorderExercise={handleReorderMain}
                  onDeleteExercise={(re) => setExerciseToDelete(re)}
                  onDuplicateExercise={(re) => onDuplicateExercise(re, id)}
                  onMoveExerciseToDay={(re) => onMoveExerciseToDay(re, id)}
                />
              )}
            </>
          ) : (
            <>
              {blocks?.length === 0 ? (
                <Text className="text-secondary text-sm">No hay ejercicios configurados</Text>
              ) : (
                blocks?.filter(b => b.routine_exercises?.length > 0).map(block => (
                  <BlockSection key={block.id} block={block} />
                ))
              )}
            </>
          )}
        </View>
      )}

      <ConfirmModal
        isOpen={!!exerciseToDelete}
        title="Eliminar ejercicio"
        message={`¿Seguro que quieres eliminar "${exerciseToDelete?.exercise?.name}" de este día?`}
        confirmText="Eliminar"
        onConfirm={handleDeleteExercise}
        onCancel={() => setExerciseToDelete(null)}
      />
    </Card>
  )
}
