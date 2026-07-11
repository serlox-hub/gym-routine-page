import { MeasurementType, WEIGHT_MEASUREMENT_TYPES, REPS_MEASUREMENT_TYPES } from './measurementTypes.js'
import { calculateEpley1RM } from './workoutCalculations.js'
import { t } from '../i18n/index.js'

// ============================================
// TRACKABLE METRICS PER MEASUREMENT TYPE
// ============================================

// Métricas calculadas para stats/charts (se guardan en exercise_session_stats)
const METRIC_MAP = {
  [MeasurementType.WEIGHT_REPS]: ['weight', 'reps', '1rm', 'volume', 'repPR'],
  [MeasurementType.REPS_ONLY]: ['reps'],
  [MeasurementType.TIME]: ['time'],
  [MeasurementType.WEIGHT_TIME]: ['weight', 'time'],
  [MeasurementType.DISTANCE]: ['distance'],
  [MeasurementType.WEIGHT_DISTANCE]: ['weight', 'distance'],
  [MeasurementType.CALORIES]: [],
  [MeasurementType.LEVEL_TIME]: ['time'],
  [MeasurementType.LEVEL_DISTANCE]: ['distance'],
  [MeasurementType.LEVEL_CALORIES]: [],
  [MeasurementType.DISTANCE_TIME]: ['distance', 'time'],
  [MeasurementType.DISTANCE_PACE]: ['distance', 'pace'],
}

// Métricas que disparan PRs (subconjunto de METRIC_MAP).
// weight_reps: modelo Strong/Hevy → weight (heaviest ever) + 1RM est. + repPR
// (mejor peso por cada rep count exacto). Otros tipos: una métrica unificada.
const PR_METRIC_MAP = {
  [MeasurementType.WEIGHT_REPS]: ['1rm', 'weight', 'repPR'],
  [MeasurementType.REPS_ONLY]: ['reps'],
  [MeasurementType.TIME]: ['time'],
  [MeasurementType.WEIGHT_TIME]: [],
  [MeasurementType.DISTANCE]: ['distance'],
  [MeasurementType.WEIGHT_DISTANCE]: [],
  [MeasurementType.CALORIES]: [],
  [MeasurementType.LEVEL_TIME]: [],
  [MeasurementType.LEVEL_DISTANCE]: [],
  [MeasurementType.LEVEL_CALORIES]: [],
  [MeasurementType.DISTANCE_TIME]: [],
  [MeasurementType.DISTANCE_PACE]: ['pace'],
}

export function getTrackableMetrics(measurementType) {
  return METRIC_MAP[measurementType] || []
}

export function getPRMetrics(measurementType) {
  return PR_METRIC_MAP[measurementType] || METRIC_MAP[measurementType] || []
}

// ============================================
// SESSION STATS CALCULATION
// ============================================

export function calculateSessionExerciseStats(sets, measurementType) {
  if (!sets || sets.length === 0) return null

  const metrics = getTrackableMetrics(measurementType)
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

  if (metrics.includes('repPR')) {
    // Mejor peso de la sesión por cada rep_count exacto. Ej: { "5": 100, "8": 80 }
    const perRep = {}
    for (const s of sets) {
      if (s.weight && s.reps_completed && s.weight > 0 && s.reps_completed > 0) {
        const key = String(s.reps_completed)
        if (!perRep[key] || s.weight > perRep[key]) {
          perRep[key] = s.weight
        }
      }
    }
    stats.bestPerReps = Object.keys(perRep).length > 0 ? perRep : null
  }

  return stats
}

/**
 * Combina dos stats del mismo ejercicio (ej. calentamiento + principal).
 * Maxima los `best*`, suma `totalVolume` y `totalSets`, mínima `bestPaceSeconds`.
 */
export function mergeExerciseStats(target, source) {
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
  if (source.bestPerReps) {
    if (!target.bestPerReps) target.bestPerReps = {}
    for (const [reps, weight] of Object.entries(source.bestPerReps)) {
      if (!target.bestPerReps[reps] || weight > target.bestPerReps[reps]) {
        target.bestPerReps[reps] = weight
      }
    }
  }
}

// ============================================
// REP-PR DOMINANCE HELPER
// ============================================

// Regla de dominancia: hacer más reps al mismo peso es estrictamente mejor, así
// que un set W×N "cubre" implícitamente W×M para todo M < N. Por eso el récord a
// N reps debe compararse contra el mejor peso conseguido a N reps *o más*, no solo
// a exactamente N. Esto evita marcar como PR un 100×8 cuando ya se hizo 100×9.
//
// Devuelve el máximo peso entre las entradas con rep count >= minReps (o > minReps
// si strictlyGreater=true) de uno o varios objetos bestPerReps. 0 si no hay ninguna.
export function maxWeightAtRepsOrAbove(minReps, strictlyGreater, ...maps) {
  let best = 0
  for (const map of maps) {
    if (!map) continue
    for (const [repsKey, weight] of Object.entries(map)) {
      const reps = parseInt(repsKey, 10)
      const qualifies = strictlyGreater ? reps > minReps : reps >= minReps
      if (qualifies && weight > best) best = weight
    }
  }
  return best
}

