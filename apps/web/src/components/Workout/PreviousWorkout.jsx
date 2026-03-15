import { useState } from 'react'
import { colors } from '../../lib/styles.js'
import { usePreviousWorkout } from '../../hooks/useWorkout.js'
import { NotesBadge } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'
import { formatRelativeDate } from '../../lib/dateUtils.js'
import { formatSetValueByType } from '../../lib/setUtils.js'
import { MeasurementType } from '../../lib/measurementTypes.js'

function PreviousWorkout({ exerciseId, measurementType = MeasurementType.WEIGHT_REPS, timeUnit = 's', distanceUnit = 'm' }) {
  const { data: previous, isLoading } = usePreviousWorkout(exerciseId)
  const [selectedSet, setSelectedSet] = useState(null)

  if (isLoading) {
    return (
      <div
        className="rounded-lg p-2 animate-pulse"
        style={{ backgroundColor: colors.bgSecondary }}
      >
        <div className="h-3 rounded w-20 mb-2" style={{ backgroundColor: colors.bgTertiary }} />
        <div className="h-5 rounded w-full" style={{ backgroundColor: colors.bgTertiary }} />
      </div>
    )
  }

  if (!previous) {
    return (
      <div
        className="rounded-lg p-2 text-xs"
        style={{ backgroundColor: colors.bgSecondary, color: colors.textSecondary }}
      >
        Primera vez con este ejercicio
      </div>
    )
  }

  return (
    <div
      className="rounded-lg p-2"
      style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs" style={{ color: colors.textSecondary }}>
          Última vez
        </span>
        <span className="text-xs" style={{ color: colors.textMuted }}>
          {formatRelativeDate(previous.date)}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {previous.sets.map((set, index) => {
          const hasNotes = !!set.notes

          return (
            <div
              key={index}
              className="flex-shrink-0 rounded px-2 py-1"
              style={{ backgroundColor: colors.bgTertiary }}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs" style={{ color: colors.textSecondary }}>
                  S{set.setNumber}
                </span>
                <NotesBadge
                  rir={set.rir}
                  hasNotes={hasNotes}
                  onClick={hasNotes ? () => setSelectedSet(set) : null}
                />
              </div>
              <div className="text-sm font-medium text-center" style={{ color: colors.textPrimary }}>
                {formatSetValueByType(set, measurementType, { timeUnit, distanceUnit })}
              </div>
            </div>
          )
        })}
      </div>

      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        rir={selectedSet?.rir}
        notes={selectedSet?.notes}
      />
    </div>
  )
}

export default PreviousWorkout
