import { memo } from 'react'
import { View, Text } from 'react-native'
import { Flame } from 'lucide-react-native'
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
          <View key={block.blockName} className="gap-3">
            <View
              className="flex-row items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: colors.bgTertiary,
                borderLeftWidth: 4,
                borderLeftColor: block.isWarmup ? colors.warning : colors.purple,
              }}
            >
              {block.isWarmup && <Flame size={16} color={colors.warning} />}
              <Text
                className="text-sm font-semibold uppercase"
                style={{ color: block.isWarmup ? colors.warning : colors.purple, letterSpacing: 1 }}
              >
                {translateBlockName(block.blockName)}
              </Text>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                ({totalExercises})
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
                      isWarmup={block.isWarmup}
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
