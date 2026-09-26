// Reglas de colocación de los ejercicios de UN bloque de un día de rutina (calentamiento o
// principal), y el modelo de filas con el que se pintan y se arrastran.
//
// Un superset no es una entidad guardada: es una TIRADA de filas CONSECUTIVAS (por `sort_order`,
// dentro del bloque) que comparten `superset_group`, exactamente como lo pinta
// `groupExercisesBySupersetId`. Así que cualquier movimiento tiene que decidir DÓNDE cae la fila,
// o el superset aparece como dos tarjetas moradas con la misma etiqueta.
//
// El modelo es la UNIDAD: un ejercicio individual, o una tirada consecutiva de un grupo. Un grupo
// ya partido en dos tiradas sigue siendo dos unidades; nada se junta ni se cura a espaldas del
// usuario, así que el menú, el arrastre y el render comparten modelo y ningún movimiento reordena
// ejercicios que el usuario no ha tocado.
//
// Membership only changes through `placeInSuperset`, which places the row and sets its group in
// the SAME result: that is what keeps a write from leaving a superset split into two cards. Drag
// reaches it through `resolveMembershipDrop` + `membershipDropToPlacement`; the position menu still
// never changes membership (a member only moves within its own run).
//
// ⚠️ Todas las funciones llevan la directiva `'worklet'` y el módulo NO tiene imports, igual que
// `lib/dragReorder.js`: native llama a estas desde el HILO DE UI durante el arrastre, y un worklet
// no puede capturar un módulo que no esté workletizado ni ser definido por uno. Las funciones de
// ESTE archivo sí pueden llamarse entre ellas (todas lo están). En web y en los tests la directiva
// es una cadena inerte al principio del cuerpo.
//
// Los índices son POSICIONES FINALES (el convenio de `arrayMove` que ya usan `getDropIndex` y
// `SortableList`): se cuentan sobre la lista con el elemento movido quitado y reinsertado.

/**
 * Normaliza las filas de un bloque a `{ id, superset_group, sort_order }` ordenadas por `sort_order`.
 * @param {Array} exercises
 * @returns {Array<{ id: number, superset_group: number|null, sort_order: number }>}
 */
function normalizeRows(exercises) {
  'worklet'
  const rows = []
  for (let i = 0; i < exercises.length; i++) {
    const row = exercises[i]
    rows.push({
      id: row.id,
      superset_group: row.superset_group == null ? null : row.superset_group,
      sort_order: row.sort_order,
    })
  }
  return rows.sort((a, b) => a.sort_order - b.sort_order)
}

/** Índice de la unidad que contiene `exerciseId`, o -1. */
function findUnitIndex(units, exerciseId) {
  'worklet'
  for (let i = 0; i < units.length; i++) {
    if (units[i].ids.indexOf(exerciseId) !== -1) return i
  }
  return -1
}

/** Posición de la fila con `id` dentro de una lista de filas, o -1. */
function findRowIndex(rows, id) {
  'worklet'
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return i
  }
  return -1
}

/** Copia de `array` con el elemento de `from` movido a la posición final `to`. */
function moveIndex(array, from, to) {
  'worklet'
  const result = array.slice()
  const removed = result.splice(from, 1)[0]
  result.splice(to, 0, removed)
  return result
}

/** Aplana las unidades de vuelta a una lista plana de ids. */
function flattenUnits(units) {
  'worklet'
  const ids = []
  for (let i = 0; i < units.length; i++) {
    for (let j = 0; j < units[i].ids.length; j++) ids.push(units[i].ids[j])
  }
  return ids
}

/** Copy of `array` without the element at `index`. */
function removeAt(array, index) {
  'worklet'
  const result = []
  for (let i = 0; i < array.length; i++) {
    if (i !== index) result.push(array[i])
  }
  return result
}

/**
 * A block's order as `reorderRoutineExercises` items. Only the moved one carries `supersetGroup`,
 * and only when it is passed (`undefined` = its membership does not change).
 */
function toOrderItems(ids, movedId, supersetGroup) {
  'worklet'
  const items = []
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === movedId && supersetGroup !== undefined) items.push({ id: ids[i], supersetGroup })
    else items.push({ id: ids[i] })
  }
  return items
}

/**
 * `null` → `null`; an array of ids → `reorderRoutineExercises` items with no membership change.
 * The position menus (`moveExercise`, `moveSuperset`) produce ids; the reorder path takes items.
 */
export function idsToOrderItems(ids) {
  'worklet'
  return ids ? toOrderItems(ids, null, undefined) : null
}

/**
 * Unidades de un bloque tal y como se pintan: individuales y tiradas consecutivas (un grupo
 * partido en dos tiradas = dos unidades).
 *
 * @param {Array} exercises - Ejercicios de un bloque, en cualquier orden, como `{ id, superset_group, sort_order }`
 * @returns {Array<{ kind: 'single', ids: number[] } | { kind: 'superset', group: number, ids: number[] }>}
 */
export function getBlockUnits(exercises) {
  'worklet'
  if (!exercises || exercises.length === 0) return []

  const rows = normalizeRows(exercises)
  const units = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const last = units.length > 0 ? units[units.length - 1] : null
    if (row.superset_group == null) {
      units.push({ kind: 'single', ids: [row.id] })
    } else if (last && last.kind === 'superset' && last.group === row.superset_group) {
      last.ids.push(row.id)
    } else {
      units.push({ kind: 'superset', group: row.superset_group, ids: [row.id] })
    }
  }

  return units
}

/**
 * Mueve un ejercicio a una posición final de su ámbito: un individual entre las unidades de su
 * bloque, un miembro de una tirada solo dentro de su tirada. La pertenencia no se toca nunca.
 *
 * Una tirada de un solo miembro se mueve como unidad a propósito: dentro no hay nada que
 * reordenar, y mover esa unidad entre las del bloque no puede partir nada.
 *
 * @param {Array} exercises - Ejercicios de un bloque
 * @param {number} exerciseId
 * @param {number} targetIndex - Posición final en el ámbito (unidades del bloque o miembros de la tirada)
 * @returns {number[]|null} El nuevo orden de ids del bloque, o null si no hay nada que escribir
 */
export function moveExercise(exercises, exerciseId, targetIndex) {
  'worklet'
  const units = getBlockUnits(exercises)
  const unitIndex = findUnitIndex(units, exerciseId)
  if (unitIndex === -1) return null

  const unit = units[unitIndex]
  const inRun = unit.kind === 'superset' && unit.ids.length > 1
  const count = inRun ? unit.ids.length : units.length
  const current = inRun ? unit.ids.indexOf(exerciseId) : unitIndex

  // `null >= 0` es true en JS, así que la comprobación de nulo va primero: "sin posición" no
  // puede mover una fila.
  if (targetIndex == null || !(targetIndex >= 0) || targetIndex >= count || targetIndex === current) return null

  if (!inRun) return flattenUnits(moveIndex(units, unitIndex, targetIndex))

  const reordered = units.slice()
  reordered[unitIndex] = { kind: 'superset', group: unit.group, ids: moveIndex(unit.ids, current, targetIndex) }
  return flattenUnits(reordered)
}

/**
 * Ámbito de reordenación de un ejercicio: las posiciones que su menú puede ofrecer y en cuál está
 * hoy. Es el mismo reparto que aplica `moveExercise`, expuesto para que el menú no tenga que
 * deducirlo: un miembro de una tirada de más de uno se mueve DENTRO de su tirada, y todo lo demás
 * entre las unidades del bloque.
 *
 * Los `ids` del ámbito `'unit'` son el PRIMER miembro de cada unidad, que es la clave con la que
 * `buildExerciseRows` identifica una tirada y con la que el que llama puede emparejar etiquetas.
 *
 * @param {Array} exercises - Ejercicios de un bloque
 * @param {number} exerciseId
 * @returns {{ scope: 'run'|'unit', ids: number[], index: number }|null} null si el ejercicio no está
 */
export function getExerciseReorderScope(exercises, exerciseId) {
  'worklet'
  const units = getBlockUnits(exercises)
  const unitIndex = findUnitIndex(units, exerciseId)
  if (unitIndex === -1) return null

  const unit = units[unitIndex]
  if (unit.kind === 'superset' && unit.ids.length > 1) {
    return { scope: 'run', ids: unit.ids.slice(), index: unit.ids.indexOf(exerciseId) }
  }

  const ids = []
  for (let i = 0; i < units.length; i++) ids.push(units[i].ids[0])
  return { scope: 'unit', ids, index: unitIndex }
}

/**
 * Mueve una tirada COMPLETA a una posición final entre las unidades del bloque. La usan el
 * arrastre de la cabecera morada y su "Reordenar superset".
 *
 * `firstMemberId` desempata cuando el grupo está partido en dos tiradas (las dos tienen el mismo
 * `group`): sin él se mueve la primera. Es el dato que lleva la fila de cabecera, que sobrevive
 * al plegado del arrastre cuando sus miembros ya no están en la lista.
 *
 * @param {Array} exercises - Ejercicios de un bloque
 * @param {number} group - `superset_group` de la tirada
 * @param {number} targetUnitIndex - Posición final entre las unidades del bloque
 * @param {number} [firstMemberId] - Id del primer miembro de la tirada que se mueve
 * @returns {number[]|null} El nuevo orden de ids del bloque, o null si no hay nada que escribir
 */
export function moveSuperset(exercises, group, targetUnitIndex, firstMemberId) {
  'worklet'
  const units = getBlockUnits(exercises)

  let unitIndex = -1
  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    if (unit.kind !== 'superset' || unit.group !== group) continue
    if (firstMemberId == null || unit.ids[0] === firstMemberId) {
      unitIndex = i
      break
    }
  }
  if (unitIndex === -1) return null

  if (targetUnitIndex == null || !(targetUnitIndex >= 0) || targetUnitIndex >= units.length || targetUnitIndex === unitIndex) return null

  return flattenUnits(moveIndex(units, unitIndex, targetUnitIndex))
}

/**
 * Joins an exercise to a superset (`group`) or takes it out (`null`), and PLACES it in the same
 * result. Writing the group without placing the row next to its run would render the superset as
 * two purple cards with the same label.
 *
 * - Join: by default it goes right after the last member of the group's LAST run in the block;
 *   `targetIndex` is the final position within that run. If the group has no members in the
 *   block, there is no run to join: an individual takes the group where it is, and a member of a
 *   run of more than one goes right after that run first (set in place in the middle, it would
 *   split it).
 * - Leave: by default it goes right after the run it leaves; `targetIndex` is the final position
 *   among the block's units (counted without the exercise, which comes back as its own unit).
 *
 * `firstMemberId` picks WHICH run of the group when it is split in two, with the same tiebreaker
 * (and for the same reason) as `moveSuperset`. Joining the OTHER run of the group it already
 * belongs to is a real move (with no `supersetGroup` change); joining its own run is nothing.
 *
 * @param {Array} exercises - One block's exercises
 * @param {number} exerciseId
 * @param {number|null} group - Group to join, or null to leave
 * @param {number} [targetIndex] - Explicit final position (see above)
 * @param {number} [firstMemberId] - First member of the target run
 * @returns {Array<{ id: number, supersetGroup?: number|null }>|null} The whole block in its new
 *   order (only the moved one carries `supersetGroup`, and only if it changes), or null if there
 *   is nothing to write
 */
export function placeInSuperset(exercises, exerciseId, group, targetIndex, firstMemberId) {
  'worklet'
  const units = getBlockUnits(exercises)
  const ownIndex = findUnitIndex(units, exerciseId)
  if (ownIndex === -1) return null
  if (targetIndex != null && !(targetIndex >= 0)) return null

  const ownUnit = units[ownIndex]
  const currentGroup = ownUnit.kind === 'superset' ? ownUnit.group : null
  const nextGroup = group == null ? null : group

  if (nextGroup == null) {
    if (currentGroup == null) return null

    // The units without the exercise. Its own unit disappears if it was the only member.
    const rest = []
    let defaultIndex = 0
    for (let i = 0; i < units.length; i++) {
      if (i !== ownIndex) {
        rest.push(units[i])
        continue
      }
      const remaining = []
      for (let j = 0; j < ownUnit.ids.length; j++) {
        if (ownUnit.ids[j] !== exerciseId) remaining.push(ownUnit.ids[j])
      }
      if (remaining.length > 0) rest.push({ kind: 'superset', group: ownUnit.group, ids: remaining })
      // Right after the run it leaves; if it was the only member, where the run was.
      defaultIndex = rest.length
    }

    const insertAt = targetIndex == null ? defaultIndex : targetIndex
    if (insertAt > rest.length) return null
    rest.splice(insertAt, 0, { kind: 'single', ids: [exerciseId] })
    return toOrderItems(flattenUnits(rest), exerciseId, null)
  }

  if (nextGroup === currentGroup && (firstMemberId == null || ownUnit.ids[0] === firstMemberId)) return null

  // Target run: the one starting at `firstMemberId`, or the group's last one. Its own run cannot
  // come up here: its group is the current one, and that case already returned above.
  let targetUnit = -1
  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    if (i === ownIndex || unit.kind !== 'superset' || unit.group !== nextGroup) continue
    if (firstMemberId == null) {
      targetUnit = i
    } else if (unit.ids[0] === firstMemberId) {
      targetUnit = i
      break
    }
  }

  const changedGroup = nextGroup !== currentGroup ? nextGroup : undefined
  const ids = flattenUnits(units)

  if (targetUnit === -1) {
    if (firstMemberId != null || (targetIndex != null && targetIndex !== 0)) return null
    if (ownUnit.ids.length === 1) return toOrderItems(ids, exerciseId, changedGroup)
    // Out of its run first, right after it, as leaving does.
    const rest = removeAt(ids, ids.indexOf(exerciseId))
    const ownLast = ownUnit.ids[ownUnit.ids.length - 1] === exerciseId
      ? ownUnit.ids[ownUnit.ids.length - 2]
      : ownUnit.ids[ownUnit.ids.length - 1]
    rest.splice(rest.indexOf(ownLast) + 1, 0, exerciseId)
    return toOrderItems(rest, exerciseId, changedGroup)
  }

  const members = units[targetUnit].ids
  const position = targetIndex == null ? members.length : targetIndex
  if (position > members.length) return null

  const flat = removeAt(ids, ids.indexOf(exerciseId))
  const insertAt = position < members.length
    ? flat.indexOf(members[position])
    : flat.indexOf(members[members.length - 1]) + 1
  flat.splice(insertAt, 0, exerciseId)
  return toOrderItems(flat, exerciseId, changedGroup)
}

/**
 * @typedef {object} ExerciseRow
 * @property {string} id - `'ex-<exerciseId>'` | `'ss-<group>-<firstMemberId>'` (único por tirada:
 *   un grupo ya partido pinta dos cabeceras)
 * @property {'exercise'|'supersetHeader'} kind
 * @property {number|null} exerciseId
 * @property {number|null} group - `superset_group` de la fila (null en un individual)
 * @property {'start'|'middle'|'end'|null} segment - Trozo de tarjeta morada que pinta la fila:
 *   la cabecera el borde de arriba, cada miembro los laterales, el último también el de abajo
 * @property {number} runSize - Miembros de su tirada (0 en un individual). Una tirada de UNO no
 *   pinta asa en su miembro: la cabecera de encima ya arrastra la tirada entera, que es ese mismo
 *   ejercicio, y así no hay un arrastre que separe la fila de su cabecera
 * @property {number|null} firstMemberId - Solo en la cabecera: desempata tiradas del mismo grupo
 */

/**
 * Filas de un bloque, desde `getBlockUnits`: una cabecera por tirada consecutiva (como se pinta)
 * más una fila por ejercicio.
 *
 * @param {Array} exercises - Ejercicios de un bloque
 * @returns {ExerciseRow[]}
 */
export function buildExerciseRows(exercises) {
  'worklet'
  const units = getBlockUnits(exercises)
  const rows = []

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    if (unit.kind === 'single') {
      rows.push({
        id: 'ex-' + unit.ids[0],
        kind: 'exercise',
        exerciseId: unit.ids[0],
        group: null,
        segment: null,
        runSize: 0,
        firstMemberId: null,
      })
      continue
    }

    rows.push({
      id: 'ss-' + unit.group + '-' + unit.ids[0],
      kind: 'supersetHeader',
      exerciseId: null,
      group: unit.group,
      segment: 'start',
      runSize: unit.ids.length,
      firstMemberId: unit.ids[0],
    })
    for (let j = 0; j < unit.ids.length; j++) {
      rows.push({
        id: 'ex-' + unit.ids[j],
        kind: 'exercise',
        exerciseId: unit.ids[j],
        group: unit.group,
        segment: j === unit.ids.length - 1 ? 'end' : 'middle',
        runSize: unit.ids.length,
        firstMemberId: null,
      })
    }
  }

  return rows
}

/**
 * Whether a row gets a drag handle. A member of a run of more than one always does, even when that
 * run is the block's only unit: it can move within the run or leave it. A header or an individual
 * only when the block has another unit to move past. The member of a run of ONE never does: the
 * header above it already drags that same run.
 *
 * @param {ExerciseRow} row
 * @param {number} unitCount - Units in the block (`getBlockUnits(...).length`)
 * @returns {boolean}
 */
export function canDragExerciseRow(row, unitCount) {
  'worklet'
  if (!row) return false
  if (row.kind === 'exercise' && row.group != null) return row.runSize > 1
  return unitCount >= 2
}

/** Último índice de la tirada que empieza en la cabecera `headerIndex`. */
function findRunEnd(rows, headerIndex) {
  'worklet'
  const group = rows[headerIndex].group
  let end = headerIndex
  // Los miembros de la tirada son las filas de ejercicio que la siguen sin interrupción: la
  // cabecera de otra tirada del MISMO grupo (un grupo partido) corta aquí por su `kind`.
  while (end + 1 < rows.length && rows[end + 1].kind === 'exercise' && rows[end + 1].group === group) end++
  return end
}

/** Índice de la cabecera de la tirada a la que pertenece la fila de miembro `index`, o -1. */
function findRunHeaderIndex(rows, index) {
  'worklet'
  for (let i = index - 1; i >= 0; i--) {
    if (rows[i].kind === 'supersetHeader') return i
  }
  return -1
}

/** Una fila empieza unidad si es cabecera de tirada o un ejercicio individual. */
function isUnitStart(row) {
  'worklet'
  return row.kind === 'supersetHeader' || row.group == null
}

/** Index of the header of the run that starts at `firstMemberId`, or -1. */
function findHeaderIndexByFirstMember(rows, firstMemberId) {
  'worklet'
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].kind === 'supersetHeader' && rows[i].firstMemberId === firstMemberId) return i
  }
  return -1
}

/**
 * Rows whose superset a drag can change: an individual, or a member of a run of more than one. A
 * header moves its whole run, and the member of a run of ONE does not drag.
 */
function canChangeMembership(row) {
  'worklet'
  return row.kind === 'exercise' && (row.group == null || row.runSize > 1)
}

/**
 * Lista de filas durante un arrastre: la unidad arrastrada se pliega a su cabecera.
 *
 * Solo la cabecera pliega. Un individual y un miembro ya son una fila, así que la lista viaja
 * igual. El plegado nunca cambia el índice de la cabecera arrastrada (sus miembros van detrás),
 * y eso es lo que permite plegar a mitad de gesto sin reconstruirlo.
 *
 * @param {ExerciseRow[]} rows
 * @param {string} activeRowId
 * @returns {ExerciseRow[]}
 */
export function collapseForDrag(rows, activeRowId) {
  'worklet'
  if (!rows || rows.length === 0) return []

  const activeIndex = findRowIndex(rows, activeRowId)
  if (activeIndex === -1 || rows[activeIndex].kind !== 'supersetHeader') return rows.slice()

  const runEnd = findRunEnd(rows, activeIndex)
  const result = []
  for (let i = 0; i < rows.length; i++) {
    if (i > activeIndex && i <= runEnd) continue
    result.push(rows[i])
  }
  return result
}

/**
 * Posiciones finales válidas para la fila `activeIndex` dentro de `rows`.
 *
 * Se cuentan sobre la lista SIN la fila arrastrada: insertar en `i` es dejarla justo antes de
 * `remainder[i]`. Un individual (o una tirada plegada en su cabecera) solo puede caer entre
 * unidades, nunca dentro de otra tirada; un miembro solo dentro de la suya.
 */
function getValidDropIndices(rows, activeIndex) {
  'worklet'
  const active = rows[activeIndex]
  const remainder = []
  for (let i = 0; i < rows.length; i++) {
    if (i !== activeIndex) remainder.push(rows[i])
  }

  const valid = []

  if (active.kind === 'exercise' && active.group != null && active.runSize > 1) {
    const headerIndex = findRunHeaderIndex(rows, activeIndex)
    if (headerIndex === -1) return [activeIndex]
    // Quitar el miembro no mueve a su cabecera (va delante), así que su índice vale igual en
    // `remainder`: las posiciones de dentro de la tirada son las que van tras ella.
    for (let i = headerIndex + 1; i <= headerIndex + active.runSize; i++) valid.push(i)
    return valid
  }

  for (let i = 0; i <= remainder.length; i++) {
    if (i === remainder.length || isUnitStart(remainder[i])) valid.push(i)
  }
  return valid
}

/**
 * Valida una posición final cruda sobre la lista plegada. Devuelve la posición válida más
 * cercana, que es la que tienen que previsualizar las dos apps: soltar en un hueco imposible
 * (dentro de otra tirada, o fuera de la propia) aterriza en el borde válido más próximo.
 *
 * With `allowMembershipChange`, an exercise can land in ANY slot: inside a run it joins it, and
 * between units it stays individual or joins at the edge (`resolveMembershipDrop`). It does not
 * affect a header, which moves its whole run. The list and the save must use the SAME value: with
 * the flag on only for the save, the preview would clamp the member back into its run and the save
 * would put it outside.
 *
 * @param {ExerciseRow[]} collapsedRows - Filas tal y como están durante el arrastre
 * @param {string} activeRowId
 * @param {number} rawIndex - Posición final que propone el gesto
 * @param {boolean} [allowMembershipChange] - The drag may change membership
 * @returns {number} Posición final válida
 */
export function resolveRowDrop(collapsedRows, activeRowId, rawIndex, allowMembershipChange) {
  'worklet'
  if (!collapsedRows || collapsedRows.length === 0) return 0

  const activeIndex = findRowIndex(collapsedRows, activeRowId)
  if (activeIndex === -1) return Math.max(0, Math.min(collapsedRows.length - 1, rawIndex))

  // Un miembro de una tirada de UNO no arrastra (no lleva asa): si llega aquí, se queda donde está.
  const active = collapsedRows[activeIndex]
  if (active.kind === 'exercise' && active.group != null && active.runSize === 1) return activeIndex

  const target = rawIndex == null ? activeIndex : Math.max(0, Math.min(collapsedRows.length - 1, rawIndex))
  if (allowMembershipChange && active.kind === 'exercise') return target

  const valid = getValidDropIndices(collapsedRows, activeIndex)
  if (valid.length === 0) return activeIndex

  let best = valid[0]
  let bestDistance = Math.abs(valid[0] - target)
  for (let i = 1; i < valid.length; i++) {
    const distance = Math.abs(valid[i] - target)
    // Estrictamente menor: en un empate manda la posición más baja, para que el mismo gesto
    // resuelva siempre igual en las dos plataformas.
    if (distance < bestDistance) {
      best = valid[i]
      bestDistance = distance
    }
  }
  return best
}

/**
 * Traduce una posición final ya validada a los argumentos de `moveExercise` o `moveSuperset`.
 *
 * @param {ExerciseRow[]} collapsedRows - Filas tal y como están durante el arrastre
 * @param {string} activeRowId
 * @param {number} index - Posición final validada por `resolveRowDrop`
 * @returns {{ exerciseId: number, targetIndex: number }|{ group: number, targetUnitIndex: number, firstMemberId: number|null }|null}
 */
export function rowDropToMove(collapsedRows, activeRowId, index) {
  'worklet'
  if (!collapsedRows || collapsedRows.length === 0) return null

  const activeIndex = findRowIndex(collapsedRows, activeRowId)
  if (activeIndex === -1) return null

  const active = collapsedRows[activeIndex]

  // Miembro de una tirada de más de uno: posición DENTRO de la tirada.
  if (active.kind === 'exercise' && active.group != null && active.runSize > 1) {
    const headerIndex = findRunHeaderIndex(collapsedRows, activeIndex)
    if (headerIndex === -1) return null
    return { exerciseId: active.exerciseId, targetIndex: index - headerIndex - 1 }
  }

  // Todo lo demás se mueve entre unidades: la posición final se cuenta en unidades, no en filas.
  const remainder = []
  for (let i = 0; i < collapsedRows.length; i++) {
    if (i !== activeIndex) remainder.push(collapsedRows[i])
  }
  let targetUnitIndex = 0
  for (let i = 0; i < index && i < remainder.length; i++) {
    if (isUnitStart(remainder[i])) targetUnitIndex++
  }

  if (active.kind === 'supersetHeader') {
    return { group: active.group, targetUnitIndex, firstMemberId: active.firstMemberId }
  }
  return { exerciseId: active.exerciseId, targetIndex: targetUnitIndex }
}

/**
 * What happens to membership if the dragged row lands at `index`, from its two neighbours in the
 * list without it:
 *
 * | Previous row          | Next row                               | Result               |
 * |-----------------------|----------------------------------------|----------------------|
 * | Header of G           | Member of G                            | `join` (at the start)|
 * | Member of G           | Member of G                            | `join`               |
 * | Last member of G      | Header, individual or end of the block | edge, by `offsetX`   |
 * | Anything else         |                                        | `single`             |
 *
 * At an EDGE the horizontal offset decides, counted from the depth the row is at (the "projected
 * depth" pattern of tree lists): an individual, or a member of ANOTHER run, joins G when dragged at
 * least `indent` to the right; a member of G itself stays in it unless dragged `indent` to the
 * left. That way grabbing the last member and dropping it where it was does not take it out.
 *
 * @param {ExerciseRow[]} collapsedRows - Rows as they are during the drag
 * @param {string} activeRowId
 * @param {number} index - Final position already vetted by `resolveRowDrop` with membership allowed
 * @param {number} offsetX - Horizontal drag offset in px (positive = to the right)
 * @param {number} indent - Distance that decides the edge (`design.supersetIndent`)
 * @returns {{ index: number, group: number|null, firstMemberId: number|null,
 *   kind: 'join'|'edge-join'|'edge-single'|'single' }|null} null when the row cannot change
 *   superset (a header, the member of a run of one, or an unknown id)
 */
export function resolveMembershipDrop(collapsedRows, activeRowId, index, offsetX, indent) {
  'worklet'
  if (!collapsedRows || collapsedRows.length === 0) return null

  const activeIndex = findRowIndex(collapsedRows, activeRowId)
  if (activeIndex === -1 || !canChangeMembership(collapsedRows[activeIndex])) return null

  const active = collapsedRows[activeIndex]
  const remainder = removeAt(collapsedRows, activeIndex)
  const position = index == null ? activeIndex : Math.max(0, Math.min(remainder.length, index))
  const previous = position > 0 ? remainder[position - 1] : null
  const next = position < remainder.length ? remainder[position] : null
  const previousIsMember = previous != null && previous.kind === 'exercise' && previous.group != null
  const nextIsMember = next != null && next.kind === 'exercise' && next.group != null

  // Header of the previous row's run. A member can only follow its header or another member of
  // ITS run (every run starts with its header), so the next member is enough to tell which run.
  let headerIndex = -1
  if (previous != null && previous.kind === 'supersetHeader') headerIndex = position - 1
  else if (previousIsMember) headerIndex = findRunHeaderIndex(remainder, position - 1)
  const header = headerIndex === -1 ? null : remainder[headerIndex]

  if (header && nextIsMember) {
    return { index: position, group: header.group, firstMemberId: header.firstMemberId, kind: 'join' }
  }

  if (header && previousIsMember) {
    const ownHeaderIndex = active.group != null ? findRunHeaderIndex(collapsedRows, activeIndex) : -1
    const isOwnRun = ownHeaderIndex !== -1 && collapsedRows[ownHeaderIndex].id === header.id
    const dx = offsetX || 0
    let joins = isOwnRun
    if (indent > 0) joins = isOwnRun ? dx > -indent : dx >= indent
    return joins
      ? { index: position, group: header.group, firstMemberId: header.firstMemberId, kind: 'edge-join' }
      : { index: position, group: null, firstMemberId: null, kind: 'edge-single' }
  }

  return { index: position, group: null, firstMemberId: null, kind: 'single' }
}

/**
 * How the list paints the dragged row, so the preview shows where it will end up: as a member of
 * the purple card if dropping it here keeps it in or joins a superset, flush if it ends up
 * individual. A string and not an object: native passes it from the UI thread to React and only
 * re-renders when it changes.
 *
 * @param {ExerciseRow[]} collapsedRows
 * @param {string} activeRowId
 * @param {number} index - Final position, already vetted
 * @param {number} offsetX
 * @param {number} indent
 * @returns {'superset'|'single'|null} null when the row cannot change superset (it keeps its
 *   resting look)
 */
export function getMembershipDropPreview(collapsedRows, activeRowId, index, offsetX, indent) {
  'worklet'
  const drop = resolveMembershipDrop(collapsedRows, activeRowId, index, offsetX, indent)
  if (!drop) return null
  return drop.group != null ? 'superset' : 'single'
}

