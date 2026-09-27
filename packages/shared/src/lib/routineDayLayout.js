import { BLOCK_NAMES } from './constants.js'
import { placeInSuperset } from './exerciseOrder.js'

/**
 * Applies an exercise order to a flat list of rows (a routine day or a workout session, warm-up
 * first), renumbering `sort_order` 1..n as the RPCs do, plus the membership of the items that carry
 * `supersetGroup` (like the RPCs, only those). Rows come back in the new order.
 *
 * It is what leaves the drag painted where the finger drops it, without waiting for the refetch;
 * without applying membership, a row joining a superset would be shown outside its card until the
 * refetch landed.
 *
 * @param {Array|null|undefined} rows - Rows with `id`
 * @param {Array<number|{ id: number, supersetGroup?: number|null }>|null|undefined} items - The
 *   whole list in its new order, as ids or as reorder items
 * @returns {Array|null|undefined} New rows, or the input ones if the order does not match them
 */
export function applyExerciseOrder(rows, items) {
  if (!rows || !items) return rows

  const byId = new Map(rows.map(row => [row.id, row]))
  const entries = items.map(item => (typeof item === 'object' && item !== null ? item : { id: item }))

  // Un orden que no nombra exactamente a los mismos ejercicios que la caché no se aplica: la
  // alternativa sería tirar filas que la caché sí tiene, y eso se ve como un borrado hasta que
  // aterriza el refetch. Sin actualización optimista se ve el orden viejo, que es recuperable.
  if (entries.length !== byId.size || entries.some(entry => !byId.has(entry.id))) return rows

  return entries.map((entry, index) => {
    const row = { ...byId.get(entry.id), sort_order: index + 1 }
    if ('supersetGroup' in entry) row.superset_group = entry.supersetGroup
    return row
  })
}

/**
 * `applyExerciseOrder` over the blocks in the `useRoutineBlocks` cache (the whole day, warm-up
 * first). Each block keeps its exercises: the order only rearranges them within their own block,
 * because this move never changes block.
 *
 * @param {Array|null|undefined} blocks - The day's blocks as `useRoutineBlocks` caches them
 * @param {Array<number|{ id: number, supersetGroup?: number|null }>|null|undefined} items - The day
 *   in its new order, as ids or as `reorderRoutineExercises` items
 * @returns {Array|null|undefined} New blocks, or the input ones if the order does not match them
 */
export function applyExerciseOrderToBlocks(blocks, items) {
  if (!blocks || !items) return blocks

  const rows = blocks.flatMap(block => block.routine_exercises || [])
  const ordered = applyExerciseOrder(rows, items)
  if (ordered === rows) return blocks

  return blocks.map(block => {
    const blockIds = new Set((block.routine_exercises || []).map(re => re.id))
    return { ...block, routine_exercises: ordered.filter(row => blockIds.has(row.id)) }
  })
}

/**
 * One block's new order (`ExerciseRowList`) → the whole list, warm-up first, which is what
 * `reorderSessionExercises` writes. The other block keeps its rows as they are.
 *
 * @param {Array<{ id: number, isWarmup: boolean }>} rows - The whole list (`flatExercises`)
 * @param {boolean} isWarmup - Which block `blockItems` is
 * @param {Array<{ id: number, supersetGroup?: number|null }>} blockItems - That block in its new order
 * @returns {Array<{ id: number, supersetGroup?: number|null }>}
 */
export function mergeBlockOrder(rows, isWarmup, blockItems) {
  const untouched = (rows || []).filter(row => row.isWarmup !== isWarmup).map(row => ({ id: row.id }))
  return isWarmup ? [...blockItems, ...untouched] : [...untouched, ...blockItems]
}

/**
 * `placeInSuperset` over a whole list split into warm-up and main (a routine day or a workout
 * session): applies the rule to the exercise's own block and returns the full list, warm-up first,
 * which is what `reorderRoutineExercises` and `reorderSessionExercises` take. The API (on rows read
 * from the DB) and the optimistic writes (on the cache) use it, so both place the same way.
 *
 * @param {Array} rows - Rows with `id`, `sort_order`, `is_warmup`, `superset_group`, in any order
 * @param {{ exerciseId: number, supersetGroup: number|null, targetIndex?: number, firstMemberId?: number }} placement
 * @returns {Array<{ id: number, supersetGroup?: number|null }>|null} null if there is nothing to write
 */
export function placeInSupersetForBlocks(rows, { exerciseId, supersetGroup, targetIndex, firstMemberId }) {
  if (!rows) return null

  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  const warmup = sorted.filter(row => row.is_warmup)
  const main = sorted.filter(row => !row.is_warmup)
  const inWarmup = warmup.some(row => row.id === exerciseId)
  const block = inWarmup ? warmup : main

  const placed = placeInSuperset(block, exerciseId, supersetGroup, targetIndex, firstMemberId)
  if (!placed) return null

  const untouched = (inWarmup ? main : warmup).map(row => ({ id: row.id }))
  return inWarmup ? [...placed, ...untouched] : [...untouched, ...placed]
}

/**
 * Resolve what the expanded body of a routine day has to render.
 *
 * The detail screen is modeless (issue #85): there is no longer a view variant that hides empty
 * blocks and an edit variant that always paints both. A block with no exercises collapses to its
 * "+ add" row alone, so an expanded day never shows an empty section with a "(0)" header.
 *
 * `fetchRoutineBlocks` solo devuelve un bloque cuando tiene ejercicios, así que hoy
 * `showWarmupSection` equivale a `warmupBlock != null`. Se calcula por conteo a propósito, para que
 * la pantalla no dependa de ese filtro de la API: si algún día deja de filtrar, el día sigue sin
 * pintar secciones vacías en vez de aparecer con un "(0)".
 *
 * @param {Array|null|undefined} blocks - Blocks of the day as returned by `useRoutineBlocks`
 * @returns {{
 *   warmupBlock: object|null, mainBlock: object|null,
 *   warmupExercises: Array, mainExercises: Array, allExercises: Array, totalSets: number,
 *   showWarmupSection: boolean, showMainSection: boolean, showEmptyMessage: boolean
 * }}
 */
export function getRoutineDayLayout(blocks) {
  const warmupBlock = blocks?.find(b => b.name === BLOCK_NAMES.WARMUP) || null
  const mainBlock = blocks?.find(b => b.name === BLOCK_NAMES.MAIN) || null
  const warmupExercises = warmupBlock?.routine_exercises || []
  const mainExercises = mainBlock?.routine_exercises || []
  const allExercises = [...warmupExercises, ...mainExercises]

  return {
    warmupBlock,
    mainBlock,
    warmupExercises,
    mainExercises,
    allExercises,
    // Incluye las del calentamiento: es lo que se va a hacer ese día, no solo el trabajo efectivo.
    totalSets: allExercises.reduce((sum, re) => sum + (re.series || 0), 0),
    showWarmupSection: warmupExercises.length > 0,
    showMainSection: mainExercises.length > 0,
    showEmptyMessage: warmupExercises.length === 0 && mainExercises.length === 0,
  }
}
