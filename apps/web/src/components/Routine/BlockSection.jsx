import { useMemo } from 'react'
import AddExerciseButton from './AddExerciseButton.jsx'
import ExerciseCard from './ExerciseCard.jsx'
import SupersetHeaderRow from './SupersetHeaderRow.jsx'
import { SortableList } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import {
  applyRowDrop,
  buildExerciseRows,
  canDragExerciseRow,
  collapseForDrag,
  formatSupersetLabel,
  getBlockUnits,
  getExerciseName,
  getExerciseReorderScope,
  getMembershipDropPreview,
  idsToOrderItems,
  moveExercise,
  moveSuperset,
  resolveRowDrop,
  translateBlockName,
} from '@gym/shared'

// Los ejercicios de un bloque se pintan como una lista PLANA de filas (una cabecera por
// superserie más una fila por ejercicio), no como listas anidadas: es lo que permite que el
// arrastre mueva una superserie entera y un ejercicio a cualquier hueco, con la pertenencia que
// decide el hueco (`resolveMembershipDrop`), con un único modelo, el de `lib/exerciseOrder.js`,
// compartido con native y con el menú.
//
// Como no hay una vista que envuelva a los miembros, la tarjeta morada se pinta POR FILA: la
// cabecera el borde de arriba, cada miembro los laterales y el pie el de abajo. El
// relleno de la tarjeta y el hueco entre filas van DENTRO del alto de cada fila, porque la
// aritmética del arrastre suma altos de fila (`lib/dragReorder.js`) y un margen por fuera
// descuadraría el hueco que se abre.
const ROW_GAP = 8
const CARD_PADDING = 8

// Dragging in this list can change superset membership. The list previews with this and
// `getMembershipDropPreview`, and `applyRowDrop` saves with the same flag: with it on for the save
// and off for the preview, a member would be shown clamped back into its run and saved outside it.
function resolveExerciseRowDrop(rows, activeRowId, index) {
  return resolveRowDrop(rows, activeRowId, index, true)
}

const isMemberRow = (row) => row.kind === 'exercise' && row.group != null
const isFooterRow = (row) => row.kind === 'supersetFooter'

/** Hueco sobre la fila: entre unidades sí, dentro de la tarjeta no (lo da el relleno). */
function getRowGap(row, index) {
  if (index === 0) return 0
  return isMemberRow(row) || isFooterRow(row) ? 0 : ROW_GAP
}

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
    padding: `${CARD_PADDING}px ${CARD_PADDING}px 0`,
  }
}

/**
 * The gap the dragged row would drop into (`SortableList` with `withDropSlot`): a slice of the
 * purple card when it would land in a superset, so the card's sides stay continuous around the gap,
 * and empty otherwise. The list gives it the row's height; the slot only fills it.
 */
function getDropSlotStyle(dragPreview) {
  if (dragPreview !== 'superset') return { height: '100%' }
  const border = `1px solid ${colors.purple}`
  return {
    height: '100%',
    boxSizing: 'border-box',
    backgroundColor: colors.bgSecondary,
    borderLeft: border,
    borderRight: border,
  }
}

/**
 * The floating copy that follows the pointer: always flush, without the card's sides (it never
 * lines up with them; the slot draws them). Same vertical space as at rest, so it does not jump
 * away from the pointer when lifted.
 */
