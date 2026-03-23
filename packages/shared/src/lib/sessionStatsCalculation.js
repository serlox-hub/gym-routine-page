import { MeasurementType, WEIGHT_MEASUREMENT_TYPES, REPS_MEASUREMENT_TYPES } from './measurementTypes.js'
import { calculateEpley1RM } from './workoutCalculations.js'

// ============================================
// TRACKABLE METRICS PER MEASUREMENT TYPE
// ============================================

// Métricas calculadas para stats/charts (se guardan en exercise_session_stats)
const METRIC_MAP = {
  [MeasurementType.WEIGHT_REPS]: ['weight', 'reps', '1rm', 'volume'],
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
// Solo tipos con una métrica unificada clara disparan PRs:
// - weight_reps: 1RM (combina peso×reps)
// - reps_only: reps
// - time: tiempo
// - distance: distancia
// - distance_pace: ritmo (combina distancia/tiempo)
// Tipos compuestos sin fórmula unificada no disparan PRs:
// - weight_time, weight_distance, distance_time, calories, level_*
const PR_METRIC_MAP = {
  [MeasurementType.WEIGHT_REPS]: ['1rm'],
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

  return stats
}

// ============================================
// PR DETECTION (END OF SESSION)
// ============================================

const PR_FIELDS = [
  { stat: 'bestWeight', flag: 'isPrWeight', label: 'Peso', unit: 'kg', metric: 'weight' },
  { stat: 'bestReps', flag: 'isPrReps', label: 'Repeticiones', unit: 'reps', metric: 'reps' },
  { stat: 'best1rm', flag: 'isPr1rm', label: '1RM Est.', unit: 'kg', metric: '1rm' },
  { stat: 'totalVolume', flag: 'isPrVolume', label: 'Volumen', unit: 'kg', metric: 'volume' },
  { stat: 'bestTimeSeconds', flag: 'isPrTime', label: 'Tiempo', unit: 's', metric: 'time' },
  { stat: 'bestDistanceMeters', flag: 'isPrDistance', label: 'Distancia', unit: 'm', metric: 'distance' },
]

const PACE_FIELD = { stat: 'bestPaceSeconds', flag: 'isPrPace', label: 'Ritmo', unit: 's/km', metric: 'pace' }

const DEFAULT_FLAGS = {
  isPrWeight: false,
  isPrReps: false,
  isPr1rm: false,
  isPrVolume: false,
  isPrTime: false,
  isPrDistance: false,
  isPrPace: false,
}

export function detectNewPersonalRecords(currentStats, previousBests, measurementType) {
  const flags = { ...DEFAULT_FLAGS }
  const details = []

  if (!currentStats || !previousBests) return { flags, details }

  const prMetrics = measurementType ? getPRMetrics(measurementType) : null

  for (const { stat, flag, label, unit, metric } of PR_FIELDS) {
    if (prMetrics && !prMetrics.includes(metric)) continue
    const current = currentStats[stat]
    const previous = previousBests[stat]
    if (current && previous && current > previous) {
      flags[flag] = true
      const improvement = Math.round(((current - previous) / previous) * 100)
      details.push({ type: stat, label, newValue: current, oldValue: previous, unit, improvement })
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
        label: PACE_FIELD.label,
        newValue: currentPace,
        oldValue: previousPace,
        unit: PACE_FIELD.unit,
        improvement,
      })
    }
  }

  return { flags, details }
}

// ============================================
// REAL-TIME PR DETECTION (PER SET)
// ============================================

export function evaluateSetForPR(setData, runningBests, preSessionBests, measurementType) {
  const metrics = getPRMetrics(measurementType)
  const newRecords = []
  const updatedRunningBests = { ...runningBests }

  if (!setData || !preSessionBests) return { newRecords, updatedRunningBests }

  const checks = []

  if (metrics.includes('weight') && setData.weight) {
    checks.push({ key: 'bestWeight', value: setData.weight, label: 'Peso', unit: 'kg', higherIsBetter: true })
  }

  if (metrics.includes('reps') && setData.reps_completed) {
    checks.push({ key: 'bestReps', value: setData.reps_completed, label: 'Repeticiones', unit: 'reps', higherIsBetter: true })
  }

  if (metrics.includes('1rm') && setData.weight && setData.reps_completed) {
    const e1rm = calculateEpley1RM(setData.weight, setData.reps_completed)
    if (e1rm > 0) {
      checks.push({ key: 'best1rm', value: e1rm, label: '1RM Est.', unit: 'kg', higherIsBetter: true })
    }
  }

  if (metrics.includes('time') && setData.time_seconds) {
    checks.push({ key: 'bestTimeSeconds', value: setData.time_seconds, label: 'Tiempo', unit: 's', higherIsBetter: true })
  }

  if (metrics.includes('distance') && setData.distance_meters) {
    checks.push({ key: 'bestDistanceMeters', value: setData.distance_meters, label: 'Distancia', unit: 'm', higherIsBetter: true })
  }

  if (metrics.includes('pace') && setData.pace_seconds) {
    checks.push({ key: 'bestPaceSeconds', value: setData.pace_seconds, label: 'Ritmo', unit: 's/km', higherIsBetter: false })
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
    const flags = {
      isPrWeight: false,
      isPrReps: false,
      isPr1rm: false,
      isPrVolume: false,
      isPrTime: false,
      isPrDistance: false,
      isPrPace: false,
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

export function formatPRNotificationText(notification) {
  const record = notification.records[0]
  const improvement = record.previousValue
    ? ` (anterior: ${record.previousValue})`
    : ''
  return `${notification.exerciseName}: ${record.label} ${record.value} ${record.unit}${improvement}`
}
