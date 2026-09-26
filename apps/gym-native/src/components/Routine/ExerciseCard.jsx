import { useState, useMemo } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronRight, History, Pencil, Trash2, Copy, FolderInput, Repeat2, ArrowUpDown, Link2Off } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { DragHandle, Modal, ReorderModal } from '../ui'
import { ExerciseHistoryModal } from '../Workout'
import { colors } from '../../lib/styles'
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete'
import { SetField, formatEffortBadge, formatFieldValue, getExerciseName, resolveTrackedFields, useResolvedDistanceUnit } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'

export default function ExerciseCard({
  routineExercise,
  routineDayId,
  isReordering = false,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToDay,
  onReplace,
  onRemoveFromSuperset,
  onReorderToPosition,
  currentIndex = 0,
  totalExercises = 1,
  positionLabels = [],
  dragHandleProps = null,
  isDragging = false,
}) {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { exercise, series, reps, level, rir, rest_seconds } = routineExercise
  const [showReorder, setShowReorder] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  // Memoizado como en WorkoutExerciseCard: devuelve un array nuevo por render y viaja a los
  // useMemo de ExerciseHistoryModal. `exercise` viene de la caché de query (referencia estable).
  const trackedFields = useMemo(() => resolveTrackedFields(exercise), [exercise])
  const distanceUnit = useResolvedDistanceUnit(exercise)

  const swipe = useSwipeToDelete({ onDelete })

  const handleCardPress = () => {
    if (swipe.consumePress()) return
    setShowMenu(true)
  }

  const borderStyle = getMuscleGroupBorderStyle(exercise?.muscle_group?.name)
  const rnBorderStyle = {
    borderLeftWidth: parseInt(borderStyle.borderLeftWidth) || 3,
    borderLeftColor: borderStyle.borderLeftColor || colors.textSecondary,
  }

  const menuItems = [
    { icon: History, label: t('routine:exercise.viewHistory'), onPress: () => setShowHistory(true) },
    { icon: Pencil, label: t('common:buttons.edit'), onPress: onEdit },
    { icon: Repeat2, label: t('routine:exercise.replace'), onPress: onReplace },
    { icon: Copy, label: t('routine:exercise.duplicateExercise'), onPress: onDuplicate },
    { icon: FolderInput, label: t('routine:exercise.moveToDay'), onPress: onMoveToDay },
    onReorderToPosition && totalExercises > 1 && { icon: ArrowUpDown, label: t('routine:reorder'), onPress: () => setShowReorder(true), disabled: isReordering },
    // Superset members only (whoever renders the row decides whether to pass it).
    onRemoveFromSuperset && { icon: Link2Off, label: t('routine:superset.removeFrom'), onPress: onRemoveFromSuperset, disabled: isReordering },
    { icon: Trash2, label: t('common:buttons.delete'), onPress: onDelete, danger: true },
  ].filter(Boolean)

  const handleMenuAction = (action) => {
    setShowMenu(false)
    action?.()
  }

  const cardContent = (
    <View
      style={{
        backgroundColor: colors.bgTertiary,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        // Mientras viaja con el dedo se despega del resto de la lista.
        ...(isDragging ? { shadowColor: colors.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } } : null),
        ...rnBorderStyle,
      }}
    >
      {/* El asa bloquea el swipe al TOCARLA, no al activarse el arrastre: el swipe se clasifica
          dentro de `onMoveShouldSetPanResponder`, que es síncrono y no podría consultar un aviso
          que llegase desde el hilo de UI. */}
      <DragHandle
        dragHandleProps={dragHandleProps}
        disabled={isReordering}
        size={14}
        onPressStart={() => { swipe.blockedRef.current = true }}
        onPressEnd={() => { swipe.blockedRef.current = false }}
      />
      {/* La pulsación va DENTRO de la zona del swipe y hermana del asa (igual que en DayCard):
          envolviendo la fila entera, el Pressable se queda el responder al tocar y RN nunca
          pregunta a sus descendientes si quieren el movimiento, así que el swipe no arrancaría. */}
      <Pressable onPress={handleCardPress} className="active:opacity-70" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            {getExerciseName(exercise)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{series}×{reps}</Text>
            {level != null && (
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatFieldValue(SetField.LEVEL, level)}</Text>
            )}
            {rir !== null && rir !== undefined && (
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatEffortBadge(rir, trackedFields)}</Text>
            )}
            {rest_seconds > 0 && (
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{rest_seconds}s</Text>
            )}
          </View>
        </View>
        <ChevronRight size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  )

  return (
    <>
      {/* `overflow` recorta la fila mientras se desliza, pero se suelta al arrastrar para no
          cortar la sombra que la despega de la lista (iOS la recorta con `overflow: hidden`). */}
      <View style={{ borderRadius: 8, overflow: isDragging ? 'visible' : 'hidden' }} {...swipe.panHandlers}>
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
            paddingHorizontal: 12,
            opacity: swipe.affordanceOpacity,
          }}
        >
          <Trash2 size={16} color={colors.white} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateX: swipe.translateX }] }}>
          {cardContent}
        </Animated.View>
      </View>
      <Modal isOpen={showMenu} onClose={() => setShowMenu(false)} position="bottom">
        <View style={{ paddingVertical: 8, paddingBottom: 24 }}>
          {menuItems.map((item, i) => (
            <Pressable key={i} onPress={() => handleMenuAction(item.onPress)}
              disabled={item.disabled}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, opacity: item.disabled ? 0.4 : 1 }}
              className="active:opacity-70">
              {item.icon && <item.icon size={18} color={item.danger ? colors.danger : colors.textSecondary} />}
              <Text style={{ color: item.danger ? colors.danger : colors.textPrimary, fontSize: 14 }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
      {/* Montado solo al abrirlo: sus queries de historial corren aunque el modal esté cerrado,
          y esta fila se repite por cada ejercicio de la rutina. */}
      {showHistory && (
        <ExerciseHistoryModal
          isOpen
          onClose={() => setShowHistory(false)}
          exerciseId={exercise?.id}
          exerciseName={getExerciseName(exercise)}
          trackedFields={trackedFields}
          distanceUnit={distanceUnit}
          routineDayId={routineDayId}
          onSessionClick={(sessionId, date) => {
            setShowHistory(false)
            navigation.navigate('MainTabs', { screen: 'History', params: { sessionId, date } })
          }}
        />
      )}
      {showReorder && (
        <ReorderModal
          visible
          onClose={() => setShowReorder(false)}
          totalItems={totalExercises}
          currentIndex={currentIndex}
          positionLabels={positionLabels}
          onSelect={(i) => { onReorderToPosition(i); setShowReorder(false) }}
        />
      )}
    </>
  )
}
