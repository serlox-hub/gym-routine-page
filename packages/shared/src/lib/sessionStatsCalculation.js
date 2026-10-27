import { SetField, getProgressableField, normalizeTrackedFields } from './measurementFields.js'
import { calculateEpley1RM, findLeastAssistanceSet, getLeastAssistance } from './workoutCalculations.js'
import { getProgressionDirection } from './progressionUtils.js'
import { t } from '../i18n/index.js'

// ============================================
// MÉTRICAS SEGÚN LO QUE MIDE EL EJERCICIO
// ============================================

// Campo → métrica que se guarda en `exercise_session_stats`. El nivel y las calorías NO tienen
// columna ahí (no hay best_level/best_calories), así que no son métricas: se registran en la
// serie pero no alimentan stats, gráficas ni PRs. Añadir esa dimensión es otro ticket.
const FIELD_METRIC = {
  [SetField.WEIGHT]: 'weight',
  [SetField.ASSISTANCE]: 'assistance',
  [SetField.REPS]: 'reps',
  [SetField.TIME]: 'time',
  [SetField.DISTANCE]: 'distance',
  [SetField.PACE]: 'pace',
}

/**
 * Métricas calculadas para stats y gráficas. Peso + reps juntos habilitan además las derivadas
 * del modelo de fuerza (1RM estimado, volumen y rep-PR), que no significan nada sin las dos.
 * Assistance + reps enables only the rep PR: assistance is help, not load, so no 1RM nor volume.
 * @param {string[]} trackedFields
 * @returns {string[]}
 */
export function getTrackableMetrics(trackedFields) {
  const fields = normalizeTrackedFields(trackedFields)
  const metrics = fields.map(f => FIELD_METRIC[f]).filter(Boolean)
  if (fields.includes(SetField.WEIGHT) && fields.includes(SetField.REPS)) {
    metrics.push('1rm', 'volume', 'repPR')
  } else if (fields.includes(SetField.ASSISTANCE) && fields.includes(SetField.REPS)) {
    metrics.push('repPR')
  }
  return metrics
}

/**
 * Métricas que disparan PRs (subconjunto de las anteriores).
 *
 * Un récord solo tiene sentido cuando la marca es COMPARABLE entre sesiones, es decir cuando el
 * ejercicio varía en una sola dimensión. Con dos o más (peso × tiempo, nivel × distancia, la bici
 * con nivel × distancia × tiempo) no hay un "mejor" objetivo: más distancia a menos nivel no es
 * mejor ni peor. Dos excepciones, que son las dos formas de colapsar dos dimensiones en una:
 * peso × reps con el 1RM estimado (modelo Strong/Hevy, más heaviest-ever y rep-PR por rep count),
 * y el ritmo, que ya normaliza el tiempo por la distancia.
 * Assistance × reps is the weight × reps model inverted (least assistance ever and rep PRs where
 * less assistance wins, no 1RM). Assistance alone or with anything else has no record.
 * The SQL `pr_metrics` (migration 072) mirrors it for recalculate_exercise_prs: change both
 * together, `npm run db:check-pr-parity -w apps/web` compares them.
 * @param {string[]} trackedFields
 * @returns {string[]}
 */
export function getPRMetrics(trackedFields) {
  const fields = normalizeTrackedFields(trackedFields)
  if (fields.length === 2 && fields.includes(SetField.WEIGHT) && fields.includes(SetField.REPS)) {
    return ['1rm', 'weight', 'repPR']
  }
  if (fields.includes(SetField.ASSISTANCE)) {
    return fields.length === 2 && fields.includes(SetField.REPS) ? ['assistance', 'repPR'] : []
  }
  if (fields.includes(SetField.PACE)) return ['pace']
  if (fields.length === 1) {
    const metric = FIELD_METRIC[fields[0]]
    return metric ? [metric] : []
  }
  return []
}

/**
 * Does this exercise's rep PR go to LESS load? Yes on assistance × reps (getProgressionDirection of
 * its load field, the progressable one). On weight × reps, more weight wins.
 * @param {string[]} trackedFields
 * @returns {boolean}
 */
export function isRepPRLowerBetter(trackedFields) {
  return getProgressionDirection(getProgressableField(trackedFields)) === 'lower'
}

// ============================================
// SESSION STATS CALCULATION
// ============================================

