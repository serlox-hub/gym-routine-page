import { useState } from 'react'
import { X, FileText } from 'lucide-react'
import { useExerciseHistory } from '../../hooks/useExerciseHistory.js'
import { LoadingSpinner } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'
import ExerciseProgressChart from './ExerciseProgressChart.jsx'
import { colors, modalOverlayStyle, modalContentStyle, buttonSecondaryStyle } from '../../lib/styles.js'

const RIR_LABELS = {
  [-1]: 'F',
  0: '0',
  1: '1',
  2: '2',
  3: '3+',
}

function ExerciseHistoryModal({ isOpen, onClose, exerciseId, exerciseName, measurementType = 'weight_reps' }) {
  const { data: sessions, isLoading } = useExerciseHistory(exerciseId)
  const [selectedSet, setSelectedSet] = useState(null)

  if (!isOpen) return null

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    })
  }

  const formatSetValue = (set) => {
    const parts = []
    if (set.weight) {
      parts.push(`${set.weight}${set.weight_unit}`)
    }
    if (set.reps_completed) {
      parts.push(`${set.reps_completed}`)
    }
    if (set.time_seconds) {
      parts.push(`${set.time_seconds}s`)
    }
    if (set.distance_meters) {
      parts.push(`${set.distance_meters}m`)
    }
    return parts.join(' × ')
  }

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
          className="p-4 flex justify-between items-center shrink-0"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <div>
            <h3 className="font-bold" style={{ color: colors.textPrimary }}>
              Histórico
            </h3>
            <p className="text-sm text-secondary">{exerciseName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-80"
            style={buttonSecondaryStyle}
          >
            <X size={20} style={{ color: colors.textSecondary }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-center text-secondary py-8">
              Sin registros anteriores
            </p>
          ) : (
            <div className="space-y-4">
              <ExerciseProgressChart sessions={sessions} measurementType={measurementType} />
              {sessions.map(session => (
                <div
                  key={session.sessionId}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: colors.bgTertiary }}
                >
                  <div className="text-xs text-secondary mb-2">
                    {formatDate(session.date)}
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
                        {set.notas && (
                          <button
                            onClick={() => setSelectedSet(set)}
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
          )}
        </div>

        <SetNotesView
          isOpen={!!selectedSet}
          onClose={() => setSelectedSet(null)}
          rir={selectedSet?.rir_actual}
          notas={selectedSet?.notas}
        />
      </div>
    </div>
  )
}

export default ExerciseHistoryModal
