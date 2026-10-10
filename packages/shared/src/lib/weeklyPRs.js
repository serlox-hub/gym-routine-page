import { buildPRDetailsFromStats } from './workoutSummary.js'
import { resolveWeightUnit, resolveDistanceUnit } from './exerciseUtils.js'

/**
 * The week's records grouped by session (newest first) and exercise. `count` is the number of
 * records, not of exercises (a weight PR and a 1RM PR on one exercise are two): it is the number on
 * the home's records card. Names come untranslated (the exercise row, the day name or null for a
 * free workout): the component resolves them while rendering, so a language change shows at once.
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
    const details = buildPRDetailsFromStats(row, {
      unit: resolveWeightUnit(gymUnit ?? null, { weight_unit: globalWeightUnit }),
      distanceUnit: resolveDistanceUnit(distanceUnitOverrides[row.exercise_id], row.exercise),
    })
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
