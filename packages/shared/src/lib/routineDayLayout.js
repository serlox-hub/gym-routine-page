import { BLOCK_NAMES } from './constants.js'

/**
 * Aplica un orden de ejercicios (el día entero, calentamiento primero) a los bloques que tiene la
 * caché de `useRoutineBlocks`, renumerando `sort_order` 1..n igual que hace la RPC.
 *
 * Cada bloque conserva sus ejercicios: el orden solo los recoloca dentro del suyo, porque este
 * movimiento nunca cambia de bloque (ni la pertenencia a un superset). Es lo que deja el arrastre
 * pintado donde el dedo lo suelta, sin esperar al refetch.
 *
 * @param {Array|null|undefined} blocks - Bloques del día tal y como los cachea `useRoutineBlocks`
 * @param {Array<number>|null|undefined} orderedIds - Ids del día en su nuevo orden
 * @returns {Array|null|undefined} Bloques nuevos, o los de entrada si el orden no cuadra con ellos
 */
export function applyExerciseOrderToBlocks(blocks, orderedIds) {
  if (!blocks || !orderedIds) return blocks

  const byId = new Map()
  for (const block of blocks) {
    for (const re of block.routine_exercises || []) byId.set(re.id, re)
  }

  // Un orden que no nombra exactamente a los mismos ejercicios que la caché no se aplica: la
  // alternativa sería tirar filas que la caché sí tiene, y eso se ve como un borrado hasta que
  // aterriza el refetch. Sin actualización optimista se ve el orden viejo, que es recuperable.
  if (orderedIds.length !== byId.size || orderedIds.some(id => !byId.has(id))) return blocks

  const sortOrderById = new Map(orderedIds.map((id, index) => [id, index + 1]))

  return blocks.map(block => {
    const blockIds = new Set((block.routine_exercises || []).map(re => re.id))
    return {
      ...block,
      routine_exercises: orderedIds
        .filter(id => blockIds.has(id))
        .map(id => ({ ...byId.get(id), sort_order: sortOrderById.get(id) })),
    }
  })
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
