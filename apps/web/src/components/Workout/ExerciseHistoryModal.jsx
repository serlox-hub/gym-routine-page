import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useExerciseHistory, useExerciseHistorySummary, useExerciseChartData } from '../../hooks/useWorkout.js'
import { useSelectedGym } from '@gym/shared'
import { LoadingSpinner, Modal } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'
import HistoryChart from './HistoryChart.jsx'
import HistoryTable from './HistoryTable.jsx'
import GymSelector from './GymSelector.jsx'
import { colors } from '../../lib/styles.js'
import { MeasurementType, calculateExerciseStats, useResolvedWeightUnit, useExerciseUnitsByGym, usePreference, convertSessionsToDisplayUnit } from '@gym/shared'

const SCOPE = { GLOBAL: 'global', DAY: 'day' }
// gymFilter: null → un gym (el seleccionado), 'all' → overlay de todos los gyms
const ALL_GYMS = 'all'

function ExerciseHistoryModal({ isOpen, onClose, exerciseId, exerciseName, measurementType = MeasurementType.WEIGHT_REPS, timeUnit = 's', distanceUnit = 'm', routineDayId = null }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [selectedSet, setSelectedSet] = useState(null)
  const [scope, setScope] = useState(routineDayId ? SCOPE.DAY : SCOPE.GLOBAL)

  const { gyms, gymId: defaultGymId, hasMultiple } = useSelectedGym()
  // Filtro de gym para las gráficas: id concreto, o ALL_GYMS para overlay
  const [gymFilter, setGymFilter] = useState(defaultGymId)
  const [showGymSelector, setShowGymSelector] = useState(false)

  const isDay = scope === SCOPE.DAY
  const chartDayId = isDay ? routineDayId : null

  const isOverlay = gymFilter === ALL_GYMS
  // En overlay ("Todos"), lista+stats+gráfica van cross-gym (gymId=null) y se convierten al
  // vuelo a la unidad de display (la del gym por defecto para el ejercicio). Con un gym
  // concreto, todo se filtra a ese gym. `unitGymId` = destino de la unidad de display.
  const unitGymId = isOverlay ? defaultGymId : gymFilter
  const historyGymId = hasMultiple ? (isOverlay ? null : gymFilter) : null

  // Fetch both scopes in parallel — switch is instant
  const { data: daySummary, isLoading: loadingDaySummary } = useExerciseHistorySummary(exerciseId, routineDayId, historyGymId)
  const { data: globalSummary, isLoading: loadingGlobalSummary } = useExerciseHistorySummary(exerciseId, null, historyGymId)
  const { data: dayHistoryPages, isLoading: loadingDayHistory, fetchNextPage: fetchDayNext, hasNextPage: hasDayNext, isFetchingNextPage: fetchingDayNext } = useExerciseHistory(exerciseId, routineDayId, historyGymId)
  const { data: globalHistoryPages, isLoading: loadingGlobalHistory, fetchNextPage: fetchGlobalNext, hasNextPage: hasGlobalNext, isFetchingNextPage: fetchingGlobalNext } = useExerciseHistory(exerciseId, null, historyGymId)

  // Chart data por gym: cuando hay overlay usamos todas las filas (gymId=null)
  const chartGymId = hasMultiple ? (isOverlay ? null : gymFilter) : null
  const { data: chartRows, isLoading: loadingChart } = useExerciseChartData(exerciseId, chartDayId, chartGymId)

  const resolvedWeightUnit = useResolvedWeightUnit(exerciseId, unitGymId)
  const { value: globalWeightUnit } = usePreference('weight_unit')
  const { data: explicitUnitsByGym = {}, isLoading: loadingUnits } = useExerciseUnitsByGym(exerciseId, isOverlay)

  const summarySessions = isDay ? daySummary : globalSummary
  const historyPages = isDay ? dayHistoryPages : globalHistoryPages
  const historySessions = useMemo(() => historyPages?.pages.flat() ?? [], [historyPages])
  // En overlay se espera a las unidades por gym: sin ellas la conversión caería al fallback
  // global y mostraría pesos mal convertidos un instante para gyms con unidad explícita.
  const isLoading = (isDay ? (loadingDaySummary || loadingDayHistory) : (loadingGlobalSummary || loadingGlobalHistory)) || (hasMultiple && loadingChart) || (isOverlay && loadingUnits)
  const fetchNextPage = isDay ? fetchDayNext : fetchGlobalNext
  const hasNextPage = isDay ? hasDayNext : hasGlobalNext
  const isFetchingNextPage = isDay ? fetchingDayNext : fetchingGlobalNext

  const handleSessionClick = (sessionId, date) => { onClose(); navigate('/history', { state: { sessionId, date } }) }

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
  const displaySummary = useMemo(
    () => (isOverlay ? convertSessionsToDisplayUnit(summarySessions, unitByGym, weightUnit) : summarySessions),
    [isOverlay, summarySessions, unitByGym, weightUnit]
  )
  const displayHistory = useMemo(
    () => (isOverlay ? convertSessionsToDisplayUnit(historySessions, unitByGym, weightUnit) : historySessions),
    [isOverlay, historySessions, unitByGym, weightUnit]
  )
  const stats = useMemo(() => calculateExerciseStats(displaySummary, measurementType), [displaySummary, measurementType])

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-lg" className="max-h-[85vh] flex flex-col" noBorder>
      <div className="p-4 shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex items-center gap-3">
          <h3 className="font-bold truncate flex-1 min-w-0" style={{ color: colors.textPrimary }}>{exerciseName}</h3>
          {routineDayId && (
            <div className="shrink-0 grid grid-cols-2 rounded-full p-0.5 relative" style={{ backgroundColor: colors.bgTertiary }}>
              <div
                className="absolute top-0.5 bottom-0.5 rounded-full transition-transform duration-200 ease-in-out"
                style={{
                  width: 'calc(50% - 1px)',
                  backgroundColor: colors.success,
                  left: 2,
                  transform: isDay ? 'translateX(0)' : 'translateX(100%)',
                }}
              />
              <button onClick={() => setScope(SCOPE.DAY)} className="relative z-10 px-3 py-1 text-xs font-semibold"
                style={{ color: isDay ? colors.bgPrimary : colors.textSecondary }}>
                {t('exercise:scopeRoutine')}
              </button>
              <button onClick={() => setScope(SCOPE.GLOBAL)} className="relative z-10 px-3 py-1 text-xs font-semibold"
                style={{ color: !isDay ? colors.bgPrimary : colors.textSecondary }}>
                {t('exercise:scopeGlobal')}
              </button>
            </div>
          )}
        </div>
        {hasMultiple && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setShowGymSelector(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity"
              style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
            >
              <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}>{gymFilterLabel}</span>
              <ChevronDown size={13} style={{ color: colors.textMuted }} />
            </button>
            <button
              onClick={() => setGymFilter(isOverlay ? defaultGymId : ALL_GYMS)}
              className="inline-flex items-center px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
              style={{
                backgroundColor: isOverlay ? `${colors.success}20` : colors.bgTertiary,
                border: `1px solid ${isOverlay ? colors.success : colors.border}`,
                color: isOverlay ? colors.success : colors.textSecondary,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t('common:gym.compareGyms')}
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <HistoryChart
              sessions={displaySummary}
              stats={stats}
              measurementType={measurementType}
              weightUnit={weightUnit}
              distanceUnit={distanceUnit}
              chartRows={hasMultiple ? chartRows : undefined}
              overlayGyms={isOverlay ? overlayGyms : undefined}
              unitByGym={isOverlay ? unitByGym : undefined}
            />
            <HistoryTable sessions={displayHistory} measurementType={measurementType} weightUnit={weightUnit} timeUnit={timeUnit} distanceUnit={distanceUnit} onSelectSet={setSelectedSet}
              onSessionClick={handleSessionClick} hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} onLoadMore={fetchNextPage} />
          </>
        )}
      </div>
      <SetNotesView isOpen={!!selectedSet} onClose={() => setSelectedSet(null)} notes={selectedSet?.notes} videoUrl={selectedSet?.video_url} />
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

export default ExerciseHistoryModal