// ============================================
// PR DETECTION (END OF SESSION)
// ============================================

// Mapa de stat → clave i18n para el label que se muestra en la notificación de PR
// y en los registros de detalle. Se evalúa con t() en cada uso para respetar el
// idioma activo (no se puede hacer a nivel de módulo).
const PR_LABEL_KEY = {
  bestWeight: 'workout:pr.weight',
  bestReps: 'workout:pr.reps',
  best1rm: 'workout:pr.oneRM',
  totalVolume: 'workout:pr.volume',
  bestTimeSeconds: 'workout:pr.time',
  bestDistanceMeters: 'workout:pr.distance',
  bestPaceSeconds: 'workout:pr.pace',
}

function getPRLabel(stat) {
  const key = PR_LABEL_KEY[stat]
  return key ? t(key) : ''
}

const PR_FIELDS = [
  { stat: 'bestWeight', flag: 'isPrWeight', unit: 'kg', metric: 'weight' },
  { stat: 'bestReps', flag: 'isPrReps', unit: 'reps', metric: 'reps' },
  { stat: 'best1rm', flag: 'isPr1rm', unit: 'kg', metric: '1rm' },
  { stat: 'totalVolume', flag: 'isPrVolume', unit: 'kg', metric: 'volume' },
  { stat: 'bestTimeSeconds', flag: 'isPrTime', unit: 's', metric: 'time' },
  { stat: 'bestDistanceMeters', flag: 'isPrDistance', unit: 'm', metric: 'distance' },
]

const PACE_FIELD = { stat: 'bestPaceSeconds', flag: 'isPrPace', unit: 's/km', metric: 'pace' }

const DEFAULT_FLAGS = {
  isPrWeight: false,
  isPrReps: false,
  isPr1rm: false,
  isPrVolume: false,
  isPrTime: false,
  isPrDistance: false,
  isPrPace: false,
  prRepCounts: null,
}

