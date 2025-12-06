import { Flame } from 'lucide-react'
import { WorkoutExerciseCard } from './index.js'
import { colors } from '../../lib/styles.js'

function BlockExerciseList({ exercisesByBlock, onCompleteSet, onUncompleteSet, onRemove }) {
  return (
    <>
      {exercisesByBlock.map((block) => (
        <section key={block.blockName} className="space-y-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border-l-4"
            style={{
              backgroundColor: colors.bgTertiary,
              borderLeftColor: block.isWarmup ? colors.warning : colors.purple,
            }}
          >
            {block.isWarmup && <Flame size={16} style={{ color: colors.warning }} />}
            <h3
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: block.isWarmup ? colors.warning : colors.purple }}
            >
              {block.blockName}
            </h3>
            <span className="text-xs" style={{ color: colors.textSecondary }}>
              ({block.exercises.length})
            </span>
            {block.duracionMin && (
              <span className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
                ~{block.duracionMin} min
              </span>
            )}
          </div>

          <div className="space-y-2">
            {block.exercises.map((routineExercise) => (
              <WorkoutExerciseCard
                key={routineExercise.id}
                routineExercise={routineExercise}
                onCompleteSet={onCompleteSet}
                onUncompleteSet={onUncompleteSet}
                onRemove={onRemove}
                isWarmup={block.isWarmup}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

export default BlockExerciseList