export function calculateSessionExerciseStats(sets, trackedFields) {
  if (!sets || sets.length === 0) return null

  const metrics = getTrackableMetrics(trackedFields)
  const stats = { totalSets: sets.length }

  if (metrics.includes('weight')) {
    stats.bestWeight = Math.max(...sets.map(s => s.weight || 0))
    if (stats.bestWeight === 0) stats.bestWeight = null
  }

  if (metrics.includes('reps')) {
    stats.bestReps = Math.max(...sets.map(s => s.reps_completed || 0))
    if (stats.bestReps === 0) stats.bestReps = null
  }

  if (metrics.includes('1rm')) {
    let best = 0
    for (const s of sets) {
      if (s.weight && s.reps_completed) {
        const e1rm = calculateEpley1RM(s.weight, s.reps_completed)
        if (e1rm > best) best = e1rm
      }
    }
    stats.best1rm = best || null
  }

  if (metrics.includes('volume')) {
    const vol = sets.reduce((sum, s) => {
      return sum + ((s.weight || 0) * (s.reps_completed || 0))
    }, 0)
    stats.totalVolume = vol || null
  }

  if (metrics.includes('time')) {
    stats.bestTimeSeconds = Math.max(...sets.map(s => s.time_seconds || 0))
    if (stats.bestTimeSeconds === 0) stats.bestTimeSeconds = null
  }

  if (metrics.includes('distance')) {
    stats.bestDistanceMeters = Math.max(...sets.map(s => s.distance_meters || 0))
    if (stats.bestDistanceMeters === 0) stats.bestDistanceMeters = null
  }

  if (metrics.includes('pace')) {
    const paces = sets.map(s => s.pace_seconds).filter(p => p && p > 0)
    stats.bestPaceSeconds = paces.length > 0 ? Math.min(...paces) : null
  }

  // Least assistance (see getLeastAssistance): null without data, 0 is the best mark.
  if (metrics.includes('assistance')) {
    stats.bestAssistance = getLeastAssistance(sets, trackedFields)
  }

  if (metrics.includes('repPR')) {
    stats.bestPerReps = buildBestPerReps(sets, isRepPRLowerBetter(trackedFields))
  }

  return stats
}

// Best load of the session per exact rep count. E.g. { "5": 100, "8": 80 }. With weight, the
// heaviest of the sets with weight > 0 (a 0 kg set is stored as "no value", see below). With
// assistance, the LEAST, and 0 counts: it is a set without help.
function buildBestPerReps(sets, lowerIsBetter) {
  const perRep = {}
  for (const s of sets) {
    if (s.weight == null || !(s.reps_completed > 0)) continue
    const load = Number(s.weight)
    if (Number.isNaN(load) || (!lowerIsBetter && !(load > 0))) continue
    const key = String(s.reps_completed)
    if (perRep[key] == null || (lowerIsBetter ? load < perRep[key] : load > perRep[key])) {
      perRep[key] = load
    }
  }
  return Object.keys(perRep).length > 0 ? perRep : null
}

/**
 * Combina dos stats del mismo ejercicio (ej. calentamiento + principal).
 * Maxima los `best*`, suma `totalVolume` y `totalSets`, mínima `bestPaceSeconds`.
 * The least `bestAssistance` wins, and `bestPerReps` follows the exercise's rep-PR direction (the
 * least with assistance): that is why it needs the exercise's fields.
 * @param {object} target - mutated
 * @param {object} source
 * @param {string[]} trackedFields
 */
export function mergeExerciseStats(target, source, trackedFields) {
  if (source.bestWeight && (!target.bestWeight || source.bestWeight > target.bestWeight)) {
    target.bestWeight = source.bestWeight
  }
  if (source.bestReps && (!target.bestReps || source.bestReps > target.bestReps)) {
    target.bestReps = source.bestReps
  }
  if (source.best1rm && (!target.best1rm || source.best1rm > target.best1rm)) {
    target.best1rm = source.best1rm
  }
  if (source.totalVolume) {
    target.totalVolume = (target.totalVolume || 0) + source.totalVolume
  }
  target.totalSets = (target.totalSets || 0) + (source.totalSets || 0)
  if (source.bestTimeSeconds && (!target.bestTimeSeconds || source.bestTimeSeconds > target.bestTimeSeconds)) {
    target.bestTimeSeconds = source.bestTimeSeconds
  }
  if (source.bestDistanceMeters && (!target.bestDistanceMeters || source.bestDistanceMeters > target.bestDistanceMeters)) {
    target.bestDistanceMeters = source.bestDistanceMeters
  }
  if (source.bestPaceSeconds && (!target.bestPaceSeconds || source.bestPaceSeconds < target.bestPaceSeconds)) {
    target.bestPaceSeconds = source.bestPaceSeconds
  }
  if (source.bestAssistance != null && (target.bestAssistance == null || source.bestAssistance < target.bestAssistance)) {
    target.bestAssistance = source.bestAssistance
  }
  if (source.bestPerReps) {
    const lowerIsBetter = isRepPRLowerBetter(trackedFields)
    if (!target.bestPerReps) target.bestPerReps = {}
    for (const [reps, load] of Object.entries(source.bestPerReps)) {
      const current = target.bestPerReps[reps]
      if (current == null || (lowerIsBetter ? load < current : load > current)) {
        target.bestPerReps[reps] = load
      }
    }
  }
}

