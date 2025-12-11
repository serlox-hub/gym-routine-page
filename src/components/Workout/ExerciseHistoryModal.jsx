import { useState, useMemo } from 'react'
import { X, FileText } from 'lucide-react'
import { useExerciseHistory } from '../../hooks/useWorkout.js'
import { LoadingSpinner, Card } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'
import ExerciseProgressChart from './ExerciseProgressChart.jsx'
import { colors, modalOverlayStyle, modalContentStyle, buttonSecondaryStyle } from '../../lib/styles.js'
import { formatShortDate } from '../../lib/dateUtils.js'
import { formatSetValue } from '../../lib/setUtils.js'
import { calculateExerciseStats } from '../../lib/workoutCalculations.js'

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

function ExerciseHistoryModal({ isOpen, onClose, exerciseId, exerciseName, measurementType = 'weight_reps', weightUnit = 'kg', routineDayId = null }) {
  const [selectedSet, setSelectedSet] = useState(null)
  const [activeTab, setActiveTab] = useState(TABS.PROGRESS)
  const [scope, setScope] = useState(routineDayId ? SCOPE.DAY : SCOPE.GLOBAL)

  const filterByDayId = scope === SCOPE.DAY ? routineDayId : null
  const { data: sessions, isLoading } = useExerciseHistory(exerciseId, filterByDayId)

  const stats = useMemo(() => {
    return calculateExerciseStats(sessions, measurementType)
  }, [sessions, measurementType])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={modalOverlayStyle}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col"
        style={modalContentStyle}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 shrink-0"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-bold" style={{ color: colors.textPrimary }}>
                {exerciseName}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:opacity-80"
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

          {/* Scope selector - solo si hay routineDayId */}
          {routineDayId && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setScope(SCOPE.DAY)}
                className="px-3 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: scope === SCOPE.DAY ? 'rgba(63, 185, 80, 0.15)' : '#21262d',
                  color: scope === SCOPE.DAY ? colors.success : colors.textSecondary,
                }}
              >
                Esta rutina
              </button>
              <button
                onClick={() => setScope(SCOPE.GLOBAL)}
                className="px-3 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: scope === SCOPE.GLOBAL ? 'rgba(139, 148, 158, 0.15)' : '#21262d',
                  color: scope === SCOPE.GLOBAL ? colors.textPrimary : colors.textSecondary,
                }}
              >
                Todas
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : activeTab === TABS.PROGRESS ? (
            <ProgressTab
              sessions={sessions}
              stats={stats}
              measurementType={measurementType}
              weightUnit={weightUnit}
            />
          ) : (
            <HistoryTab
              sessions={sessions}
              onSelectSet={setSelectedSet}
            />
          )}
        </div>

        <SetNotesView
          isOpen={!!selectedSet}
          onClose={() => setSelectedSet(null)}
          rir={selectedSet?.rir_actual}
          notes={selectedSet?.notes}
        />
      </div>
    </div>
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
              value={`${stats.best1RM} ${weightUnit}`}
              color={colors.purple}
            />
          )}
          {stats.maxWeight > 0 && (
            <StatCard
              label="Peso maximo"
              value={`${stats.maxWeight} ${weightUnit}`}
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

function HistoryTab({ sessions, onSelectSet }) {
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
          className="p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <div className="text-xs text-secondary mb-2">
            {formatShortDate(session.date)}
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
                <span className="flex-1">{formatSetValue(set)}</span>
                {set.rir_actual !== null && (
                  <span
                    className="text-xs font-bold px-1 rounded"
                    style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)', color: colors.purple }}
                  >
                    {RIR_LABELS[set.rir_actual] ?? set.rir_actual}
                  </span>
                )}
                {set.notes && (
                  <button
                    onClick={() => onSelectSet(set)}
                    className="p-0.5 rounded hover:opacity-80"
                  >
                    <FileText size={12} style={{ color: colors.purple }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ExerciseHistoryModal
