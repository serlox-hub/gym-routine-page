import { getClient } from './_client.js'
import { calculateSessionExerciseStats, mergeExerciseStats } from '../lib/sessionStatsCalculation.js'

// ============================================
// UPSERT SESSION STATS (al finalizar sesión)
// ============================================

export async function upsertExerciseSessionStats(statsArray) {
  if (!statsArray || statsArray.length === 0) return []

  const rows = statsArray.map(s => ({
    user_id: s.userId,
    exercise_id: s.exerciseId,
    session_id: s.sessionId,
    session_date: s.sessionDate,
    best_weight: s.bestWeight ?? null,
    best_reps: s.bestReps ?? null,
    best_1rm: s.best1rm ?? null,
    total_volume: s.totalVolume ?? null,
    total_sets: s.totalSets,
    best_time_seconds: s.bestTimeSeconds ?? null,
    best_distance_meters: s.bestDistanceMeters ?? null,
    best_pace_seconds: s.bestPaceSeconds ?? null,
    best_per_reps: s.bestPerReps ?? null,
    gym_id: s.gymId ?? null,
    is_pr_weight: s.isPrWeight ?? false,
    is_pr_reps: s.isPrReps ?? false,
    is_pr_1rm: s.isPr1rm ?? false,
    is_pr_volume: s.isPrVolume ?? false,
    is_pr_time: s.isPrTime ?? false,
    is_pr_distance: s.isPrDistance ?? false,
    is_pr_pace: s.isPrPace ?? false,
    pr_rep_counts: s.prRepCounts ?? null,
  }))

  const { data, error } = await getClient()
    .from('exercise_session_stats')
    .upsert(rows, { onConflict: 'session_id,exercise_id' })
    .select()

  if (error) throw error
  return data
}

// ============================================
// FETCH BESTS (para detección de PRs)
// ============================================

export async function fetchExerciseBests(exerciseIds, { beforeDate, gymId } = {}) {
  if (!exerciseIds || exerciseIds.length === 0) return {}

  let query = getClient()
    .from('exercise_session_stats')
    .select('exercise_id, best_weight, best_reps, best_1rm, total_volume, best_time_seconds, best_distance_meters, best_pace_seconds, best_per_reps')
    .in('exercise_id', exerciseIds)

  if (beforeDate) {
    query = query.lt('session_date', beforeDate)
  }

  // PRs por gimnasio: los bests se calculan dentro del contexto del gym.
  if (gymId != null) {
    query = query.eq('gym_id', gymId)
  }

  const { data, error } = await query

  if (error) throw error

  const bests = {}
  for (const row of data) {
    const eid = row.exercise_id
    if (!bests[eid]) {
      bests[eid] = {
        bestWeight: null,
        bestReps: null,
        best1rm: null,
        totalVolume: null,
        bestTimeSeconds: null,
        bestDistanceMeters: null,
        bestPaceSeconds: null,
        bestPerReps: null,
        sessionCount: 0,
      }
    }
    const b = bests[eid]
    b.sessionCount++
    const w = Number(row.best_weight) || null
    const r = Number(row.best_reps) || null
    const e = Number(row.best_1rm) || null
    const v = Number(row.total_volume) || null
    const t = Number(row.best_time_seconds) || null
    const d = Number(row.best_distance_meters) || null
    const p = Number(row.best_pace_seconds) || null
    if (w && (!b.bestWeight || w > b.bestWeight)) b.bestWeight = w
    if (r && (!b.bestReps || r > b.bestReps)) b.bestReps = r
    if (e && (!b.best1rm || e > b.best1rm)) b.best1rm = e
    if (v && (!b.totalVolume || v > b.totalVolume)) b.totalVolume = v
    if (t && (!b.bestTimeSeconds || t > b.bestTimeSeconds)) b.bestTimeSeconds = t
    if (d && (!b.bestDistanceMeters || d > b.bestDistanceMeters)) b.bestDistanceMeters = d
    if (p && (!b.bestPaceSeconds || p < b.bestPaceSeconds)) b.bestPaceSeconds = p
    if (row.best_per_reps && typeof row.best_per_reps === 'object') {
      if (!b.bestPerReps) b.bestPerReps = {}
      for (const [reps, weight] of Object.entries(row.best_per_reps)) {
        const numWeight = Number(weight) || 0
        if (numWeight > 0 && (!b.bestPerReps[reps] || numWeight > b.bestPerReps[reps])) {
          b.bestPerReps[reps] = numWeight
        }
      }
    }
  }

  return bests
}

