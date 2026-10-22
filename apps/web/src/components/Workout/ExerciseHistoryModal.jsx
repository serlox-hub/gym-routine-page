import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useExerciseHistorySummary, useExerciseChartData, useExerciseHistoryFilter } from '../../hooks/useWorkout.js'
import { useSelectedGym } from '@gym/shared'
import { ExerciseName, LoadingSpinner, Modal } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'
import HistoryChart from './HistoryChart.jsx'
import HistoryTable from './HistoryTable.jsx'
import HistoryFilterSelector from './HistoryFilterSelector.jsx'
import GymSelector from './GymSelector.jsx'
import { colors } from '../../lib/styles.js'
import { DEFAULT_TRACKED_FIELDS, calculateExerciseStats, useResolvedWeightUnit, useExerciseUnitsByGym, usePreference, convertSessionsToDisplayUnit } from '@gym/shared'

// gymFilter: null → un gym (el seleccionado), 'all' → overlay de todos los gyms
const ALL_GYMS = 'all'

// Opened from a routine day (`routineDayId`), every session is listed and marked against that day
// and its routine (`routineId`), with a filter. The callers that pass a day mount it only while
// open, so each opening starts on "All" with one page.
function ExerciseHistoryModal({ isOpen, onClose, exerciseId, exerciseName, trackedFields = DEFAULT_TRACKED_FIELDS, distanceUnit = 'm', routineDayId = null, routineId = null }) {
  const navigate = useNavigate()
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
  const displaySessions = useMemo(
    () => (isOverlay ? convertSessionsToDisplayUnit(routineFilter.sessions, unitByGym, weightUnit) : routineFilter.sessions),
    [isOverlay, routineFilter.sessions, unitByGym, weightUnit]
  )
  const stats = useMemo(() => calculateExerciseStats(displaySessions, trackedFields), [displaySessions, trackedFields])
  const hasFilterSelector = routineFilter.options.length > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-lg" className="max-h-[85vh] flex flex-col" noBorder>
      <div className="p-4 shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <ExerciseName as="h3" fontSize={16} fontWeight="700">{exerciseName}</ExerciseName>
        {hasFilterSelector && (
          <div className="mt-1">
            <HistoryFilterSelector options={routineFilter.options} value={routineFilter.filter} onChange={routineFilter.setFilter} />
          </div>
        )}
        {/* The buttons are the 44px boxes, the pills inside keep their size. mt-1, not mt-3: the
            box adds ~10px above the pill. None under the selector, whose box already leaves 8px. */}
        {hasMultiple && (
          <div className={`flex items-center gap-2 ${hasFilterSelector ? '' : 'mt-1'}`}>
            <button
              onClick={() => setShowGymSelector(true)}
              className="min-h-11 inline-flex items-center hover:opacity-80 transition-opacity"
            >
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
              >
                <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}>{gymFilterLabel}</span>
                <ChevronDown size={13} style={{ color: colors.textMuted }} />
              </span>
            </button>
            <button
              onClick={() => setGymFilter(isOverlay ? defaultGymId : ALL_GYMS)}
              className="min-h-11 inline-flex items-center transition-opacity hover:opacity-80"
            >
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: isOverlay ? `${colors.success}20` : colors.bgTertiary,
                  border: `1px solid ${isOverlay ? colors.success : colors.border}`,
                  color: isOverlay ? colors.success : colors.textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t('common:gym.compareGyms')}
              </span>
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
            <HistoryTable key={`${routineFilter.filter}:${gymFilter}`} sessions={displaySessions} trackedFields={trackedFields} weightUnit={weightUnit}
              distanceUnit={distanceUnit} onSelectSet={setSelectedSet} onSessionClick={handleSessionClick} membershipOf={routineFilter.membershipOf} />
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
