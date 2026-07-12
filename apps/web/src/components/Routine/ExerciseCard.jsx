import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Pencil, Trash2, Copy, FolderInput, ArrowUpDown, Repeat2 } from 'lucide-react'
import { Modal, ReorderModal } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'
import { colors } from '../../lib/styles.js'
import { MeasurementType, getExerciseName } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'

function ExerciseCard({
  routineExercise,
  routineDayId,
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
  const [showMenu, setShowMenu] = useState(false)
  const [showReorder, setShowReorder] = useState(false)

  const measurementType = measurement_type || exercise.measurement_type || MeasurementType.WEIGHT_REPS

  const menuItems = [
    { icon: Pencil, label: t('common:buttons.edit'), onClick: onEdit },
    { icon: Repeat2, label: t('routine:exercise.replace'), onClick: onReplace },
    { icon: Copy, label: t('routine:exercise.duplicateExercise'), onClick: onDuplicate },
    { icon: FolderInput, label: t('routine:exercise.moveToDay'), onClick: onMoveToDay },
    totalExercises > 1 && { icon: ArrowUpDown, label: t('routine:reorder'), onClick: () => setShowReorder(true), disabled: isReordering },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ].filter(Boolean)

  if (!isEditing) {
    return (
      <>
        <div
          className="rounded-lg cursor-pointer transition-colors"
          style={{
            backgroundColor: colors.bgTertiary,
            padding: '10px 14px',
            ...getMuscleGroupBorderStyle(exercise.muscle_group?.name),
          }}
          onClick={(e) => {
            e.stopPropagation()
            setShowHistory(true)
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bgAlt}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bgTertiary}
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate" style={{ color: colors.textPrimary, fontSize: 14 }}>
                {getExerciseName(exercise)}
              </h4>
              <div className="flex flex-wrap gap-3 mt-1">
                <span style={{ color: colors.textSecondary, fontSize: 12 }}>{series}×{reps}</span>
                {rir !== null && rir !== undefined && <span style={{ color: colors.textSecondary, fontSize: 12 }}>RIR {rir}</span>}
                {rest_seconds > 0 && <span style={{ color: colors.textSecondary, fontSize: 12 }}>{rest_seconds}s</span>}
              </div>
            </div>
            <ChevronRight size={16} color={colors.textMuted} className="shrink-0" />
          </div>
        </div>
        <ExerciseHistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          exerciseId={exercise.id}
          exerciseName={getExerciseName(exercise)}
          measurementType={measurementType}
          routineDayId={routineDayId}
        />
      </>
    )
  }

  const handleMenuAction = (action) => {
    setShowMenu(false)
    action?.()
  }

  return (
    <>
      <div
        className="rounded-lg cursor-pointer hover:opacity-80"
        style={{
          backgroundColor: colors.bgTertiary,
          padding: '8px 12px',
          ...getMuscleGroupBorderStyle(exercise.muscle_group?.name),
        }}
        onClick={() => setShowMenu(true)}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{getExerciseName(exercise)}</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-xs" style={{ color: colors.textSecondary }}>{series}×{reps}</span>
              {rir !== null && rir !== undefined && <span className="text-xs" style={{ color: colors.purple }}>RIR {rir}</span>}
              {rest_seconds > 0 && <span className="text-xs" style={{ color: colors.warning }}>{rest_seconds}s</span>}
            </div>
          </div>
          <ChevronRight size={16} color={colors.textMuted} className="shrink-0" />
        </div>
      </div>
      <Modal isOpen={showMenu} onClose={() => setShowMenu(false)} position="bottom" maxWidth="max-w-lg">
        <div className="py-2 pb-6">
          {menuItems.map((item, i) => (
            <button key={i} onClick={() => handleMenuAction(item.onClick)} disabled={item.disabled}
              className="w-full flex items-center gap-3 px-5 py-3 text-sm hover:opacity-80 disabled:opacity-40"
              style={{ color: item.danger ? colors.danger : item.accent ? colors.success : colors.textPrimary }}>
              {item.icon && <item.icon size={18} style={{ color: item.danger ? colors.danger : item.accent ? colors.success : colors.textSecondary }} />}
              {item.label}
            </button>
          ))}
        </div>
      </Modal>
      <ReorderModal
        isOpen={showReorder}
        onClose={() => setShowReorder(false)}
        totalItems={totalExercises}
        currentIndex={currentIndex}
        positionLabels={positionLabels}
        onSelect={(i) => { setShowReorder(false); onReorderToPosition?.(i) }}
      />
    </>
  )
}

export default ExerciseCard
