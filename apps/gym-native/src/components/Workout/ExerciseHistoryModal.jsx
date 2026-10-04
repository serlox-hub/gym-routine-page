import { useState, useMemo, useRef, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronDown, FileText, Video } from 'lucide-react-native'
import { useExerciseHistory, useExerciseHistorySummary, useExerciseChartData } from '../../hooks/useWorkout'
import { ExerciseName, IconButton, LoadingSpinner, Modal } from '../ui'
import SetNotesView from './SetNotesView'
import GymSelector from './GymSelector'
import { colors, design } from '../../lib/styles'
import {
  DEFAULT_TRACKED_FIELDS,
  getExerciseStatCards,
  calculateExerciseStats,
  formatSetValue,
  formatShortDate,
  formatEffortBadge,
  useSelectedGym,
  useResolvedWeightUnit,
  useExerciseUnitsByGym,
  usePreference,
  convertSessionsToDisplayUnit,
} from '@gym/shared'
import { ExerciseProgressChart } from '../Charts'

// gymFilter: id concreto → un gym, 'all' → overlay de todos los gyms
const ALL_GYMS = 'all'
// Scope toggle: the visible track sits this far inside the 44pt row (44 - 2 * 8 = a 28pt track).
const TOGGLE_TRACK_INSET = 8


function StatCard({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 2 }}>{value}</Text>
    </View>
  )
}

