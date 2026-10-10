import { useState } from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { Timer, Trophy } from 'lucide-react-native'
import { useWeeklyStats, useWeeklyPRs, formatDurationHoursMinutes } from '@gym/shared'
import { Card } from '../ui'
import { colors, design } from '../../lib/styles'
import WeeklyPRsModal from './WeeklyPRsModal'

function StatsRow() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { totalMinutes, isLoading: loadingWeekly, isError: errorWeekly } = useWeeklyStats()
  const { sessions, count, isLoading: loadingPRs, detailsLoading, isError: errorPRs } = useWeeklyPRs()
  const [showPRs, setShowPRs] = useState(false)
  const { hours, minutes } = formatDurationHoursMinutes(totalMinutes)

  const durationParts = hours > 0
    ? [{ val: hours, unit: 'h' }, { val: minutes, unit: 'min' }]
    : [{ val: minutes, unit: 'min' }]

  return (
    <View className="flex-row gap-3 mb-4">
      <Card className="flex-1 p-4" onPress={() => navigation.navigate('History', { date: new Date().toISOString() })}>
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
      <Card className="flex-1 p-4" onPress={() => setShowPRs(true)}>
        <Trophy size={16} color={colors.gold} />
        <Text style={{ color: colors.textPrimary, fontSize: design.statValueSize.large, fontWeight: '700', letterSpacing: -0.5, marginTop: 8 }}>
          {loadingPRs || errorPRs ? '—' : String(count)}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: design.labelSize, fontWeight: '500' }}>
          {t('common:home.prsThisWeek')}
        </Text>
      </Card>
      <WeeklyPRsModal
        isOpen={showPRs}
        onClose={() => setShowPRs(false)}
        sessions={sessions}
        count={count}
        isLoading={detailsLoading}
        isError={errorPRs}
      />
    </View>
  )
}

export default StatsRow
