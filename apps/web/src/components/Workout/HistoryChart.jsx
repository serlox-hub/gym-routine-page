import { useTranslation } from 'react-i18next'
import ExerciseProgressChart from './ExerciseProgressChart.jsx'
import { colors } from '../../lib/styles.js'
import { getExerciseStatCards } from '@gym/shared'

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

function HistoryChart({ sessions, stats, trackedFields, weightUnit, distanceUnit = 'm', chartRows, overlayGyms, unitByGym }) {
  const { t } = useTranslation()
  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-center text-secondary py-8">
        {t('exercise:noHistory')}
      </p>
    )
  }

  const statCards = getExerciseStatCards(stats, trackedFields, { weightUnit, distanceUnit })

  // En modo gym-aware el gráfico se dibuja desde chartRows (filas de stats por gym)
  const usesChartRows = Array.isArray(chartRows)
  const chartSource = usesChartRows ? (chartRows?.length ?? 0) : sessions.length

  return (
    <div className="space-y-4">
      {/* Chart */}
      {chartSource >= 2 ? (
        <ExerciseProgressChart
          sessions={sessions}
          chartRows={usesChartRows ? chartRows : undefined}
          overlayGyms={overlayGyms}
          unitByGym={unitByGym}
          trackedFields={trackedFields}
          weightUnit={weightUnit}
        />
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
