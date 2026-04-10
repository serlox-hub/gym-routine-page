import { useState } from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Copy, FolderInput, Repeat2, ArrowUpDown } from 'lucide-react-native'
import { Card, DropdownMenu, ReorderModal } from '../ui'
import { colors } from '../../lib/styles'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'

export default function ExerciseCard({
  routineExercise,
  isSuperset = false,
  isEditing = false,
  isReordering: _isReordering = false,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToDay,
  onReplace,
  onPress: _onPress,
  onReorderToPosition,
  currentIndex = 0,
  totalExercises = 1,
  positionLabels = [],
}) {
  const { t } = useTranslation()
  const { exercise, series, reps, rir, rest_seconds } = routineExercise
  const [showReorder, setShowReorder] = useState(false)

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
    onReorderToPosition && totalExercises > 1 && { type: 'separator' },
    onReorderToPosition && totalExercises > 1 && { icon: ArrowUpDown, label: t('routine:reorder'), onPress: () => setShowReorder(true) },
    { icon: Trash2, label: t('common:buttons.delete'), onPress: onDelete, danger: true },
  ].filter(Boolean)

  // Vista mode — card con fondo y borde muscular
  if (!isEditing) {
    return (
      <View
        style={{
          backgroundColor: colors.bgTertiary,
          borderRadius: 8,
          paddingVertical: 10,
          paddingHorizontal: 14,
          ...rnBorderStyle,
        }}
      >
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
    )
  }

  const content = (
    <>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-primary font-medium text-sm flex-1" numberOfLines={1}>
          {exercise?.name}
        </Text>
        <DropdownMenu items={menuItems} triggerSize={14} />
      </View>
      <View className="flex-row flex-wrap gap-2 mt-1">
        <Text className="text-secondary text-xs">{series}×{reps}</Text>
        {rir !== null && rir !== undefined && (
          <Text className="text-xs" style={{ color: colors.purple }}>RIR {rir}</Text>
        )}
        {rest_seconds > 0 && (
          <Text className="text-xs" style={{ color: colors.warning }}>{rest_seconds}s</Text>
        )}
      </View>
    </>
  )

  const reorderModal = showReorder && (
    <ReorderModal
      visible
      onClose={() => setShowReorder(false)}
      totalItems={totalExercises}
      currentIndex={currentIndex}
      positionLabels={positionLabels}
      onSelect={(i) => { onReorderToPosition(i); setShowReorder(false) }}
    />
  )

  if (isSuperset) {
    return <>{reorderModal}<View style={rnBorderStyle} className="p-2">{content}</View></>
  }

  return (
    <>
      {reorderModal}
      <Card className="p-2" style={rnBorderStyle}>
        {content}
      </Card>
    </>
  )
}