function getFloatingStyle(row, index) {
  return { paddingTop: getRowGap(row, index) + (isMemberRow(row) ? CARD_PADDING : 0) }
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

  const rows = useMemo(() => buildExerciseRows(routine_exercises), [routine_exercises])
  const units = useMemo(() => getBlockUnits(routine_exercises), [routine_exercises])
  const exerciseById = useMemo(
    () => new Map(routine_exercises.map(re => [re.id, re])),
    [routine_exercises]
  )
  // Etiquetas de las posiciones de UNIDAD, para mover una superserie entera desde su menú.
  const unitLabels = useMemo(() => units.map(unit => (
    unit.kind === 'single'
      ? getExerciseName(exerciseById.get(unit.ids[0])?.exercise)
      : formatSupersetLabel(unit.group)
  )), [units, exerciseById])

  // El menú «Reordenar» de un ejercicio ofrece las posiciones de SU ámbito, el mismo que aplica
  // `moveExercise`: un miembro de una superserie se mueve dentro de su tirada, todo lo demás entre
  // las unidades del bloque. Con las posiciones planas, el menú (el único camino con lector de
  // pantalla) podía partir una superserie que el arrastre no deja partir.
  const reorderScopeById = useMemo(() => new Map(routine_exercises.map((re) => {
    const scope = getExerciseReorderScope(routine_exercises, re.id)
    if (!scope) return [re.id, { labels: [], index: 0 }]
    const labels = scope.scope === 'run'
      ? scope.ids.map(id => getExerciseName(exerciseById.get(id)?.exercise))
      : unitLabels
    return [re.id, { labels, index: scope.index }]
  })), [routine_exercises, exerciseById, unitLabels])

  const handleDrop = (_fromIndex, toIndex, activeRowId) => {
    const items = applyRowDrop(routine_exercises, rows, activeRowId, toIndex)
    if (items) onReorderBlock?.(items)
  }

  const handleReorderExercise = (exerciseId, index) => {
    const ids = moveExercise(routine_exercises, exerciseId, index)
    if (ids) onReorderBlock?.(idsToOrderItems(ids))
  }

  const handleReorderSuperset = (row, unitIndex) => {
    const ids = moveSuperset(routine_exercises, row.group, unitIndex, row.firstMemberId)
    if (ids) onReorderBlock?.(idsToOrderItems(ids))
  }

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
        <SortableList
          items={rows}
          disabled={isReordering}
          collapseForDrag={collapseForDrag}
          resolveDrop={resolveExerciseRowDrop}
          getDragPreview={getMembershipDropPreview}
          onReorder={handleDrop}
          withDropSlot
          animateShift={false}
          renderItem={(row, { dragHandleProps, isDragging, index, dragPreview, isDropSlot }) => {
            if (isFooterRow(row)) return <div style={getSegmentStyle(row)} />
            if (isDropSlot) return <div style={getDropSlotStyle(dragPreview)} />

            // Which rows get a handle is a shared rule; a row without one does not spend width on
            // a gesture that leads nowhere (`DragHandle` with null paints nothing).
            const handleProps = canDragExerciseRow(row, units.length) ? dragHandleProps : null
            const routineExercise = exerciseById.get(row.exerciseId)
            const reorderScope = reorderScopeById.get(row.exerciseId) ?? { labels: [], index: 0 }

            return (
              <div style={isDragging ? getFloatingStyle(row, index) : { paddingTop: getRowGap(row, index) }}>
                <div style={isDragging ? undefined : getSegmentStyle(row)}>
                  {row.kind === 'supersetHeader' ? (
                    <SupersetHeaderRow
                      label={formatSupersetLabel(row.group)}
                      dragHandleProps={handleProps}
                      isReordering={isReordering}
                      unitLabels={unitLabels}
                      currentUnitIndex={units.findIndex(unit => unit.ids[0] === row.firstMemberId)}
                      onReorderToUnit={(unitIndex) => handleReorderSuperset(row, unitIndex)}
                    />
                  ) : (
                    <ExerciseCard
                      routineExercise={routineExercise}
                      routineDayId={routineDayId}
                      isReordering={isReordering}
                      onEdit={() => onEditExercise?.(routineExercise)}
                      onReplace={() => onReplaceExercise?.(routineExercise)}
                      onDelete={() => onDeleteExercise?.(routineExercise)}
                      onDuplicate={() => onDuplicateExercise?.(routineExercise)}
                      onMoveToDay={() => onMoveExerciseToDay?.(routineExercise)}
                      // Also for a single member: that row does not drag, so the menu is its way out.
                      onRemoveFromSuperset={row.group != null ? () => onRemoveExerciseFromSuperset?.(routineExercise) : undefined}
                      onReorderToPosition={(newIndex) => handleReorderExercise(row.exerciseId, newIndex)}
                      currentIndex={reorderScope.index}
                      totalExercises={reorderScope.labels.length}
                      positionLabels={reorderScope.labels}
                      dragHandleProps={handleProps}
                      isDragging={isDragging}
                    />
                  )}
                </div>
              </div>
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