// ============================================
// REP-PR DOMINANCE HELPER
// ============================================

// Regla de dominancia: hacer más reps con la misma carga es estrictamente mejor, así
// que un set W×N "cubre" implícitamente W×M para todo M < N. Por eso el récord a
// N reps debe compararse contra la mejor carga conseguida a N reps *o más*, no solo
// a exactamente N. Esto evita marcar como PR un 100×8 cuando ya se hizo 100×9.
// The load is the weight (more is better) or the assistance (LESS is better, and 0 is the best):
// a set A×N is a rep PR when no earlier set has assistance <= A at N reps or more.

// The better load wins (heavier, or less assistance); on a tie, more reps wins (by the same
// dominance rule, that set covers the others).
function isBetterRepEntry(candidate, best, lowerIsBetter) {
  if (!best) return true
  if (candidate.weight === best.weight) return candidate.reps > best.reps
  return lowerIsBetter ? candidate.weight < best.weight : candidate.weight > best.weight
}

// A weight entry needs a positive weight (0 kg is stored as "no value"); an assistance entry only
// needs a number, 0 included.
function isRankableLoad(load, lowerIsBetter) {
  return lowerIsBetter ? load != null && !Number.isNaN(Number(load)) : load > 0
}

/**
 * The best entry at minReps reps or more across one or more bestPerReps maps: its load and its rep
 * count. Ties on load resolve to the highest rep count. With weight (default) the heaviest wins and
 * an entry without a positive weight never wins; with `{ lowerIsBetter: true }` (assistance) the
 * least assistance wins and 0 can win.
 * @param {number} minReps
 * @param {boolean} strictlyGreater - true: only rep counts > minReps qualify; false: >= minReps
 * @param {Array<Object<string, number>|null>} maps - bestPerReps objects (rep count → best load)
 * @param {{lowerIsBetter?: boolean}} [options]
 * @returns {{ weight: number, reps: number } | null}  null when no entry qualifies
 */
export function bestAtRepsOrAbove(minReps, strictlyGreater, maps, { lowerIsBetter = false } = {}) {
  let best = null
  for (const map of maps) {
    if (!map) continue
    for (const [repsKey, load] of Object.entries(map)) {
      const reps = parseInt(repsKey, 10)
      const qualifies = strictlyGreater ? reps > minReps : reps >= minReps
      if (!qualifies || !isRankableLoad(load, lowerIsBetter)) continue
      const candidate = { weight: Number(load), reps }
      if (isBetterRepEntry(candidate, best, lowerIsBetter)) best = candidate
    }
  }
  return best
}

/**
 * The record a rep PR at repCount beats: the best of historicalMap at >= repCount reps and
 * sessionMap at > repCount reps (the session's own entry at repCount is the new record).
 * The better load wins; on a load tie, higher reps.
 * @param {number} repCount
 * @param {Object<string, number>|null} historicalMap - bestPerReps before the session
 * @param {Object<string, number>|null} sessionMap - bestPerReps of the session
 * @param {{lowerIsBetter?: boolean}} [options]
 * @returns {{ weight: number, reps: number } | null}
 */
export function findBeatenRepRecord(repCount, historicalMap, sessionMap, { lowerIsBetter = false } = {}) {
  const historical = bestAtRepsOrAbove(repCount, false, [historicalMap], { lowerIsBetter })
  const sameSession = bestAtRepsOrAbove(repCount, true, [sessionMap], { lowerIsBetter })
  if (!sameSession) return historical
  return isBetterRepEntry(sameSession, historical, lowerIsBetter) ? sameSession : historical
}

