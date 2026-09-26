import { useMemo } from 'react'
import { View, Text } from 'react-native'
import AddExerciseButton from './AddExerciseButton'
import ExerciseCard from './ExerciseCard'
import SupersetHeaderRow from './SupersetHeaderRow'
import { DraggableList } from '../ui'
import { colors } from '../../lib/styles'
import {
  applyRowDrop,
  buildExerciseRows,
  collapseForDrag,
  formatSupersetLabel,
  getBlockUnits,
  getExerciseName,
  getExerciseReorderScope,
  moveExercise,
  moveSuperset,
  resolveRowDrop,
  translateBlockName,
} from '@gym/shared'

// Los ejercicios de un bloque se pintan como una lista PLANA de filas (una cabecera por
// superserie más una fila por ejercicio), no como listas anidadas: es lo que permite que el
// arrastre mueva una superserie entera, un miembro dentro de la suya y un individual entre
// unidades con un único modelo, el de `lib/exerciseOrder.js`, compartido con web y con el menú.
//
// Como no hay una vista que envuelva a los miembros, la tarjeta morada se pinta POR FILA: la
// cabecera el borde de arriba, cada miembro los laterales, el último también el de abajo. El
// relleno de la tarjeta y el hueco entre filas van DENTRO del alto de cada fila, porque la
// aritmética del arrastre suma altos de fila (`lib/dragReorder.js`) y un margen por fuera
// descuadraría el hueco que se abre.
const ROW_GAP = 8
const CARD_PADDING = 8

/** Hueco sobre la fila: entre unidades sí, entre la cabecera y sus miembros no (lo da el relleno). */
function getRowGap(row, index) {
  if (index === 0) return 0
  return row.kind === 'exercise' && row.group != null ? 0 : ROW_GAP
}

/** Trozo de borde morado y relleno interior que pinta cada fila de una superserie. */
function getSegmentStyle(row) {
  if (row.kind !== 'exercise' || row.group == null) return null
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

  const handleDrop = (_fromIndex, toIndex, activeRowId) => {
    const ids = applyRowDrop(routine_exercises, rows, activeRowId, toIndex)
    if (ids) onReorderBlock?.(ids)
  }

  const handleReorderExercise = (exerciseId, index) => {
    const ids = moveExercise(routine_exercises, exerciseId, index)
    if (ids) onReorderBlock?.(ids)
  }

  const handleReorderSuperset = (row, unitIndex) => {
    const ids = moveSuperset(routine_exercises, row.group, unitIndex, row.firstMemberId)
    if (ids) onReorderBlock?.(ids)
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
          // Con una sola unidad no hay nada que reordenar: sin asa, la fila no gasta ancho en un
          // gesto que no lleva a ninguna parte (`DragHandle` con null no pinta nada).
          disabled={units.length < 2 || isReordering}
          collapseForDrag={collapseForDrag}
          resolveDrop={resolveRowDrop}
          onReorder={handleDrop}
          renderItem={(row, { dragHandleProps, isDragging, index }) => {
            // Una tirada de un solo miembro no da asa a su miembro: la cabecera de encima ya
            // arrastra esa misma tirada, y un arrastre de la fila la separaría de su cabecera.
            const canDrag = units.length >= 2 && !(row.kind === 'exercise' && row.runSize === 1)
            const handleProps = canDrag ? dragHandleProps : null
            const routineExercise = exerciseById.get(row.exerciseId)
            const reorderScope = reorderScopeById.get(row.exerciseId) ?? { labels: [], index: 0 }

            return (
              <View style={{ paddingTop: getRowGap(row, index) }}>
                <View style={getSegmentStyle(row)}>
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
