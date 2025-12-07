import { useState } from 'react'
import { Info, Pencil, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { Card, DropdownMenu } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'
import { colors } from '../../lib/styles.js'

function ExerciseCard({
  routineExercise,
  onClick,
  isSuperset = false,
  isEditing = false,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp = true,
  canMoveDown = true
}) {
  const { exercise, series, reps, rir, rest_seconds, tempo, measurement_type } = routineExercise
  const [showHistory, setShowHistory] = useState(false)

  const measurementType = measurement_type || exercise.measurement_type || 'weight_reps'

  const Wrapper = isSuperset ? 'div' : Card
  const wrapperProps = isSuperset ? {} : { className: 'p-2', onClick }

  const menuItems = [
    { icon: Pencil, label: 'Editar', onClick: onEdit },
    { icon: ChevronUp, label: 'Mover arriba', onClick: onMoveUp, disabled: !canMoveUp },
    { icon: ChevronDown, label: 'Mover abajo', onClick: onMoveDown, disabled: !canMoveDown },
    { icon: Trash2, label: 'Eliminar', onClick: onDelete, danger: true },
  ]

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium text-sm truncate flex-1 min-w-0">{exercise.name}</h4>
        {isEditing ? (
          <DropdownMenu items={menuItems} triggerSize={14} />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowHistory(true)
            }}
            className="p-1 rounded hover:opacity-80 flex-shrink-0"
            style={{ backgroundColor: colors.bgTertiary }}
            title="Info del ejercicio"
          >
            <Info size={14} style={{ color: colors.textSecondary }} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-1">
        <span className="text-xs" style={{ color: '#8b949e' }}>{series}×{reps}</span>
        {rir !== null && rir !== undefined && <span className="text-xs" style={{ color: '#a371f7' }}>RIR {rir}</span>}
        {rest_seconds > 0 && <span className="text-xs" style={{ color: '#d29922' }}>{rest_seconds}s</span>}
        {tempo && <span className="text-xs" style={{ color: '#8b949e' }}>{tempo}</span>}
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
