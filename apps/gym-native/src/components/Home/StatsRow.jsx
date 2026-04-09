import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Timer, Trophy } from 'lucide-react-native'
import { useWeeklyStats, useMonthlySessionCount, formatDurationHoursMinutes } from '@gym/shared'
import { Card } from '../ui'
import { colors, design } from '../../lib/styles'

function StatsRow() {
  const { t } = useTranslation()
  const { totalMinutes, isLoading: loadingWeekly, isError: errorWeekly } = useWeeklyStats()
  const { count, isLoading: loadingMonthly, isError: errorMonthly } = useMonthlySessionCount()
  const { hours, minutes } = formatDurationHoursMinutes(totalMinutes)

  const durationParts = hours > 0
    ? [{ val: hours, unit: 'h' }, { val: minutes, unit: 'min' }]
    : [{ val: minutes, unit: 'min' }]

  return (
    <View className="flex-row gap-3 mb-4">
      <Card className="flex-1 p-4">
        <Timer size={16} color={colors.success} />
        <Text style={{ color: colors.textPrimary, fontSize: design.statValueSize.large, fontWeight: '700', letterSpacing: -0.5, marginTop: 8 }}>
          {loadingWeekly || errorWeekly ? '—' : durationParts.map((p, i) => (
            <Text key={i}>{i > 0 && ' '}{p.val} <Text style={{ fontSize: 12, color: colors.textMuted }}>{p.unit}</Text></Text>
          ))}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: design.labelSize, fontWeight: '500' }}>
          {t('common:home.thisWeek')}
        </Text>
      </Card>
      <Card className="flex-1 p-4">
        <Trophy size={16} color={colors.purple} />
        <Text style={{ color: colors.textPrimary, fontSize: design.statValueSize.large, fontWeight: '700', letterSpacing: -0.5, marginTop: 8 }}>
          {loadingMonthly || errorMonthly ? '—' : String(count)}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: design.labelSize, fontWeight: '500' }}>
          {t('common:home.thisMonth')}
        </Text>
      </Card>
    </View>
  )
}

export default StatsRow
