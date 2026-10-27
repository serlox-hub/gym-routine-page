import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Timer, Trophy } from 'lucide-react'
import {
  useWeeklyStats, useWeeklyPRs, useHomeCycleOffset, formatDurationHoursMinutes, getCycleReferenceDate,
  getViewedWeekLabel, VIEWED_WEEK_LABELS,
} from '@gym/shared'
import { Card } from '../ui/index.js'
import { colors, design } from '../../lib/styles.js'
import WeeklyPRsModal from './WeeklyPRsModal.jsx'

function StatsRow() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cycleOffset = useHomeCycleOffset()
  const { totalMinutes, isLoading: loadingWeekly, isError: errorWeekly } = useWeeklyStats(cycleOffset)
  const { sessions, count, isLoading: loadingPRs, detailsLoading, isError: errorPRs } = useWeeklyPRs(cycleOffset)
  const [showPRs, setShowPRs] = useState(false)
  const { hours, minutes } = formatDurationHoursMinutes(totalMinutes)
  const totalTimeLabel = getViewedWeekLabel(cycleOffset, VIEWED_WEEK_LABELS.totalTime)
  const prsLabel = getViewedWeekLabel(cycleOffset, VIEWED_WEEK_LABELS.prs)

  const durationParts = hours > 0
    ? [{ val: hours, unit: 'h' }, { val: minutes, unit: 'min' }]
    : [{ val: minutes, unit: 'min' }]

  return (
    <section className="flex gap-3 mb-4">
      <Card className="flex-1 p-4" onClick={() => navigate('/history', { state: { date: getCycleReferenceDate(cycleOffset).toISOString() } })}>
        <Timer size={16} style={{ color: colors.success }} />
        <p style={{ color: colors.textPrimary, fontSize: design.statValueSize.large, fontWeight: 700, letterSpacing: -0.5, marginTop: 8 }}>
          {loadingWeekly || errorWeekly ? '—' : durationParts.map((p, i) => (
            <span key={i}>{i > 0 && ' '}{p.val}<span style={{ fontSize: 12, color: colors.textMuted, marginLeft: 2 }}>{p.unit}</span></span>
          ))}
        </p>
        <p style={{ color: colors.textSecondary, fontSize: design.labelSize, fontWeight: 500 }}>
          {t(totalTimeLabel.key, totalTimeLabel.values)}
        </p>
      </Card>
      <Card className="flex-1 p-4" onClick={() => setShowPRs(true)}>
        <Trophy size={16} style={{ color: colors.gold }} />
        <p style={{ color: colors.textPrimary, fontSize: design.statValueSize.large, fontWeight: 700, letterSpacing: -0.5, marginTop: 8 }}>
          {loadingPRs || errorPRs ? '—' : count}
        </p>
        <p style={{ color: colors.textSecondary, fontSize: design.labelSize, fontWeight: 500 }}>
          {t(prsLabel.key, prsLabel.values)}
        </p>
      </Card>
      <WeeklyPRsModal
        isOpen={showPRs}
        onClose={() => setShowPRs(false)}
        sessions={sessions}
        count={count}
        isLoading={detailsLoading}
        isError={errorPRs}
        cycleOffset={cycleOffset}
      />
    </section>
  )
}

export default StatsRow