export function detectNewPersonalRecords(currentStats, previousBests, measurementType) {
  const flags = { ...DEFAULT_FLAGS }
  const details = []

  if (!currentStats || !previousBests) return { flags, details }

  const prMetrics = measurementType ? getPRMetrics(measurementType) : null

  for (const { stat, flag, unit, metric } of PR_FIELDS) {
    if (prMetrics && !prMetrics.includes(metric)) continue
    const current = currentStats[stat]
    const previous = previousBests[stat]
    if (current && previous && current > previous) {
      flags[flag] = true
      const improvement = Math.round(((current - previous) / previous) * 100)
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

  // Rep-PR-por-rep-count (modelo Strong/Hevy). Solo dispara si previousBests
  // tiene al menos una entrada en bestPerReps — sin eso no hay historial
  // rep-by-rep para comparar (caso de primera sesión o transitorio).
  if (!prMetrics || prMetrics.includes('repPR')) {
    const currentBPR = currentStats.bestPerReps
    const previousBPR = previousBests.bestPerReps
    const hasRepPRHistory = previousBPR && Object.keys(previousBPR).length > 0
    if (currentBPR && hasRepPRHistory) {
      const prCounts = []
      for (const [repsKey, weight] of Object.entries(currentBPR)) {
        const repCount = parseInt(repsKey, 10)
        // Dominancia: el récord a N reps se compara contra el mejor peso a N reps
        // o más — tanto del histórico (M >= N) como de la propia sesión (M > N,
        // porque más reps al mismo peso domina). El mismo rep count ya está
        // agregado como máximo en currentBPR[N].
        const historicalThreshold = maxWeightAtRepsOrAbove(repCount, false, previousBPR)
        const sameSessionDom = maxWeightAtRepsOrAbove(repCount, true, currentBPR)
        const threshold = Math.max(historicalThreshold, sameSessionDom)
        if (weight > threshold) {
          prCounts.push(repCount)
          const oldValue = threshold > 0 ? threshold : null
          const improvement = oldValue
            ? Math.round(((weight - oldValue) / oldValue) * 100)
            : null
          details.push({
            type: 'repPR',
            repCount,
            label: t('workout:pr.repPR', { repCount }),
            newValue: weight,
            oldValue,
            unit: 'kg',
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

export function evaluateSetForPR(setData, runningBests, preSessionBests, measurementType, weightUnit = 'kg') {
  const metrics = getPRMetrics(measurementType)
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
      if (value > threshold && threshold > 0) {
        newRecords.push({ type: key, value, previousValue: preSessionBests[key], label, unit })
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

  // Rep-PR-por-rep-count (modelo Strong/Hevy): el set @ W kg × N reps es PR si W
  // supera el mejor peso histórico a exactamente N reps, o si es la primera vez a
  // N reps con historial general del ejercicio.
  //
  // Guard: solo dispara si preSessionBests.bestPerReps tiene al menos una entrada.
  // Esto evita falsos positivos en la primera sesión del ejercicio (no hay historial
  // de rep-by-rep) o durante el período transitorio antes de que el backfill llene
  // best_per_reps en filas existentes.
  if (metrics.includes('repPR') && setData.weight && setData.reps_completed) {
    const preSessionPerRep = preSessionBests.bestPerReps
    const hasRepPRHistory = preSessionPerRep && Object.keys(preSessionPerRep).length > 0

    if (hasRepPRHistory) {
      const N = setData.reps_completed
      const runningPerRep = runningBests.bestPerReps || {}
      // Dominancia: comparar contra el mejor peso a N reps o más (M >= N), tanto de
      // los sets ya hechos en la sesión como del histórico. Así un 100×8 posterior a
      // un 100×9 no dispara PR (running[9]=100 ya cubre 8 reps).
      const threshold = maxWeightAtRepsOrAbove(N, false, runningPerRep, preSessionPerRep)

      if (setData.weight > threshold) {
        newRecords.push({
          type: 'repPR',
          repCount: N,
          value: setData.weight,
          previousValue: preSessionPerRep[N] ?? null,
          label: t('workout:pr.repPR', { repCount: N }),
          unit: weightUnit,
        })
        if (!updatedRunningBests.bestPerReps) updatedRunningBests.bestPerReps = { ...runningPerRep }
        updatedRunningBests.bestPerReps[N] = setData.weight
      } else if ((runningPerRep[N] || 0) < setData.weight) {
        // No es PR pero mejora el running bests interno
        if (!updatedRunningBests.bestPerReps) updatedRunningBests.bestPerReps = { ...runningPerRep }
        updatedRunningBests.bestPerReps[N] = setData.weight
      }
    }
  }

  return { newRecords, updatedRunningBests }
}

// ============================================
// PR FLAGS RECALCULATION (AFTER DELETE)
// ============================================

export function recalculatePRFlags(sessionsOrderedByDate) {
  if (!sessionsOrderedByDate || sessionsOrderedByDate.length === 0) return []

  const runningBests = {}
  const results = []

  for (let i = 0; i < sessionsOrderedByDate.length; i++) {
    const session = sessionsOrderedByDate[i]
    const isFirst = i === 0
    // prRepCounts no se recalcula aquí — esta función es la versión cliente
    // simplificada; la fuente de verdad es el RPC recalculate_exercise_prs.
    const flags = {
      isPrWeight: false,
      isPrReps: false,
      isPr1rm: false,
      isPrVolume: false,
      isPrTime: false,
      isPrDistance: false,
      isPrPace: false,
      prRepCounts: null,
    }

    if (!isFirst) {
      // Higher-is-better fields
      for (const [stat, flag] of [
        ['bestWeight', 'isPrWeight'],
        ['bestReps', 'isPrReps'],
        ['best1rm', 'isPr1rm'],
        ['totalVolume', 'isPrVolume'],
        ['bestTimeSeconds', 'isPrTime'],
        ['bestDistanceMeters', 'isPrDistance'],
      ]) {
        const current = session[stat]
        const previous = runningBests[stat]
        if (current && previous && current > previous) {
          flags[flag] = true
        }
      }

      // Pace: lower is better
      const currentPace = session.bestPaceSeconds
      const previousPace = runningBests.bestPaceSeconds
      if (currentPace && previousPace && currentPace < previousPace) {
        flags.isPrPace = true
      }
    }

    // Update running bests
    for (const stat of ['bestWeight', 'bestReps', 'best1rm', 'totalVolume', 'bestTimeSeconds', 'bestDistanceMeters']) {
      const val = session[stat]
      if (val && (!runningBests[stat] || val > runningBests[stat])) {
        runningBests[stat] = val
      }
    }
    // Pace: track minimum
    if (session.bestPaceSeconds && (!runningBests.bestPaceSeconds || session.bestPaceSeconds < runningBests.bestPaceSeconds)) {
      runningBests.bestPaceSeconds = session.bestPaceSeconds
    }

    results.push({
      sessionId: session.sessionId,
      exerciseId: session.exerciseId,
      ...flags,
    })
  }

  return results
}

// ============================================
// FIND PR SET IN HISTORY (for session detail view)
// ============================================

export function findPRSetNumbers(sets, prData) {
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

  return prSetNumbers
}

// ============================================
// PR NOTIFICATION FORMATTING
// ============================================

// Prioridad de records cuando una serie dispara varios PRs simultáneos.
// repPR (más específico) > best1rm (señal de fuerza global) > bestWeight (heaviest).
// Resto en orden de aparición.
const RECORD_PRIORITY = { repPR: 0, best1rm: 1, bestWeight: 2 }

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
    ? ` (${t('workout:set.previous').toLowerCase()}: ${record.previousValue})`
    : ''
  return `${notification.exerciseName}: ${record.label} ${record.value} ${record.unit}${improvement}`
}
