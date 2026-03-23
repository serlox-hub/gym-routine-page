import { formatSetValue } from './setUtils.js'

/**
 * Formatea minutos en formato legible: "1h 05min", "45 min"
 */
export function formatDurationHumanReadable(minutes) {
  if (!minutes || minutes <= 0) return '< 1 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${String(m).padStart(2, '0')}min`
}

/**
 * Calcula volumen total (peso × reps) de todos los sets que tengan peso y reps.
 * No depende de measurement_type ya que no siempre está disponible en el query.
 */
export function calculateSessionTotalVolume(exercises) {
  if (!exercises?.length) return 0
  let total = 0
  for (const ex of exercises) {
    for (const set of (ex.sets || [])) {
      const w = set.weight || 0
      const r = set.reps_completed || 0
      if (w > 0 && r > 0) total += w * r
    }
  }
  return Math.round(total)
}

/**
 * Cuenta el total de sets completados.
 */
export function calculateSessionTotalSets(exercises) {
  if (!exercises?.length) return 0
  return exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)
}

/**
 * Encuentra la mejor serie de un ejercicio para mostrar en el resumen.
 * Retorna el string formateado de la serie con más volumen/reps.
 */
function getBestSetFormatted(sets, exercise) {
  if (!sets?.length) return ''

  let best = sets[0]
  let bestScore = 0

  for (const set of sets) {
    const w = set.weight || 0
    const r = set.reps_completed || 0
    const score = (w > 0 && r > 0)
      ? w * r
      : (r || set.time_seconds || set.distance_meters || 0)
    if (score > bestScore) {
      bestScore = score
      best = set
    }
  }

  return formatSetValue(best, {
    timeUnit: exercise?.time_unit || 's',
    distanceUnit: exercise?.distance_unit || 'm',
  })
}

/**
 * Genera nombre de archivo para la imagen compartible: "entrenamiento-2026-03-23.png"
 */
export function buildSummaryFilename(date) {
  const d = date ? new Date(date) : new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `entrenamiento-${yyyy}-${mm}-${dd}.png`
}

/**
 * Formatea fecha corta para la tarjeta: "lun, 23 mar 2026"
 */
function formatShortDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Construye datos del resumen desde la data disponible al terminar sesión.
 *
 * @param {Object} session - session data de endSessionMutation (routine_name, day_name, duration_minutes, started_at)
 * @param {Array} detectedPRs - PRs detectados [{exerciseId, exerciseName, details: [{type, label, newValue, unit}]}]
 * @param {Object} completedSets - snapshot del store {key: {sessionExerciseId, weight, repsCompleted, ...}}
 * @param {Array} sessionExercises - del query cache [{id, exercise_id, exercises: {id, name, measurement_type}, ...}]
 */
export function buildWorkoutSummaryFromEndSession(session, detectedPRs, completedSets, sessionExercises) {
  const prExerciseIds = new Set((detectedPRs || []).map(pr => pr.exerciseId))

  // Agrupar sets por sessionExerciseId
  const setsBySessionExercise = {}
  for (const storeSet of Object.values(completedSets || {})) {
    const seId = storeSet.sessionExerciseId
    if (!setsBySessionExercise[seId]) setsBySessionExercise[seId] = []
    setsBySessionExercise[seId].push({
      weight: storeSet.weight ?? null,
      weight_unit: storeSet.weightUnit || 'kg',
      reps_completed: storeSet.repsCompleted ?? null,
      time_seconds: storeSet.timeSeconds ?? null,
      distance_meters: storeSet.distanceMeters ?? null,
      pace_seconds: storeSet.paceSeconds ?? null,
      set_number: storeSet.setNumber,
    })
  }

  // Construir lista de ejercicios
  const exercises = []
  let totalVolume = 0
  let totalSets = 0

  for (const se of (sessionExercises || [])) {
    const sets = setsBySessionExercise[se.id] || []
    if (sets.length === 0) continue

    const exercise = se.exercises || se.exercise || {}

    for (const s of sets) {
      const w = s.weight || 0
      const r = s.reps_completed || 0
      if (w > 0 && r > 0) totalVolume += w * r
    }

    totalSets += sets.length

    exercises.push({
      name: exercise.name || 'Ejercicio',
      setsCompleted: sets.length,
      bestSet: getBestSetFormatted(sets, exercise),
      hasPR: prExerciseIds.has(exercise.id),
    })
  }

  return {
    dayName: session.day_name || 'Entrenamiento Libre',
    routineName: session.routine_name || null,
    date: formatShortDate(session.started_at || session.completed_at),
    durationMinutes: session.duration_minutes || 0,
    durationFormatted: formatDurationHumanReadable(session.duration_minutes),
    totalExercises: exercises.length,
    totalSetsCompleted: totalSets,
    totalVolumeKg: Math.round(totalVolume),
    exercises,
    prs: (detectedPRs || []).map(pr => ({
      exerciseName: pr.exerciseName,
      details: pr.details.map(d => ({
        label: d.label,
        newValue: d.newValue,
        unit: d.unit,
      })),
    })),
  }
}

