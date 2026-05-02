import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Pencil, Trash2, Copy, FolderInput, Repeat2, ArrowUpDown } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { Modal, ReorderModal } from '../ui'
import { ExerciseHistoryModal } from '../Workout'
import { colors } from '../../lib/styles'
import { MeasurementType } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'

export default function ExerciseCard({
  routineExercise,
  routineDayId,
  isSuperset = false,
  isEditing = false,
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
  const { exercise, series, reps, rir, rest_seconds, measurement_type } = routineExercise
  const [showReorder, setShowReorder] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const measurementType = measurement_type || exercise?.measurement_type || MeasurementType.WEIGHT_REPS

  const borderStyle = getMuscleGroupBorderStyle(exercise?.muscle_group?.name)
  const rnBorderStyle = {
    borderLeftWidth: parseInt(borderStyle.borderLeftWidth) || 3,
    borderLeftColor: borderStyle.borderLeftColor || colors.textSecondary,
  }

  const menuItems = [
    { icon: Pencil, label: t('common:buttons.edit'), onPress: onEdit },
    { icon: Repeat2, label: t('routine:exercise.replace'), onPress: onReplace },
    { icon: Copy, label: t('routine:exercise.duplicateExercise'), onPress: onDuplicate },
    { icon: FolderInput, label: t('routine:exercise.moveToDay'), onPress: onMoveToDay },
    onReorderToPosition && totalExercises > 1 && { icon: ArrowUpDown, label: t('routine:reorder'), onPress: () => setShowReorder(true) },
    { icon: Trash2, label: t('common:buttons.delete'), onPress: onDelete, danger: true },
  ].filter(Boolean)

  // Vista mode — card clickable con historial
  if (!isEditing) {
    return (
      <>
        <Pressable
          onPress={() => setShowHistory(true)}
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
              {exercise?.name}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{series}×{reps}</Text>
              {rir !== null && rir !== undefined && (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>RIR {rir}</Text>
              )}
              {rest_seconds > 0 && (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{rest_seconds}s</Text>
              )}
            </View>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </Pressable>
        <ExerciseHistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          exerciseId={exercise?.id}
          exerciseName={exercise?.name}
          measurementType={measurementType}
          routineDayId={routineDayId}
          onSessionClick={(sessionId, date) => {
            setShowHistory(false)
            navigation.navigate('MainTabs', { screen: 'History', params: { sessionId, sessionDate: date } })
          }}
        />
      </>
    )
  }

  const handleMenuAction = (action) => {
    setShowMenu(false)
    action?.()
  }

  const cardContent = (
    <Pressable
      onPress={() => setShowMenu(true)}
      className="active:opacity-70"
      style={{
        backgroundColor: colors.bgTertiary,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...(isSuperset ? {} : rnBorderStyle),
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }} numberOfLines={1}>
          {exercise?.name}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{series}×{reps}</Text>
          {rir !== null && rir !== undefined && (
            <Text style={{ color: colors.purple, fontSize: 12 }}>RIR {rir}</Text>
          )}
          {rest_seconds > 0 && (
            <Text style={{ color: colors.warning, fontSize: 12 }}>{rest_seconds}s</Text>
          )}
        </View>
      </View>
      <ChevronRight size={16} color={colors.textMuted} />
    </Pressable>
  )

  return (
    <>
      {cardContent}
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