/**
 * The "previous" a rep PR at repCount shows, on the card and in the in-session notice: the best
 * set before the session at repCount reps or more. Sets of the same session never count, even
 * when they raised the bar the PR had to clear (findBeatenRepRecord): they can be later than the
 * PR, and every other record type also shows its pre-session best.
 * @param {number} repCount
 * @param {Object<string, number>|null} historicalMap - bestPerReps before the session
 * @param {{lowerIsBetter?: boolean}} [options]
 * @returns {{ weight: number, reps: number } | null}
 */
export function findPreviousRepRecord(repCount, historicalMap, { lowerIsBetter = false } = {}) {
  return bestAtRepsOrAbove(repCount, false, [historicalMap], { lowerIsBetter })
}

/**
 * Does `load` at its rep count beat `record` (the entry it has to clear, or null)? Without a record
 * every load wins (the first time at that rep count); with assistance, only a strictly lower one.
 * @param {number} load
 * @param {{ weight: number } | null} record
 * @param {boolean} lowerIsBetter
 * @returns {boolean}
 */
function beatsRepRecord(load, record, lowerIsBetter) {
  if (lowerIsBetter) return record == null || load < record.weight
  return load > (record?.weight ?? 0)
}

// ============================================
// HISTORY WITHOUT A WEIGHT (0 kg sets)
// ============================================

// A 0 kg set is stored as "no value": a history whose sets were all at 0 kg has null bestWeight,
// best1rm and bestPerReps. For these stats, with history in this gym, a missing previous value
// counts as 0, or the first weighted session would never be a PR. recalculate_exercise_prs
// (migration 070) applies the same rule. Other stats still need a previous value: only the weight
// has a real 0 (a bodyweight set) that is stored as missing. A missing reps, time or distance was
// never measured, so counting it as 0 would make the first session that measures it a record.
const ZERO_WHEN_MISSING_STATS = new Set(['bestWeight', 'best1rm'])

function hasWeightHistory(bests) {
  return bests.bestWeight > 0 || bests.best1rm > 0
}

/**
 * The bestPerReps map a rep PR is measured against, or null when rep PRs are not judged. A
 * history without any weight (only 0 kg sets) is measured against an empty map, so every
 * weighted rep count is new. A history WITH a weight but no map is inconsistent data (rows from
 * before best_per_reps, see migration 043): no rep PR rather than a false one. With assistance the
 * same rule reads `bestAssistance`: every assisted set lands in the map (0 included), so an
 * assistance without a map is the inconsistent case.
 * @param {Object} bests - bests before the session (fetchExerciseBests), never null
 * @param {boolean} lowerIsBetter - the exercise ranks rep PRs by assistance
 * @returns {Object<string, number>|null}
 */
function getRepPRHistory(bests, lowerIsBetter) {
  const map = bests.bestPerReps
  if (map && Object.keys(map).length > 0) return map
  const hasLoadHistory = lowerIsBetter ? bests.bestAssistance != null : hasWeightHistory(bests)
  return hasLoadHistory ? null : {}
}

// ============================================
// PR DETECTION (END OF SESSION)
// ============================================

// Mapa de stat → clave i18n para el label que se muestra en la notificación de PR
// y en los registros de detalle. Se evalúa con t() en cada uso para respetar el
// idioma activo (no se puede hacer a nivel de módulo).
const PR_LABEL_KEY = {
  bestWeight: 'workout:pr.weight',
  bestAssistance: 'workout:pr.assistance',
  bestReps: 'workout:pr.reps',
  best1rm: 'workout:pr.oneRM',
  totalVolume: 'workout:pr.volume',
  bestTimeSeconds: 'workout:pr.time',
  bestDistanceMeters: 'workout:pr.distance',
  bestPaceSeconds: 'workout:pr.pace',
}

export function getPRLabel(stat) {
  const key = PR_LABEL_KEY[stat]
  return key ? t(key) : ''
}

// This module does not know the exercise's weight unit in the session's gym, so weight PRs
// carry this placeholder. buildWorkoutSummaryFromEndSession relabels every WEIGHT_PR_TYPES
// detail with the real unit (labelPRDetailUnit). Assistance is in the weight unit too.
const PLACEHOLDER_WEIGHT_UNIT = 'kg'

const PR_FIELDS = [
  { stat: 'bestWeight', flag: 'isPrWeight', unit: PLACEHOLDER_WEIGHT_UNIT, metric: 'weight' },
  { stat: 'bestReps', flag: 'isPrReps', unit: 'reps', metric: 'reps' },
  { stat: 'best1rm', flag: 'isPr1rm', unit: PLACEHOLDER_WEIGHT_UNIT, metric: '1rm' },
  { stat: 'totalVolume', flag: 'isPrVolume', unit: PLACEHOLDER_WEIGHT_UNIT, metric: 'volume' },
  { stat: 'bestTimeSeconds', flag: 'isPrTime', unit: 's', metric: 'time' },
  { stat: 'bestDistanceMeters', flag: 'isPrDistance', unit: 'm', metric: 'distance' },
]

