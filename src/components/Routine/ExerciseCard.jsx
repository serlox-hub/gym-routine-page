import { useState } from 'react'
import { Info, Pencil, Trash2, Loader2, Copy, FolderInput, ArrowUpDown } from 'lucide-react'
import { Card, DropdownMenu } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'
import { colors } from '../../lib/styles.js'
import { MeasurementType } from '../../lib/measurementTypes.js'

function ExerciseCard({
  routineExercise,
  routineDayId,
  onClick,
  isSuperset = false,
  isEditing = false,
  isReordering = false,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToDay,
  onReorderToPosition,
  currentIndex = 0,
  totalExercises = 1
}) {
  const { exercise, series, reps, rir, rest_seconds, tempo, measurement_type } = routineExercise
  const [showHistory, setShowHistory] = useState(false)

  const measurementType = measurement_type || exercise.measurement_type || MeasurementType.WEIGHT_REPS

  const Wrapper = isSuperset ? 'div' : Card
  const wrapperProps = isSuperset ? {} : { className: 'p-2', onClick }

  // Generar opciones de posición para el submenú
  const positionOptions = Array.from({ length: totalExercises }, (_, i) => ({
    label: `Posición ${i + 1}`,
    onClick: () => onReorderToPosition?.(i),
    active: i === currentIndex,
    disabled: i === currentIndex || isReordering,
  }))

  const menuItems = [
    { icon: Pencil, label: 'Editar', onClick: onEdit },
    { icon: Copy, label: 'Duplicar', onClick: onDuplicate },
    { icon: FolderInput, label: 'Mover de día', onClick: onMoveToDay },
    totalExercises > 1 && { icon: ArrowUpDown, label: 'Reordenar', children: positionOptions, disabled: isReordering },
    { icon: Trash2, label: 'Eliminar', onClick: onDelete, danger: true },
  ].filter(Boolean)

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium text-sm truncate flex-1 min-w-0">{exercise.name}</h4>
        {isEditing ? (
          isReordering ? (
            <div className="p-1.5" style={{ color: colors.textSecondary }}>
              <Loader2 size={14} className="animate-spin" />
            </div>
          ) : (
            <DropdownMenu items={menuItems} triggerSize={14} />
          )
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
        routineDayId={routineDayId}
      />
    </Wrapper>
  )
}

export default ExerciseCard
