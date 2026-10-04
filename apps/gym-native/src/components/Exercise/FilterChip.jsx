import { View, Text, Pressable } from 'react-native'
import { colors, design } from '../../lib/styles'

/**
 * Selectable chip of the exercise filters. `fillTouchTarget` makes the pressable
 * design.minTouchTarget tall around the same visible chip, for a row where nothing else gives it
 * a tappable height.
 */
export default function FilterChip({ label, isSelected, dot, onPress, onLayout, fillTouchTarget = false }) {
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={fillTouchTarget ? { height: design.minTouchTarget, justifyContent: 'center' } : undefined}
    >
      <View
        className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full"
        style={{
          backgroundColor: isSelected ? colors.successBgSubtle : colors.bgTertiary,
          borderWidth: 1,
          borderColor: isSelected ? colors.success : 'transparent',
        }}
      >
        {dot && <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />}
        <Text style={{ fontSize: 12, fontWeight: '500', color: isSelected ? colors.success : colors.textSecondary }}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}