// Lower is better, like pace, but 0 is a value (a set without help): compared with `!= null`.
const ASSISTANCE_FIELD = { stat: 'bestAssistance', flag: 'isPrAssistance', unit: PLACEHOLDER_WEIGHT_UNIT, metric: 'assistance' }

// Derived, so a new weight metric in PR_FIELDS is relabelled without touching another list.
export const WEIGHT_PR_TYPES = new Set([
  ...PR_FIELDS.filter(field => field.unit === PLACEHOLDER_WEIGHT_UNIT).map(field => field.stat),
  ASSISTANCE_FIELD.stat,
  'repPR',
])

const PACE_FIELD = { stat: 'bestPaceSeconds', flag: 'isPrPace', unit: 's/km', metric: 'pace' }

const DEFAULT_FLAGS = {
  isPrWeight: false,
  isPrReps: false,
  isPr1rm: false,
  isPrVolume: false,
  isPrTime: false,
  isPrDistance: false,
  isPrPace: false,
  isPrAssistance: false,
  prRepCounts: null,
}

export function detectNewPersonalRecords(currentStats, previousBests, trackedFields) {
  const flags = { ...DEFAULT_FLAGS }
  const details = []

  if (!currentStats || !previousBests) return { flags, details }

  const prMetrics = trackedFields ? getPRMetrics(trackedFields) : null

  for (const { stat, flag, unit, metric } of PR_FIELDS) {
    if (prMetrics && !prMetrics.includes(metric)) continue
    const current = currentStats[stat]
    const previous = previousBests[stat] || null
    const comparable = previous || ZERO_WHEN_MISSING_STATS.has(stat)
    if (current && comparable && current > (previous || 0)) {
      flags[flag] = true
      const improvement = previous ? Math.round(((current - previous) / previous) * 100) : null
      details.push({ type: stat, label: getPRLabel(stat), newValue: current, oldValue: previous, unit, improvement })
    }
  }

  // Pace is inverted: lower = better
  if (!prMetrics || prMetrics.includes('pace')) {
    const currentPace = currentStats[PACE_FIELD.stat]
    const previousPace = previousBests[PACE_FIELD.stat]
    if (currentPace && previousPace && currentPace < previousPace) {
      flags[PACE_FIELD.flag] = true
      const improvement = Math.round(((previousPace - currentPace) / previousPace) * 100)
      details.push({
        type: PACE_FIELD.stat,
        label: getPRLabel(PACE_FIELD.stat),
        newValue: currentPace,
        oldValue: previousPace,
        unit: PACE_FIELD.unit,
        improvement,
      })
    }
  }

  // Assistance: lower is better, 0 included. Needs an earlier assistance to compare with.
  if (prMetrics?.includes('assistance')) {
    const current = currentStats[ASSISTANCE_FIELD.stat]
    const previous = previousBests[ASSISTANCE_FIELD.stat]
    if (current != null && previous != null && current < previous) {
      flags[ASSISTANCE_FIELD.flag] = true
      details.push({
        type: ASSISTANCE_FIELD.stat,
        label: getPRLabel(ASSISTANCE_FIELD.stat),
        newValue: current,
        oldValue: previous,
        unit: ASSISTANCE_FIELD.unit,
        improvement: Math.round(((previous - current) / previous) * 100),
      })
    }
  }

  // Rep PR per rep count (Strong/Hevy model), against the history getRepPRHistory picks.
  if (!prMetrics || prMetrics.includes('repPR')) {
    const lowerIsBetter = trackedFields ? isRepPRLowerBetter(trackedFields) : false
    const currentBPR = currentStats.bestPerReps
    const previousBPR = getRepPRHistory(previousBests, lowerIsBetter)
    if (currentBPR && previousBPR) {
      const prCounts = []
      for (const [repsKey, load] of Object.entries(currentBPR)) {
        const repCount = parseInt(repsKey, 10)
        // Dominancia: el récord a N reps se compara contra la mejor carga a N reps
        // o más — tanto del histórico (M >= N) como de la propia sesión (M > N,
        // porque más reps con la misma carga domina). El mismo rep count ya está
        // agregado como el mejor en currentBPR[N].
        if (beatsRepRecord(load, findBeatenRepRecord(repCount, previousBPR, currentBPR, { lowerIsBetter }), lowerIsBetter)) {
          prCounts.push(repCount)
          const previous = findPreviousRepRecord(repCount, previousBPR, { lowerIsBetter })
          const oldValue = previous?.weight ?? null
          const improvement = oldValue
            ? Math.round((Math.abs(load - oldValue) / oldValue) * 100)
            : null
          details.push({
            type: 'repPR',
            repCount,
            label: t('workout:pr.repPR', { repCount }),
            newValue: load,
            oldValue,
            // The previous set can have more reps than repCount (dominance), so its own count.
            oldRepCount: previous?.reps ?? null,
            unit: PLACEHOLDER_WEIGHT_UNIT,
            improvement,
          })
        }
      }
      if (prCounts.length > 0) {
        flags.prRepCounts = prCounts.sort((a, b) => a - b)
      }
    }
  }

  return { flags, details }
}

