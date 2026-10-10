import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatPRDetailLabel, formatPRDetailAmount, getExerciseName } from '@gym/shared'
import { ExerciseName } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

/**
 * One exercise of the weekly records sheet: its name and one chip per record. Tapping it opens the
 * session in the history.
 */
function WeeklyPRExerciseCard({ exercise, onClick }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-3 transition-opacity hover:opacity-80"
      style={{ backgroundColor: colors.bgTertiary }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <ExerciseName as="p" fontSize={15}>{getExerciseName(exercise.exercise) || t('workout:pr.exerciseFallback')}</ExerciseName>
        </div>
        <ChevronRight size={18} color={colors.textMuted} className="shrink-0" />
      </div>
      <div className="flex flex-wrap gap-2 mt-2.5">
        {exercise.details.map((detail, index) => (
          <div key={index} className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: colors.bgSecondary }}>
            <p className="text-[11px] font-medium" style={{ color: colors.textSecondary }}>
              {formatPRDetailLabel(detail)}
            </p>
            <p className="text-[15px] font-bold" style={{ color: colors.gold }}>
              {formatPRDetailAmount(detail)}
            </p>
          </div>
        ))}
      </div>
    </button>
  )
}

export default WeeklyPRExerciseCard
