import { useState } from 'react'
import { usePreviousWorkout } from '../../hooks/useWorkout.js'
import { NotesBadge } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'
import { formatRelativeDate } from '../../lib/dateUtils.js'
import { formatSetValueByType } from '../../lib/setUtils.js'

function PreviousWorkout({ exerciseId, measurementType = 'weight_reps' }) {
  const { data: previous, isLoading } = usePreviousWorkout(exerciseId)
  const [selectedSet, setSelectedSet] = useState(null)

  if (isLoading) {
    return (
      <div
        className="rounded-lg p-2 animate-pulse"
        style={{ backgroundColor: '#161b22' }}
      >
        <div className="h-3 rounded w-20 mb-2" style={{ backgroundColor: '#21262d' }} />
        <div className="h-5 rounded w-full" style={{ backgroundColor: '#21262d' }} />
      </div>
    )
  }

  if (!previous) {
    return (
      <div
        className="rounded-lg p-2 text-xs"
        style={{ backgroundColor: '#161b22', color: '#8b949e' }}
      >
        Primera vez con este ejercicio
      </div>
    )
  }

  return (
    <div
      className="rounded-lg p-2"
      style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs" style={{ color: '#8b949e' }}>
          Última vez
        </span>
        <span className="text-xs" style={{ color: '#6e7681' }}>
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
              style={{ backgroundColor: '#21262d' }}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs" style={{ color: '#8b949e' }}>
                  S{set.setNumber}
                </span>
                <NotesBadge
                  rir={set.rir}
                  hasNotes={hasNotes}
                  onClick={hasNotes ? () => setSelectedSet(set) : null}
                />
              </div>
              <div className="text-sm font-medium text-center" style={{ color: '#e6edf3' }}>
                {formatSetValueByType(set, measurementType)}
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
