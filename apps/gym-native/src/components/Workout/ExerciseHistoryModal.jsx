import { useState, useMemo, useRef, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronRight, FileText, Video } from 'lucide-react-native'
import { useExerciseHistory } from '../../hooks/useWorkout'
import { LoadingSpinner, Modal } from '../ui'
import SetNotesView from './SetNotesView'
import { colors } from '../../lib/styles'
import {
  MeasurementType,
  measurementTypeUsesTime,
  measurementTypeUsesDistance,
  calculateExerciseStats,
  formatSetValue,
  formatShortDate,
  formatSecondsToMMSS,
} from '@gym/shared'
import { ExerciseProgressChart } from '../Charts'


function StatCard({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 2 }}>{value}</Text>
    </View>
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

function ProgressTab({ sessions, stats, measurementType, weightUnit, distanceUnit = 'm' }) {
  const { t } = useTranslation()
  if (!sessions || sessions.length === 0) {
    return <Text className="text-secondary text-center py-8">{t('exercise:noHistory')}</Text>
  }

  const statCards = getStatCards(stats, measurementType, weightUnit, distanceUnit, t)

  return (
    <View style={{ gap: 16 }}>
      {sessions.length >= 2 ? (
        <ExerciseProgressChart sessions={sessions} measurementType={measurementType} weightUnit={weightUnit} />
      ) : (
        <Text className="text-secondary text-center py-4 text-sm">
          {t('exercise:progressMinSessions')}
        </Text>
      )}

      {statCards.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {statCards.map(card => (
            <StatCard key={card.label} label={card.label} value={card.value} />
          ))}
        </View>
      )}
    </View>
  )
}

function HistoryTab({ sessions, weightUnit, timeUnit, distanceUnit, onSelectSet, onSessionClick }) {
  const { t } = useTranslation()
  if (!sessions || sessions.length === 0) {
    return <Text className="text-secondary text-center py-8">{t('exercise:noHistory')}</Text>
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
        {t('workout:history.recentSessions')}
      </Text>

      {sessions.map(session => {
        const volume = session.sets.reduce((sum, s) => sum + ((s.weight || 0) * (s.reps_completed || 0)), 0)
        return (
          <View
            key={session.sessionId}
            style={{
              backgroundColor: colors.bgTertiary,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            {/* Session header — clickable to navigate */}
            <Pressable
              onPress={() => onSessionClick(session.sessionId, session.date)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>
                {formatShortDate(session.date)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {volume > 0 && (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {volume.toLocaleString()} {weightUnit}
                  </Text>
                )}
                <ChevronRight size={16} color={colors.textSecondary} />
              </View>
            </Pressable>

            {/* Sets */}
            <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 6 }}>
              {session.sets.map(set => (
                <View key={set.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12, width: 14, textAlign: 'right' }}>
                    {set.set_number}
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, flex: 1 }}>
                    {formatSetValue({ ...set, weight_unit: weightUnit }, { timeUnit, distanceUnit })}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {set.notes && (
                      <Pressable onPress={() => onSelectSet(set)}>
                        <FileText size={14} color={colors.textMuted} />
                      </Pressable>
                    )}
                    {set.video_url && (
                      <Pressable onPress={() => onSelectSet(set)}>
                        <Video size={14} color={colors.textMuted} />
                      </Pressable>
                    )}
                    {set.rir_actual !== null && set.rir_actual !== undefined && (
                      <Text style={{ color: colors.textMuted, fontSize: 12, minWidth: 16, textAlign: 'right' }}>
                        {set.rir_actual}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )
      })}
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
  const { t } = useTranslation()
  const [selectedSet, setSelectedSet] = useState(null)
  const [scope, setScope] = useState(routineDayId ? 'day' : 'global')
  const slideAnim = useRef(new Animated.Value(scope === 'day' ? 0 : 1)).current
  const [toggleWidth, setToggleWidth] = useState(0)

  // Fetch both scopes in parallel — switch is instant
  const { data: dayData, isLoading: loadingDay, fetchNextPage: fetchDayNext, hasNextPage: hasDayNext, isFetchingNextPage: fetchingDayNext } = useExerciseHistory(exerciseId, routineDayId)
  const { data: globalData, isLoading: loadingGlobal, fetchNextPage: fetchGlobalNext, hasNextPage: hasGlobalNext, isFetchingNextPage: fetchingGlobalNext } = useExerciseHistory(exerciseId, null)

  const isDay = scope === 'day'

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: isDay ? 0 : 1, duration: 200, useNativeDriver: false }).start()
  }, [isDay, slideAnim])
  const data = isDay ? dayData : globalData
  const sessions = useMemo(() => data?.pages.flat() ?? [], [data])
  const isLoading = isDay ? loadingDay : loadingGlobal
  const fetchNextPage = isDay ? fetchDayNext : fetchGlobalNext
  const hasNextPage = isDay ? hasDayNext : hasGlobalNext
  const isFetchingNextPage = isDay ? fetchingDayNext : fetchingGlobalNext

  const stats = useMemo(() => {
    return calculateExerciseStats(sessions, measurementType)
  }, [sessions, measurementType])

  const handleSessionClick = (sessionId, date) => {
    onClose()
    onSessionClick?.(sessionId, date)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      {/* Header */}
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View className="flex-row items-center gap-2">
          <Text className="font-bold text-primary flex-1" numberOfLines={1}>{exerciseName}</Text>
          {routineDayId && (
            <View
              style={{ flexDirection: 'row', borderRadius: 20, padding: 2, backgroundColor: colors.bgTertiary }}
              onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
            >
              {toggleWidth > 0 && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 2, bottom: 2,
                    width: (toggleWidth - 4) / 2,
                    borderRadius: 18,
                    backgroundColor: colors.success,
                    left: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [2, (toggleWidth - 4) / 2 + 2] }),
                  }}
                />
              )}
              <Pressable
                onPress={() => setScope('day')}
                style={{ paddingHorizontal: 12, paddingVertical: 5, zIndex: 1 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDay ? colors.bgPrimary : colors.textSecondary }}>
                  {t('exercise:scopeRoutine')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setScope('global')}
                style={{ paddingHorizontal: 12, paddingVertical: 5, zIndex: 1 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: !isDay ? colors.bgPrimary : colors.textSecondary }}>
                  {t('exercise:scopeGlobal')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Content — single scroll */}
      <ScrollView className="p-4" style={{ maxHeight: 500 }}>
        {isLoading ? (
          <LoadingSpinner fullScreen={false} />
        ) : (
          <View className="gap-4">
            <ProgressTab
              sessions={sessions}
              stats={stats}
              measurementType={measurementType}
              weightUnit={weightUnit}
            />
            <HistoryTab
              sessions={sessions}
              weightUnit={weightUnit}
              timeUnit={timeUnit}
              distanceUnit={distanceUnit}
              onSelectSet={setSelectedSet}
              onSessionClick={handleSessionClick}
            />
            {hasNextPage && (
              <Pressable
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="py-2 items-center rounded-lg"
                style={{ backgroundColor: colors.bgTertiary }}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Text className="text-sm text-secondary">{t('common:buttons.seeMore')}</Text>
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
        videoUrl={selectedSet?.video_url}
      />
    </Modal>
  )
}
