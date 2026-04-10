import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useExerciseHistory, useExerciseHistorySummary } from '../../hooks/useWorkout.js'
import { LoadingSpinner, Modal } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'
import HistoryChart from './HistoryChart.jsx'
import HistoryTable from './HistoryTable.jsx'
import { colors, buttonSecondaryStyle } from '../../lib/styles.js'
import { MeasurementType, calculateExerciseStats } from '@gym/shared'

const TABS = { PROGRESS: 'progress', HISTORY: 'history' }
const SCOPE = { GLOBAL: 'global', DAY: 'day' }

function ExerciseHistoryModal({ isOpen, onClose, exerciseId, exerciseName, measurementType = MeasurementType.WEIGHT_REPS, weightUnit = 'kg', timeUnit = 's', distanceUnit = 'm', routineDayId = null }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [selectedSet, setSelectedSet] = useState(null)
  const [activeTab, setActiveTab] = useState(TABS.PROGRESS)
  const [scope, setScope] = useState(routineDayId ? SCOPE.DAY : SCOPE.GLOBAL)

  const filterByDayId = scope === SCOPE.DAY ? routineDayId : null
  const { data: summarySessions, isLoading: loadingSummary } = useExerciseHistorySummary(exerciseId, filterByDayId)
  const { data: historyPages, isLoading: loadingHistory, fetchNextPage, hasNextPage, isFetchingNextPage } = useExerciseHistory(exerciseId, filterByDayId)
  const historySessions = historyPages?.pages.flat() ?? []
  const isLoading = loadingSummary || loadingHistory

  const handleSessionClick = (sessionId, date) => { onClose(); navigate('/history', { state: { sessionId, sessionDate: date } }) }
  const stats = useMemo(() => calculateExerciseStats(summarySessions, measurementType), [summarySessions, measurementType])

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-lg" className="max-h-[80vh] flex flex-col" noBorder>
      <div className="p-4 shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="font-bold truncate" style={{ color: colors.textPrimary }}>{exerciseName}</h3>
            {routineDayId && (
              <div className="shrink-0 flex rounded-full p-0.5" style={{ backgroundColor: colors.bgTertiary }}>
                <button onClick={() => setScope(SCOPE.DAY)} className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={{ backgroundColor: scope === SCOPE.DAY ? colors.successBg : 'transparent', color: scope === SCOPE.DAY ? colors.success : colors.textSecondary }}>
                  {t('exercise:scopeRoutine')}
                </button>
                <button onClick={() => setScope(SCOPE.GLOBAL)} className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={{ backgroundColor: scope === SCOPE.GLOBAL ? colors.accentBgSubtle : 'transparent', color: scope === SCOPE.GLOBAL ? colors.textPrimary : colors.textSecondary }}>
                  {t('exercise:scopeGlobal')}
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 p-2 rounded-lg hover:opacity-80" style={buttonSecondaryStyle}>
            <X size={20} style={{ color: colors.textSecondary }} />
          </button>
        </div>
        <div className="flex" style={{ backgroundColor: colors.bgTertiary, borderRadius: 8, padding: 4 }}>
          <button onClick={() => setActiveTab(TABS.PROGRESS)} className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
            style={{ backgroundColor: activeTab === TABS.PROGRESS ? colors.bgSecondary : 'transparent', color: activeTab === TABS.PROGRESS ? colors.purple : colors.textSecondary, boxShadow: activeTab === TABS.PROGRESS ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }}>
            {t('exercise:progression')}
          </button>
          <button onClick={() => setActiveTab(TABS.HISTORY)} className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
            style={{ backgroundColor: activeTab === TABS.HISTORY ? colors.bgSecondary : 'transparent', color: activeTab === TABS.HISTORY ? colors.accent : colors.textSecondary, boxShadow: activeTab === TABS.HISTORY ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }}>
            {t('exercise:history')}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : activeTab === TABS.PROGRESS ? (
          <HistoryChart sessions={summarySessions} stats={stats} measurementType={measurementType} weightUnit={weightUnit} />
        ) : (
          <HistoryTable sessions={historySessions} weightUnit={weightUnit} timeUnit={timeUnit} distanceUnit={distanceUnit} onSelectSet={setSelectedSet}
            onSessionClick={handleSessionClick} hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} onLoadMore={fetchNextPage} />
        )}
      </div>
      <SetNotesView isOpen={!!selectedSet} onClose={() => setSelectedSet(null)} rir={selectedSet?.rir_actual} notes={selectedSet?.notes} videoUrl={selectedSet?.video_url} />
    </Modal>
  )
}

export default ExerciseHistoryModal
