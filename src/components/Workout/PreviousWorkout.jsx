import { useState } from 'react'
import { usePreviousWorkout } from '../../hooks/useWorkout.js'
import { NotesBadge } from '../ui/index.js'
import SetNotesView from './SetNotesView.jsx'

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`
    return `Hace ${Math.floor(diffDays / 30)} mes`
  }

  const renderSetValue = (set) => {
    switch (measurementType) {
      case 'weight_reps':
        return `${set.weight}${set.weightUnit} × ${set.reps}`
      case 'reps_only':
        return `${set.reps} reps`
      case 'reps_per_side':
        return `${set.reps} reps/lado`
      case 'time':
        return `${set.timeSeconds}s`
      case 'time_per_side':
        return `${set.timeSeconds}s/lado`
      case 'distance':
        return set.weight
          ? `${set.weight}${set.weightUnit} × ${set.distanceMeters}m`
          : `${set.distanceMeters}m`
      default:
        return set.weight ? `${set.weight}${set.weightUnit} × ${set.reps}` : `${set.reps}`
    }
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
          {formatDate(previous.date)}
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
                {renderSetValue(set)}
              </div>
            </div>
          )
        })}
      </div>

      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        rir={selectedSet?.rir}
        notas={selectedSet?.notes}
      />
    </div>
  )
}

export default PreviousWorkout
