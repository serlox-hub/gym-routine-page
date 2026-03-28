import { View, Text, Pressable } from 'react-native'
import { DropdownMenu } from '../ui'
import { colors } from '../../lib/styles'

function ExerciseCardHeader({
  exerciseName,
  completedCount,
  setsCount,
  isCompleted,
  collapsed,
  onToggleCollapse,
  menuItems,
}) {
  return (
    <Pressable
      onPress={onToggleCollapse}
      className="flex-row justify-between items-start gap-2"
    >
      <Text className="text-xs" style={{ color: colors.textSecondary }}>{collapsed ? '▶' : '▼'}</Text>
      <View className="flex-1">
        <Text className="text-primary font-medium" style={collapsed ? { opacity: 0.7 } : undefined}>{exerciseName}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <View
          className="px-2 py-0.5 rounded"
          style={{ backgroundColor: isCompleted ? colors.successBg : colors.accentBg }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: isCompleted ? colors.success : colors.accent }}
          >
            {completedCount}/{setsCount}
          </Text>
        </View>
        {!collapsed && <DropdownMenu triggerSize={16} items={menuItems} />}
      </View>
    </Pressable>
  )
}

export default ExerciseCardHeader
