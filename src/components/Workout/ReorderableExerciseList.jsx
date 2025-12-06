import { ChevronUp, ChevronDown } from 'lucide-react'
import { WorkoutExerciseCard } from './index.js'
import { colors } from '../../lib/styles.js'

function ReorderableExerciseList({
  exercises,
  onMove,
  onRemove,
  onCompleteSet,
  onUncompleteSet
}) {
  return (
    <div className="space-y-3">
      {exercises.map((routineExercise, index) => (
        <div key={routineExercise.id} className="relative">
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
            <button
              onClick={() => onMove(index, 'up')}
              disabled={index === 0}
              className="p-1 rounded hover:opacity-80 disabled:opacity-30"
              style={{ backgroundColor: colors.bgTertiary }}
            >
              <ChevronUp size={16} style={{ color: colors.textSecondary }} />
            </button>
            <button
              onClick={() => onMove(index, 'down')}
              disabled={index === exercises.length - 1}
              className="p-1 rounded hover:opacity-80 disabled:opacity-30"
              style={{ backgroundColor: colors.bgTertiary }}
            >
              <ChevronDown size={16} style={{ color: colors.textSecondary }} />
            </button>
          </div>

          <div className="ml-8">
            {routineExercise.type === 'extra' && (
              <div
                className="text-xs font-medium px-2 py-0.5 rounded inline-block mb-1"
                style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)', color: colors.purple }}
              >
                Añadido
              </div>
            )}
            <WorkoutExerciseCard
              routineExercise={routineExercise}
              onCompleteSet={onCompleteSet}
              onUncompleteSet={onUncompleteSet}
              onRemove={onRemove}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ReorderableExerciseList
