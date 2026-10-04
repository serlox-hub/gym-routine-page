/**
 * "Recent" section of the exercise picker: the exercises the user did in their
 * latest completed sessions. Source rows come from `exercise_session_stats`,
 * which only holds exercises with sets in a finished session, so the session in
 * progress never shows up here.
 */

import { filterExercises } from './arrayUtils.js'

export const RECENT_EXERCISES_LIMIT = 5
// Stats rows read to find RECENT_EXERCISES_LIMIT distinct exercises. A session
// gives one row per exercise done, so 60 rows span several sessions.
export const RECENT_STATS_LOOKBACK = 60

/**
 * Catalog exercises the user did most recently: distinct ids from `statsRows`
 * (assumed newest first), ties on session_date broken by catalog order, ids
 * missing from `catalog` skipped (soft-deleted exercises), at most `limit`.
 * The rows returned are the catalog's own objects, so they render like the list.
 *
 * @param {Array<{ exercise_id: number, session_date: string }>|null} statsRows
 * @param {Array<{ id: number }>|null} catalog
 * @param {number} [limit]
 * @returns {Array} Catalog exercises, newest first. Null/empty input => []
 */
export function getRecentExercises(statsRows, catalog, limit = RECENT_EXERCISES_LIMIT) {
  if (!statsRows?.length || !catalog?.length) return []

  const catalogIndex = new Map(catalog.map((exercise, index) => [exercise.id, index]))
  // Rows come newest first, so a session ranks where its date first appears.
  const sessionRank = new Map()
  const done = []
  for (const row of statsRows) {
    const index = catalogIndex.get(row.exercise_id)
    if (index === undefined) continue
    if (!sessionRank.has(row.session_date)) sessionRank.set(row.session_date, sessionRank.size)
    done.push({ rank: sessionRank.get(row.session_date), index })
  }
  done.sort((a, b) => a.rank - b.rank || a.index - b.index)

  // A Set keeps the first, newest, occurrence of each exercise.
  const distinct = [...new Set(done.map(({ index }) => index))]
  return distinct.slice(0, limit).map(index => catalog[index])
}

/**
 * Recent exercises the picker shows: none while there is search text (only
 * spaces counts as none), otherwise narrowed by the same filters as the list.
 *
 * @param {Array} recentExercises - From getRecentExercises
 * @param {Object} [filters] - Same options as filterExercises, search included
 * @returns {Array}
 */
export function getVisibleRecentExercises(recentExercises, filters = {}) {
  if (filters.search?.trim()) return []
  return filterExercises(recentExercises, { ...filters, search: '' })
}
