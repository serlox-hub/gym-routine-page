import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { CHART_RANGES } from '@gym/shared'
import { colors, design } from '../../lib/styles'

// Visible height of the track and of the active pill, centred in the 44pt row.
const TRACK_HEIGHT = 22

const OPTIONS = [
  { value: CHART_RANGES.ONE_MONTH, key: '1m' },
  { value: CHART_RANGES.THREE_MONTHS, key: '3m' },
  { value: CHART_RANGES.ALL, key: 'all' },
]

// The Pressables are the 44pt boxes; the track and the active pill are painted inside them at
// TRACK_HEIGHT, so the toggle looks the same and takes ~11pt more above and below.
export default function ChartRangeToggle({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <View style={{ flexDirection: 'row' }}>
      <View
        style={{
          position: 'absolute', left: 0, right: 0,
          top: (design.minTouchTarget - TRACK_HEIGHT) / 2, height: TRACK_HEIGHT,
          borderRadius: 8, backgroundColor: colors.bgTertiary,
        }}
      />
      {OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            style={{ minHeight: design.minTouchTarget, justifyContent: 'center' }}
          >
            <View
              style={{
                height: TRACK_HEIGHT,
                justifyContent: 'center',
                paddingHorizontal: 10,
                borderRadius: 6,
                backgroundColor: active ? colors.success : 'transparent',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: active ? colors.bgPrimary : colors.textMuted }}>
                {t(`common:chartRange.${opt.key}`)}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
