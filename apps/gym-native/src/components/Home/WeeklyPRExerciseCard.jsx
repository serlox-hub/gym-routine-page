import { View, Text, Pressable } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { formatPRDetailLabel, formatPRDetailAmount, getExerciseName } from '@gym/shared'
import { ExerciseName } from '../ui'
import { colors } from '../../lib/styles'

/**
 * One exercise of the weekly records sheet: its name and one chip per record. Tapping it opens the
 * session in the history.
 */
export default function WeeklyPRExerciseCard({ exercise, onPress }) {
  const { t } = useTranslation()
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl p-3 active:opacity-80"
      style={{ backgroundColor: colors.bgTertiary }}
    >
      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          <ExerciseName fontSize={15}>{getExerciseName(exercise.exercise) || t('workout:pr.exerciseFallback')}</ExerciseName>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </View>
      <View className="flex-row flex-wrap gap-2 mt-2.5">
        {exercise.details.map((detail, index) => (
          <View key={index} className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: colors.bgSecondary }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '500' }}>
              {formatPRDetailLabel(detail)}
            </Text>
            <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '700' }}>
              {formatPRDetailAmount(detail)}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  )
}
