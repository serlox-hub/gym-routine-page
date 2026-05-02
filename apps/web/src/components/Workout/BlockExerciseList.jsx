import { WorkoutExerciseCard } from './index.js'
import SupersetCard from './SupersetCard.jsx'
import { colors } from '../../lib/styles.js'
import { countExercisesInBlock, getReorderProps, getExerciseName, translateBlockName } from '@gym/shared'

function BlockExerciseList({ exercisesByBlock, onCompleteSet, onUncompleteSet, onRemove, onReplace, flatExercises = [], onReorder, isReordering = false, existingSupersets = [] }) {
  const positionLabels = flatExercises.map(e => getExerciseName(e.exercise))
  const getExerciseReorderProps = (exercise) => ({
    ...getReorderProps(flatExercises, exercise, onReorder),
    isReordering,
    positionLabels,
  })

  return (
    <>
      {exercisesByBlock.map((block) => {
        const totalExercises = countExercisesInBlock(block)

        return (
          <section key={block.blockName} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.success }}
              >
                {translateBlockName(block.blockName)} ({totalExercises})
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
                      key={group.exercise.sessionExerciseId || group.exercise.id}
                      sessionExercise={group.exercise}
                      onCompleteSet={onCompleteSet}
                      onUncompleteSet={onUncompleteSet}
                      onRemove={onRemove}
                      onReplace={onReplace}
                      existingSupersets={existingSupersets}
                      {...getExerciseReorderProps(group.exercise)}
                    />
                  )
                } else {
                  // Superset - usar ID del primer ejercicio para key única
                  return (
                    <SupersetCard
                      key={`superset-${group.supersetId}-${group.exercises[0]?.sessionExerciseId || group.exercises[0]?.id}`}
                      exercises={group.exercises}
                      supersetId={group.supersetId}
                      onCompleteSet={onCompleteSet}
                      onUncompleteSet={onUncompleteSet}
                      onRemove={onRemove}
                      onReplace={onReplace}
                      getReorderProps={getExerciseReorderProps}
                      existingSupersets={existingSupersets}
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
