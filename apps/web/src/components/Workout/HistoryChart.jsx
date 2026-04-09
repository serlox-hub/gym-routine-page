import { useTranslation } from 'react-i18next'
import { Card } from '../ui/index.js'
import ExerciseProgressChart from './ExerciseProgressChart.jsx'
import { colors } from '../../lib/styles.js'

function StatCard({ label, value, color }) {
  return (
    <Card className="p-2">
      <div className="text-xs text-secondary">{label}</div>
      <div className="text-base font-bold" style={{ color }}>
        {value}
      </div>
    </Card>
  )
}

function HistoryChart({ sessions, stats, measurementType, weightUnit }) {
  const { t } = useTranslation()
  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-center text-secondary py-8">
        {t('exercise:noHistory')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          {stats.best1RM > 0 && (
            <StatCard
              label={t('workout:summary.best1rm')}
              value={`${stats.best1RM.toLocaleString()} ${weightUnit}`}
              color={colors.purple}
            />
          )}
          {stats.maxWeight > 0 && (
            <StatCard
              label={t('workout:summary.maxWeight')}
              value={`${stats.maxWeight.toLocaleString()} ${weightUnit}`}
              color={colors.accent}
            />
          )}
          {stats.maxReps > 0 && (
            <StatCard
              label={t('workout:summary.maxReps')}
              value={stats.maxReps}
              color={colors.success}
            />
          )}
          {stats.totalVolume > 0 && (
            <StatCard
              label={t('workout:summary.totalVolume')}
              value={`${stats.totalVolume.toLocaleString()} ${weightUnit}`}
              color={colors.warning}
            />
          )}
          <StatCard
            label={t('workout:summary.sessions')}
            value={stats.sessionCount}
            color={colors.textSecondary}
          />
        </div>
      )}

      {/* Chart */}
      {sessions.length >= 2 ? (
        <ExerciseProgressChart sessions={sessions} measurementType={measurementType} weightUnit={weightUnit} />
      ) : (
        <p className="text-center text-secondary py-4 text-sm">
          {t('exercise:progressMinSessions')}
        </p>
      )}
    </div>
  )
}

export default HistoryChart
