import { getClient } from './_client.js'

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
    is_pr_weight: s.isPrWeight ?? false,
    is_pr_reps: s.isPrReps ?? false,
    is_pr_1rm: s.isPr1rm ?? false,
    is_pr_volume: s.isPrVolume ?? false,
    is_pr_time: s.isPrTime ?? false,
    is_pr_distance: s.isPrDistance ?? false,
    is_pr_pace: s.isPrPace ?? false,
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

export async function fetchExerciseBests(exerciseIds) {
  if (!exerciseIds || exerciseIds.length === 0) return {}

  const { data, error } = await getClient()
    .from('exercise_session_stats')
    .select('exercise_id, best_weight, best_reps, best_1rm, total_volume, best_time_seconds, best_distance_meters, best_pace_seconds')
    .in('exercise_id', exerciseIds)

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
  }

  return bests
}

// ============================================
// CHART DATA (reemplaza fetchExerciseHistorySummary para gráficos)
// ============================================

export async function fetchExerciseChartData({ exerciseId, routineDayId }) {
  let query = getClient()
    .from('exercise_session_stats')
    .select(`
      session_date,
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

  const { data, error } = await query

  if (error) throw error
  return data
}

// ============================================
// ALL-TIME STATS
// ============================================

export async function fetchExerciseAllTimeStats(exerciseId) {
  const { data, error } = await getClient()
    .from('exercise_session_stats')
    .select('best_weight, best_reps, best_1rm, total_volume, best_time_seconds, best_distance_meters, best_pace_seconds')
    .eq('exercise_id', exerciseId)

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

export async function recalculateExercisePRs(exerciseId, afterDate) {
  const { error } = await getClient()
    .rpc('recalculate_exercise_prs', {
      p_exercise_id: exerciseId,
      p_after_date: afterDate,
    })

  if (error) throw error
}

// ============================================
// STATS POR SESIÓN (para badges en historial)
// ============================================

export async function fetchSessionPRs(sessionId) {
  const { data, error } = await getClient()
    .from('exercise_session_stats')
    .select('exercise_id, is_pr_weight, is_pr_reps, is_pr_1rm, is_pr_volume, is_pr_time, is_pr_distance, is_pr_pace')
    .eq('session_id', sessionId)

  if (error) throw error
  return data
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
