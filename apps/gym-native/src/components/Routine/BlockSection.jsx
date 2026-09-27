import { View, Text } from 'react-native'
import AddExerciseButton from './AddExerciseButton'
import ExerciseCard from './ExerciseCard'
import { ExerciseRowList, SupersetHeaderRow } from '../ui'
import { colors, design } from '../../lib/styles'
import { formatSupersetLabel, translateBlockName } from '@gym/shared'

const ROW_GAP = design.exerciseRowGap
const CARD_PADDING = 8

const isMemberRow = (row) => row.kind === 'exercise' && row.group != null
const isFooterRow = (row) => row.kind === 'supersetFooter'

/** Trozo de borde morado y relleno interior que pinta cada miembro y el pie de una superserie. */
function getSegmentStyle(row) {
  if (isFooterRow(row)) {
    return {
      backgroundColor: colors.bgSecondary,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.purple,
      paddingBottom: CARD_PADDING,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    }
  }
  if (!isMemberRow(row)) return null
  return {
    backgroundColor: colors.bgSecondary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.purple,
    paddingHorizontal: CARD_PADDING,
    // `ExerciseRowList` reads it to keep the row in flight's vertical space.
    paddingTop: CARD_PADDING,
  }
}

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
  onRemoveExerciseFromSuperset,
  onReorderBlock,
  scrollRef,
}) {
  const { name, duration_min, routine_exercises } = block
  const isWarmup = block.is_warmup || name.toLowerCase() === 'calentamiento'

  const exerciseById = new Map(routine_exercises.map(re => [re.id, re]))

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

      <View>
        <ExerciseRowList
          exercises={routine_exercises}
          scrollRef={scrollRef}
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
        <View style={{ paddingTop: ROW_GAP }}>
          <AddExerciseButton isWarmup={isWarmup} onPress={onAddExercise} />
        </View>
      </View>
    </View>
  )
}