/**
 * Construye datos del resumen desde los datos de SessionDetail (para compartir desde historial).
 *
 * @param {Object} session - de useSessionDetail (con .exercises[].exercise, .exercises[].sets)
 * @param {Array} sessionPRs - de useSessionPRs [{exercise_id, is_pr_weight, is_pr_reps, ...}]
 */
export function buildWorkoutSummaryFromSession(session, sessionPRs) {
  if (!session) return null

  const prMap = {}
  for (const pr of (sessionPRs || [])) {
    const hasPR = pr.is_pr_weight || pr.is_pr_reps || pr.is_pr_1rm || pr.is_pr_volume ||
      pr.is_pr_time || pr.is_pr_distance || pr.is_pr_pace
    if (hasPR) prMap[pr.exercise_id] = pr
  }

  const exercises = (session.exercises || []).map(({ exercise, sets }) => ({
    name: exercise?.name || 'Ejercicio',
    setsCompleted: sets?.length || 0,
    bestSet: getBestSetFormatted(sets, exercise),
    hasPR: !!prMap[exercise?.id],
  }))

  // Construir PRs con formato simplificado para la tarjeta
  const prs = []
  for (const { exercise } of (session.exercises || [])) {
    const pr = prMap[exercise?.id]
    if (!pr) continue
    const details = []
    if (pr.is_pr_weight && pr.best_weight) details.push({ label: 'Peso', newValue: pr.best_weight, unit: 'kg' })
    if (pr.is_pr_1rm && pr.best_1rm) details.push({ label: '1RM', newValue: pr.best_1rm, unit: 'kg' })
    if (pr.is_pr_reps && pr.best_reps) details.push({ label: 'Reps', newValue: pr.best_reps, unit: 'reps' })
    if (pr.is_pr_volume && pr.total_volume) details.push({ label: 'Volumen', newValue: pr.total_volume, unit: 'kg' })
    if (pr.is_pr_time && pr.best_time_seconds) details.push({ label: 'Tiempo', newValue: pr.best_time_seconds, unit: 's' })
    if (pr.is_pr_distance && pr.best_distance_meters) details.push({ label: 'Distancia', newValue: pr.best_distance_meters, unit: 'm' })
    if (details.length > 0) {
      prs.push({ exerciseName: exercise.name, details })
    }
  }

  return {
    dayName: session.day_name || session.routine_day?.name || 'Entrenamiento Libre',
    routineName: session.routine_name || session.routine_day?.routine?.name || null,
    date: formatShortDate(session.started_at),
    durationMinutes: session.duration_minutes || 0,
    durationFormatted: formatDurationHumanReadable(session.duration_minutes),
    totalExercises: exercises.length,
    totalSetsCompleted: calculateSessionTotalSets(session.exercises),
    totalVolumeKg: calculateSessionTotalVolume(session.exercises),
    exercises,
    prs,
  }
}
