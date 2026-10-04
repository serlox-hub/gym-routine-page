import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react-native'
import { colors } from '../../lib/styles'
import { getMuscleGroupColor, getMuscleGroupName, getEquipmentName, getExerciseName } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'
import { Card, ExerciseName } from '../ui'
import ExerciseThumbnail from '../Exercise/ExerciseThumbnail'
import ExerciseBadge from './ExerciseBadge'

export default function ExerciseSearchRow({ exercise, isInRoutine, onSelect }) {
  const { t } = useTranslation()
  return (
    <Pressable onPress={() => onSelect(exercise)} className="mx-0.5">
      <Card className="p-3" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
        <View className="flex-row items-center gap-3">
          <ExerciseThumbnail gifKey={exercise.gif_key} alt={getExerciseName(exercise)} />
          <View className="flex-1" style={{ minWidth: 0 }}>
            <ExerciseName fontSize={14} fontWeight="500" reserveLines>
              {getExerciseName(exercise)}
            </ExerciseName>
            <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
              <ExerciseBadge
                label={getMuscleGroupName(exercise.muscle_group)}
                dot={getMuscleGroupColor(exercise.muscle_group?.name)}
              />
              {exercise.equipment_type && (
                <ExerciseBadge label={getEquipmentName(exercise.equipment_type)} />
              )}
              {!exercise.is_system && (
                <ExerciseBadge label={t('exercise:custom')} accent />
              )}
            </View>
          </View>
          {isInRoutine && (
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.successBg }}>
              <Check size={12} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.success }}>{t('exercise:usage.inRoutine')}</Text>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  )
}
