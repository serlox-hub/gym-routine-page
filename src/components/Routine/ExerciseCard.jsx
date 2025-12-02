import { useState } from 'react'
import { History } from 'lucide-react'
import { Card, Badge } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'
import { colors } from '../../lib/styles.js'

function ExerciseCard({ routineExercise, onClick, isWarmup = false }) {
  const { exercise, series, reps, rir, descanso_seg, tempo, notas, measurement_type } = routineExercise
  const [showHistory, setShowHistory] = useState(false)

  const measurementType = measurement_type || exercise.measurement_type || 'weight_reps'
  const equipmentInfo = buildEquipmentInfo(exercise)

  // Simplified warmup card
  if (isWarmup) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm" style={{ color: colors.textPrimary }}>
            {exercise.nombre}
          </p>
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            {reps}
            {equipmentInfo && ` · ${equipmentInfo}`}
          </p>
          {notas && (
            <p className="text-xs mt-1" style={{ color: colors.warning }}>
              {notas}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="p-3" onClick={onClick}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{exercise.nombre}</h4>
          {equipmentInfo && (
            <p className="text-sm text-secondary truncate">{equipmentInfo}</p>
          )}
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
