import { Flame } from 'lucide-react'
import { WorkoutExerciseCard } from './index.js'
import SupersetCard from './SupersetCard.jsx'
import { colors } from '../../lib/styles.js'
import { countExercisesInBlock } from '../../lib/supersetUtils.js'

function BlockExerciseList({ exercisesByBlock, onCompleteSet, onUncompleteSet, onRemove }) {
  return (
    <>
      {exercisesByBlock.map((block) => {
        const totalExercises = countExercisesInBlock(block)

        return (
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
                ({totalExercises})
              </span>
              {block.durationMin && (
                <span className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
                  ~{block.durationMin} min
                </span>
              )}
            </div>

            <div className="space-y-2">
              {block.exerciseGroups.map((group) => {
                if (group.type === 'individual') {
                  return (
                    <WorkoutExerciseCard
                      key={group.exercise.id}
                      routineExercise={group.exercise}
                      onCompleteSet={onCompleteSet}
                      onUncompleteSet={onUncompleteSet}
                      onRemove={onRemove}
                      isWarmup={block.isWarmup}
                    />
                  )
                } else {
                  // Superset
                  return (
                    <SupersetCard
                      key={`superset-${group.supersetId}`}
                      exercises={group.exercises}
                      supersetId={group.supersetId}
                      onCompleteSet={onCompleteSet}
                      onUncompleteSet={onUncompleteSet}
                      onRemove={onRemove}
                    />
                  )
                }
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}

export default BlockExerciseList
