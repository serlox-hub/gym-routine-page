import { BLOCK_NAMES } from './constants.js'
import { placeInSuperset } from './exerciseOrder.js'

/**
 * Applies an exercise order (the whole day, warm-up first) to the blocks in the `useRoutineBlocks`
 * cache, renumbering `sort_order` 1..n as the RPC does, plus the membership of the items that carry
 * `supersetGroup` (like the RPC, only those).
 *
 * Each block keeps its exercises: the order only rearranges them within their own block, because
 * this move never changes block. It is what leaves the drag painted where the finger drops it,
 * without waiting for the refetch; without applying membership, a row joining a superset would be
 * shown outside its card until the refetch landed.
 *
 * @param {Array|null|undefined} blocks - The day's blocks as `useRoutineBlocks` caches them
 * @param {Array<number|{ id: number, supersetGroup?: number|null }>|null|undefined} items - The day
 *   in its new order, as ids or as `reorderRoutineExercises` items
 * @returns {Array|null|undefined} New blocks, or the input ones if the order does not match them
 */
export function applyExerciseOrderToBlocks(blocks, items) {
  if (!blocks || !items) return blocks

  const byId = new Map()
  for (const block of blocks) {
    for (const re of block.routine_exercises || []) byId.set(re.id, re)
  }

  const entries = items.map(item => (typeof item === 'object' && item !== null ? item : { id: item }))

  // Un orden que no nombra exactamente a los mismos ejercicios que la caché no se aplica: la
  // alternativa sería tirar filas que la caché sí tiene, y eso se ve como un borrado hasta que
  // aterriza el refetch. Sin actualización optimista se ve el orden viejo, que es recuperable.
  if (entries.length !== byId.size || entries.some(entry => !byId.has(entry.id))) return blocks

  const updatedById = new Map(entries.map((entry, index) => {
    const row = { ...byId.get(entry.id), sort_order: index + 1 }
    if ('supersetGroup' in entry) row.superset_group = entry.supersetGroup
    return [entry.id, row]
  }))

  return blocks.map(block => {
    const blockIds = new Set((block.routine_exercises || []).map(re => re.id))
    return {
      ...block,
      routine_exercises: entries.filter(entry => blockIds.has(entry.id)).map(entry => updatedById.get(entry.id)),
    }
  })
}

/**
 * `placeInSuperset` over the whole day: applies the rule to the exercise's own block (warm-up or
 * main) and returns the full day, warm-up first, which is what `reorderRoutineExercises` takes.
 * Both the API (on the day read from the DB) and the hook's optimistic write (on the cache) use it,
 * so both place the same way.
 *
 * @param {Array} dayExercises - The day's exercises, in any order, with `is_warmup`
 * @param {{ routineExerciseId: number, supersetGroup: number|null, targetIndex?: number, firstMemberId?: number }} placement
 * @returns {Array<{ id: number, supersetGroup?: number|null }>|null} null if there is nothing to write
 */
export function placeInSupersetForDay(dayExercises, { routineExerciseId, supersetGroup, targetIndex, firstMemberId }) {
  if (!dayExercises) return null

  const sorted = [...dayExercises].sort((a, b) => a.sort_order - b.sort_order)
  const warmup = sorted.filter(re => re.is_warmup)
  const main = sorted.filter(re => !re.is_warmup)
  const inWarmup = warmup.some(re => re.id === routineExerciseId)
  const block = inWarmup ? warmup : main

  const placed = placeInSuperset(block, routineExerciseId, supersetGroup, targetIndex, firstMemberId)
  if (!placed) return null

  const untouched = (inWarmup ? main : warmup).map(re => ({ id: re.id }))
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
