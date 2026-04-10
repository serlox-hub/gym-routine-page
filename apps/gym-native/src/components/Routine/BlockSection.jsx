import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Link2, Plus } from 'lucide-react-native'
import ExerciseCard from './ExerciseCard'
import { Card } from '../ui'
import { colors } from '../../lib/styles'
import { formatSupersetLabel, groupExercisesBySupersetId, translateBlockName } from '@gym/shared'

export default function BlockSection({
  block,
  isEditing = false,
  isReordering = false,
  onAddExercise,
  onEditExercise,
  onReplaceExercise,
  onDeleteExercise,
  onDuplicateExercise,
  onMoveExerciseToDay,
  onReorderExercise,
}) {
  const { t } = useTranslation()
  const { name, duration_min, routine_exercises } = block
  const isWarmup = block.is_warmup || name.toLowerCase() === 'calentamiento'
  const exerciseGroups = groupExercisesBySupersetId(routine_exercises, name)
  const positionLabels = routine_exercises.map(re => re.exercise?.name)

  const accentColor = isWarmup ? colors.warning : colors.purple

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
              isEditing={isEditing}
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
                backgroundColor: 'rgba(163, 113, 247, 0.1)',
                borderBottomWidth: 1,
                borderBottomColor: colors.purple,
              }}
            >
              <Link2 size={12} color={colors.purple} />
              <Text className="text-xs font-medium" style={{ color: colors.purple }}>
                {supersetLabel}
              </Text>
            </View>
            {group.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                routineExercise={exercise}
                isSuperset
                isEditing={isEditing}
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
          </Card>
        )
      })}

      {isEditing && (
        <Pressable
          onPress={onAddExercise}
          className="w-full py-2 rounded-lg flex-row items-center justify-center gap-2 active:opacity-70"
          style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}
        >
          <Plus size={14} color={accentColor} />
          <Text className="text-xs" style={{ color: accentColor }}>
            {isWarmup ? t('routine:block.addToWarmup') : t('routine:block.addExercise')}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
