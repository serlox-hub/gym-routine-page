import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { CHART_RANGES } from '@gym/shared'
import { colors } from '../../lib/styles'

const OPTIONS = [
  { value: CHART_RANGES.ONE_MONTH, key: '1m' },
  { value: CHART_RANGES.THREE_MONTHS, key: '3m' },
  { value: CHART_RANGES.ALL, key: 'all' },
]

export default function ChartRangeToggle({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <View style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: colors.bgTertiary }}>
      {OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: active ? colors.success : 'transparent',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: active ? colors.bgPrimary : colors.textMuted }}>
              {t(`body:chartRange.${opt.key}`)}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
