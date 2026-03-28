import { useState, useMemo } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { ChevronRight, FileText } from 'lucide-react-native'
import { useExerciseHistory } from '../../hooks/useWorkout'
import { LoadingSpinner, Card, Modal } from '../ui'
import SetNotesView from './SetNotesView'
import { colors } from '../../lib/styles'
import {
  MeasurementType,
  calculateExerciseStats,
  formatSetValue,
  formatShortDate
} from '@gym/shared'
import { ExerciseProgressChart } from '../Charts'

const RIR_LABELS = { [-1]: 'F', 0: '0', 1: '1', 2: '2', 3: '3+' }

function StatCard({ label, value, color }) {
  return (
    <View className="flex-1" style={{ minWidth: '45%' }}>
      <Card className="p-2">
        <Text className="text-xs text-secondary">{label}</Text>
        <Text className="text-base font-bold" style={{ color }}>{value}</Text>
      </Card>
    </View>
  )
}

function ProgressTab({ sessions, stats, measurementType, weightUnit }) {
  if (!sessions || sessions.length === 0) {
    return <Text className="text-secondary text-center py-8">Sin registros anteriores</Text>
  }

  return (
    <View className="gap-4">
      {stats && (
        <View className="flex-row flex-wrap gap-2">
          {stats.best1RM > 0 && (
            <StatCard label="Mejor 1RM Est." value={`${stats.best1RM} ${weightUnit}`} color={colors.purple} />
          )}
          {stats.maxWeight > 0 && (
            <StatCard label="Peso máximo" value={`${stats.maxWeight} ${weightUnit}`} color={colors.accent} />
          )}
          {stats.maxReps > 0 && (
            <StatCard label="Máx. repeticiones" value={stats.maxReps} color={colors.success} />
          )}
          {stats.totalVolume > 0 && (
            <StatCard label="Volumen total" value={`${stats.totalVolume.toLocaleString()} ${weightUnit}`} color={colors.warning} />
          )}
          <StatCard label="Sesiones" value={stats.sessionCount} color={colors.textSecondary} />
        </View>
      )}

      {sessions.length >= 2 ? (
        <ExerciseProgressChart sessions={sessions} measurementType={measurementType} />
      ) : (
        <Text className="text-secondary text-center py-4 text-sm">
          Necesitas al menos 2 sesiones para ver la gráfica
        </Text>
      )}
    </View>
  )
}

function HistoryTab({ sessions, timeUnit, distanceUnit, onSelectSet, onSessionClick }) {
  if (!sessions || sessions.length === 0) {
    return <Text className="text-secondary text-center py-8">Sin registros anteriores</Text>
  }

  return (
    <View className="gap-3">
      {sessions.map(session => (
        <Pressable
          key={session.sessionId}
          onPress={() => onSessionClick(session.sessionId)}
          className="p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs text-secondary">{formatShortDate(session.date)}</Text>
            <ChevronRight size={14} color={colors.textSecondary} />
          </View>
          <View className="gap-1">
            {session.sets.map(set => (
              <View key={set.id} className="flex-row items-center gap-2">
                <View
                  className="w-5 h-5 rounded items-center justify-center"
                  style={{ backgroundColor: set.set_type === 'dropset' ? colors.dropsetBg : colors.border }}
                >
                  <Text className="text-xs font-bold" style={{ color: set.set_type === 'dropset' ? colors.dropset : colors.textSecondary }}>{set.set_type === 'dropset' ? 'D' : set.set_number}</Text>
                </View>
                <Text className="flex-1 text-sm text-primary">
                  {formatSetValue(set, { timeUnit, distanceUnit })}
                </Text>
                {(set.rir_actual !== null || set.notes) && (
                  <Pressable
                    onPress={() => {
                      if (set.notes) onSelectSet(set)
                    }}
                    className="flex-row items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)' }}
                  >
                    {set.rir_actual !== null && (
                      <Text className="text-xs font-bold" style={{ color: colors.purple }}>
                        {RIR_LABELS[set.rir_actual] ?? set.rir_actual}
                      </Text>
                    )}
                    {set.notes && <FileText size={12} color={colors.purple} />}
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

export default function ExerciseHistoryModal({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  measurementType = MeasurementType.WEIGHT_REPS,
  weightUnit = 'kg',
  timeUnit = 's',
  distanceUnit = 'm',
  routineDayId = null,
  onSessionClick,
}) {
  const [selectedSet, setSelectedSet] = useState(null)
  const [activeTab, setActiveTab] = useState('progress')
  const [scope, setScope] = useState(routineDayId ? 'day' : 'global')

  const filterByDayId = scope === 'day' ? routineDayId : null
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useExerciseHistory(exerciseId, filterByDayId)
  const sessions = useMemo(() => data?.pages.flat() ?? [], [data])

  const stats = useMemo(() => {
    return calculateExerciseStats(sessions, measurementType)
  }, [sessions, measurementType])

  const handleSessionClick = (sessionId) => {
    onClose()
    onSessionClick?.(sessionId)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      {/* Header */}
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View className="flex-row items-center gap-2 mb-3">
          <Text className="font-bold text-primary flex-1" numberOfLines={1}>{exerciseName}</Text>
          {routineDayId && (
            <View className="flex-row rounded-full p-0.5" style={{ backgroundColor: colors.bgTertiary }}>
              <Pressable
                onPress={() => setScope('day')}
                className="px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: scope === 'day' ? 'rgba(63, 185, 80, 0.2)' : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: scope === 'day' ? colors.success : colors.textSecondary }}
                >
                  Rutina
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setScope('global')}
                className="px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: scope === 'global' ? 'rgba(139, 148, 158, 0.2)' : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: scope === 'global' ? colors.textPrimary : colors.textSecondary }}
                >
                  Global
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View className="flex-row p-1 rounded-lg" style={{ backgroundColor: colors.bgTertiary }}>
          <Pressable
            onPress={() => setActiveTab('progress')}
            className="flex-1 py-2 rounded-md items-center"
            style={{ backgroundColor: activeTab === 'progress' ? colors.bgSecondary : 'transparent' }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: activeTab === 'progress' ? colors.purple : colors.textSecondary }}
            >
              Progresión
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('history')}
            className="flex-1 py-2 rounded-md items-center"
            style={{ backgroundColor: activeTab === 'history' ? colors.bgSecondary : 'transparent' }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: activeTab === 'history' ? colors.accent : colors.textSecondary }}
            >
              Historial
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="p-4" style={{ maxHeight: 400 }}>
        {isLoading ? (
          <LoadingSpinner fullScreen={false} />
        ) : activeTab === 'progress' ? (
          <ProgressTab
            sessions={sessions}
            stats={stats}
            measurementType={measurementType}
            weightUnit={weightUnit}
          />
        ) : (
          <View>
            <HistoryTab
              sessions={sessions}
              timeUnit={timeUnit}
              distanceUnit={distanceUnit}
              onSelectSet={setSelectedSet}
              onSessionClick={handleSessionClick}
            />
            {hasNextPage && (
              <Pressable
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mt-3 py-2 items-center rounded-lg"
                style={{ backgroundColor: colors.bgTertiary }}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Text className="text-sm text-secondary">Cargar más</Text>
                )}
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        rir={selectedSet?.rir_actual}
        notes={selectedSet?.notes}
      />
    </Modal>
  )
}
