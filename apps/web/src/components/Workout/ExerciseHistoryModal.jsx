import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, FileText, ChevronRight } from 'lucide-react'
import { useExerciseHistory, useExerciseHistorySummary } from '../../hooks/useWorkout.js'
import { LoadingSpinner, Card, Modal } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'
import ExerciseProgressChart from './ExerciseProgressChart.jsx'
import { colors, buttonSecondaryStyle } from '../../lib/styles.js'
import {
  MeasurementType,
  calculateExerciseStats,
  formatSetValue,
  formatShortDate
} from '@gym/shared'

const RIR_LABELS = {
  [-1]: 'F',
  0: '0',
  1: '1',
  2: '2',
  3: '3+',
}

const TABS = {
  PROGRESS: 'progress',
  HISTORY: 'history',
}

const SCOPE = {
  GLOBAL: 'global',
  DAY: 'day',
}

function ExerciseHistoryModal({ isOpen, onClose, exerciseId, exerciseName, measurementType = MeasurementType.WEIGHT_REPS, weightUnit = 'kg', timeUnit = 's', distanceUnit = 'm', routineDayId = null }) {
  const navigate = useNavigate()
  const [selectedSet, setSelectedSet] = useState(null)
  const [activeTab, setActiveTab] = useState(TABS.PROGRESS)
  const [scope, setScope] = useState(routineDayId ? SCOPE.DAY : SCOPE.GLOBAL)

  const filterByDayId = scope === SCOPE.DAY ? routineDayId : null
  const { data: summarySessions, isLoading: loadingSummary } = useExerciseHistorySummary(exerciseId, filterByDayId)
  const { data: historyPages, isLoading: loadingHistory, fetchNextPage, hasNextPage, isFetchingNextPage } = useExerciseHistory(exerciseId, filterByDayId)
  const historySessions = historyPages?.pages.flat() ?? []
  const isLoading = loadingSummary || loadingHistory

  const handleSessionClick = (sessionId) => {
    onClose()
    navigate(`/history/${sessionId}`)
  }

  const stats = useMemo(() => {
    return calculateExerciseStats(summarySessions, measurementType)
  }, [summarySessions, measurementType])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      position="bottom"
      maxWidth="max-w-lg"
      className="max-h-[80vh] flex flex-col"
      noBorder
    >
      {/* Header */}
      <div
        className="p-4 shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold truncate" style={{ color: colors.textPrimary }}>
              {exerciseName}
            </h3>
            {routineDayId && (
              <div
                className="shrink-0 flex rounded-full p-0.5"
                style={{ backgroundColor: colors.bgTertiary }}
              >
                <button
                  onClick={() => setScope(SCOPE.DAY)}
                  className="px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: scope === SCOPE.DAY ? 'rgba(63, 185, 80, 0.2)' : 'transparent',
                    color: scope === SCOPE.DAY ? colors.success : colors.textSecondary,
                  }}
                >
                  Rutina
                </button>
                <button
                  onClick={() => setScope(SCOPE.GLOBAL)}
                  className="px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: scope === SCOPE.GLOBAL ? 'rgba(139, 148, 158, 0.2)' : 'transparent',
                    color: scope === SCOPE.GLOBAL ? colors.textPrimary : colors.textSecondary,
                  }}
                >
                  Global
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg hover:opacity-80"
            style={buttonSecondaryStyle}
          >
            <X size={20} style={{ color: colors.textSecondary }} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex"
          style={{
            backgroundColor: colors.bgTertiary,
            borderRadius: '8px',
            padding: '4px',
          }}
        >
          <button
            onClick={() => setActiveTab(TABS.PROGRESS)}
            className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === TABS.PROGRESS ? colors.bgSecondary : 'transparent',
              color: activeTab === TABS.PROGRESS ? colors.purple : colors.textSecondary,
              boxShadow: activeTab === TABS.PROGRESS ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            Progresión
          </button>
          <button
            onClick={() => setActiveTab(TABS.HISTORY)}
            className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === TABS.HISTORY ? colors.bgSecondary : 'transparent',
              color: activeTab === TABS.HISTORY ? colors.accent : colors.textSecondary,
              boxShadow: activeTab === TABS.HISTORY ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            Historial
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : activeTab === TABS.PROGRESS ? (
          <ProgressTab
            sessions={summarySessions}
            stats={stats}
            measurementType={measurementType}
            weightUnit={weightUnit}
          />
        ) : (
          <HistoryTab
            sessions={historySessions}
            timeUnit={timeUnit}
            distanceUnit={distanceUnit}
            onSelectSet={setSelectedSet}
            onSessionClick={handleSessionClick}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
          />
        )}
      </div>

      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        rir={selectedSet?.rir_actual}
        notes={selectedSet?.notes}
      />
    </Modal>
  )
}

