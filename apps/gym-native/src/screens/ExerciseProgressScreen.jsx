import { View, Text, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useExercise } from '../hooks/useExercises'
import { useExerciseHistory, useExerciseChartData, useExerciseAllTimeStats } from '../hooks/useWorkout'
import { LoadingSpinner, ErrorMessage, Card, PageHeader } from '../components/ui'
import {
  MeasurementType,
  formatSetValue,
  formatShortDate,
  getExerciseName
} from '@gym/shared'
import { colors } from '../lib/styles'
import { ExerciseProgressChart } from '../components/Charts'

function StatCard({ label, value, color }) {
  return (
    <View className="flex-1" style={{ minWidth: '45%' }}>
      <Card className="p-3">
        <Text className="text-xs text-secondary mb-1">{label}</Text>
        <Text className="text-lg font-bold" style={{ color }}>{value}</Text>
      </Card>
    </View>
  )
}

function SessionCard({ session }) {
  return (
    <Card className="p-4 mx-4">
      <Text className="text-xs text-secondary mb-2">
        {formatShortDate(session.date)}
      </Text>
      <View className="gap-1">
        {session.sets.map(set => (
          <View key={set.id} className="flex-row items-center gap-2">
            <View
              className="w-5 h-5 rounded items-center justify-center"
              style={{ backgroundColor: colors.border }}
            >
              <Text className="text-xs font-bold text-secondary">{set.set_number}</Text>
            </View>
            <Text className="flex-1 text-sm text-primary">
              {formatSetValue(set)}
            </Text>
            {set.rir_actual !== null && (
              <View
                className="px-1 rounded"
                style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)' }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.purple }}>
                  RIR {set.rir_actual === -1 ? 'F' : set.rir_actual}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </Card>
  )
}

export default function ExerciseProgressScreen({ route, navigation }) {
  const { t } = useTranslation()
  const { exerciseId, exerciseName } = route.params
  const { data: exercise, isLoading: loadingExercise, error: exerciseError } = useExercise(exerciseId)
  const { isLoading: loadingChart } = useExerciseChartData(exerciseId)
  const { data: stats, isLoading: loadingStats } = useExerciseAllTimeStats(exerciseId)
  const { data: historyData, isLoading: loadingHistory } = useExerciseHistory(exerciseId)
  const sessions = historyData?.pages.flat() ?? []
  const loadingSessions = loadingChart || loadingStats || loadingHistory

  if (loadingExercise || loadingSessions) return <LoadingSpinner />
  if (exerciseError) return <ErrorMessage message={exerciseError.message} className="m-4" />
  if (!exercise) return <ErrorMessage message={t('exercise:notFound')} className="m-4" />

  const measurementType = exercise.measurement_type || MeasurementType.WEIGHT_REPS
  const weightUnit = exercise.weight_unit || 'kg'

  const ListHeader = () => (
    <View className="px-4">
      {/* Stats */}
      {stats && (
        <View className="flex-row flex-wrap gap-3 mb-4">
          {stats.best1rm > 0 && (
            <StatCard label={t('workout:summary.best1RM')} value={`${stats.best1rm} ${weightUnit}`} color={colors.purple} />
          )}
          {stats.maxWeight > 0 && (
            <StatCard label={t('workout:summary.maxWeight')} value={`${stats.maxWeight} ${weightUnit}`} color={colors.accent} />
          )}
          {stats.maxReps > 0 && (
            <StatCard label={t('workout:summary.maxReps')} value={stats.maxReps} color={colors.success} />
          )}
          {stats.totalVolume > 0 && (
            <StatCard label={t('workout:summary.totalVolume')} value={`${stats.totalVolume.toLocaleString()} ${weightUnit}`} color={colors.warning} />
          )}
          <StatCard label={t('workout:summary.sessions')} value={stats.sessionCount} color={colors.textSecondary} />
        </View>
      )}

      {sessions && sessions.length >= 2 ? (
        <Card className="p-4 mb-4">
          <ExerciseProgressChart sessions={sessions} measurementType={measurementType} />
        </Card>
      ) : (
        <Card className="p-4 mb-4">
          <Text className="text-secondary text-center py-4 text-sm">
            {t('exercise:progressMinSessions')}
          </Text>
        </Card>
      )}

      <Text className="text-lg font-bold text-primary mb-3">{t('workout:history.title')}</Text>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title={exerciseName || getExerciseName(exercise)} onBack={() => navigation.goBack()} />

      <FlatList
        data={sessions || []}
        keyExtractor={(item) => String(item.sessionId)}
        renderItem={({ item }) => <SessionCard session={item} />}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text className="text-secondary text-center py-8">{t('exercise:noHistory')}</Text>
        }
      />
    </SafeAreaView>
  )
}
