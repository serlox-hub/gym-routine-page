import { useState, useMemo, useRef } from 'react'
import { View, Text, Pressable, Animated, PanResponder } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronRight, History, Pencil, Trash2, Copy, FolderInput, Repeat2, ArrowUpDown } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { Modal, ReorderModal } from '../ui'
import { ExerciseHistoryModal } from '../Workout'
import { colors, design } from '../../lib/styles'
import { SetField, formatEffortBadge, formatFieldValue, getExerciseName, resolveTrackedFields, useResolvedDistanceUnit, shouldClaimSwipe, clampSwipeOffset, getHaptics } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'

export default function ExerciseCard({
  routineExercise,
  routineDayId,
  isReordering: _isReordering = false,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToDay,
  onReplace,
  onReorderToPosition,
  currentIndex = 0,
  totalExercises = 1,
  positionLabels = [],
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

  // --- Swipe para borrar -------------------------------------------------
  // `onDelete` se lee por ref: el PanResponder se crea una sola vez y sus closures se quedarían
  // con la prop del primer render.
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete
  const translateX = useRef(new Animated.Value(0)).current
  // Clasificación del gesto y si ya cruzó el umbral, por gesto. Ambos se reinician al tocar,
  // que es lo que hace que el háptico suene una vez POR GESTO y no una vez por montaje.
  const gesture = useRef({ phase: 'idle', crossed: false })
  const suppressPress = useRef(false)
  // Seam para el arrastre-para-reordenar (long press + vertical sobre esta misma fila): mientras
  // su pulsación esté pendiente o activa pondrá esto a true y el swipe no reclamará el gesto.
  // Hoy nadie lo escribe. Ver docs/DECISIONS.md (issue #78).
  const swipeBlocked = useRef(false)

  const panResponder = useRef(
    PanResponder.create({
      // En la fase de captura porque es el único punto del inicio del toque que corre SIEMPRE:
      // el Pressable de dentro reclama el responder en el burbujeo, así que el
      // `onStartShouldSetPanResponder` de este envoltorio podría no llegar a ejecutarse nunca.
      onStartShouldSetPanResponderCapture: () => {
        // Un gesto por vez: un segundo dedo sobre la fila NO reclasifica el que ya está en
        // vuelo. Sin esta guarda, apoyar el pulgar a mitad de swipe devolvía `phase` a
        // 'undecided' y el arrastre se soltaba sin borrar.
        if (gesture.current.phase !== 'idle') return false
        gesture.current = { phase: 'undecided', crossed: false }
        suppressPress.current = false
        return false
      },
      onStartShouldSetPanResponder: () => false,
      // El ScrollView de la pantalla pide el responder en cuanto hay deriva vertical, y sin
      // esto se le concede por defecto: el swipe ya reclamado se soltaría solo a mitad de
      // gesto. Una vez reclamado no se cede (mismo motivo y misma línea que StreakCard).
      onPanResponderTerminationRequest: () => false,
      // Predicado SÍNCRONO: es lo único que separa el swipe del ScrollView que envuelve la
      // pantalla, y tiene que responder antes de que corra ningún handler de movimiento. Por eso
      // la regla de reclamar vive en una función pura compartida y no en un estado compartido,
      // que aquí no se podría consultar.
      onMoveShouldSetPanResponder: (_, g) => {
        const state = gesture.current
        if (state.phase === 'swipe') return true
        if (state.phase !== 'undecided') return false
        if (Math.abs(g.dx) < design.gestureActivationDistance && Math.abs(g.dy) < design.gestureActivationDistance) return false
        const claimed = shouldClaimSwipe(g.dx, g.dy, {
          activationDistance: design.gestureActivationDistance,
          blocked: swipeBlocked.current,
        })
        state.phase = claimed ? 'swipe' : 'yield'
        if (claimed) suppressPress.current = true
        return claimed
      },
      onPanResponderMove: (_, g) => {
        const offset = clampSwipeOffset(g.dx, design.swipeDeleteMaxTravel)
        translateX.setValue(offset)
        const crossed = offset <= -design.swipeDeleteThreshold
        if (crossed !== gesture.current.crossed) {
          gesture.current.crossed = crossed
          if (crossed) getHaptics()?.onSwipeThresholdCross?.()
        }
      },
      onPanResponderRelease: (_, g) => {
        const shouldDelete = gesture.current.phase === 'swipe'
          && clampSwipeOffset(g.dx, design.swipeDeleteMaxTravel) <= -design.swipeDeleteThreshold
        gesture.current = { phase: 'idle', crossed: false }
        // La fila nunca se queda abierta: quien sostiene la decisión es el ConfirmModal del día.
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }).start()
        if (shouldDelete) onDeleteRef.current?.()
      },
      onPanResponderTerminate: () => {
        gesture.current = { phase: 'idle', crossed: false }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }).start()
      },
    })
  ).current

  // La afordancia se descubre con el propio recorrido en vez de quedarse tapada por la fila:
  // el `active:opacity-70` del Pressable dejaría translucir el rojo en cada pulsación.
  const affordanceOpacity = translateX.interpolate({
    inputRange: [-design.swipeDeleteMaxTravel, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const handleCardPress = () => {
    // El responder ya cancela el press cuando el swipe reclama el gesto; esto es el respaldo
    // para Android, donde el onPress puede llegar igualmente tras un gesto reclamado.
    if (suppressPress.current) {
      suppressPress.current = false
      return
    }
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
    onReorderToPosition && totalExercises > 1 && { icon: ArrowUpDown, label: t('routine:reorder'), onPress: () => setShowReorder(true) },
    { icon: Trash2, label: t('common:buttons.delete'), onPress: onDelete, danger: true },
  ].filter(Boolean)

  const handleMenuAction = (action) => {
    setShowMenu(false)
    action?.()
  }

  const cardContent = (
    <Pressable
      onPress={handleCardPress}
      className="active:opacity-70"
      style={{
        backgroundColor: colors.bgTertiary,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...rnBorderStyle,
      }}
    >
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
  )

  return (
    <>
      <View style={{ borderRadius: 8, overflow: 'hidden' }} {...panResponder.panHandlers}>
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
            opacity: affordanceOpacity,
          }}
        >
          <Trash2 size={16} color={colors.white} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateX }] }}>
          {cardContent}
        </Animated.View>
      </View>
      <Modal isOpen={showMenu} onClose={() => setShowMenu(false)} position="bottom">
        <View style={{ paddingVertical: 8, paddingBottom: 24 }}>
          {menuItems.map((item, i) => (
            <Pressable key={i} onPress={() => handleMenuAction(item.onPress)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 }}
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
