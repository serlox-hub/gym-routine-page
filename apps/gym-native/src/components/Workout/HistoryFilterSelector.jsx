import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, design } from '../../lib/styles'

// The visible track sits this far inside the 44pt row (44 - 2 * 8 = a 28pt track).
const TRACK_INSET = 8
// Gap between the row's sides and the first and last segment.
const SIDE_PADDING = 2

/**
 * The exercise history's routine filter: equal segments filling the row, with a lime pill sliding
 * under the selected one. `options` come from `getHistoryFilterOptions`.
 */
export default function HistoryFilterSelector({ options, value, onChange }) {
  const { t } = useTranslation()
  const [rowWidth, setRowWidth] = useState(0)
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
  const slideAnim = useRef(new Animated.Value(selectedIndex)).current
  const segmentWidth = (rowWidth - SIDE_PADDING * 2) / options.length

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: selectedIndex, duration: 200, useNativeDriver: true }).start()
  }, [selectedIndex, slideAnim])

  return (
    // The Pressables are the 44pt boxes; the track and the pill are painted behind them at their
    // old size (TRACK_INSET above and below).
    <View
      style={{ flexDirection: 'row', paddingHorizontal: SIDE_PADDING }}
      onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, top: TRACK_INSET, bottom: TRACK_INSET, borderRadius: 20, backgroundColor: colors.bgTertiary }} />
      {rowWidth > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: TRACK_INSET + 2, bottom: TRACK_INSET + 2,
            left: SIDE_PADDING,
            width: segmentWidth,
            borderRadius: 18,
            backgroundColor: colors.success,
            transform: [{ translateX: Animated.multiply(slideAnim, segmentWidth) }],
          }}
        />
      )}
      {options.map(option => {
        const isSelected = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={{ flex: 1, minHeight: design.minTouchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, zIndex: 1 }}
          >
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: isSelected ? colors.bgPrimary : colors.textSecondary }}>
              {t(option.labelKey)}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
