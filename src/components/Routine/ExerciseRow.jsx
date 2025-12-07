import { Pencil, ChevronUp, ChevronDown, Trash2, Link2 } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { getSupersetLetter, isExerciseInSuperset } from '../../lib/supersetUtils.js'

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
  const inSuperset = isExerciseInSuperset(routineExercise)

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm" style={{ color: colors.textPrimary }}>
            {exercise?.name}
          </span>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {routineExercise.series}×{routineExercise.reps}
          </span>
          {routineExercise.tempo && (
            <span className="text-xs" style={{ color: colors.accent }}>
              {routineExercise.tempo}
            </span>
          )}
          {inSuperset && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)', color: colors.purple }}
            >
              <Link2 size={10} />
              {getSupersetLetter(routineExercise.superset_group)}
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
