import { useTranslation } from 'react-i18next'
import { Timer, Trophy } from 'lucide-react'
import { useWeeklyStats, useMonthlySessionCount, formatDurationHoursMinutes } from '@gym/shared'
import { Card } from '../ui/index.js'
import { colors, design } from '../../lib/styles.js'

function StatsRow() {
  const { t } = useTranslation()
  const { totalMinutes, isLoading: loadingWeekly, isError: errorWeekly } = useWeeklyStats()
  const { count, isLoading: loadingMonthly, isError: errorMonthly } = useMonthlySessionCount()
  const { hours, minutes } = formatDurationHoursMinutes(totalMinutes)

  const durationParts = hours > 0
    ? [{ val: hours, unit: 'h' }, { val: minutes, unit: 'min' }]
    : [{ val: minutes, unit: 'min' }]

  return (
    <section className="flex gap-3 mb-4">
      <Card className="flex-1 p-4">
        <Timer size={16} style={{ color: colors.success }} />
        <p style={{ color: colors.textPrimary, fontSize: design.statValueSize.large, fontWeight: 700, letterSpacing: -0.5, marginTop: 8 }}>
          {loadingWeekly || errorWeekly ? '—' : durationParts.map((p, i) => (
            <span key={i}>{i > 0 && ' '}{p.val}<span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 2 }}>{p.unit}</span></span>
          ))}
        </p>
        <p style={{ color: colors.textSecondary, fontSize: design.labelSize, fontWeight: 500 }}>
          {t('common:home.thisWeek')}
        </p>
      </Card>
      <Card className="flex-1 p-4">
        <Trophy size={16} style={{ color: colors.purple }} />
        <p style={{ color: colors.textPrimary, fontSize: design.statValueSize.large, fontWeight: 700, letterSpacing: -0.5, marginTop: 8 }}>
          {loadingMonthly || errorMonthly ? '—' : count}
        </p>
        <p style={{ color: colors.textSecondary, fontSize: design.labelSize, fontWeight: 500 }}>
          {t('common:home.thisMonth')}
        </p>
      </Card>
    </section>
  )
}

export default StatsRow