// ============================================
// REAL-TIME PR DETECTION (PER SET)
// ============================================

export function evaluateSetForPR(setData, runningBests, preSessionBests, trackedFields, weightUnit = 'kg') {
  const metrics = getPRMetrics(trackedFields)
  const newRecords = []
  const updatedRunningBests = { ...runningBests }

  if (!setData || !preSessionBests) return { newRecords, updatedRunningBests }

  const checks = []

  if (metrics.includes('weight') && setData.weight) {
    checks.push({ key: 'bestWeight', value: setData.weight, label: getPRLabel('bestWeight'), unit: weightUnit, higherIsBetter: true })
  }

  if (metrics.includes('reps') && setData.reps_completed) {
    checks.push({ key: 'bestReps', value: setData.reps_completed, label: getPRLabel('bestReps'), unit: 'reps', higherIsBetter: true })
  }

  if (metrics.includes('1rm') && setData.weight && setData.reps_completed) {
    const e1rm = calculateEpley1RM(setData.weight, setData.reps_completed)
    if (e1rm > 0) {
      checks.push({ key: 'best1rm', value: e1rm, label: getPRLabel('best1rm'), unit: weightUnit, higherIsBetter: true })
    }
  }

  if (metrics.includes('time') && setData.time_seconds) {
    checks.push({ key: 'bestTimeSeconds', value: setData.time_seconds, label: getPRLabel('bestTimeSeconds'), unit: 's', higherIsBetter: true })
  }

  if (metrics.includes('distance') && setData.distance_meters) {
    checks.push({ key: 'bestDistanceMeters', value: setData.distance_meters, label: getPRLabel('bestDistanceMeters'), unit: 'm', higherIsBetter: true })
  }

  if (metrics.includes('pace') && setData.pace_seconds) {
    checks.push({ key: 'bestPaceSeconds', value: setData.pace_seconds, label: getPRLabel('bestPaceSeconds'), unit: 's/km', higherIsBetter: false })
  }

  for (const { key, value, label, unit, higherIsBetter } of checks) {
    const threshold = Math.max(runningBests[key] || 0, preSessionBests[key] || 0)

    if (higherIsBetter) {
      if (value > threshold && (threshold > 0 || ZERO_WHEN_MISSING_STATS.has(key))) {
        newRecords.push({ type: key, value, previousValue: preSessionBests[key] || null, label, unit })
        updatedRunningBests[key] = value
      } else if (value > (updatedRunningBests[key] || 0)) {
        updatedRunningBests[key] = value
      }
    } else {
      // Lower is better (pace): threshold is the MINIMUM seen so far
      const bestSoFar = Math.min(
        runningBests[key] || Infinity,
        preSessionBests[key] || Infinity,
      )
      if (bestSoFar !== Infinity && value < bestSoFar) {
        newRecords.push({ type: key, value, previousValue: preSessionBests[key], label, unit })
        updatedRunningBests[key] = value
      } else if (!updatedRunningBests[key] || value < updatedRunningBests[key]) {
        updatedRunningBests[key] = value
      }
    }
  }

  // Assistance: lower is better and 0 is a value, so `!= null` and never `|| Infinity` (pace's
  // pattern above would read a 0 record as "no record"). A PR needs an assistance before the
  // session: the first assisted session has nothing to beat.
  const reps = setData.reps_completed
  if (metrics.includes('assistance') && setData.weight != null && reps > 0) {
    const value = Number(setData.weight)
    const previous = preSessionBests[ASSISTANCE_FIELD.stat] ?? null
    const running = runningBests[ASSISTANCE_FIELD.stat] ?? null
    if (previous != null && value < Math.min(previous, running ?? previous)) {
      newRecords.push({ type: ASSISTANCE_FIELD.stat, value, previousValue: previous, label: getPRLabel(ASSISTANCE_FIELD.stat), unit: weightUnit })
    }
    if (running == null || value < running) updatedRunningBests[ASSISTANCE_FIELD.stat] = value
  }

  // Rep PR per rep count (Strong/Hevy model): a W × N set is a PR when W beats the best load
  // at N reps or more, including the first time at N reps (heavier W, or less assistance A).
  // Against the history getRepPRHistory picks.
  const lowerIsBetter = isRepPRLowerBetter(trackedFields)
  const load = setData.weight == null ? null : Number(setData.weight)
  if (metrics.includes('repPR') && isRankableLoad(load, lowerIsBetter) && reps > 0) {
    const preSessionPerRep = getRepPRHistory(preSessionBests, lowerIsBetter)

    if (preSessionPerRep) {
      const N = reps
      const runningPerRep = runningBests.bestPerReps || {}
      // Dominancia: comparar contra la mejor carga a N reps o más (M >= N), tanto de
      // los sets ya hechos en la sesión como del histórico. Así un 100×8 posterior a
      // un 100×9 no dispara PR (running[9]=100 ya cubre 8 reps).
      // Not findBeatenRepRecord: the running map holds this session's sets AT N (earlier PRs), so
      // the session side must be >= N here, not > N as on the end-of-session card.
      const record = bestAtRepsOrAbove(N, false, [runningPerRep, preSessionPerRep], { lowerIsBetter })

      if (beatsRepRecord(load, record, lowerIsBetter)) {
        const previous = findPreviousRepRecord(N, preSessionPerRep, { lowerIsBetter })
        newRecords.push({
          type: 'repPR',
          repCount: N,
          value: load,
          previousValue: previous?.weight ?? null,
          previousRepCount: previous?.reps ?? null,
          label: t('workout:pr.repPR', { repCount: N }),
          unit: weightUnit,
        })
      }
      // PR or not, the running map keeps the session's best load at N (internal running bests).
      const current = runningPerRep[N]
      if (current == null || (lowerIsBetter ? load < current : load > current)) {
        if (!updatedRunningBests.bestPerReps) updatedRunningBests.bestPerReps = { ...runningPerRep }
        updatedRunningBests.bestPerReps[N] = load
      }
    }
  }

  return { newRecords, updatedRunningBests }
}

