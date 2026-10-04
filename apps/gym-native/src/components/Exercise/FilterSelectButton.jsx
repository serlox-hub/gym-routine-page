import { View, Text, Pressable } from 'react-native'
import { ChevronDown, X } from 'lucide-react-native'
import { colors, design } from '../../lib/styles'

/**
 * A filter that opens the full list of its options. Shows the filter's name while nothing is
 * picked; once something is, shows the pick, highlighted, with an "x" that clears it.
 */
export default function FilterSelectButton({ label, value, onOpen, onClear, clearLabel }) {
  const isActive = Boolean(value)
  const tint = isActive ? colors.success : colors.textSecondary

  return (
    <View
      className="flex-1 flex-row rounded-lg"
      style={{
        height: design.minTouchTarget,
        backgroundColor: isActive ? colors.successBgSubtle : colors.bgTertiary,
        borderWidth: 1,
        borderColor: isActive ? colors.success : colors.border,
      }}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        className="flex-1 flex-row items-center gap-1 pl-3"
        style={{ paddingRight: isActive ? 0 : 8 }}
      >
        <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, color: tint }}>{value ?? label}</Text>
        {!isActive && <ChevronDown size={14} color={tint} style={{ marginLeft: 'auto' }} />}
      </Pressable>
      {isActive && (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          className="items-center justify-center"
          style={{ width: design.minTouchTarget }}
        >
          <X size={14} color={colors.success} />
        </Pressable>
      )}
    </View>
  )
}
