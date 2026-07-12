import { formatSetValue } from './setUtils.js'
import { buildPRsByExerciseMap } from './workoutCalculations.js'
import { getExerciseName } from './exerciseUtils.js'
import { fetchSessionDetail } from '../api/workoutSessionApi.js'
import { fetchSessionPRs, fetchExerciseBests } from '../api/exerciseStatsApi.js'
import { fetchUserExerciseWeightUnits } from '../api/exerciseApi.js'
import { transformSessionDetailData } from './workoutTransforms.js'
import { maxWeightAtRepsOrAbove } from './sessionStatsCalculation.js'
import { t, getCurrentLocale } from '../i18n/index.js'

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
function getBestSetFormatted(sets, exercise, weightUnit = 'kg') {
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

  return formatSetValue({ ...best, weight_unit: weightUnit })
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
  const locale = getCurrentLocale() === 'en' ? 'en-US' : 'es-ES'
  return date.toLocaleDateString(locale, {
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
export function buildWorkoutSummaryFromEndSession(session, detectedPRs, completedSets, sessionExercises, { weightUnit = 'kg' } = {}) {
  const prExerciseIds = new Set((detectedPRs || []).map(pr => pr.exerciseId))

  // Agrupar sets por sessionExerciseId
  const setsBySessionExercise = {}
  for (const storeSet of Object.values(completedSets || {})) {
    const seId = storeSet.sessionExerciseId
    if (!setsBySessionExercise[seId]) setsBySessionExercise[seId] = []
    setsBySessionExercise[seId].push({
      weight: storeSet.weight ?? null,
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
      name: getExerciseName(exercise) || t('exercise:title'),
      setsCompleted: sets.length,
      bestSet: getBestSetFormatted(sets, exercise, weightUnit),
      hasPR: prExerciseIds.has(exercise.id),
    })
  }

  return {
    dayName: session.day_name || t('workout:session.freeWorkout'),
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
      // Preservamos type/oldValue/repCount para que las tarjetas de PR del
      // carrusel puedan formatear correctamente ("× N reps", "anterior · X",
      // "primera vez a N reps", etc.)
      details: pr.details.map(d => ({ ...d })),
    })),
  }
}

/**
 * Construye un detail de PR con type/newValue/oldValue/unit/repCount.
 * Compatible con el shape que producen detectNewPersonalRecords y los formatters
 * de prCardFormat.
 */
function buildPRDetail({ type, newValue, oldValue, unit, repCount }) {
  return { type, newValue, oldValue: oldValue ?? null, unit, ...(repCount != null && { repCount }) }
}

/**
 * Construye datos del resumen desde los datos de SessionDetail (para compartir desde historial).
 *
 * @param {Object} session - de useSessionDetail (con .exercises[].exercise, .exercises[].sets)
 * @param {Array} sessionPRs - de useSessionPRs (incluye stats y flags)
 * @param {Object} previousBests - bests agregados de cada ejercicio ANTES de esta sesión
 *                                 (de fetchExerciseBests con beforeDate). Se usa para
 *                                 poblar oldValue en cada detail. Si se omite, los oldValue
 *                                 quedan a null.
 */