/**
 * Recalcula DESDE CERO qué series de un ejercicio son PR dentro de la sesión activa,
 * devolviendo cada serie-PR con sus records (para la notificación).
 *
 * A diferencia de evaluateSetForPR (pliegue incremental append-only, usado en vivo al
 * completar cada serie), esta función reprocesa TODAS las series completadas en orden.
 * Es la única forma correcta tras editar o descompletar una serie: el acumulador
 * incremental no puede "quitar" la contribución de una serie ya plegada (bajar el peso
 * de una serie que era PR, o descompletarla, dejaría el running best inflado).
 *
 * Recibe las series en formato store (camelCase) y las mapea al formato db que espera
 * evaluateSetForPR. weightUnit solo afecta a las etiquetas de los records (no a qué
 * series son PR), así que para el trofeo (ver computeExercisePRSetNumbers) es irrelevante.
 *
 * @param {Array<{setNumber:number, weight?:number, repsCompleted?:number, timeSeconds?:number, distanceMeters?:number, paceSeconds?:number}>} completedSets
 * @param {Object|null} preSessionBests - Mejores marcas previas del ejercicio (null/'none' → sin historial → sin PR)
 * @param {string[]} trackedFields
 * @param {string} [weightUnit='kg'] - Unidad para las etiquetas de los records
 * @returns {Array<{setNumber:number, records:Array}>} series que son PR, con sus records, ordenadas por setNumber
 */
export function computeExercisePRSets(completedSets, preSessionBests, trackedFields, weightUnit = 'kg') {
  if (!completedSets?.length || !preSessionBests || preSessionBests === 'none') return []

  const ordered = [...completedSets].sort((a, b) => a.setNumber - b.setNumber)
  let running = {}
  const prSets = []

  for (const set of ordered) {
    const dbFormatSet = {
      weight: set.weight ?? null,
      reps_completed: set.repsCompleted ?? null,
      time_seconds: set.timeSeconds ?? null,
      distance_meters: set.distanceMeters ?? null,
      pace_seconds: set.paceSeconds ?? null,
    }
    const { newRecords, updatedRunningBests } = evaluateSetForPR(dbFormatSet, running, preSessionBests, trackedFields, weightUnit)
    running = updatedRunningBests
    if (newRecords.length > 0) prSets.push({ setNumber: set.setNumber, records: newRecords })
  }

  return prSets
}

