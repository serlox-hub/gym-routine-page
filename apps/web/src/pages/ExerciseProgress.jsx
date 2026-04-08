import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useExercise } from '../hooks/useExercises.js'
import { useExerciseHistory, useExerciseChartData, useExerciseAllTimeStats } from '../hooks/useWorkout.js'
import { LoadingSpinner, ErrorMessage, Card, PageHeader } from '../components/ui/index.js'
import ExerciseProgressChart from '../components/Workout/ExerciseProgressChart.jsx'
import {
  MeasurementType,
  formatSetValue,
  formatShortDate,
  getExerciseName
} from '@gym/shared'
import { colors } from '../lib/styles.js'

function getBestFromRow(row, measurementType, weightUnit = 'kg') {
  switch (measurementType) {
    case MeasurementType.WEIGHT_REPS:
    case MeasurementType.WEIGHT_TIME:
    case MeasurementType.WEIGHT_DISTANCE:
      return { value: row.best_weight || 0, unit: weightUnit }
    case MeasurementType.REPS_ONLY:
      return { value: row.best_reps || 0, unit: 'reps' }
    case MeasurementType.TIME:
    case MeasurementType.LEVEL_TIME:
      return { value: row.best_time_seconds || 0, unit: 's' }
    case MeasurementType.DISTANCE:
    case MeasurementType.LEVEL_DISTANCE:
    case MeasurementType.DISTANCE_TIME:
    case MeasurementType.DISTANCE_PACE:
      return { value: row.best_distance_meters || 0, unit: 'm' }
    default:
      return { value: row.best_weight || row.best_reps || 0, unit: '' }
  }
}

function transformChartDataFromStats(data, measurementType, weightUnit = 'kg') {
  if (!data || data.length === 0) return []
  return data.map(row => {
    const date = new Date(row.session_date)
    const dateLabel = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    const { value: best, unit } = getBestFromRow(row, measurementType, weightUnit)
    return {
      date: dateLabel,
      best,
      volume: Math.round(row.total_volume || 0),
      e1rm: row.best_1rm || 0,
      unit,
      isPR: row.is_pr_weight || row.is_pr_1rm || row.is_pr_reps || row.is_pr_volume,
    }
  })
}

function ExerciseProgress() {
  const { exerciseId } = useParams()
  const { t } = useTranslation()
  const { data: exercise, isLoading: loadingExercise, error: exerciseError } = useExercise(exerciseId)
  const { data: chartRawData, isLoading: loadingChart } = useExerciseChartData(exerciseId)
  const { data: stats, isLoading: loadingStats } = useExerciseAllTimeStats(exerciseId)
  const { data: historyData, isLoading: loadingHistory, fetchNextPage, hasNextPage, isFetchingNextPage } = useExerciseHistory(exerciseId)
  const historySessions = historyData?.pages.flat() ?? []
  const loadingSessions = loadingChart || loadingStats || loadingHistory

  const measurementType = exercise?.measurement_type || MeasurementType.WEIGHT_REPS
  const weightUnit = exercise?.weight_unit || 'kg'
  const chartData = useMemo(
    () => transformChartDataFromStats(chartRawData, measurementType, weightUnit),
    [chartRawData, measurementType, weightUnit]
  )

  if (loadingExercise || loadingSessions) return <LoadingSpinner />
  if (exerciseError) return <ErrorMessage message={exerciseError.message} className="m-4" />
  if (!exercise) return <ErrorMessage message={t('common:errors.notFound')} className="m-4" />

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <PageHeader title={getExerciseName(exercise)} onBack={() => history.back()} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.best1rm > 0 && (
            <StatCard
              label={t('workout:summary.best1rm')}
              value={`${stats.best1rm.toLocaleString()} ${exercise.weight_unit || 'kg'}`}
              color={colors.purple}
            />
          )}
          {stats.maxWeight > 0 && (
            <StatCard
              label={t('workout:summary.maxWeight')}
              value={`${stats.maxWeight.toLocaleString()} ${exercise.weight_unit || 'kg'}`}
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
              value={`${stats.totalVolume.toLocaleString()} ${exercise.weight_unit || 'kg'}`}
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
      {chartData.length >= 2 ? (
        <Card className="p-4 mb-6">
          <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
            {t('exercise:progression')}
          </h2>
          <ExerciseProgressChart chartData={chartData} measurementType={measurementType} />
        </Card>
      ) : (
        <Card className="p-4 mb-6">
          <p className="text-center text-secondary py-4">
            {t('exercise:needMoreSessions')}
          </p>
        </Card>
      )}

      {/* History */}
      <h2 className="text-lg font-bold mb-3">{t('body:weight.history')}</h2>
      {historySessions.length === 0 ? (
        <p className="text-center text-secondary py-8">
          {t('workout:history.noSessions')}
        </p>
      ) : (
        <div className="space-y-3">
          {historySessions.map(session => (
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

          {hasNextPage && (
            <button
              onClick={fetchNextPage}
              disabled={isFetchingNextPage}
              className="w-full py-3 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: colors.bgTertiary, color: colors.accent }}
            >
              {isFetchingNextPage ? t('common:buttons.loading') : t('common:buttons.seeMore')}
            </button>
          )}
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
