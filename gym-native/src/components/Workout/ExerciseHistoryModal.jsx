import { useState, useMemo } from 'react'
import { View, Text, FlatList, Pressable, ScrollView } from 'react-native'
import { ChevronRight, FileText } from 'lucide-react-native'
import { useExerciseHistory } from '../../hooks/useWorkout'
import { LoadingSpinner, Card, Modal } from '../ui'
import { SetNotesView } from '../Workout'
import { colors } from '../../lib/styles'
import { formatShortDate } from '../../lib/dateUtils'
import { formatSetValue } from '../../lib/setUtils'
import { calculateExerciseStats } from '../../lib/workoutCalculations'
import { MeasurementType } from '../../lib/measurementTypes'

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
        <Card className="p-4">
          <Text className="text-secondary text-center py-4 text-sm">
            Gráfica de progresión disponible próximamente
          </Text>
        </Card>
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
                  style={{ backgroundColor: colors.border }}
                >
                  <Text className="text-xs font-bold text-secondary">{set.set_number}</Text>
                </View>
                <Text className="flex-1 text-sm text-primary">
                  {formatSetValue(set, { timeUnit, distanceUnit })}
                </Text>
                {(set.rir_actual !== null || set.notes) && (
                  <Pressable
                    onPress={(e) => {
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
  const { data: sessions, isLoading } = useExerciseHistory(exerciseId, filterByDayId)

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
        <Text className="font-bold text-primary mb-3">{exerciseName}</Text>

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

        {/* Scope selector */}
        {routineDayId && (
          <View className="flex-row gap-2 mt-2">
            <Pressable
              onPress={() => setScope('day')}
              className="px-3 py-1 rounded"
              style={{
                backgroundColor: scope === 'day' ? 'rgba(63, 185, 80, 0.15)' : colors.bgTertiary,
              }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: scope === 'day' ? colors.success : colors.textSecondary }}
              >
                Esta rutina
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setScope('global')}
              className="px-3 py-1 rounded"
              style={{
                backgroundColor: scope === 'global' ? 'rgba(139, 148, 158, 0.15)' : colors.bgTertiary,
              }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: scope === 'global' ? colors.textPrimary : colors.textSecondary }}
              >
                Todas
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView className="p-4" style={{ maxHeight: 400 }}>
        {isLoading ? (
          <LoadingSpinner />
        ) : activeTab === 'progress' ? (
          <ProgressTab
            sessions={sessions}
            stats={stats}
            measurementType={measurementType}
            weightUnit={weightUnit}
          />
        ) : (
          <HistoryTab
            sessions={sessions}
            timeUnit={timeUnit}
            distanceUnit={distanceUnit}
            onSelectSet={setSelectedSet}
            onSessionClick={handleSessionClick}
          />
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
