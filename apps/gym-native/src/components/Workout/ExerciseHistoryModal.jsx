import { useState, useMemo } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronDown, FileText, Video } from 'lucide-react-native'
import { useExerciseHistorySummary, useExerciseChartData, useExerciseHistoryFilter } from '../../hooks/useWorkout'
import { ExerciseName, IconButton, LoadingSpinner, Modal } from '../ui'
import SetNotesView from './SetNotesView'
import GymSelector from './GymSelector'
import HistoryFilterSelector from './HistoryFilterSelector'
import { colors, design } from '../../lib/styles'
import {
  DEFAULT_TRACKED_FIELDS,
  EXERCISE_HISTORY_PAGE_SIZE,
  ROUTINE_MEMBERSHIP,
  getRoutineMembershipBadgeKey,
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

// The same day stands out; another day of the routine only says so.
const BADGE_STYLES = {
  [ROUTINE_MEMBERSHIP.DAY]: { color: colors.teal, borderColor: colors.teal },
  [ROUTINE_MEMBERSHIP.ROUTINE]: { color: colors.textSecondary, borderColor: colors.border },
}

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

// `sessions` arrive already filtered; "See more" reveals them from memory. The modal remounts it
// (key) when its filters change, so the list starts again at one page.
// `membershipOf(session)` gives a ROUTINE_MEMBERSHIP value for its mark, or null for none.
function HistoryTab({ sessions, trackedFields = DEFAULT_TRACKED_FIELDS, weightUnit, distanceUnit, onSelectSet, onSessionClick, membershipOf }) {
  const { t } = useTranslation()
  const [visibleCount, setVisibleCount] = useState(EXERCISE_HISTORY_PAGE_SIZE)
  if (!sessions || sessions.length === 0) {
    return <Text className="text-secondary text-center py-8">{t('exercise:noHistory')}</Text>
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
        {t('workout:history.recentSessions')}
      </Text>

      {sessions.slice(0, visibleCount).map(session => {
        const volume = session.sets.reduce((sum, s) => sum + ((s.weight || 0) * (s.reps_completed || 0)), 0)
        const membership = membershipOf?.(session) ?? null
        const badgeKey = getRoutineMembershipBadgeKey(membership)
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
              style={{ minHeight: design.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>
                  {formatShortDate(session.date)}
                </Text>
                {badgeKey && (
                  <View style={{ borderWidth: 1, borderColor: BADGE_STYLES[membership].borderColor, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text numberOfLines={1} style={{ color: BADGE_STYLES[membership].color, fontSize: 11, fontWeight: '600' }}>
                      {t(badgeKey)}
                    </Text>
                  </View>
                )}
              </View>
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
            <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
              {session.sets.map(set => (
                // As tall as the note and video buttons, so a set without them is as tall as one with them.
                <View key={set.id} style={{ minHeight: design.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12, width: 14, textAlign: 'right' }}>
                    {set.set_number}
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, flex: 1 }}>
                    {formatSetValue({ ...set, weight_unit: weightUnit }, { distanceUnit })}
                  </Text>
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

      {sessions.length > visibleCount && (
        <Pressable
          onPress={() => setVisibleCount(count => count + EXERCISE_HISTORY_PAGE_SIZE)}
          className="py-2 items-center justify-center rounded-lg active:opacity-80"
          style={{ minHeight: design.minTouchTarget, backgroundColor: colors.bgTertiary }}
        >
          <Text style={{ color: colors.success, fontSize: 14, fontWeight: '500' }}>{t('common:buttons.seeMore')}</Text>
        </Pressable>
      )}
    </View>
  )
}

// Opened from a routine day (`routineDayId`), every session is listed and marked against that day
// and its routine (`routineId`), with a filter. The callers that pass a day mount it only while
// open, so each opening starts on "All" with one page.
export default function ExerciseHistoryModal({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  trackedFields = DEFAULT_TRACKED_FIELDS,
  distanceUnit = 'm',
  routineDayId = null,
  routineId = null,
  onSessionClick,
}) {
  const { t } = useTranslation()
  const [selectedSet, setSelectedSet] = useState(null)

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

  // Every session of the exercise in one download, with no day filter: list, records and chart
  // are filtered by routine day in memory, so switching the filter sends no request.
  const { data: summary, isLoading: loadingSummary } = useExerciseHistorySummary(exerciseId, null, historyGymId)

  // Chart data por gym: cuando hay overlay usamos todas las filas (gymId=null)
  const chartGymId = hasMultiple ? (isOverlay ? null : gymFilter) : null
  const { data: allChartRows, isLoading: loadingChart } = useExerciseChartData(exerciseId, null, chartGymId)
  const routineFilter = useExerciseHistoryFilter({ routineDayId, routineId, sessions: summary, chartRows: allChartRows })
  const resolvedWeightUnit = useResolvedWeightUnit(exerciseId, unitGymId)
  const { value: globalWeightUnit } = usePreference('weight_unit')
  const { data: explicitUnitsByGym = {}, isLoading: loadingUnits } = useExerciseUnitsByGym(exerciseId, isOverlay)

  // En overlay se espera a las unidades por gym: sin ellas la conversión caería al fallback
  // global y mostraría pesos mal convertidos un instante para gyms con unidad explícita.
  // The routine's days too: without them the marks and the selector would change under the user.
  const isLoading = loadingSummary || routineFilter.isLoading || (hasMultiple && loadingChart) || (isOverlay && loadingUnits)

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
  const displaySessions = useMemo(
    () => (isOverlay ? convertSessionsToDisplayUnit(routineFilter.sessions, unitByGym, weightUnit) : routineFilter.sessions),
    [isOverlay, routineFilter.sessions, unitByGym, weightUnit]
  )
  const stats = useMemo(
    () => calculateExerciseStats(displaySessions, trackedFields),
    [displaySessions, trackedFields]
  )
  const hasFilterSelector = routineFilter.options.length > 0

  const handleSessionClick = (sessionId, date) => {
    onClose()
    onSessionClick?.(sessionId, date)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      {/* Header */}
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ExerciseName fontSize={16} fontWeight="700">{exerciseName}</ExerciseName>
        {hasFilterSelector && (
          <View style={{ marginTop: 4 }}>
            <HistoryFilterSelector options={routineFilter.options} value={routineFilter.filter} onChange={routineFilter.setFilter} />
          </View>
        )}

        {/* The Pressables are the 44pt boxes, the pills inside keep their size. marginTop 4, not
            12: the box adds ~10 above the pill. None under the selector, whose box already leaves 8. */}
        {hasMultiple && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: hasFilterSelector ? 0 : 4 }}>
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
              sessions={displaySessions}
              stats={stats}
              trackedFields={trackedFields}
              weightUnit={weightUnit}
              distanceUnit={distanceUnit}
              chartRows={hasMultiple ? routineFilter.chartRows : undefined}
              overlayGyms={isOverlay ? overlayGyms : undefined}
              unitByGym={isOverlay ? unitByGym : undefined}
            />
            {/* Keyed by both filters: changing either starts the list again at one page. */}
            <HistoryTab
              key={`${routineFilter.filter}:${gymFilter}`}
              sessions={displaySessions}
              trackedFields={trackedFields}
              weightUnit={weightUnit}
              distanceUnit={distanceUnit}
              onSelectSet={setSelectedSet}
              onSessionClick={handleSessionClick}
              membershipOf={routineFilter.membershipOf}
            />
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
