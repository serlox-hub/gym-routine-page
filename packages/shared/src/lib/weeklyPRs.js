import { buildPRDetailsFromStats } from './workoutSummary.js'
import { resolveWeightUnit, resolveDistanceUnit } from './exerciseUtils.js'
import { calculateEpley1RM } from './workoutCalculations.js'

// A weight, 1RM or reps PR equal to one of the row's rep PRs is that same set: the heaviest set,
// the best 1RM set and (with weight) the most-reps set always win a rep PR too. The toast and the
// summary carousel already show only the rep PR. No rule marks a reps PR on weight × reps any more:
// the bestReps entry covers rows recalculate_exercise_prs marked before issue #196 (not backfilled).
// Equal, not "per type" nor ">=", because the stored bests can disagree: convert_user_weights
// scales best_1rm, while the 1RM of a set is rounded to a whole number (calculateEpley1RM). After
// a conversion the 1RM matches no rep PR and stays, in both directions: one chip too many, never
// a record hidden. The same mismatch fires false 1RM PRs after kg → lb (#194).
const COVERED_BY_REP_PR = {
  bestWeight: (detail, repPR) => repPR.newValue === detail.newValue,
  best1rm: (detail, repPR) => calculateEpley1RM(repPR.newValue, repPR.repCount) === detail.newValue,
  bestReps: (detail, repPR) => repPR.repCount === detail.newValue,
}

function dropCoveredByRepPR(details) {
  const repPRs = details.filter(detail => detail.type === 'repPR')
  if (repPRs.length === 0) return details
  return details.filter(detail => {
    const covers = COVERED_BY_REP_PR[detail.type]
    return !covers || !repPRs.some(repPR => covers(detail, repPR))
  })
}

/**
 * The week's records grouped by session (newest first) and exercise. `count` is the number of
 * records, not of exercises (a rep PR at 8 and one at 12 on one exercise are two; a weight, 1RM or
 * reps PR equal to a rep PR is dropped, it is the same set): it is the number on the home's
 * records card. Names come untranslated (the exercise row, the day name or null for a free
 * workout): the component resolves them while rendering, so a language change shows at once.
 *
 * @param {Array} rows - exercise_session_stats rows of the week with `exercise` and `session` joined (fetchWeeklyPRs)
 * @param {Object} options
 * @param {Array<{exercise_id, gym_id, weight_unit}>} options.gymUnitRows - weight unit per (exercise, gym)
 * @param {'kg'|'lb'} [options.globalWeightUnit]
 * @param {Object<number,'m'|'km'>} [options.distanceUnitOverrides] - distance unit per exercise
 * @returns {{count: number, sessions: Array<{sessionId: string, sessionDate: string, dayName: string|null,
 *   exercises: Array<{key: string, exercise: Object|null, details: Array<Object>}>}>}}
 */
export function buildWeeklyPRs(rows, { gymUnitRows = [], globalWeightUnit, distanceUnitOverrides = {} } = {}) {
  const sessionsById = new Map()
  let count = 0

  for (const row of rows || []) {
    const gymUnit = gymUnitRows.find(r =>
      r.exercise_id === row.exercise_id && String(r.gym_id) === String(row.gym_id)
    )?.weight_unit
    const details = dropCoveredByRepPR(buildPRDetailsFromStats(row, {
      unit: resolveWeightUnit(gymUnit ?? null, { weight_unit: globalWeightUnit }),
      distanceUnit: resolveDistanceUnit(distanceUnitOverrides[row.exercise_id], row.exercise),
    }))
    if (details.length === 0) continue
    count += details.length

    if (!sessionsById.has(row.session_id)) {
      sessionsById.set(row.session_id, {
        sessionId: row.session_id,
        sessionDate: row.session_date,
        dayName: row.session?.day_name || null,
        exercises: [],
      })
    }
    sessionsById.get(row.session_id).exercises.push({
      key: `${row.session_id}-${row.exercise_id}`,
      exercise: row.exercise,
      details,
    })
  }

  const sessions = [...sessionsById.values()]
    .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
  return { count, sessions }
}
