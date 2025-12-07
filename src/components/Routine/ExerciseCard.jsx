import { useState } from 'react'
import { Info } from 'lucide-react'
import { Card, Badge } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'

function ExerciseCard({ routineExercise, onClick, isWarmup = false, isSuperset = false }) {
  const { exercise, series, reps, rir, rest_seconds, tempo, measurement_type } = routineExercise
  const [showHistory, setShowHistory] = useState(false)

  const measurementType = measurement_type || exercise.measurement_type || 'weight_reps'

  // Simplified warmup card
  if (isWarmup) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm" style={{ color: '#e6edf3' }}>
            {exercise.name}
          </p>
          <p className="text-xs" style={{ color: '#8b949e' }}>
            {reps}
          </p>
        </div>
      </div>
    )
  }

  const Wrapper = isSuperset ? 'div' : Card
  const wrapperProps = isSuperset ? {} : { className: 'p-3', onClick }

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{exercise.name}</h4>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowHistory(true)
          }}
          className="p-1.5 rounded hover:opacity-80 flex-shrink-0"
          style={{ backgroundColor: '#21262d' }}
          title="Info del ejercicio"
        >
          <Info size={14} style={{ color: '#8b949e' }} />
        </button>
      </div>

      <div className={`${isSuperset ? 'mt-2' : 'mt-2 pt-2 border-t border-border'} flex flex-wrap gap-2`}>
        <Badge variant="accent">{series}×{reps}</Badge>
        {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
        {rest_seconds && <Badge variant="warning">{rest_seconds}s</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
      </div>

      <ExerciseHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        measurementType={measurementType}
      />
    </Wrapper>
  )
}

export default ExerciseCard
