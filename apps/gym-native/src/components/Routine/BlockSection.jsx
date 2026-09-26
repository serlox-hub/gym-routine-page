import { useMemo } from 'react'
import { View, Text } from 'react-native'
import AddExerciseButton from './AddExerciseButton'
import ExerciseCard from './ExerciseCard'
import SupersetHeaderRow from './SupersetHeaderRow'
import { DraggableList } from '../ui'
import { colors, design } from '../../lib/styles'
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
// compartido con web y con el menú.
//
// Como no hay una vista que envuelva a los miembros, la tarjeta morada se pinta POR FILA: la
// cabecera el borde de arriba, cada miembro los laterales, el último también el de abajo. El
// relleno de la tarjeta y el hueco entre filas van DENTRO del alto de cada fila, porque la
// aritmética del arrastre suma altos de fila (`lib/dragReorder.js`) y un margen por fuera
// descuadraría el hueco que se abre.
const ROW_GAP = 8
const CARD_PADDING = 8

// A number and not `design.supersetIndent` inside the worklet: capturing the `design` object would
// copy it whole to the UI thread (and freeze it in development).
const SUPERSET_INDENT = design.supersetIndent

// Dragging in this list can change superset membership. The list previews with these two
// functions and `applyRowDrop` saves with the same arguments: with the flag on for the save and off
// for the preview, a member would be shown clamped back into its run and saved outside it.
// They are worklets because `DraggableList` calls them from the UI thread.
function resolveExerciseRowDrop(rows, activeRowId, index) {
  'worklet'
  return resolveRowDrop(rows, activeRowId, index, true)
}

function getExerciseDragPreview(rows, activeRowId, index, offsetX) {
  'worklet'
  return getMembershipDropPreview(rows, activeRowId, index, offsetX, SUPERSET_INDENT)
}

/** Hueco sobre la fila: entre unidades sí, entre la cabecera y sus miembros no (lo da el relleno). */
function getRowGap(row, index) {
  if (index === 0) return 0
  return row.kind === 'exercise' && row.group != null ? 0 : ROW_GAP
}

const isMemberRow = (row) => row.kind === 'exercise' && row.group != null

/** Trozo de borde morado y relleno interior que pinta cada fila de una superserie. */
function getSegmentStyle(row) {
  if (!isMemberRow(row)) return null
  return {
    backgroundColor: colors.bgSecondary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.purple,
    paddingHorizontal: CARD_PADDING,
    paddingTop: CARD_PADDING,
    ...(row.segment === 'end' ? {
      borderBottomWidth: 1,
      paddingBottom: CARD_PADDING,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    } : null),
  }
}

/**
 * The dragged row, painted as it will look once dropped: a slice of the purple card
 * (`dragPreview === 'superset'`) or flush. The card's own side padding is the indent, so nothing
 * is translated sideways. Only the sides change: the vertical space stays the resting one, because
 * `DraggableList` opens the gap with the height measured at lift, and a row that grew or shrank
 * mid-drag would push every row below it.
 */
function getDragPreviewStyle(row, index, dragPreview) {
  const member = isMemberRow(row)
  const style = {
    paddingTop: getRowGap(row, index) + (member ? CARD_PADDING : 0),
    // The resting last member closes the card: its bottom padding plus the 1px border.
    paddingBottom: member && row.segment === 'end' ? CARD_PADDING + 1 : 0,
  }
  if (dragPreview !== 'superset') return style
  return {
    ...style,
    backgroundColor: colors.bgSecondary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.purple,
    paddingHorizontal: CARD_PADDING,
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

  const handleDrop = (_fromIndex, toIndex, activeRowId, offsetX) => {
    const items = applyRowDrop(routine_exercises, rows, activeRowId, toIndex, offsetX, SUPERSET_INDENT)
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
        <DraggableList
          items={rows}
          scrollRef={scrollRef}
          disabled={isReordering}
          collapseForDrag={collapseForDrag}
          resolveDrop={resolveExerciseRowDrop}
          getDragPreview={getExerciseDragPreview}
          onReorder={handleDrop}
          renderItem={(row, { dragHandleProps, isDragging, index, dragPreview }) => {
            // Which rows get a handle is a shared rule; a row without one does not spend width on
            // a gesture that leads nowhere (`DragHandle` with null paints nothing).
            const handleProps = canDragExerciseRow(row, units.length) ? dragHandleProps : null
            const routineExercise = exerciseById.get(row.exerciseId)
            const reorderScope = reorderScopeById.get(row.exerciseId) ?? { labels: [], index: 0 }
            const previewing = dragPreview != null

            return (
              <View style={previewing ? getDragPreviewStyle(row, index, dragPreview) : { paddingTop: getRowGap(row, index) }}>
                <View style={previewing ? null : getSegmentStyle(row)}>
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
                </View>
              </View>
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
