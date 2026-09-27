import { memo, useMemo } from 'react'
import { View, Text } from 'react-native'
import WorkoutExerciseCard from './WorkoutExerciseCard'
import { ExerciseRowList, SupersetHeaderRow } from '../ui'
import { colors } from '../../lib/styles'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'
import { countExercisesInBlock, formatSupersetLabel, getBlockUnits, translateBlockName } from '@gym/shared'

// Alto justo para que se vean las esquinas redondeadas del pie; el último miembro le cede ese
// hueco de su padding de abajo, así la tarjeta mide lo mismo que antes.
const FOOTER_HEIGHT = 8
// `py-5` de la tarjeta suelta expandida.
const MEMBER_PADDING = 20

/** Trozo de tarjeta morada de un miembro (laterales) o del pie (borde de abajo) de una superserie. */
function getSliceStyle(row) {
  if (row.kind === 'supersetFooter') {
    return {
      height: FOOTER_HEIGHT,
      backgroundColor: colors.bgSecondary,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.purple,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    }
  }
  if (row.kind !== 'exercise' || row.group == null) return null
  return { backgroundColor: colors.bgSecondary, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.purple }
}

function BlockExerciseList({ exercisesByBlock, flatExercises = [], onCompleteSet, onUncompleteSet, onRemove, onReplace, onReorderBlock, isReordering = false, existingSupersets = [], scrollRef }) {
  // Los ejercicios de cada bloque, en orden: es lo que consume `ExerciseRowList`.
  const exercisesByWarmup = useMemo(() => ({
    true: flatExercises.filter(e => e.isWarmup),
    false: flatExercises.filter(e => !e.isWarmup),
  }), [flatExercises])
  const exerciseById = useMemo(() => new Map(flatExercises.map(e => [e.id, e])), [flatExercises])
  // Primer y último miembro de cada tirada: el resto lleva el divisor encima, como la tarjeta de
  // antes, y el último cede al pie parte de su padding de abajo.
  const { firstMemberIds, lastMemberIds } = useMemo(() => {
    const runs = [exercisesByWarmup.true, exercisesByWarmup.false]
      .flatMap(block => getBlockUnits(block))
      .filter(unit => unit.kind === 'superset')
    return {
      firstMemberIds: new Set(runs.map(unit => unit.ids[0])),
      lastMemberIds: new Set(runs.map(unit => unit.ids[unit.ids.length - 1])),
    }
  }, [exercisesByWarmup])

  return (
    <View className="gap-4">
      {exercisesByBlock.map((block) => (
        <View key={block.blockName} className="gap-2">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text
              className="text-xs font-semibold uppercase"
              style={{ color: colors.success, letterSpacing: 1 }}
            >
              {translateBlockName(block.blockName)} ({countExercisesInBlock(block)})
            </Text>
            {block.durationMin && (
              <Text className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
                ~{block.durationMin} min
              </Text>
            )}
          </View>

          <ExerciseRowList
            exercises={exercisesByWarmup[block.isWarmup]}
            scrollRef={scrollRef}
            isReordering={isReordering}
            onReorderBlock={(items) => onReorderBlock(block.isWarmup, items)}
            getSliceStyle={getSliceStyle}
            renderHeader={(row, { dragHandleProps, reorder }) => (
              <SupersetHeaderRow
                label={formatSupersetLabel(row.group)}
                count={row.runSize}
                dragHandleProps={dragHandleProps}
                isReordering={isReordering}
                unitLabels={reorder.labels}
                currentUnitIndex={reorder.index}
                onReorderToUnit={reorder.onReorderTo}
              />
            )}
            renderExercise={(exerciseId, { dragHandleProps, isDragging, reorder, onRemoveFromSuperset }) => {
              const sessionExercise = exerciseById.get(exerciseId)
              const isMember = sessionExercise.superset_group != null
              const card = (
                <WorkoutExerciseCard
                  sessionExercise={sessionExercise}
                  onCompleteSet={onCompleteSet}
                  onUncompleteSet={onUncompleteSet}
                  onRemove={onRemove}
                  onReplace={onReplace}
                  isSuperset={isMember}
                  reorder={reorder}
                  isReordering={isReordering}
                  onRemoveFromSuperset={onRemoveFromSuperset}
                  dragHandleProps={dragHandleProps}
                  isDragging={isDragging}
                  existingSupersets={existingSupersets}
                />
              )
              if (!isMember) return card

              // Dentro de una superserie la tarjeta no pinta su envoltorio: lo pone este, con el
              // borde del grupo muscular DENTRO del trozo morado para que los dos `borderLeft` no
              // choquen. Mismo padding que la tarjeta de un ejercicio suelto expandida.
              return (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingTop: MEMBER_PADDING,
                    paddingBottom: lastMemberIds.has(exerciseId) && !isDragging ? MEMBER_PADDING - FOOTER_HEIGHT : MEMBER_PADDING,
                    ...getMuscleGroupBorderStyle(sessionExercise.exercise?.muscle_group?.name),
                    ...(!isDragging && !firstMemberIds.has(exerciseId) ? { borderTopWidth: 1, borderTopColor: colors.border } : null),
                    ...(isDragging
                      ? { backgroundColor: colors.bgSecondary, borderRadius: 8, shadowColor: colors.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } }
                      : null),
                  }}
                >
                  {card}
                </View>
              )
            }}
          />
        </View>
      ))}
    </View>
  )
}

export default memo(BlockExerciseList)
