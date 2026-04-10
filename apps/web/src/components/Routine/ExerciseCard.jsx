import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Loader2, Copy, FolderInput, ArrowUpDown, Repeat2 } from 'lucide-react'
import { Card, DropdownMenu } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'
import { colors } from '../../lib/styles.js'
import { MeasurementType, getExerciseName } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'

function ExerciseCard({
  routineExercise,
  routineDayId,
  onClick,
  isSuperset = false,
  isEditing = false,
  isReordering = false,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToDay,
  onReplace,
  onReorderToPosition,
  currentIndex = 0,
  totalExercises = 1,
  positionLabels = [],
}) {
  const { t } = useTranslation()
  const { exercise, series, reps, rir, rest_seconds, measurement_type } = routineExercise
  const [showHistory, setShowHistory] = useState(false)

  const measurementType = measurement_type || exercise.measurement_type || MeasurementType.WEIGHT_REPS

  const Wrapper = isSuperset ? 'div' : Card
  const wrapperProps = isSuperset
    ? {}
    : { className: 'p-2', onClick, style: getMuscleGroupBorderStyle(exercise.muscle_group?.name) }

  // Generar opciones de posición para el submenú
  const positionOptions = Array.from({ length: totalExercises }, (_, i) => ({
    label: `${i + 1}. ${positionLabels[i] || ''}`,
    onClick: () => onReorderToPosition?.(i),
    active: i === currentIndex,
    disabled: i === currentIndex || isReordering,
  }))

  const menuItems = [
    { icon: Pencil, label: t('common:buttons.edit'), onClick: onEdit },
    { icon: Repeat2, label: t('routine:exercise.replace'), onClick: onReplace },
    { icon: Copy, label: t('routine:exercise.duplicateExercise'), onClick: onDuplicate },
    { icon: FolderInput, label: t('routine:exercise.moveToDay'), onClick: onMoveToDay },
    totalExercises > 1 && { icon: ArrowUpDown, label: t('routine:reorder'), children: positionOptions, disabled: isReordering },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ].filter(Boolean)

  if (!isEditing) {
    return (
      <div
        className="rounded-lg"
        style={{
          backgroundColor: colors.bgTertiary,
          padding: '10px 14px',
          ...getMuscleGroupBorderStyle(exercise.muscle_group?.name),
        }}
        onClick={onClick}
      >
        <h4 className="font-semibold truncate" style={{ color: colors.textPrimary, fontSize: 14 }}>
          {getExerciseName(exercise)}
        </h4>
        <div className="flex flex-wrap gap-3 mt-1">
          <span style={{ color: colors.textSecondary, fontSize: 12 }}>{series}×{reps}</span>
          {rir !== null && rir !== undefined && <span style={{ color: colors.textSecondary, fontSize: 12 }}>RIR {rir}</span>}
          {rest_seconds > 0 && <span style={{ color: colors.textSecondary, fontSize: 12 }}>{rest_seconds}s</span>}
        </div>
      </div>
    )
  }

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium text-sm truncate flex-1 min-w-0">{getExerciseName(exercise)}</h4>
        {isReordering ? (
          <div className="p-1.5" style={{ color: colors.textSecondary }}>
            <Loader2 size={14} className="animate-spin" />
          </div>
        ) : (
          <DropdownMenu items={menuItems} triggerSize={14} />
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-1">
        <span className="text-xs" style={{ color: colors.textSecondary }}>{series}×{reps}</span>
        {rir !== null && rir !== undefined && <span className="text-xs" style={{ color: colors.purple }}>RIR {rir}</span>}
        {rest_seconds > 0 && <span className="text-xs" style={{ color: colors.warning }}>{rest_seconds}s</span>}
      </div>

      <ExerciseHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={getExerciseName(exercise)}
        measurementType={measurementType}
        routineDayId={routineDayId}
      />
    </Wrapper>
  )
}

export default ExerciseCard
