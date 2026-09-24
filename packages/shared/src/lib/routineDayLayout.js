import { BLOCK_NAMES } from './constants.js'

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
 *   warmupExercises: Array, mainExercises: Array, allExercises: Array,
 *   showWarmupSection: boolean, showMainSection: boolean, showEmptyMessage: boolean
 * }}
 */
export function getRoutineDayLayout(blocks) {
  const warmupBlock = blocks?.find(b => b.name === BLOCK_NAMES.WARMUP) || null
  const mainBlock = blocks?.find(b => b.name === BLOCK_NAMES.MAIN) || null
  const warmupExercises = warmupBlock?.routine_exercises || []
  const mainExercises = mainBlock?.routine_exercises || []

  return {
    warmupBlock,
    mainBlock,
    warmupExercises,
    mainExercises,
    allExercises: [...warmupExercises, ...mainExercises],
    showWarmupSection: warmupExercises.length > 0,
    showMainSection: mainExercises.length > 0,
    showEmptyMessage: warmupExercises.length === 0 && mainExercises.length === 0,
  }
}
