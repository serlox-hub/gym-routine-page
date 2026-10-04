import { View, Text, Pressable, ScrollView, Modal as RNModal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, design } from '../../lib/styles'

const SHEET_CONTENT_MAX_HEIGHT = 480
const SHEET_BOTTOM_PADDING = 16
const OPTION_GAP = 6
const COLUMNS = 2

// Rows of two, so an odd last option keeps the width of the others instead of stretching.
const toRows = options => {
  const rows = []
  for (let i = 0; i < options.length; i += COLUMNS) rows.push(options.slice(i, i + COLUMNS))
  return rows
}

const optionStyle = isSelected => ({
  minHeight: design.minTouchTarget,
  backgroundColor: isSelected ? colors.successBgSubtle : colors.bgTertiary,
  borderWidth: 1,
  borderColor: isSelected ? colors.success : 'transparent',
})

const optionTextStyle = isSelected => ({ fontSize: 14, color: isSelected ? colors.success : colors.textPrimary })

/**
 * Every option of one filter at once, in two columns, so none hides past an edge. "All" first,
 * then the sections (`getSectionTitle` names them; without it they go untitled). Picking closes it.
 */
export default function FilterOptionSheet({
  isOpen, onClose, title, allLabel, sections, getSectionTitle, getOptionDot, selectedId, onSelect,
}) {
  const insets = useSafeAreaInsets()

  const pick = id => {
    onSelect(id)
    onClose()
  }

  return (
    <RNModal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end" style={{ backgroundColor: colors.overlaySoft }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-block rounded-t-2xl px-4 pt-2"
          style={{ paddingBottom: insets.bottom + SHEET_BOTTOM_PADDING }}
        >
          <View className="justify-center" style={{ minHeight: design.minTouchTarget }}>
            <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{title}</Text>
          </View>

          <ScrollView style={{ maxHeight: SHEET_CONTENT_MAX_HEIGHT }}>
            <Pressable
              onPress={() => pick(null)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedId == null }}
              className="px-3 justify-center rounded-lg"
              style={optionStyle(selectedId == null)}
            >
              <Text style={optionTextStyle(selectedId == null)}>{allLabel}</Text>
            </Pressable>
            {sections.map(section => (
              <View key={section.key} className="mt-3">
                {getSectionTitle && (
                  <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: 6 }}>
                    {getSectionTitle(section.key)}
                  </Text>
                )}
                <View style={{ gap: OPTION_GAP }}>
                  {toRows(section.options).map(row => (
                    <View key={row[0].id} className="flex-row" style={{ gap: OPTION_GAP }}>
                      {row.map(option => {
                        const isSelected = selectedId === option.id
                        const dot = getOptionDot?.(option)
                        return (
                          <Pressable
                            key={option.id}
                            onPress={() => pick(option.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            className="flex-1 flex-row items-center gap-2 px-3 rounded-lg"
                            style={optionStyle(isSelected)}
                          >
                            {dot && <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />}
                            <Text numberOfLines={1} style={[optionTextStyle(isSelected), { flexShrink: 1 }]}>{option.label}</Text>
                          </Pressable>
                        )
                      })}
                      {row.length < COLUMNS && <View className="flex-1" />}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  )
}
