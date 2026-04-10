import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useExerciseHistory, useExerciseHistorySummary } from '../../hooks/useWorkout.js'
import { LoadingSpinner, Modal } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'
import HistoryChart from './HistoryChart.jsx'
import HistoryTable from './HistoryTable.jsx'
import { colors } from '../../lib/styles.js'
import { MeasurementType, calculateExerciseStats } from '@gym/shared'

const SCOPE = { GLOBAL: 'global', DAY: 'day' }

function ExerciseHistoryModal({ isOpen, onClose, exerciseId, exerciseName, measurementType = MeasurementType.WEIGHT_REPS, weightUnit = 'kg', timeUnit = 's', distanceUnit = 'm', routineDayId = null }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [selectedSet, setSelectedSet] = useState(null)
  const [scope, setScope] = useState(routineDayId ? SCOPE.DAY : SCOPE.GLOBAL)

  // Fetch both scopes in parallel — switch is instant
  const { data: daySummary, isLoading: loadingDaySummary } = useExerciseHistorySummary(exerciseId, routineDayId)
  const { data: globalSummary, isLoading: loadingGlobalSummary } = useExerciseHistorySummary(exerciseId, null)
  const { data: dayHistoryPages, isLoading: loadingDayHistory, fetchNextPage: fetchDayNext, hasNextPage: hasDayNext, isFetchingNextPage: fetchingDayNext } = useExerciseHistory(exerciseId, routineDayId)
  const { data: globalHistoryPages, isLoading: loadingGlobalHistory, fetchNextPage: fetchGlobalNext, hasNextPage: hasGlobalNext, isFetchingNextPage: fetchingGlobalNext } = useExerciseHistory(exerciseId, null)

  const isDay = scope === SCOPE.DAY
  const summarySessions = isDay ? daySummary : globalSummary
  const historyPages = isDay ? dayHistoryPages : globalHistoryPages
  const historySessions = historyPages?.pages.flat() ?? []
  const isLoading = isDay ? (loadingDaySummary || loadingDayHistory) : (loadingGlobalSummary || loadingGlobalHistory)
  const fetchNextPage = isDay ? fetchDayNext : fetchGlobalNext
  const hasNextPage = isDay ? hasDayNext : hasGlobalNext
  const isFetchingNextPage = isDay ? fetchingDayNext : fetchingGlobalNext

  const handleSessionClick = (sessionId, date) => { onClose(); navigate('/history', { state: { sessionId, sessionDate: date } }) }
  const stats = useMemo(() => calculateExerciseStats(summarySessions, measurementType), [summarySessions, measurementType])

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
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <HistoryChart sessions={summarySessions} stats={stats} measurementType={measurementType} weightUnit={weightUnit} />
            <HistoryTable sessions={historySessions} weightUnit={weightUnit} timeUnit={timeUnit} distanceUnit={distanceUnit} onSelectSet={setSelectedSet}
              onSessionClick={handleSessionClick} hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} onLoadMore={fetchNextPage} />
          </>
        )}
      </div>
      <SetNotesView isOpen={!!selectedSet} onClose={() => setSelectedSet(null)} rir={selectedSet?.rir_actual} notes={selectedSet?.notes} videoUrl={selectedSet?.video_url} />
    </Modal>
  )
}

export default ExerciseHistoryModal
