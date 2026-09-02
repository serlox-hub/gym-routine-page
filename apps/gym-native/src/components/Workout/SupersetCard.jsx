import { View, Text } from 'react-native'
import { Link2 } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui'
import WorkoutExerciseCard from './WorkoutExerciseCard'
import { colors } from '../../lib/styles'
import { formatSupersetLabel } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'

export default function SupersetCard({ exercises, supersetId, onCompleteSet, onUncompleteSet, onRemove, onReplace, existingSupersets = [] }) {
  const { t } = useTranslation()
  const supersetLabel = formatSupersetLabel(supersetId)

  return (
    <Card className="p-0" style={{ borderWidth: 1, borderColor: colors.purple }}>
      <View
        className="flex-row items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{
          backgroundColor: colors.purpleBg,
          borderBottomWidth: 1,
          borderBottomColor: colors.purple,
        }}
      >
        <Link2 size={14} color={colors.purple} />
        <Text className="text-xs font-medium" style={{ color: colors.purple }}>
          {supersetLabel}
        </Text>
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          ({t('routine:superset.exerciseCount', { count: exercises.length })})
        </Text>
      </View>

      {exercises.map((sessionExercise, index) => (
        <View
          key={sessionExercise.sessionExerciseId || sessionExercise.id}
          // Mismo padding que la card de un ejercicio suelto (ver WorkoutExerciseCard): dentro
          // de un superset la tarjeta no pinta su propio envoltorio, lo pone este.
          className="px-4 py-5"
          style={{
            ...getMuscleGroupBorderStyle(sessionExercise.exercise?.muscle_group?.name),
            ...(index < exercises.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : {}),
          }}
        >
          <WorkoutExerciseCard
            sessionExercise={sessionExercise}
            onCompleteSet={onCompleteSet}
            onUncompleteSet={onUncompleteSet}
            onRemove={onRemove}
            onReplace={onReplace}
            isSuperset
            existingSupersets={existingSupersets}
          />
        </View>
      ))}
    </Card>
  )
}
