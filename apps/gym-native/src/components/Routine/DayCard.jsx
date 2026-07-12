import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronDown, ChevronRight, Play, Pencil, ArrowUpDown } from 'lucide-react-native'
import { Card, ConfirmModal, DropdownMenu, LoadingSpinner, Modal, ReorderModal } from '../ui'
import { useRoutineBlocks, useReorderRoutineExercises, useDeleteRoutineExercise, useUpdateRoutineDay } from '../../hooks/useRoutines'
import { useStartSession } from '../../hooks/useWorkout'
import useWorkoutStore from '../../stores/workoutStore'
import { colors } from '../../lib/styles'
import { getExistingSupersetIds, moveItemToPosition, useSelectedGym } from '@gym/shared'
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
  onReorderToPosition,
  currentIndex,
  totalDays,
  dayNames,
  hasActiveSession,
  activeRoutineDayId,
  navigation: _navigation,
}) {
  const { t } = useTranslation()
  const { id, name } = day
  const [isExpanded, setIsExpanded] = useState(false)

  const { data: blocks, isLoading: loadingBlocks } = useRoutineBlocks(id)
  const startSessionMutation = useStartSession()
  const { gymId } = useSelectedGym()
  const reorderExercises = useReorderRoutineExercises()
  const deleteExercise = useDeleteRoutineExercise()
  const updateDay = useUpdateRoutineDay()
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [exerciseToDelete, setExerciseToDelete] = useState(null)
  const [showReorderDay, setShowReorderDay] = useState(false)

  const warmupBlock = blocks?.find(b => b.name === 'Calentamiento')
  const mainBlock = blocks?.find(b => b.name === 'Principal')
  const warmupExercises = warmupBlock?.routine_exercises || []
  const mainExercises = mainBlock?.routine_exercises || []
  const allExercises = [...warmupExercises, ...mainExercises]
  const existingSupersets = getExistingSupersetIds(allExercises)

  const isThisDayActive = hasActiveSession && activeRoutineDayId === id

  const handleClick = () => {
    setIsExpanded(!isExpanded)
  }

  const handleStartWorkout = () => {
    useWorkoutStore.getState().showWorkout()
    startSessionMutation.mutate(
      { routineDayId: id, routineId: parseInt(routineId), routineName, dayName: name, blocks, gymId }
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

  const handleRenameDay = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== name) {
      updateDay.mutate({ dayId: id, routineId, data: { name: trimmed } })
    }
    setShowRenameModal(false)
  }

  return (
    <Card
      className="mb-2"
      style={{ borderRadius: 14, padding: 12, paddingHorizontal: 14 }}
      onPress={handleClick}
    >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            {isExpanded
              ? <ChevronDown size={16} color={colors.textSecondary} />
              : <ChevronRight size={16} color={colors.textSecondary} />
            }
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            {!isEditing && (
              <Pressable
                onPress={isThisDayActive ? handleContinueWorkout : handleStartWorkout}
                disabled={startSessionMutation.isPending || loadingBlocks || (hasActiveSession && !isThisDayActive)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4, opacity: (hasActiveSession && !isThisDayActive) ? 0.4 : 1 }}
              >
                <Play size={20} color={colors.success} />
              </Pressable>
            )}
            {isEditing && (
              <DropdownMenu
                items={[
                  {
                    icon: Pencil,
                    label: t('common:buttons.edit'),
                    onClick: () => {
                      setRenameValue(name)
                      setShowRenameModal(true)
                    },
                  },
                  ...(totalDays > 1 ? [{
                    icon: ArrowUpDown,
                    label: t('routine:reorder'),
                    onClick: () => setShowReorderDay(true),
                  }] : []),
                  { icon: Trash2, label: t('common:buttons.delete'), onClick: () => onDelete(id), danger: true },
                ]}
              />
            )}
          </View>
        </View>

      {isExpanded && (
        <View style={{ marginTop: 12, gap: 16 }}>
          {loadingBlocks ? (
            <LoadingSpinner fullScreen={false} />
          ) : isEditing ? (
            <>
              <BlockSection
                  block={warmupBlock || { name: 'Calentamiento', routine_exercises: [] }}
                  routineDayId={id}
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
              <BlockSection
                  block={mainBlock || { name: 'Principal', routine_exercises: [] }}
                  routineDayId={id}
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
            </>
          ) : (
            <>
              {blocks?.length === 0 ? (
                <Text className="text-secondary text-sm">{t('routine:block.noExercises')}</Text>
              ) : (
                blocks?.filter(b => b.routine_exercises?.length > 0).map(block => (
                  <BlockSection key={block.name} block={block} routineDayId={id} />
                ))
              )}
            </>
          )}
        </View>
      )}

      <ConfirmModal
        isOpen={!!exerciseToDelete}
        title={t('routine:exercise.removeFromRoutine')}
        message={t('routine:exercise.removeConfirm', { name: exerciseToDelete?.exercise?.name })}
        confirmText={t('common:buttons.delete')}
        onConfirm={handleDeleteExercise}
        onCancel={() => setExerciseToDelete(null)}
      />

      <ReorderModal
        visible={showReorderDay}
        onClose={() => setShowReorderDay(false)}
        totalItems={totalDays}
        currentIndex={currentIndex}
        positionLabels={dayNames}
        onSelect={(newIndex) => {
          onReorderToPosition(newIndex)
          setShowReorderDay(false)
        }}
      />

      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} position="bottom">
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={{ padding: 20, gap: 16 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{t('routine:day.edit')}</Text>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>{t('routine:day.name')}</Text>
              <TextInput value={renameValue} onChangeText={setRenameValue}
                autoFocus placeholderTextColor={colors.textMuted}
                returnKeyType="done" onSubmitEditing={handleRenameDay}
                style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }} />
            </View>
            <Pressable onPress={handleRenameDay} disabled={!renameValue.trim()}
              style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 10, alignItems: 'center', opacity: renameValue.trim() ? 1 : 0.4 }}>
              <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.save')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Modal>
    </Card>
  )
}
