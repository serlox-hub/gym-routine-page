import { useParams } from 'react-router-dom'
import { useExercise } from '../hooks/useExercises.js'
import { useExerciseHistory } from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Card, PageHeader } from '../components/ui/index.js'
import ExerciseProgressChart from '../components/Workout/ExerciseProgressChart.jsx'
import { formatShortDate } from '../lib/dateUtils.js'
import { formatSetValue } from '../lib/setUtils.js'
import { calculateExerciseStats } from '../lib/workoutCalculations.js'
import { colors } from '../lib/styles.js'
import { MeasurementType } from '../lib/measurementTypes.js'

function ExerciseProgress() {
  const { exerciseId } = useParams()
  const { data: exercise, isLoading: loadingExercise, error: exerciseError } = useExercise(exerciseId)
  const { data: sessions, isLoading: loadingSessions } = useExerciseHistory(exerciseId)

  if (loadingExercise || loadingSessions) return <LoadingSpinner />
  if (exerciseError) return <ErrorMessage message={exerciseError.message} className="m-4" />
  if (!exercise) return <ErrorMessage message="Ejercicio no encontrado" className="m-4" />

  const measurementType = exercise.measurement_type || MeasurementType.WEIGHT_REPS
  const stats = calculateExerciseStats(sessions, measurementType)

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <PageHeader title={exercise.name} onBack={() => history.back()} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.best1RM > 0 && (
            <StatCard
              label="Mejor 1RM Est."
              value={`${stats.best1RM} ${exercise.weight_unit || 'kg'}`}
              color={colors.purple}
            />
          )}
          {stats.maxWeight > 0 && (
            <StatCard
              label="Peso máximo"
              value={`${stats.maxWeight} ${exercise.weight_unit || 'kg'}`}
              color={colors.accent}
            />
          )}
          {stats.maxReps > 0 && (
            <StatCard
              label="Máx. repeticiones"
              value={stats.maxReps}
              color={colors.success}
            />
          )}
          {stats.totalVolume > 0 && (
            <StatCard
              label="Volumen total"
              value={`${stats.totalVolume.toLocaleString()} ${exercise.weight_unit || 'kg'}`}
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
      {sessions && sessions.length >= 2 ? (
        <Card className="p-4 mb-6">
          <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
            Progresión
          </h2>
          <ExerciseProgressChart sessions={sessions} measurementType={measurementType} />
        </Card>
      ) : (
        <Card className="p-4 mb-6">
          <p className="text-center text-secondary py-4">
            Necesitas al menos 2 sesiones para ver la gráfica de progresión
          </p>
        </Card>
      )}

      {/* History */}
      <h2 className="text-lg font-bold mb-3">Historial</h2>
      {!sessions || sessions.length === 0 ? (
        <p className="text-center text-secondary py-8">
          Sin registros anteriores
        </p>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <Card
              key={session.sessionId}
              className="p-4"
            >
              <div className="text-xs text-secondary mb-2">
                {formatShortDate(session.date)}
              </div>
              <div className="space-y-1">
                {session.sets.map(set => (
                  <div
                    key={set.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold"
                      style={{ backgroundColor: colors.border, color: colors.textSecondary }}
                    >
                      {set.set_number}
                    </span>
                    <span className="flex-1">{formatSetValue(set)}</span>
                    {set.rir_actual !== null && (
                      <span
                        className="text-xs font-bold px-1 rounded"
                        style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)', color: colors.purple }}
                      >
                        RIR {set.rir_actual === -1 ? 'F' : set.rir_actual}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-secondary mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>
        {value}
      </div>
    </Card>
  )
}

export default ExerciseProgress
