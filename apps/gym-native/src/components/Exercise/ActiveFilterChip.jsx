import { View, Text, Pressable } from 'react-native'
import { X } from 'lucide-react-native'
import { colors, design } from '../../lib/styles'

/**
 * An active filter shown under the search field. The whole chip clears it, and the pressable is
 * design.minTouchTarget tall around the small visible chip.
 */
export default function ActiveFilterChip({ label, onClear }) {
  return (
    <Pressable
      onPress={onClear}
      accessibilityRole="button"
      className="active:opacity-70"
      style={{ height: design.minTouchTarget, justifyContent: 'center' }}
    >
      <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.successBgSubtle }}>
        <Text style={{ fontSize: 12, color: colors.success }}>{label}</Text>
        <X size={10} color={colors.success} />
      </View>
    </Pressable>
  )
}