/**
 * Igual que computeExercisePRSets pero solo los setNumbers (para el trofeo, que no
 * necesita records ni unidad de peso).
 * @returns {number[]} setNumbers que son PR en la sesión
 */
export function computeExercisePRSetNumbers(completedSets, preSessionBests, trackedFields) {
  return computeExercisePRSets(completedSets, preSessionBests, trackedFields).map(r => r.setNumber)
}

// ============================================
// FIND PR SET IN HISTORY (for session detail view)
// ============================================

export function findPRSetNumbers(sets, prData, trackedFields) {
  if (!sets || sets.length === 0 || !prData) return new Set()

  const prSetNumbers = new Set()

  if (prData.is_pr_1rm) {
    let best = 0
    let bestSetNumber = null
    for (const s of sets) {
      if (s.weight && s.reps_completed) {
        const e1rm = calculateEpley1RM(s.weight, s.reps_completed)
        if (e1rm > best) { best = e1rm; bestSetNumber = s.set_number }
      }
    }
    if (bestSetNumber) prSetNumbers.add(bestSetNumber)
  }

  if (prData.is_pr_reps) {
    let best = 0
    let bestSetNumber = null
    for (const s of sets) {
      const reps = s.reps_completed || 0
      if (reps > best) { best = reps; bestSetNumber = s.set_number }
    }
    if (bestSetNumber) prSetNumbers.add(bestSetNumber)
  }

  if (prData.is_pr_time) {
    let best = 0
    let bestSetNumber = null
    for (const s of sets) {
      if (s.time_seconds && s.time_seconds > best) { best = s.time_seconds; bestSetNumber = s.set_number }
    }
    if (bestSetNumber) prSetNumbers.add(bestSetNumber)
  }

  if (prData.is_pr_distance) {
    let best = 0
    let bestSetNumber = null
    for (const s of sets) {
      if (s.distance_meters && s.distance_meters > best) { best = s.distance_meters; bestSetNumber = s.set_number }
    }
    if (bestSetNumber) prSetNumbers.add(bestSetNumber)
  }

  if (prData.is_pr_pace) {
    let best = Infinity
    let bestSetNumber = null
    for (const s of sets) {
      if (s.pace_seconds && s.pace_seconds > 0 && s.pace_seconds < best) { best = s.pace_seconds; bestSetNumber = s.set_number }
    }
    if (bestSetNumber) prSetNumbers.add(bestSetNumber)
  }

  // The set with the least assistance (0 included), the one the record came from.
  if (prData.is_pr_assistance) {
    const best = findLeastAssistanceSet(sets, trackedFields)
    if (best) prSetNumbers.add(best.set_number)
  }

  return prSetNumbers
}

// ============================================
// PR NOTIFICATION FORMATTING
// ============================================

// Prioridad de records cuando una serie dispara varios PRs simultáneos.
// repPR (más específico) > best1rm (señal de fuerza global) > bestWeight (heaviest).
// Resto en orden de aparición. bestAssistance ranks like bestWeight: it is its assisted twin.
const RECORD_PRIORITY = { repPR: 0, best1rm: 1, bestWeight: 2, bestAssistance: 2 }

export function formatPRNotificationText(notification) {
  const records = notification.records
  if (!records || records.length === 0) return notification.exerciseName
  const sorted = [...records].sort((a, b) => {
    const pa = RECORD_PRIORITY[a.type] ?? 99
    const pb = RECORD_PRIORITY[b.type] ?? 99
    return pa - pb
  })
  const record = sorted[0]
  const improvement = record.previousValue
    ? ` (${t('workout:set.previous').toLowerCase()}: ${formatPreviousRecordValue(record)})`
    : ''
  return `${notification.exerciseName}: ${record.label} ${record.value} ${record.unit}${improvement}`
}

// A rep PR's previous set can have more reps than the new one (dominance), so it carries
// its own unit and rep count. Records without previousRepCount (built before it existed)
// fall back to the record's repCount.
function formatPreviousRecordValue(record) {
  if (record.type !== 'repPR') return record.previousValue
  return `${record.previousValue} ${record.unit} × ${record.previousRepCount ?? record.repCount}`
}
