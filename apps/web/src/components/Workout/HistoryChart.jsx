import { useTranslation } from 'react-i18next'
import ExerciseProgressChart from './ExerciseProgressChart.jsx'
import { colors } from '../../lib/styles.js'
import { MeasurementType, measurementTypeUsesTime, measurementTypeUsesDistance, formatSecondsToMMSS } from '@gym/shared'

function StatCard({ label, value }) {
  return (
    <div
      className="flex-1 flex flex-col items-center py-3 rounded-lg"
      style={{ border: `1px solid ${colors.border}` }}
    >
      <span style={{ color: colors.textMuted, fontSize: 11, fontWeight: 500 }}>{label}</span>
      <span style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700, marginTop: 2 }}>{value}</span>
    </div>
  )
}

function getStatCards(stats, measurementType, weightUnit, distanceUnit, t) {
  if (!stats) return []

  if (measurementType === MeasurementType.WEIGHT_REPS) {
    const cards = []
    if (stats.best1RM > 0) cards.push({ label: t('workout:summary.best1rm'), value: `${stats.best1RM} ${weightUnit}` })
    if (stats.maxWeight > 0) cards.push({ label: t('workout:summary.maxWeight'), value: `${stats.maxWeight} ${weightUnit}` })
    return cards
  }

  if (measurementType === MeasurementType.REPS_ONLY) {
    const cards = []
    if (stats.maxReps > 0) cards.push({ label: t('workout:summary.maxReps'), value: stats.maxReps })
    if (stats.avgReps > 0) cards.push({ label: t('workout:summary.avgReps'), value: stats.avgReps })
    return cards
  }

  if (measurementTypeUsesTime(measurementType)) {
    const cards = []
    if (stats.maxTime > 0) cards.push({ label: t('workout:summary.maxTime'), value: formatSecondsToMMSS(stats.maxTime) })
    if (stats.avgTime > 0) cards.push({ label: t('workout:summary.avgTime'), value: formatSecondsToMMSS(stats.avgTime) })
    return cards
  }

  if (measurementTypeUsesDistance(measurementType)) {
    const cards = []
    if (stats.maxDistance > 0) cards.push({ label: t('workout:summary.maxDistance'), value: `${stats.maxDistance} ${distanceUnit}` })
    if (stats.avgDistance > 0) cards.push({ label: t('workout:summary.avgDistance'), value: `${stats.avgDistance} ${distanceUnit}` })
    return cards
  }

  return []
}

function HistoryChart({ sessions, stats, measurementType, weightUnit, distanceUnit = 'm' }) {
  const { t } = useTranslation()
  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-center text-secondary py-8">
        {t('exercise:noHistory')}
      </p>
    )
  }

  const statCards = getStatCards(stats, measurementType, weightUnit, distanceUnit, t)

  return (
    <div className="space-y-4">
      {/* Chart */}
      {sessions.length >= 2 ? (
        <ExerciseProgressChart sessions={sessions} measurementType={measurementType} weightUnit={weightUnit} />
      ) : (
        <p className="text-center text-secondary py-4 text-sm">
          {t('exercise:progressMinSessions')}
        </p>
      )}

      {/* Stats */}
      {statCards.length > 0 && (
        <div className="flex gap-2">
          {statCards.map(card => (
            <StatCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryChart
