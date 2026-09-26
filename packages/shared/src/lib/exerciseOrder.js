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
// ejercicios que el usuario no ha tocado. Arreglar el partido es otra issue (#87): aquí NADA
// escribe `superset_group`.
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
 * @param {ExerciseRow[]} collapsedRows - Filas tal y como están durante el arrastre
 * @param {string} activeRowId
 * @param {number} rawIndex - Posición final que propone el gesto
 * @returns {number} Posición final válida
 */
export function resolveRowDrop(collapsedRows, activeRowId, rawIndex) {
  'worklet'
  if (!collapsedRows || collapsedRows.length === 0) return 0

  const activeIndex = findRowIndex(collapsedRows, activeRowId)
  if (activeIndex === -1) return Math.max(0, Math.min(collapsedRows.length - 1, rawIndex))

  // Un miembro de una tirada de UNO no arrastra (no lleva asa): si llega aquí, se queda donde está.
  const active = collapsedRows[activeIndex]
  if (active.kind === 'exercise' && active.group != null && active.runSize === 1) return activeIndex

  const valid = getValidDropIndices(collapsedRows, activeIndex)
  if (valid.length === 0) return activeIndex

  const target = rawIndex == null ? activeIndex : Math.max(0, Math.min(collapsedRows.length - 1, rawIndex))
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
 * Nuevo orden de ids del bloque tras soltar una fila en `index`: pliega, valida, traduce y mueve.
 *
 * Es el único camino que usan las dos apps al soltar, para que el arrastre no pueda resolverse de
 * dos maneras. Revalida el índice a propósito (es idempotente sobre uno ya válido): así la regla
 * se cumple aunque la lista de una plataforma se olvide de validar mientras previsualiza.
 *
 * @param {Array} exercises - Ejercicios del bloque
 * @param {ExerciseRow[]} rows - Filas del bloque SIN plegar (`buildExerciseRows`)
 * @param {string} activeRowId
 * @param {number} index - Posición final donde se ha soltado, contada en la lista plegada
 * @returns {number[]|null} El nuevo orden de ids del bloque, o null si no hay nada que escribir
 */
export function applyRowDrop(exercises, rows, activeRowId, index) {
  'worklet'
  const collapsed = collapseForDrag(rows, activeRowId)
  const move = rowDropToMove(collapsed, activeRowId, resolveRowDrop(collapsed, activeRowId, index))
  if (!move) return null

  if (move.exerciseId != null) return moveExercise(exercises, move.exerciseId, move.targetIndex)
  return moveSuperset(exercises, move.group, move.targetUnitIndex, move.firstMemberId)
}