function ProgressTab({ sessions, stats, measurementType, weightUnit }) {
  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-center text-secondary py-8">
        Sin registros anteriores
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          {stats.best1RM > 0 && (
            <StatCard
              label="Mejor 1RM Est."
              value={`${stats.best1RM.toLocaleString()} ${weightUnit}`}
              color={colors.purple}
            />
          )}
          {stats.maxWeight > 0 && (
            <StatCard
              label="Peso maximo"
              value={`${stats.maxWeight.toLocaleString()} ${weightUnit}`}
              color={colors.accent}
            />
          )}
          {stats.maxReps > 0 && (
            <StatCard
              label="Max. repeticiones"
              value={stats.maxReps}
              color={colors.success}
            />
          )}
          {stats.totalVolume > 0 && (
            <StatCard
              label="Volumen total"
              value={`${stats.totalVolume.toLocaleString()} ${weightUnit}`}
              color={colors.warning}
            />
          )}
          <StatCard
            label="Sesiones"
            value={stats.sessionCount}
            color={colors.textSecondary}
          />
        </div>
      )}

      {/* Chart */}
      {sessions.length >= 2 ? (
        <ExerciseProgressChart sessions={sessions} measurementType={measurementType} />
      ) : (
        <p className="text-center text-secondary py-4 text-sm">
          Necesitas al menos 2 sesiones para ver la grafica
        </p>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <Card className="p-2">
      <div className="text-xs text-secondary">{label}</div>
      <div className="text-base font-bold" style={{ color }}>
        {value}
      </div>
    </Card>
  )
}

function HistoryTab({ sessions, timeUnit = 's', distanceUnit = 'm', onSelectSet, onSessionClick, hasNextPage, isFetchingNextPage, onLoadMore }) {
  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-center text-secondary py-8">
        Sin registros anteriores
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map(session => (
        <div
          key={session.sessionId}
          className="p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: colors.bgTertiary }}
          onClick={() => onSessionClick(session.sessionId)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-secondary">
              {formatShortDate(session.date)}
            </span>
            <ChevronRight size={14} style={{ color: colors.textSecondary }} />
          </div>
          <div className="space-y-1">
            {session.sets.map(set => (
              <div
                key={set.id}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold"
                  style={{ backgroundColor: colors.border, color: colors.textSecondary }}
                >
                  {set.set_number}
                </span>
                <span className="flex-1">{formatSetValue(set, { timeUnit, distanceUnit })}</span>
                {(set.rir_actual !== null || set.notes) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (set.notes) onSelectSet(set)
                    }}
                    className={`flex items-center justify-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded ${set.notes ? 'hover:opacity-80' : ''}`}
                    style={{
                      backgroundColor: 'rgba(163, 113, 247, 0.15)',
                      color: colors.purple,
                      cursor: set.notes ? 'pointer' : 'default',
                      minWidth: '24px',
                    }}
                  >
                    {set.rir_actual !== null && (
                      <span className="w-4 text-center">{RIR_LABELS[set.rir_actual] ?? set.rir_actual}</span>
                    )}
                    {set.notes && <FileText size={12} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {hasNextPage && (
        <button
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="w-full py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: colors.bgTertiary, color: colors.accent }}
        >
          {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
        </button>
      )}
    </div>
  )
}

export default ExerciseHistoryModal