function ProgressTab({ sessions, stats, trackedFields, weightUnit, distanceUnit = 'm', chartRows, overlayGyms, unitByGym }) {
  const { t } = useTranslation()
  if (!sessions || sessions.length === 0) {
    return <Text className="text-secondary text-center py-8">{t('exercise:noHistory')}</Text>
  }

  const statCards = getExerciseStatCards(stats, trackedFields, { weightUnit, distanceUnit })

  // En modo gym-aware el gráfico se dibuja desde chartRows (filas de stats por gym)
  const usesChartRows = Array.isArray(chartRows)
  const chartSource = usesChartRows ? (chartRows?.length ?? 0) : sessions.length

  return (
    <View style={{ gap: 16 }}>
      {chartSource >= 2 ? (
        <ExerciseProgressChart
          sessions={sessions}
          trackedFields={trackedFields}
          weightUnit={weightUnit}
          distanceUnit={distanceUnit}
          chartRows={chartRows}
          overlayGyms={overlayGyms}
          unitByGym={unitByGym}
        />
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

function HistoryTab({ sessions, trackedFields = DEFAULT_TRACKED_FIELDS, weightUnit, distanceUnit, onSelectSet, onSessionClick }) {
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
              className="active:opacity-70"
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
                    {formatSetValue({ ...set, weight_unit: weightUnit }, { distanceUnit })}
                  </Text>
                  {/* No negative margin: the 44pt boxes make a set with a note or video 44 tall,
                      so two consecutive ones do not overlap in the 6pt gap. */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    {set.notes && (
                      <IconButton icon={FileText} iconSize={14} color={colors.textMuted} label={t('workout:set.notes')} onPress={() => onSelectSet(set)} />
                    )}
                    {set.video_url && (
                      <IconButton icon={Video} iconSize={14} color={colors.textMuted} label={t('workout:set.video')} onPress={() => onSelectSet(set)} />
                    )}
                    {set.rir_actual !== null && set.rir_actual !== undefined && (
                      <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12, minWidth: 16, textAlign: 'center' }}>
                        {formatEffortBadge(set.rir_actual, trackedFields)}
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
  trackedFields = DEFAULT_TRACKED_FIELDS,
  distanceUnit = 'm',
  routineDayId = null,
  onSessionClick,
}) {
  const { t } = useTranslation()
  const [selectedSet, setSelectedSet] = useState(null)
  const [scope, setScope] = useState(routineDayId ? 'day' : 'global')
  const slideAnim = useRef(new Animated.Value(scope === 'day' ? 0 : 1)).current
  const [toggleWidth, setToggleWidth] = useState(0)

  const { gyms, gymId: defaultGymId, hasMultiple } = useSelectedGym()
  // Filtro de gym para las gráficas: id concreto, o ALL_GYMS para overlay
  const [gymFilter, setGymFilter] = useState(defaultGymId)
  const [showGymSelector, setShowGymSelector] = useState(false)

  const isOverlay = gymFilter === ALL_GYMS
  // En overlay ("Todos"), lista+stats+gráfica van cross-gym (gymId=null) y se convierten al
  // vuelo a la unidad de display (la del gym por defecto para el ejercicio). Con un gym
  // concreto, todo se filtra a ese gym. `unitGymId` = destino de la unidad de display.
  const unitGymId = isOverlay ? defaultGymId : gymFilter
  const historyGymId = hasMultiple ? (isOverlay ? null : gymFilter) : null

  // Fetch both scopes in parallel — switch is instant.
  // Summary (sin paginar) → stats sobre TODO el historial; history (paginado) → la lista.
  const { data: daySummary, isLoading: loadingDaySummary } = useExerciseHistorySummary(exerciseId, routineDayId, historyGymId)
  const { data: globalSummary, isLoading: loadingGlobalSummary } = useExerciseHistorySummary(exerciseId, null, historyGymId)
  const { data: dayData, isLoading: loadingDay, fetchNextPage: fetchDayNext, hasNextPage: hasDayNext, isFetchingNextPage: fetchingDayNext } = useExerciseHistory(exerciseId, routineDayId, historyGymId)
  const { data: globalData, isLoading: loadingGlobal, fetchNextPage: fetchGlobalNext, hasNextPage: hasGlobalNext, isFetchingNextPage: fetchingGlobalNext } = useExerciseHistory(exerciseId, null, historyGymId)

  const isDay = scope === 'day'
  const chartDayId = isDay ? routineDayId : null

  // Chart data por gym: cuando hay overlay usamos todas las filas (gymId=null)
  const chartGymId = hasMultiple ? (isOverlay ? null : gymFilter) : null
  const { data: chartRows, isLoading: loadingChart } = useExerciseChartData(exerciseId, chartDayId, chartGymId)
  const resolvedWeightUnit = useResolvedWeightUnit(exerciseId, unitGymId)
  const { value: globalWeightUnit } = usePreference('weight_unit')
  const { data: explicitUnitsByGym = {}, isLoading: loadingUnits } = useExerciseUnitsByGym(exerciseId, isOverlay)

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: isDay ? 0 : 1, duration: 200, useNativeDriver: false }).start()
  }, [isDay, slideAnim])
  const data = isDay ? dayData : globalData
  const sessions = useMemo(() => data?.pages.flat() ?? [], [data])
  const summarySessions = isDay ? daySummary : globalSummary
  // En overlay se espera a las unidades por gym: sin ellas la conversión caería al fallback
  // global y mostraría pesos mal convertidos un instante para gyms con unidad explícita.
  const isLoading = (isDay ? (loadingDaySummary || loadingDay) : (loadingGlobalSummary || loadingGlobal)) || (hasMultiple && loadingChart) || (isOverlay && loadingUnits)
  const fetchNextPage = isDay ? fetchDayNext : fetchGlobalNext
  const hasNextPage = isDay ? hasDayNext : hasGlobalNext
  const isFetchingNextPage = isDay ? fetchingDayNext : fetchingGlobalNext

  const gymFilterLabel = useMemo(() => {
    if (isOverlay) return t('common:gym.allGyms')
    const g = gyms.find(gym => String(gym.id) === String(gymFilter))
    if (!g) return t('common:gym.allGyms')
    return g.is_default && !g.name ? t('common:gym.defaultName') : g.name
  }, [isOverlay, gyms, gymFilter, t])

  // Gyms con nombre resuelto para las leyendas del overlay
  const overlayGyms = useMemo(
    () => gyms.map(g => ({ id: g.id, name: g.is_default && !g.name ? t('common:gym.defaultName') : g.name })),
    [gyms, t]
  )

  // Unidad de cada gym para convertir sus series a la unidad de display en el overlay.
  const unitByGym = useMemo(() => {
    const m = {}
    for (const g of overlayGyms) m[g.id] = explicitUnitsByGym[g.id] || globalWeightUnit || 'kg'
    return m
  }, [overlayGyms, explicitUnitsByGym, globalWeightUnit])

  // Unidad de display. En overlay se toma del mapa por gym (gateado por loadingUnits) en vez de
  // useResolvedWeightUnit (query aparte, sin gatear), para no convertir/etiquetar con la unidad
  // equivocada un instante. Coincide con la resuelta una vez cargado (mismo origen; ver gotcha
  // de coherencia en DECISIONS).
  const weightUnit = isOverlay ? (unitByGym[defaultGymId] || resolvedWeightUnit) : resolvedWeightUnit

  // En overlay, las series vienen de varios gyms (unidades mezcladas): se convierten a la
  // unidad de display antes de stats/tabla. Con un gym concreto no hay nada que convertir.
  // summary → stats (todo el historial); sessions (paginado) → lista.
  const displaySummary = useMemo(
    () => (isOverlay ? convertSessionsToDisplayUnit(summarySessions, unitByGym, weightUnit) : summarySessions),
    [isOverlay, summarySessions, unitByGym, weightUnit]
  )
  const displaySessions = useMemo(
    () => (isOverlay ? convertSessionsToDisplayUnit(sessions, unitByGym, weightUnit) : sessions),
    [isOverlay, sessions, unitByGym, weightUnit]
  )
  const stats = useMemo(
    () => calculateExerciseStats(displaySummary, trackedFields),
    [displaySummary, trackedFields]
  )

  const handleSessionClick = (sessionId, date) => {
    onClose()
    onSessionClick?.(sessionId, date)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      {/* Header */}
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View className="flex-row items-center gap-2">
          <ExerciseName fontSize={16} fontWeight="700" className="flex-1">{exerciseName}</ExerciseName>
          {routineDayId && (
            // The Pressables are the 44pt boxes; the track and the sliding pill are painted behind
            // them at their old size (TOGGLE_TRACK_INSET above and below).
            <View
              style={{ flexDirection: 'row', paddingHorizontal: 2 }}
              onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
            >
              <View style={{ position: 'absolute', left: 0, right: 0, top: TOGGLE_TRACK_INSET, bottom: TOGGLE_TRACK_INSET, borderRadius: 20, backgroundColor: colors.bgTertiary }} />
              {toggleWidth > 0 && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: TOGGLE_TRACK_INSET + 2, bottom: TOGGLE_TRACK_INSET + 2,
                    width: (toggleWidth - 4) / 2,
                    borderRadius: 18,
                    backgroundColor: colors.success,
                    left: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [2, (toggleWidth - 4) / 2 + 2] }),
                  }}
                />
              )}
              <Pressable
                onPress={() => setScope('day')}
                style={{ minHeight: design.minTouchTarget, justifyContent: 'center', paddingHorizontal: 12, zIndex: 1 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDay ? colors.bgPrimary : colors.textSecondary }}>
                  {t('exercise:scopeRoutine')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setScope('global')}
                style={{ minHeight: design.minTouchTarget, justifyContent: 'center', paddingHorizontal: 12, zIndex: 1 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: !isDay ? colors.bgPrimary : colors.textSecondary }}>
                  {t('exercise:scopeGlobal')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* The Pressables are the 44pt boxes, the pills inside keep their size. marginTop 4, not
            12: the box adds ~10 above the pill. */}
        {hasMultiple && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Pressable
              onPress={() => setShowGymSelector(true)}
              accessibilityRole="button"
              className="active:opacity-80"
              style={{ minHeight: design.minTouchTarget, justifyContent: 'center' }}
            >
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 10, paddingVertical: 4,
                  borderRadius: 999, backgroundColor: colors.bgTertiary,
                  borderWidth: 1, borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{gymFilterLabel}</Text>
                <ChevronDown size={13} color={colors.textMuted} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => setGymFilter(isOverlay ? defaultGymId : ALL_GYMS)}
              accessibilityRole="button"
              className="active:opacity-80"
              style={{ minHeight: design.minTouchTarget, justifyContent: 'center' }}
            >
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 10, paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: isOverlay ? `${colors.success}20` : colors.bgTertiary,
                  borderWidth: 1, borderColor: isOverlay ? colors.success : colors.border,
                }}
              >
                <Text style={{ color: isOverlay ? colors.success : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  {t('common:gym.compareGyms')}
                </Text>
              </View>
            </Pressable>
          </View>
        )}
      </View>

      {/* Content — single scroll */}
      <ScrollView className="p-4" style={{ maxHeight: 500 }}>
        {isLoading ? (
          <LoadingSpinner fullScreen={false} />
        ) : (
          <View className="gap-4">
            <ProgressTab
              sessions={displaySummary}
              stats={stats}
              trackedFields={trackedFields}
              weightUnit={weightUnit}
              distanceUnit={distanceUnit}
              chartRows={hasMultiple ? chartRows : undefined}
              overlayGyms={isOverlay ? overlayGyms : undefined}
              unitByGym={isOverlay ? unitByGym : undefined}
            />
            <HistoryTab
              sessions={displaySessions}
              trackedFields={trackedFields}
              weightUnit={weightUnit}
              distanceUnit={distanceUnit}
              onSelectSet={setSelectedSet}
              onSessionClick={handleSessionClick}
            />
            {hasNextPage && (
              <Pressable
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="py-2 items-center justify-center rounded-lg"
                style={{ minHeight: design.minTouchTarget, backgroundColor: colors.bgTertiary }}
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
        notes={selectedSet?.notes}
        videoUrl={selectedSet?.video_url}
      />

      <GymSelector
        isOpen={showGymSelector}
        onClose={() => setShowGymSelector(false)}
        selectedGymId={isOverlay ? null : gymFilter}
        onSelect={(id) => setGymFilter(id ?? ALL_GYMS)}
        allowAllGyms
      />
    </Modal>
  )
}
