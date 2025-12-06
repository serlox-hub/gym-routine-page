import { Pencil, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { colors } from '../../lib/styles.js'

function ExerciseRow({
  routineExercise,
  index,
  totalCount,
  canMoveUp,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete
}) {
  const exercise = routineExercise.exercise
  const isFirst = index === 0
  const isLast = index === totalCount - 1

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div>
          <span className="text-sm" style={{ color: colors.textPrimary }}>
            {exercise?.name}
          </span>
          <span className="text-sm ml-2" style={{ color: colors.textSecondary }}>
            {routineExercise.series}×{routineExercise.reps}
          </span>
          {routineExercise.tempo && (
            <span className="text-xs ml-2" style={{ color: colors.accent }}>
              {routineExercise.tempo}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="p-1 rounded transition-opacity hover:opacity-80"
          style={{ color: colors.textSecondary }}
          title="Editar"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveUp()
          }}
          disabled={isFirst && !canMoveUp}
          className="p-1 rounded transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ color: colors.textSecondary }}
          title="Mover arriba"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveDown()
          }}
          disabled={isLast}
          className="p-1 rounded transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ color: colors.textSecondary }}
          title="Mover abajo"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1 rounded transition-opacity hover:opacity-80"
          style={{ color: '#f85149' }}
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default ExerciseRow
