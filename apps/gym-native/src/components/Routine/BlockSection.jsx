import { View, Text } from 'react-native'
import { Link2 } from 'lucide-react-native'
import AddExerciseButton from './AddExerciseButton'
import ExerciseCard from './ExerciseCard'
import { Card } from '../ui'
import { colors } from '../../lib/styles'
import { formatSupersetLabel, groupExercisesBySupersetId, translateBlockName } from '@gym/shared'

export default function BlockSection({
  block,
  routineDayId,
  isReordering = false,
  onAddExercise,
  onEditExercise,
  onReplaceExercise,
  onDeleteExercise,
  onDuplicateExercise,
  onMoveExerciseToDay,
  onReorderExercise,
}) {
  const { name, duration_min, routine_exercises } = block
  const isWarmup = block.is_warmup || name.toLowerCase() === 'calentamiento'
  const exerciseGroups = groupExercisesBySupersetId(routine_exercises, name)
  const positionLabels = routine_exercises.map(re => re.exercise?.name)

  return (
    <View className="gap-2">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: colors.success, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {translateBlockName(name)} ({routine_exercises.length})
        </Text>
        {duration_min && (
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 'auto' }}>~{duration_min} min</Text>
        )}
      </View>

      {exerciseGroups.map(group => {
        if (group.type === 'individual') {
          return (
            <ExerciseCard
              key={group.exercise.id}
              routineExercise={group.exercise}
              routineDayId={routineDayId}
              isReordering={isReordering}
              onEdit={() => onEditExercise?.(group.exercise)}
              onReplace={() => onReplaceExercise?.(group.exercise)}
              onDelete={() => onDeleteExercise?.(group.exercise)}
              onDuplicate={() => onDuplicateExercise?.(group.exercise)}
              onMoveToDay={() => onMoveExerciseToDay?.(group.exercise)}
              onReorderToPosition={(newIndex) => onReorderExercise?.(group.exercise.id, newIndex)}
              currentIndex={routine_exercises.findIndex(e => e.id === group.exercise.id)}
              totalExercises={routine_exercises.length}
              positionLabels={positionLabels}
            />
          )
        }

        const supersetLabel = formatSupersetLabel(group.supersetId)
        return (
          <Card
            key={`superset-${group.supersetId}-${group.exercises[0]?.id}`}
            style={{ borderColor: colors.purple }}
          >
            <View
              className="flex-row items-center gap-2 px-2 py-1 rounded-t-lg"
              style={{
                backgroundColor: colors.purpleBg,
                borderBottomWidth: 1,
                borderBottomColor: colors.purple,
              }}
            >
              <Link2 size={12} color={colors.purple} />
              <Text className="text-xs font-medium" style={{ color: colors.purple }}>
                {supersetLabel}
              </Text>
            </View>
            <View style={{ gap: 8, padding: 8 }}>
            {group.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                routineExercise={exercise}
                routineDayId={routineDayId}
                isReordering={isReordering}
                onEdit={() => onEditExercise?.(exercise)}
                onReplace={() => onReplaceExercise?.(exercise)}
                onDelete={() => onDeleteExercise?.(exercise)}
                onDuplicate={() => onDuplicateExercise?.(exercise)}
                onMoveToDay={() => onMoveExerciseToDay?.(exercise)}
                onReorderToPosition={(newIndex) => onReorderExercise?.(exercise.id, newIndex)}
                currentIndex={routine_exercises.findIndex(e => e.id === exercise.id)}
                totalExercises={routine_exercises.length}
              />
            ))}
            </View>
          </Card>
        )
      })}

      <AddExerciseButton isWarmup={isWarmup} onPress={onAddExercise} />
    </View>
  )
}
