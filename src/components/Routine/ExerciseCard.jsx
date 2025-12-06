import { useState } from 'react'
import { History } from 'lucide-react'
import { Card, Badge } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'

function ExerciseCard({ routineExercise, onClick, isWarmup = false }) {
  const { exercise, series, reps, rir, descanso_seg, tempo, measurement_type } = routineExercise
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
            {exercise.nombre}
          </p>
          <p className="text-xs" style={{ color: '#8b949e' }}>
            {reps}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-3" onClick={onClick}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{exercise.nombre}</h4>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowHistory(true)
          }}
          className="p-1.5 rounded hover:opacity-80 flex-shrink-0"
          style={{ backgroundColor: '#21262d' }}
          title="Ver histórico"
        >
          <History size={14} style={{ color: '#8b949e' }} />
        </button>
      </div>

      <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-2">
        <Badge variant="accent">{series}×{reps}</Badge>
        {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
        {descanso_seg && <Badge variant="warning">{descanso_seg}s</Badge>}
        {tempo && <Badge variant="default">{tempo}</Badge>}
      </div>

      <ExerciseHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={exercise.nombre}
        measurementType={measurementType}
      />
    </Card>
  )
}

export default ExerciseCard