/**
 * Translates what `resolveMembershipDrop` returns into `placeInSuperset` arguments (membership
 * changes) or `moveExercise` arguments (it does not): the row position becomes a position within
 * the target run when joining, or a unit position when ending up individual.
 *
 * Moving within its OWN run does not change membership; moving to the other run of an already
 * split group does (it is another card), even though the group is the same.
 *
 * @param {ExerciseRow[]} collapsedRows
 * @param {string} activeRowId
 * @param {{ index: number, group: number|null, firstMemberId: number|null }} drop
 * @returns {{ exerciseId: number, group: number|null, targetIndex: number,
 *   firstMemberId: number|null, changesMembership: boolean }|null}
 */
export function membershipDropToPlacement(collapsedRows, activeRowId, drop) {
  'worklet'
  if (!drop || !collapsedRows || collapsedRows.length === 0) return null

  const activeIndex = findRowIndex(collapsedRows, activeRowId)
  if (activeIndex === -1 || !canChangeMembership(collapsedRows[activeIndex])) return null

  const active = collapsedRows[activeIndex]
  const remainder = removeAt(collapsedRows, activeIndex)

  if (drop.group != null) {
    const headerIndex = findHeaderIndexByFirstMember(remainder, drop.firstMemberId)
    if (headerIndex === -1) return null
    // The own header comes before the dragged member: its index is the same with and without it.
    const ownHeaderIndex = active.group != null ? findRunHeaderIndex(collapsedRows, activeIndex) : -1
    const isOwnRun = ownHeaderIndex !== -1 && collapsedRows[ownHeaderIndex].id === remainder[headerIndex].id
    return {
      exerciseId: active.exerciseId,
      group: drop.group,
      targetIndex: drop.index - headerIndex - 1,
      firstMemberId: drop.firstMemberId,
      changesMembership: !isOwnRun,
    }
  }

  let targetUnitIndex = 0
  for (let i = 0; i < drop.index && i < remainder.length; i++) {
    if (isUnitStart(remainder[i])) targetUnitIndex++
  }
  return {
    exerciseId: active.exerciseId,
    group: null,
    targetIndex: targetUnitIndex,
    firstMemberId: null,
    changesMembership: active.group != null,
  }
}

/**
 * The block's new order after dropping a row at `index`: collapses, vets, resolves membership and
 * places.
 *
 * It is the only path both apps use on drop, so a drag cannot resolve in two ways. It re-vets the
 * index on purpose (idempotent on an already valid one): the rule holds even if one platform's list
 * forgets to vet while previewing. An exercise may change superset (`placeInSuperset` with the
 * dropped position, not the default one: what is saved is exactly what was previewed); a header
 * moves its run and never changes it.
 *
 * @param {Array} exercises - The block's exercises
 * @param {ExerciseRow[]} rows - The block's rows, NOT collapsed (`buildExerciseRows`)
 * @param {string} activeRowId
 * @param {number} index - Final position where it was dropped, counted in the collapsed list
 * @param {number} [offsetX] - Horizontal drag offset in px
 * @param {number} [indent] - `design.supersetIndent`
 * @returns {Array<{ id: number, supersetGroup?: number|null }>|null} The block in its new order,
 *   or null if there is nothing to write
 */
export function applyRowDrop(exercises, rows, activeRowId, index, offsetX, indent) {
  'worklet'
  const collapsed = collapseForDrag(rows, activeRowId)
  const activeIndex = findRowIndex(collapsed, activeRowId)
  if (activeIndex === -1) return null

  if (canChangeMembership(collapsed[activeIndex])) {
    const vetted = resolveRowDrop(collapsed, activeRowId, index, true)
    const drop = resolveMembershipDrop(collapsed, activeRowId, vetted, offsetX, indent)
    const placement = membershipDropToPlacement(collapsed, activeRowId, drop)
    if (!placement) return null
    if (placement.changesMembership) {
      return placeInSuperset(exercises, placement.exerciseId, placement.group, placement.targetIndex, placement.firstMemberId)
    }
    return idsToOrderItems(moveExercise(exercises, placement.exerciseId, placement.targetIndex))
  }

  const move = rowDropToMove(collapsed, activeRowId, resolveRowDrop(collapsed, activeRowId, index))
  if (!move) return null

  if (move.exerciseId != null) return idsToOrderItems(moveExercise(exercises, move.exerciseId, move.targetIndex))
  return idsToOrderItems(moveSuperset(exercises, move.group, move.targetUnitIndex, move.firstMemberId))
}
