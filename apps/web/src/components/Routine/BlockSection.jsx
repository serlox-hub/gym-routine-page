import AddExerciseButton from './AddExerciseButton.jsx'
import ExerciseCard from './ExerciseCard.jsx'
import { ExerciseRowList, SupersetHeaderRow } from '../ui/index.js'
import { colors, design } from '../../lib/styles.js'
import { formatSupersetLabel, translateBlockName } from '@gym/shared'

const ROW_GAP = design.exerciseRowGap
const CARD_PADDING = 8

const isMemberRow = (row) => row.kind === 'exercise' && row.group != null
const isFooterRow = (row) => row.kind === 'supersetFooter'

/** Trozo de borde morado y relleno interior que pinta cada miembro y el pie de una superserie. */
function getSegmentStyle(row) {
  const border = `1px solid ${colors.purple}`
  if (isFooterRow(row)) {
    return {
      backgroundColor: colors.bgSecondary,
      borderLeft: border,
      borderRight: border,
      borderBottom: border,
      paddingBottom: CARD_PADDING,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    }
  }
  if (!isMemberRow(row)) return undefined
  return {
    backgroundColor: colors.bgSecondary,
    borderLeft: border,
    borderRight: border,
    // Longhands: `ExerciseRowList` reads `paddingTop` to keep the floating copy's vertical space.
    paddingTop: CARD_PADDING,
    paddingLeft: CARD_PADDING,
    paddingRight: CARD_PADDING,
  }
}

function BlockSection({
  block,
  routineDayId,
  isReordering = false,
  onAddExercise,
  onEditExercise,
  onReplaceExercise,
  onReorderBlock,
  onDeleteExercise,
  onDuplicateExercise,
  onMoveExerciseToDay,
  onRemoveExerciseFromSuperset,
}) {
  const { name, duration_min, routine_exercises } = block
  const isWarmup = block.is_warmup || name.toLowerCase() === 'calentamiento'

  const exerciseById = new Map(routine_exercises.map(re => [re.id, re]))

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: colors.success }}
        >
          {translateBlockName(name)} ({routine_exercises.length})
        </span>
        {duration_min && (
          <span className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
            ~{duration_min} min
          </span>
        )}
      </div>

      <div>
        <ExerciseRowList
          exercises={routine_exercises}
          isReordering={isReordering}
          onReorderBlock={onReorderBlock}
          getSliceStyle={getSegmentStyle}
          renderHeader={(row, { dragHandleProps, reorder }) => (
            <SupersetHeaderRow
              label={formatSupersetLabel(row.group)}
              dragHandleProps={dragHandleProps}
              isReordering={isReordering}
              unitLabels={reorder.labels}
              currentUnitIndex={reorder.index}
              onReorderToUnit={reorder.onReorderTo}
            />
          )}
          renderExercise={(exerciseId, { dragHandleProps, isDragging, reorder, onRemoveFromSuperset }) => {
            const routineExercise = exerciseById.get(exerciseId)
            return (
              <ExerciseCard
                routineExercise={routineExercise}
                routineDayId={routineDayId}
                isReordering={isReordering}
                onEdit={() => onEditExercise?.(routineExercise)}
                onReplace={() => onReplaceExercise?.(routineExercise)}
                onDelete={() => onDeleteExercise?.(routineExercise)}
                onDuplicate={() => onDuplicateExercise?.(routineExercise)}
                onMoveToDay={() => onMoveExerciseToDay?.(routineExercise)}
                // The routine keeps its own path (`useSetRoutineExerciseSupersetGroup`), which reads the day from the DB.
                onRemoveFromSuperset={onRemoveFromSuperset ? () => onRemoveExerciseFromSuperset?.(routineExercise) : undefined}
                onReorderToPosition={reorder.onReorderTo}
                currentIndex={reorder.index}
                totalExercises={reorder.labels.length}
                positionLabels={reorder.labels}
                dragHandleProps={dragHandleProps}
                isDragging={isDragging}
              />
            )
          }}
        />
        <div style={{ paddingTop: ROW_GAP }}>
          <AddExerciseButton isWarmup={isWarmup} onClick={onAddExercise} />
        </div>
      </div>
    </section>
  )
}

export default BlockSection
