import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { getMuscleGroupColor, getMuscleGroupName, getEquipmentName, getExerciseName } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'
import { Card, ExerciseName } from '../ui/index.js'
import ExerciseThumbnail from '../Exercise/ExerciseThumbnail.jsx'
import ExerciseBadge from './ExerciseBadge.jsx'

function ExerciseSearchRow({ exercise, isInRoutine, onSelect, nameAs }) {
  const { t } = useTranslation()
  return (
    <button onClick={() => onSelect(exercise)} className="w-full text-left">
      <Card className="p-3 transition-colors hover:opacity-90" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
        <div className="flex items-center gap-3">
          <ExerciseThumbnail gifKey={exercise.gif_key} alt={getExerciseName(exercise)} />
          <div className="flex-1 min-w-0">
            <ExerciseName as={nameAs} fontSize={14} fontWeight="500" reserveLines>
              {getExerciseName(exercise)}
            </ExerciseName>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
            </div>
          </div>
          {isInRoutine && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: colors.successBg, color: colors.success }}
            >
              <Check size={12} />
              {t('exercise:usage.inRoutine')}
            </span>
          )}
        </div>
      </Card>
    </button>
  )
}

export default ExerciseSearchRow