export function buildWorkoutSummaryFromSession(session, sessionPRs, { weightUnit = 'kg', weightUnitByExerciseId = {}, previousBests = {} } = {}) {
  if (!session) return null

  const prMap = buildPRsByExerciseMap(sessionPRs)
  const getUnit = (exerciseId) => weightUnitByExerciseId[exerciseId] || weightUnit

  const exercises = (session.exercises || []).map(({ exercise, sets }) => ({
    name: getExerciseName(exercise) || t('exercise:title'),
    setsCompleted: sets?.length || 0,
    bestSet: getBestSetFormatted(sets, exercise, getUnit(exercise?.id)),
    hasPR: !!prMap[exercise?.id],
  }))

  // Construir PRs con shape completo (type/oldValue/repCount) para alimentar
  // las tarjetas de PR del carrusel.
  const prs = []
  for (const { exercise } of (session.exercises || [])) {
    const pr = prMap[exercise?.id]
    if (!pr) continue
    const unit = getUnit(exercise?.id)
    const prevBests = previousBests[exercise?.id] || {}
    const details = []

    if (pr.is_pr_weight && pr.best_weight) {
      details.push(buildPRDetail({ type: 'bestWeight', newValue: pr.best_weight, oldValue: prevBests.bestWeight, unit }))
    }
    if (pr.is_pr_1rm && pr.best_1rm) {
      details.push(buildPRDetail({ type: 'best1rm', newValue: pr.best_1rm, oldValue: prevBests.best1rm, unit }))
    }
    if (pr.is_pr_reps && pr.best_reps) {
      details.push(buildPRDetail({ type: 'bestReps', newValue: pr.best_reps, oldValue: prevBests.bestReps, unit: 'reps' }))
    }
    if (pr.is_pr_volume && pr.total_volume) {
      details.push(buildPRDetail({ type: 'totalVolume', newValue: pr.total_volume, oldValue: prevBests.totalVolume, unit }))
    }
    if (pr.is_pr_time && pr.best_time_seconds) {
      details.push(buildPRDetail({ type: 'bestTimeSeconds', newValue: pr.best_time_seconds, oldValue: prevBests.bestTimeSeconds, unit: 's' }))
    }
    if (pr.is_pr_distance && pr.best_distance_meters) {
      details.push(buildPRDetail({ type: 'bestDistanceMeters', newValue: pr.best_distance_meters, oldValue: prevBests.bestDistanceMeters, unit: 'm' }))
    }

    if (Array.isArray(pr.pr_rep_counts) && pr.best_per_reps) {
      const prevPerReps = prevBests.bestPerReps || {}
      for (const repCount of pr.pr_rep_counts) {
        const key = String(repCount)
        const newValue = pr.best_per_reps[key]
        if (newValue == null) continue
        // Dominancia: el "anterior" es el mejor peso batido a N reps o más — del
        // histórico (M >= N) y de la propia sesión a más reps (M > N). Coincide con
        // el umbral usado en detectNewPersonalRecords para no mostrar dos valores
        // distintos según la vista.
        const threshold = Math.max(
          maxWeightAtRepsOrAbove(repCount, false, prevPerReps),
          maxWeightAtRepsOrAbove(repCount, true, pr.best_per_reps),
        )
        details.push(buildPRDetail({
          type: 'repPR',
          newValue,
          oldValue: threshold > 0 ? threshold : null,
          unit,
          repCount,
        }))
      }
    }

    if (details.length > 0) {
      prs.push({ exerciseName: getExerciseName(exercise), details })
    }
  }

  return {
    dayName: session.day_name || session.routine_day?.name || t('workout:session.freeWorkout'),
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

/**
 * Obtiene los datos de resumen de una sesion para compartir.
 * Fetcha la sesion y sus PRs, transforma y construye el summary.
 */
export async function fetchWorkoutSummary(sessionId, { weightUnit = 'kg' } = {}) {
  const [rawSession, prs] = await Promise.all([
    fetchSessionDetail(sessionId),
    fetchSessionPRs(sessionId),
  ])
  const session = transformSessionDetailData(rawSession)
  const exerciseIds = (session?.exercises || []).map(e => e.exercise?.id).filter(Boolean)
  const gymId = rawSession?.gym_id ?? null

  // Bests históricos hasta justo antes de esta sesión, dentro del mismo gym, para
  // poblar oldValue en cada detail (línea "anterior · X" en las tarjetas de PR).
  const [weightUnitByExerciseId, previousBests] = await Promise.all([
    fetchUserExerciseWeightUnits(exerciseIds),
    fetchExerciseBests(exerciseIds, { beforeDate: session.started_at, gymId }),
  ])

  return buildWorkoutSummaryFromSession(session, prs, {
    weightUnit,
    weightUnitByExerciseId,
    previousBests,
  })
}
