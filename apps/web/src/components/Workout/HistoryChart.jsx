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
  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-center text-secondary py-8">
        Sin registros anteriores
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
              label="Mejor 1RM Est."
              value={`${stats.best1RM.toLocaleString()} ${weightUnit}`}
              color={colors.purple}
            />
          )}
          {stats.maxWeight > 0 && (
            <StatCard
              label="Peso maximo"
              value={`${stats.maxWeight.toLocaleString()} ${weightUnit}`}
              color={colors.accent}
            />
          )}
          {stats.maxReps > 0 && (
            <StatCard
              label="Max. repeticiones"
              value={stats.maxReps}
              color={colors.success}
            />
          )}
          {stats.totalVolume > 0 && (
            <StatCard
              label="Volumen total"
              value={`${stats.totalVolume.toLocaleString()} ${weightUnit}`}
              color={colors.warning}
            />
          )}
          <StatCard
            label="Sesiones"
            value={stats.sessionCount}
            color={colors.textSecondary}
          />
        </div>
      )}

      {/* Chart */}
      {sessions.length >= 2 ? (
        <ExerciseProgressChart sessions={sessions} measurementType={measurementType} />
      ) : (
        <p className="text-center text-secondary py-4 text-sm">
          Necesitas al menos 2 sesiones para ver la grafica
        </p>
      )}
    </div>
  )
}

export default HistoryChart
