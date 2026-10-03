import { BLOCK_NAMES } from './constants.js'
import { sanitizeImportedSupersetGroups } from './supersetUtils.js'

/** localStorage key of the shared routine a logged-out visitor left to sign up or log in. */
export const PENDING_SHARED_ROUTINE_KEY = 'pendingSharedRoutine'

/** How long that pending path is honoured. Long enough to confirm a signup email, short enough not to surprise a later login. */
export const PENDING_SHARED_ROUTINE_TTL_MS = 24 * 60 * 60 * 1000

const SHARED_ROUTINE_PATH_PREFIX = '/r/'

/**
 * Public link of a shared routine.
 * @param {string} origin - web origin, with or without a trailing slash
 * @param {string} token
 * @returns {string}
 */
export function buildRoutineShareUrl(origin, token) {
  return `${origin.replace(/\/+$/, '')}${SHARED_ROUTINE_PATH_PREFIX}${token}`
}

/**
 * Remembers the shared routine a logged-out visitor is leaving to sign up or log in, so the app can
 * take them back once they have a session. Storage errors (private mode) are ignored: the visitor
 * only loses the way back.
 * @param {{ setItem: Function }} storage
 * @param {string} path
 * @param {number} now - epoch ms
 */
export function savePendingSharedRoutine(storage, path, now) {
  try {
    storage.setItem(PENDING_SHARED_ROUTINE_KEY, JSON.stringify({ path, savedAt: now }))
  } catch {
    // no storage: nothing to come back to
  }
}

/**
 * Returns the pending shared-routine path and deletes it, so it is followed once. An expired,
 * malformed or foreign entry is deleted and ignored.
 * @param {{ getItem: Function, removeItem: Function }} storage
 * @param {number} now - epoch ms
 * @returns {string|null}
 */
export function takePendingSharedRoutine(storage, now) {
  let raw
  try {
    raw = storage.getItem(PENDING_SHARED_ROUTINE_KEY)
    if (raw == null) return null
    storage.removeItem(PENDING_SHARED_ROUTINE_KEY)
  } catch {
    return null
  }

  let entry
  try {
    entry = JSON.parse(raw)
  } catch {
    return null
  }

  // Only a shared-routine path: the entry is read back from storage, and a navigation target must
  // never be whatever ended up there.
  if (typeof entry?.path !== 'string' || !entry.path.startsWith(SHARED_ROUTINE_PATH_PREFIX)) return null
  if (typeof entry.savedAt !== 'number' || now - entry.savedAt > PENDING_SHARED_ROUTINE_TTL_MS) return null
  return entry.path
}

/**
 * What the public page of a shared routine shows, from the export JSON alone (the visitor may have
 * no session, so nothing is loaded per id). Days in order; each day's warm-up first; consecutive
 * members of a superset grouped in one unit. Each exercise carries its catalog entry, to localize
 * its name and muscle group and to pick its effort scale.
 * @param {object} exportData - shape of `buildRoutineExport`
 * @returns {{ name: string, description: string|null, days: object[] }}
 */
export function buildSharedRoutinePreview(exportData) {
  const catalog = new Map((exportData?.exercises || []).map(exercise => [exercise.name_es, exercise]))
  const routine = exportData?.routine || {}

  const days = [...(routine.days || [])]
    .sort((a, b) => (a.sort_order == null) - (b.sort_order == null) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((day, dayIndex) => {
      const blocks = [...(day.blocks || [])]
        .filter(block => block.exercises?.length)
        .sort((a, b) => (a.name === BLOCK_NAMES.WARMUP ? 0 : 1) - (b.name === BLOCK_NAMES.WARMUP ? 0 : 1))
        .map(block => ({
          isWarmup: block.name === BLOCK_NAMES.WARMUP,
          units: groupIntoUnits(block.exercises, catalog),
        }))

      return {
        key: `${dayIndex}`,
        name: day.name,
        estimatedDurationMin: day.estimated_duration_min ?? null,
        blocks,
      }
    })

  return { name: routine.name, description: routine.description ?? null, days }
}

// Through the same rule as the import (`sanitizeImportedSupersetGroups`): a lone member or a group
// split by other rows shows as individual exercises, because that is what the visitor would get.
function groupIntoUnits(exercises, catalog) {
  const groups = sanitizeImportedSupersetGroups(exercises.map(exercise => exercise.superset_group))
  const units = []
  exercises.forEach((exercise, index) => {
    const group = groups[index]
    const item = { ...exercise, catalog: catalog.get(exercise.exercise_name) || { name_es: exercise.exercise_name } }
    const last = units[units.length - 1]
    if (group !== null && last?.supersetGroup === group) {
      last.exercises.push(item)
    } else {
      units.push({ supersetGroup: group, exercises: [item] })
    }
  })
  return units
}
