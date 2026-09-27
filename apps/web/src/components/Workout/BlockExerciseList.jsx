import { useMemo } from 'react'
import WorkoutExerciseCard from './WorkoutExerciseCard.jsx'
import { ExerciseRowList, SupersetHeaderRow } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'
import { countExercisesInBlock, formatSupersetLabel, getBlockUnits, translateBlockName } from '@gym/shared'

const purpleBorder = `1px solid ${colors.purple}`
const FOOTER_HEIGHT = 8
// `py-5` de la tarjeta suelta expandida.
const MEMBER_PADDING = 20

/** Trozo de tarjeta morada de un miembro (laterales) o del pie (borde de abajo) de una superserie. */
function getSliceStyle(row) {
  if (row.kind === 'supersetFooter') {
    return {
      // Alto justo para que se vean las esquinas redondeadas; el último miembro le cede ese hueco
      // de su padding de abajo, así la tarjeta mide lo mismo que antes.
      height: FOOTER_HEIGHT,
      backgroundColor: colors.bgSecondary,
      borderLeft: purpleBorder,
      borderRight: purpleBorder,
      borderBottom: purpleBorder,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    }
  }
  if (row.kind !== 'exercise' || row.group == null) return undefined
  return { backgroundColor: colors.bgSecondary, borderLeft: purpleBorder, borderRight: purpleBorder }
}

function BlockExerciseList({ exercisesByBlock, flatExercises = [], onCompleteSet, onUncompleteSet, onRemove, onReplace, onReorderBlock, isReordering = false, existingSupersets = [] }) {
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
    <>
      {exercisesByBlock.map((block) => {
        const exercises = exercisesByWarmup[block.isWarmup]

        return (
          <section key={block.blockName} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: colors.success }}
              >
                {translateBlockName(block.blockName)} ({countExercisesInBlock(block)})
              </span>
              {block.durationMin && (
                <span className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
                  ~{block.durationMin} min
                </span>
              )}
            </div>

            <ExerciseRowList
              exercises={exercises}
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
                // borde del grupo muscular DENTRO del trozo morado para que los dos `borderLeft`
                // no choquen. Mismo padding que la tarjeta de un ejercicio suelto expandida.
                return (
                  <div
                    className="px-4 pt-5"
                    style={{
                      paddingBottom: lastMemberIds.has(exerciseId) && !isDragging ? MEMBER_PADDING - FOOTER_HEIGHT : MEMBER_PADDING,
                      ...getMuscleGroupBorderStyle(sessionExercise.exercise?.muscle_group?.name),
                      ...(!isDragging && !firstMemberIds.has(exerciseId) ? { borderTop: `1px solid ${colors.border}` } : null),
                      ...(isDragging ? { backgroundColor: colors.bgSecondary, borderRadius: 8, boxShadow: `0 8px 24px ${colors.shadow}` } : null),
                    }}
                  >
                    {card}
                  </div>
                )
              }}
            />
          </section>
        )
      })}
    </>
  )
}

export default BlockExerciseList
