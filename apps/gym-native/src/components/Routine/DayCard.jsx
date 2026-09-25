import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Trash2, Play, Pencil, ArrowUpDown, Copy } from 'lucide-react-native'
import { Card, ConfirmModal, DragHandle, DropdownMenu, LoadingSpinner, Modal, ReorderModal } from '../ui'
import { useRoutineBlocks, useReorderRoutineExercises, useDeleteRoutineExercise, useUpdateRoutineDay } from '../../hooks/useRoutines'
import { useStartSession } from '../../hooks/useWorkout'
import useWorkoutStore from '../../stores/workoutStore'
import { colors } from '../../lib/styles'
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete'
import { getExistingSupersetIds, getRoutineDayLayout, moveItemToPosition, useSelectedGym, getRoutineDayAction, WORKOUT_START_ACTION, getNotifier } from '@gym/shared'
import AddExerciseButton from './AddExerciseButton'
import BlockSection from './BlockSection'

export default function DayCard({
  day,
  routineId,
  routineName,
  onAddExercise,
  onAddWarmup,
  onEditExercise,
  onReplaceExercise,
  onDuplicateExercise,
  onMoveExerciseToDay,
  onDelete,
  onDuplicate,
  isDuplicatingDay = false,
  onReorderToPosition,
  currentIndex,
  totalDays,
  dayNames,
  hasActiveSession,
  activeRoutineDayId,
  activeSessionSynced,
  isReorderingDays = false,
  dragHandleProps = null,
  isDragging = false,
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

  const {
    warmupBlock, mainBlock, warmupExercises, mainExercises, allExercises, totalSets,
    showWarmupSection, showMainSection, showEmptyMessage,
  } = getRoutineDayLayout(blocks)
  const existingSupersets = getExistingSupersetIds(allExercises)

  const dayAction = getRoutineDayAction({
    hasActiveSession,
    activeRoutineDayId,
    dayId: id,
    isStarting: startSessionMutation.isPending,
    isLoading: loadingBlocks,
    hasSynced: activeSessionSynced,
  })
  const isBusy = dayAction === WORKOUT_START_ACTION.BUSY

  // Se escucha solo la cabecera (el cuerpo tiene los swipes de sus ejercicios), pero se desliza
  // la tarjeta entera. El asa queda fuera de la zona para que el arrastre no compita con el swipe.
  const swipe = useSwipeToDelete({ onDelete: () => onDelete(id) })

  const handleClick = () => {
    if (swipe.consumePress()) return
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

  // Mismo criterio que el botón de entrenamiento libre: bloqueado no puede ser mudo.
  const handleStartPress = () => {
    switch (dayAction) {
      case WORKOUT_START_ACTION.RESUME:
        handleContinueWorkout()
        return
      case WORKOUT_START_ACTION.BLOCKED:
        getNotifier()?.show(t('workout:session.finishCurrentFirst'), 'info')
        return
      case WORKOUT_START_ACTION.START:
        handleStartWorkout()
        return
      case WORKOUT_START_ACTION.BUSY:
        return  // bloques sin cargar, arranque en vuelo, o sesión activa aún desconocida
    }
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
    <>
      {/* `overflow` recorta la tarjeta mientras se desliza, pero se suelta al arrastrar para no
          cortar la sombra que la despega de la lista (iOS la recorta con `overflow: hidden`). */}
      <View style={{ marginBottom: 8, borderRadius: 14, overflow: isDragging ? 'visible' : 'hidden' }}>
        {/* Afordancia de borrado: invisible en reposo, aparece con el recorrido del dedo */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.danger,
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingHorizontal: 16,
            opacity: swipe.affordanceOpacity,
          }}
        >
          <Trash2 size={18} color={colors.white} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateX: swipe.translateX }] }}>
          <Card
            style={{
              borderRadius: 14,
              padding: 12,
              paddingHorizontal: 14,
              // Mientras viaja con el dedo se despega del resto de la lista.
              ...(isDragging ? { shadowColor: colors.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } } : null),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <DragHandle dragHandleProps={dragHandleProps} disabled={isReorderingDays} />
              <View
                style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                {...swipe.panHandlers}
              >
                {/* La pulsación va DENTRO de la zona del swipe, no en la tarjeta: con el Pressable
                    fuera, él se queda el responder al tocar y RN nunca pregunta a sus descendientes
                    si quieren el movimiento, así que el swipe no arrancaría (igual que en ExerciseCard). */}
                <Pressable onPress={handleClick} className="active:opacity-80" style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{name}</Text>
                  {/* Dice que hay contenido dentro sin gastar un icono (el chevron) en la cabecera. */}
                  {!loadingBlocks && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {t('common:home.nExercises', { count: allExercises.length })}
                      {totalSets > 0 && ` · ${t('common:home.nSets', { count: totalSets })}`}
                    </Text>
                  )}
                </Pressable>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                  <Pressable
                    onPress={handleStartPress}
                    disabled={isBusy}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                      padding: 4,
                      // El 0.4 de BLOCKED es la convención "no disponible, pero responde"; BUSY se
                      // atenúa igual que en web porque en native `disabled` no atenúa por sí solo.
                      opacity: dayAction === WORKOUT_START_ACTION.BLOCKED || isBusy ? 0.4 : 1,
                    }}
                  >
                    {isBusy
                      ? <LoadingSpinner inline />
                      : <Play size={20} color={colors.success} />
                    }
                  </Pressable>
                  <DropdownMenu
                    items={[
                      {
                        icon: Pencil,
                        label: t('routine:day.rename'),
                        onClick: () => {
                          setRenameValue(name)
                          setShowRenameModal(true)
                        },
                      },
                      { icon: Copy, label: t('routine:day.duplicate'), onClick: () => onDuplicate(id), disabled: isDuplicatingDay },
                      ...(totalDays > 1 ? [{
                        icon: ArrowUpDown,
                        label: t('routine:reorder'),
                        disabled: isReorderingDays,
                        onClick: () => setShowReorderDay(true),
                      }] : []),
                      { icon: Trash2, label: t('common:buttons.delete'), onClick: () => onDelete(id), danger: true },
                    ]}
                  />
                </View>
              </View>
            </View>

            {isExpanded && (
              <View style={{ marginTop: 12, gap: 16 }}>
                {loadingBlocks ? (
                  <LoadingSpinner fullScreen={false} />
                ) : (
                  <>
                    {/* Un bloque vacío se queda en su fila de añadir: una sección con "(0)" haría
                        parecer roto un día al que solo le falta el calentamiento. */}
                    {showWarmupSection ? (
                      <BlockSection
                        block={warmupBlock}
                        routineDayId={id}
                        isReordering={reorderExercises.isPending}
                        onAddExercise={() => onAddWarmup(id, existingSupersets)}
                        onEditExercise={(re) => onEditExercise(re, id, existingSupersets)}
                        onReplaceExercise={(re) => onReplaceExercise(re, id)}
                        onReorderExercise={handleReorderWarmup}
                        onDeleteExercise={(re) => setExerciseToDelete(re)}
                        onDuplicateExercise={(re) => onDuplicateExercise(re, id)}
                        onMoveExerciseToDay={(re) => onMoveExerciseToDay(re, id)}
                      />
                    ) : (
                      <AddExerciseButton isWarmup onPress={() => onAddWarmup(id, existingSupersets)} />
                    )}
                    {showMainSection ? (
                      <BlockSection
                        block={mainBlock}
                        routineDayId={id}
                        isReordering={reorderExercises.isPending}
                        onAddExercise={() => onAddExercise(id, existingSupersets)}
                        onEditExercise={(re) => onEditExercise(re, id, existingSupersets)}
                        onReplaceExercise={(re) => onReplaceExercise(re, id)}
                        onReorderExercise={handleReorderMain}
                        onDeleteExercise={(re) => setExerciseToDelete(re)}
                        onDuplicateExercise={(re) => onDuplicateExercise(re, id)}
                        onMoveExerciseToDay={(re) => onMoveExerciseToDay(re, id)}
                      />
                    ) : (
                      <>
                        {showEmptyMessage && (
                          <Text className="text-secondary text-sm">{t('routine:block.noExercises')}</Text>
                        )}
                        <AddExerciseButton onPress={() => onAddExercise(id, existingSupersets)} />
                      </>
                    )}
                  </>
                )}
              </View>
            )}
          </Card>
        </Animated.View>
      </View>

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
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{t('routine:day.rename')}</Text>
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
    </>
  )
}