// ============================================
// CHART DATA (reemplaza fetchExerciseHistorySummary para gráficos)
// ============================================

export async function fetchExerciseChartData({ exerciseId, routineDayId, gymId }) {
  let query = getClient()
    .from('exercise_session_stats')
    .select(`
      session_date,
      gym_id,
      best_weight,
      best_reps,
      best_1rm,
      total_volume,
      total_sets,
      best_time_seconds,
      best_distance_meters,
      best_pace_seconds,
      is_pr_weight,
      is_pr_reps,
      is_pr_1rm,
      is_pr_volume,
      session:workout_sessions!inner (
        routine_day_id
      )
    `)
    .eq('exercise_id', exerciseId)
    .order('session_date', { ascending: true })

  if (routineDayId) {
    query = query.eq('session.routine_day_id', routineDayId)
  }

  // Filtro por gym (vista de un solo gimnasio). Para el overlay se omite y se
  // agrupa por gym_id en el cliente.
  if (gymId != null) {
    query = query.eq('gym_id', gymId)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// ============================================
// ALL-TIME STATS
// ============================================

export async function fetchExerciseAllTimeStats({ exerciseId, gymId } = {}) {
  let query = getClient()
    .from('exercise_session_stats')
    .select('best_weight, best_reps, best_1rm, total_volume, best_time_seconds, best_distance_meters, best_pace_seconds')
    .eq('exercise_id', exerciseId)

  if (gymId != null) {
    query = query.eq('gym_id', gymId)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data || data.length === 0) return null

  const num = (v) => Number(v) || 0

  return {
    best1rm: Math.max(...data.map(r => num(r.best_1rm))) || null,
    maxWeight: Math.max(...data.map(r => num(r.best_weight))) || null,
    maxReps: Math.max(...data.map(r => num(r.best_reps))) || null,
    totalVolume: data.reduce((sum, r) => sum + num(r.total_volume), 0) || null,
    maxTimeSeconds: Math.max(...data.map(r => num(r.best_time_seconds))) || null,
    maxDistanceMeters: Math.max(...data.map(r => num(r.best_distance_meters))) || null,
    bestPaceSeconds: Math.min(...data.filter(r => r.best_pace_seconds).map(r => Number(r.best_pace_seconds))) || null,
    sessionCount: data.length,
  }
}

// ============================================
// PR FLAGS UPDATE (para recalculación)
// ============================================

/**
 * Recalcula `exercise_session_stats` para una sesión a partir de los `completed_sets`
 * actuales y propaga los flags `is_pr_*` desde su fecha. Se llama tras editar/borrar
 * un set en el historial para evitar que los stats queden desincronizados.
 */
export async function recalculateSessionStats(sessionId) {
  if (!sessionId) return { affectedExerciseIds: [] }

  const client = getClient()

  const { data: session, error: sErr } = await client
    .from('workout_sessions')
    .select('user_id, started_at, gym_id')
    .eq('id', sessionId)
    .single()
  if (sErr) throw sErr

  const { data: sessionExercises, error: seErr } = await client
    .from('session_exercises')
    .select('id, exercise_id, exercise:exercises!inner ( measurement_type )')
    .eq('session_id', sessionId)
  if (seErr) throw seErr

  const { data: sets, error: setsErr } = await client
    .from('completed_sets')
    .select('session_exercise_id, weight, reps_completed, time_seconds, distance_meters, pace_seconds')
    .eq('session_id', sessionId)
  if (setsErr) throw setsErr

  const exerciseMap = {}
  const exerciseIds = new Set()
  for (const se of sessionExercises || []) {
    const mt = se.exercise?.measurement_type || 'weight_reps'
    exerciseMap[se.id] = { exerciseId: se.exercise_id, measurementType: mt }
    exerciseIds.add(se.exercise_id)
  }

  const setsByExercise = {}
  for (const s of sets || []) {
    if (!setsByExercise[s.session_exercise_id]) setsByExercise[s.session_exercise_id] = []
    setsByExercise[s.session_exercise_id].push(s)
  }

  const statsPerExercise = {}
  for (const [seId, exSets] of Object.entries(setsByExercise)) {
    const info = exerciseMap[seId]
    if (!info) continue
    const stats = calculateSessionExerciseStats(exSets, info.measurementType)
    if (!stats) continue
    if (!statsPerExercise[info.exerciseId]) {
      statsPerExercise[info.exerciseId] = stats
    } else {
      mergeExerciseStats(statsPerExercise[info.exerciseId], stats)
    }
  }

  const statsRows = []
  for (const exerciseId of exerciseIds) {
    const stats = statsPerExercise[exerciseId]
    if (!stats) continue
    statsRows.push({
      userId: session.user_id,
      exerciseId,
      sessionId,
      sessionDate: session.started_at,
      gymId: session.gym_id,
      ...stats,
    })
  }

  if (statsRows.length > 0) {
    await upsertExerciseSessionStats(statsRows)
  }

  // Si tras la edición un ejercicio quedó sin sets en esta sesión, borrar la fila stale
  // para que no perdure como PR fantasma.
  const exercisesWithSets = new Set(statsRows.map(r => r.exerciseId))
  const exercisesToDelete = Array.from(exerciseIds).filter(eid => !exercisesWithSets.has(eid))
  if (exercisesToDelete.length > 0) {
    const { error: delErr } = await client
      .from('exercise_session_stats')
      .delete()
      .eq('session_id', sessionId)
      .in('exercise_id', exercisesToDelete)
    if (delErr) throw delErr
  }

  // Recalcula flags is_pr_* desde esta sesión hacia adelante para cada ejercicio
  // afectado, dentro del gym de la sesión.
  await Promise.all(
    Array.from(exerciseIds).map(eid => recalculateExercisePRs(eid, session.started_at, session.gym_id))
  )

  return { affectedExerciseIds: Array.from(exerciseIds), gymId: session.gym_id }
}

export async function recalculateExercisePRs(exerciseId, afterDate, gymId = null) {
  const { error } = await getClient()
    .rpc('recalculate_exercise_prs', {
      p_exercise_id: exerciseId,
      p_after_date: afterDate,
      p_gym_id: gymId,
    })

  if (error) throw error
}

// ============================================
// STATS POR SESIÓN (para badges en historial)
// ============================================

export async function fetchSessionPRs(sessionId) {
  const { data, error } = await getClient()
    .from('exercise_session_stats')
    .select(`
      exercise_id,
      best_weight, best_reps, best_1rm, total_volume,
      best_time_seconds, best_distance_meters, best_pace_seconds,
      best_per_reps,
      is_pr_weight, is_pr_reps, is_pr_1rm, is_pr_volume,
      is_pr_time, is_pr_distance, is_pr_pace,
      pr_rep_counts
    `)
    .eq('session_id', sessionId)

  if (error) throw error
  return data
}

export async function fetchWeeklyPRCount(from, to) {
  const { count, error } = await getClient()
    .from('exercise_session_stats')
    .select('*', { count: 'exact', head: true })
    .gte('session_date', from)
    .lte('session_date', to)
    .or('is_pr_weight.eq.true,is_pr_reps.eq.true,is_pr_1rm.eq.true,is_pr_volume.eq.true,is_pr_time.eq.true,is_pr_distance.eq.true,is_pr_pace.eq.true')

  if (error) throw error
  return count || 0
}

export async function fetchSessionsWithPRs(sessionIds) {
  if (!sessionIds || sessionIds.length === 0) return {}

  const { data, error } = await getClient()
    .from('exercise_session_stats')
    .select('session_id')
    .in('session_id', sessionIds)
    .or('is_pr_weight.eq.true,is_pr_reps.eq.true,is_pr_1rm.eq.true,is_pr_volume.eq.true,is_pr_time.eq.true,is_pr_distance.eq.true,is_pr_pace.eq.true')

  if (error) throw error

  const result = {}
  for (const row of data) {
    result[row.session_id] = true
  }
  return result
}
