import { useState } from 'react'
import { View, Text, Pressable, Modal } from 'react-native'
import { Info, Pencil, Trash2, Copy, FolderInput, Repeat2, ArrowUpDown } from 'lucide-react-native'
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
  onReorderToPosition,
  currentIndex = 0,
  totalExercises = 1,
}) {
  const { exercise, series, reps, rir, rest_seconds, tempo } = routineExercise
  const [showReorder, setShowReorder] = useState(false)

  const borderStyle = getMuscleGroupBorderStyle(exercise?.muscle_group?.name)
  const rnBorderStyle = {
    borderLeftWidth: parseInt(borderStyle.borderLeftWidth) || 3,
    borderLeftColor: borderStyle.borderLeftColor || colors.textSecondary,
  }

  const menuItems = [
    { icon: Pencil, label: 'Editar', onPress: onEdit },
    { icon: Repeat2, label: 'Sustituir', onPress: onReplace },
    { icon: Copy, label: 'Duplicar', onPress: onDuplicate },
    { icon: FolderInput, label: 'Mover de día', onPress: onMoveToDay },
    onReorderToPosition && totalExercises > 1 && { type: 'separator' },
    onReorderToPosition && totalExercises > 1 && { icon: ArrowUpDown, label: 'Reordenar', onPress: () => setShowReorder(true) },
    { icon: Trash2, label: 'Eliminar', onPress: onDelete, danger: true },
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

  const reorderModal = showReorder && (
    <Modal visible transparent animationType="fade" onRequestClose={() => setShowReorder(false)}>
      <Pressable onPress={() => setShowReorder(false)} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable onPress={e => e.stopPropagation()} className="bg-surface-block border border-border rounded-t-2xl py-2 pb-8">
          <Text className="text-base font-semibold text-primary px-5 py-3">Mover a posición</Text>
          {Array.from({ length: totalExercises }, (_, i) => (
            <Pressable key={i} onPress={() => { onReorderToPosition(i); setShowReorder(false) }} disabled={i === currentIndex} className={`px-5 py-3 ${i === currentIndex ? 'opacity-30' : ''}`}>
              <Text style={{ color: i === currentIndex ? '#8b949e' : '#e6edf3' }} className="text-base">
                Posición {i + 1}{i === currentIndex ? ' (actual)' : ''}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
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
