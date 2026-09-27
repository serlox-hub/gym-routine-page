import { useMemo } from 'react'
import SortableList from './SortableList.jsx'
import { colors, design } from '../../lib/styles.js'
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
  placeInSupersetForBlocks,
  resolveRowDrop,
} from '@gym/shared'

// Los ejercicios de un bloque (de un día de rutina o de la sesión) se pintan como una lista PLANA
// de filas (una cabecera y un pie por superserie más una fila por ejercicio), no como listas
// anidadas: es lo que permite que el arrastre mueva una superserie entera y un ejercicio a
// cualquier hueco, con la pertenencia que decide el hueco (`resolveMembershipDrop`), con un único
// modelo, el de `lib/exerciseOrder.js`, compartido con native y con el menú. Rutina y sesión pasan
// por AQUÍ: cada pantalla solo dice qué pinta una fila y cómo se ven sus trozos de tarjeta.
//
// Como no hay una vista que envuelva a los miembros, la tarjeta morada se pinta POR FILA: la
// cabecera el borde de arriba, cada miembro los laterales y el pie el de abajo (`getSliceStyle`).
// El relleno de la tarjeta y el hueco entre filas van DENTRO del alto de cada fila, porque la
// aritmética del arrastre suma altos de fila (`lib/dragReorder.js`) y un margen por fuera
// descuadraría el hueco que se abre.
const ROW_GAP = design.exerciseRowGap

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

const EMPTY_SCOPE = { labels: [], index: 0 }

/**
 * Default drop slot: a slice of the purple card (its sides) when the row would land in a superset,
 * so the card stays continuous around the gap, and empty otherwise. The list gives it the row's
 * height; the slot only fills it.
 */
function getDefaultSlotStyle(dragPreview) {
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
 * @param {object} props
 * @param {Array<{ id: number, sort_order: number, superset_group: number|null, exercise?: object }>} props.exercises - One block
 * @param {boolean} [props.isReordering] - Mutation in flight: list disabled, handles dimmed
 * @param {(items: Array<{ id: number, supersetGroup?: number|null }>) => void} props.onReorderBlock - The whole block in its new order
 * @param {(exerciseId: number, rowProps: object) => import('react').ReactNode} props.renderExercise
 * @param {(row: object, rowProps: object) => import('react').ReactNode} props.renderHeader
 * @param {(row: object, index: number) => object|undefined} props.getSliceStyle - The card slice of a member/footer row
 * @param {(dragPreview: string|null) => object} [props.getSlotStyle] - The drop slot (default: purple sides when joining)
 */
function ExerciseRowList({
  exercises,
  isReordering = false,
  onReorderBlock,
  renderExercise,
  renderHeader,
  getSliceStyle,
  getSlotStyle = getDefaultSlotStyle,
}) {
  const rows = useMemo(() => buildExerciseRows(exercises), [exercises])
  const units = useMemo(() => getBlockUnits(exercises), [exercises])
  const exerciseById = useMemo(() => new Map(exercises.map(e => [e.id, e])), [exercises])
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
  const reorderScopeById = useMemo(() => new Map(exercises.map((e) => {
    const scope = getExerciseReorderScope(exercises, e.id)
    if (!scope) return [e.id, EMPTY_SCOPE]
    const labels = scope.scope === 'run'
      ? scope.ids.map(id => getExerciseName(exerciseById.get(id)?.exercise))
      : unitLabels
    return [e.id, { labels, index: scope.index }]
  })), [exercises, exerciseById, unitLabels])

  const handleDrop = (_fromIndex, toIndex, activeRowId) => {
    const items = applyRowDrop(exercises, rows, activeRowId, toIndex)
    if (items) onReorderBlock?.(items)
  }

  const handleReorderExercise = (exerciseId, index) => {
    const ids = moveExercise(exercises, exerciseId, index)
    if (ids) onReorderBlock?.(idsToOrderItems(ids))
  }

  const handleReorderSuperset = (row, unitIndex) => {
    const ids = moveSuperset(exercises, row.group, unitIndex, row.firstMemberId)
    if (ids) onReorderBlock?.(idsToOrderItems(ids))
  }

  // Default placement: right after the superset it leaves. The block alone is enough: the rule
  // never looks outside the exercise's own block.
  const handleRemoveFromSuperset = (exerciseId) => {
    const items = placeInSupersetForBlocks(exercises, { exerciseId, supersetGroup: null })
    if (items) onReorderBlock?.(items)
  }

  // Own wrapper: a parent with `space-y-*` would otherwise put a margin between the rows and split
  // the purple card.
  return (
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
          if (isFooterRow(row)) return <div style={getSliceStyle(row, index)} />
          if (isDropSlot) return <div style={getSlotStyle(dragPreview)} />

          // Which rows get a handle is a shared rule; a row without one does not spend width on a
          // gesture that leads nowhere (`DragHandle` with null paints nothing).
          const handleProps = canDragExerciseRow(row, units.length) ? dragHandleProps : null
          const slice = getSliceStyle(row, index)
          const isHeader = row.kind === 'supersetHeader'

          const rowProps = isHeader
            ? {
                dragHandleProps: handleProps,
                isDragging,
                reorder: {
                  labels: unitLabels,
                  index: units.findIndex(unit => unit.ids[0] === row.firstMemberId),
                  onReorderTo: (unitIndex) => handleReorderSuperset(row, unitIndex),
                },
              }
            : {
                dragHandleProps: handleProps,
                isDragging,
                reorder: {
                  ...(reorderScopeById.get(row.exerciseId) ?? EMPTY_SCOPE),
                  onReorderTo: (newIndex) => handleReorderExercise(row.exerciseId, newIndex),
                },
                // Also for a single member: that row does not drag, so the menu is its way out.
                onRemoveFromSuperset: row.group != null ? () => handleRemoveFromSuperset(row.exerciseId) : undefined,
              }

          // The floating copy that follows the pointer is always flush, without the card's sides (it
          // never lines up with them; the slot draws them), and keeps the same vertical space as at
          // rest, so it does not jump away from the pointer when lifted.
          const gap = getRowGap(row, index)
          const outerStyle = isDragging ? { paddingTop: gap + (slice?.paddingTop ?? 0) } : { paddingTop: gap }

          return (
            <div style={outerStyle}>
              <div style={isDragging ? undefined : slice}>
                {isHeader ? renderHeader(row, rowProps) : renderExercise(row.exerciseId, rowProps)}
              </div>
            </div>
          )
        }}
      />
    </div>
  )
}

export default ExerciseRowList
