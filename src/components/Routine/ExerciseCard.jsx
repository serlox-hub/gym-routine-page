import { useState } from 'react'
import { History } from 'lucide-react'
import { Card, Badge } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'

function ExerciseCard({ routineExercise, onClick }) {
  const { exercise, series, reps, rir, descanso_seg, tempo, notas, measurement_type } = routineExercise
  const [showHistory, setShowHistory] = useState(false)

  const measurementType = measurement_type || exercise.measurement_type || 'weight_reps'

  const equipmentInfo = buildEquipmentInfo(exercise)

  return (
    <Card className="p-3" onClick={onClick}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{exercise.nombre}</h4>
          {equipmentInfo && (
            <p className="text-sm text-secondary truncate">{equipmentInfo}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowHistory(true)
            }}
            className="p-1.5 rounded hover:opacity-80"
            style={{ backgroundColor: '#21262d' }}
            title="Ver histórico"
          >
            <History size={14} style={{ color: '#8b949e' }} />
          </button>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-accent">{series}</span>
            <span className="text-secondary">×</span>
            <span className="text-lg font-medium">{reps}</span>
          </div>
        </div>
      </div>

      {(rir !== null || descanso_seg || tempo) && (
        <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-2">
          {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
          {descanso_seg && <Badge variant="warning">{descanso_seg}s</Badge>}
          {tempo && <Badge variant="accent">{tempo}</Badge>}
        </div>
      )}

      {notas && (
        <p className="mt-2 text-xs text-secondary bg-surface-block rounded p-2">{notas}</p>
      )}

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

function buildEquipmentInfo(exercise) {
  const parts = []

  if (exercise.equipment?.nombre) {
    parts.push(exercise.equipment.nombre)
  }
  if (exercise.grip_type?.nombre && exercise.grip_type.nombre !== 'N/A') {
    parts.push(exercise.grip_type.nombre)
  }
  if (exercise.grip_width?.nombre && exercise.grip_width.nombre !== 'N/A') {
    parts.push(exercise.grip_width.nombre)
  }
  if (exercise.altura_polea) {
    parts.push(`Polea ${exercise.altura_polea}`)
  }

  return parts.join(' · ')
}

export default ExerciseCard
