import { memo } from 'react'
import { View, Text } from 'react-native'
import WorkoutExerciseCard from './WorkoutExerciseCard'
import SupersetCard from './SupersetCard'
import { colors } from '../../lib/styles'
import { countExercisesInBlock, findExerciseIndex, translateBlockName } from '@gym/shared'

function BlockExerciseList({ exercisesByBlock, onCompleteSet, onUncompleteSet, onRemove, onReplace, flatExercises = [], onReorder, isReordering = false, existingSupersets = [] }) {
  const totalFlat = flatExercises.length
  const positionLabels = flatExercises.map(e => e.exercise?.name)

  return (
    <View className="gap-4">
      {exercisesByBlock.map((block) => {
        const totalExercises = countExercisesInBlock(block)

        return (
          <View key={block.blockName} className="gap-2">
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Text
                className="text-xs font-semibold uppercase"
                style={{ color: colors.success, letterSpacing: 1 }}
              >
                {translateBlockName(block.blockName)} ({totalExercises})
              </Text>
              {block.durationMin && (
                <Text className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
                  ~{block.durationMin} min
                </Text>
              )}
            </View>

            <View className="gap-2">
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
                      onReorder={onReorder}
                      currentIndex={findExerciseIndex(flatExercises, group.exercise)}
                      totalExercises={totalFlat}
                      positionLabels={positionLabels}
                      isReordering={isReordering}
                      existingSupersets={existingSupersets}
                    />
                  )
                }
                return (
                  <SupersetCard
                    key={`superset-${group.supersetId}-${group.exercises[0]?.sessionExerciseId || group.exercises[0]?.id}`}
                    exercises={group.exercises}
                    supersetId={group.supersetId}
                    onCompleteSet={onCompleteSet}
                    onUncompleteSet={onUncompleteSet}
                    onRemove={onRemove}
                    onReplace={onReplace}
                    existingSupersets={existingSupersets}
                  />
                )
              })}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export default memo(BlockExerciseList)
