import { View, Text, Pressable } from 'react-native'
import { Info, Pencil, Trash2, Copy, FolderInput, Repeat2 } from 'lucide-react-native'
import { Card, DropdownMenu } from '../ui'
import { colors } from '../../lib/styles'
import { getMuscleGroupBorderStyle } from '../../lib/constants'

export default function ExerciseCard({
  routineExercise,
  isSuperset = false,
  isEditing = false,
  isReordering = false,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToDay,
  onReplace,
  onPress,
}) {
  const { exercise, series, reps, rir, rest_seconds, tempo } = routineExercise

  const borderStyle = getMuscleGroupBorderStyle(exercise?.muscle_group?.name)
  const rnBorderStyle = {
    borderLeftWidth: parseInt(borderStyle.borderLeftWidth) || 3,
    borderLeftColor: borderStyle.borderLeftColor || colors.textSecondary,
  }

  const menuItems = [
    { icon: Pencil, label: 'Editar', onClick: onEdit },
    { icon: Repeat2, label: 'Sustituir', onClick: onReplace },
    { icon: Copy, label: 'Duplicar', onClick: onDuplicate },
    { icon: FolderInput, label: 'Mover de día', onClick: onMoveToDay },
    { icon: Trash2, label: 'Eliminar', onClick: onDelete, danger: true },
  ].filter(Boolean)

  const content = (
    <>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-primary font-medium text-sm flex-1" numberOfLines={1}>
          {exercise?.name}
        </Text>
        {isEditing ? (
          <DropdownMenu items={menuItems} triggerSize={14} />
        ) : (
          <Pressable
            onPress={onPress}
            className="p-1 rounded bg-surface-block"
          >
            <Info size={14} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
      <View className="flex-row flex-wrap gap-2 mt-1">
        <Text className="text-secondary text-xs">{series}×{reps}</Text>
        {rir !== null && rir !== undefined && (
          <Text className="text-xs" style={{ color: colors.purple }}>RIR {rir}</Text>
        )}
        {rest_seconds > 0 && (
          <Text className="text-xs" style={{ color: colors.warning }}>{rest_seconds}s</Text>
        )}
        {tempo && <Text className="text-secondary text-xs">{tempo}</Text>}
      </View>
    </>
  )

  if (isSuperset) {
    return <View style={rnBorderStyle} className="p-2">{content}</View>
  }

  return (
    <Card className="p-2" style={rnBorderStyle}>
      {content}
    </Card>
  )
}
