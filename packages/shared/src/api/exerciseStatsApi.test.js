import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeClientMock, makeRangedQueryMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from './_client.js'

import { recalculateSessionStats, fetchRecentExerciseStats, fetchWeeklyPRs, fetchExerciseChartData, fetchExerciseBests, fetchSessionsWithPRs, fetchExerciseAllTimeStats, upsertExerciseSessionStats } from './exerciseStatsApi.js'
import { RECENT_STATS_LOOKBACK } from '../lib/recentExercises.js'

beforeEach(() => {
  vi.clearAllMocks()
})

const SESSION_ID = 'sess-1'
const USER_ID = 'user-1'
const STARTED_AT = '2026-05-01T10:00:00Z'

function buildClient({ session, sessionExercises, sets }) {
  const client = makeClientMock({
    workout_sessions: { data: session, error: null },
    session_exercises: { data: sessionExercises, error: null },
    completed_sets: { data: sets, error: null },
    exercise_session_stats: { data: null, error: null },
  })
  return client
}

describe('recalculateSessionStats', () => {
  it('devuelve sin afectar nada si sessionId es null', async () => {
    const result = await recalculateSessionStats(null)
    expect(result).toEqual({ affectedExerciseIds: [] })
    expect(getClient).not.toHaveBeenCalled()
  })

  it('upserta stats agregados por exercise_id desde los sets actuales', async () => {
    const client = buildClient({
      session: { user_id: USER_ID, started_at: STARTED_AT },
      sessionExercises: [
        { id: 'se-1', exercise_id: 100, exercise: { tracked_fields: ['weight', 'reps'] } },
      ],
      sets: [
        { session_exercise_id: 'se-1', weight: 80, reps_completed: 10, time_seconds: null, distance_meters: null, pace_seconds: null },
        { session_exercise_id: 'se-1', weight: 90, reps_completed: 5, time_seconds: null, distance_meters: null, pace_seconds: null },
      ],
    })
    getClient.mockReturnValue(client)

    const result = await recalculateSessionStats(SESSION_ID)

    expect(result.affectedExerciseIds).toEqual([100])
    // Verifica que se llamó upsert sobre exercise_session_stats
    const calls = client.from.mock.calls.map(c => c[0])
    expect(calls).toContain('exercise_session_stats')
  })

  it('combina stats cuando hay varios session_exercises del mismo ejercicio (calentamiento + principal)', async () => {
    const client = buildClient({
      session: { user_id: USER_ID, started_at: STARTED_AT },
      sessionExercises: [
        { id: 'se-warm', exercise_id: 100, exercise: { tracked_fields: ['weight', 'reps'] } },
        { id: 'se-main', exercise_id: 100, exercise: { tracked_fields: ['weight', 'reps'] } },
      ],
      sets: [
        { session_exercise_id: 'se-warm', weight: 40, reps_completed: 12, time_seconds: null, distance_meters: null, pace_seconds: null },
        { session_exercise_id: 'se-main', weight: 80, reps_completed: 8, time_seconds: null, distance_meters: null, pace_seconds: null },
      ],
    })
    getClient.mockReturnValue(client)

    const result = await recalculateSessionStats(SESSION_ID)

    // Solo un exercise_id afectado aunque haya dos session_exercises
    expect(result.affectedExerciseIds).toEqual([100])
  })

  it('borra la fila stale si un ejercicio queda sin sets tras la edición', async () => {
    const client = buildClient({
      session: { user_id: USER_ID, started_at: STARTED_AT },
      sessionExercises: [
        { id: 'se-1', exercise_id: 100, exercise: { tracked_fields: ['weight', 'reps'] } },
        { id: 'se-2', exercise_id: 200, exercise: { tracked_fields: ['weight', 'reps'] } },
      ],
      // Solo quedan sets para se-1; se-2 quedó vacío
      sets: [
        { session_exercise_id: 'se-1', weight: 80, reps_completed: 10, time_seconds: null, distance_meters: null, pace_seconds: null },
      ],
    })
    getClient.mockReturnValue(client)

    const result = await recalculateSessionStats(SESSION_ID)

    expect(result.affectedExerciseIds.sort()).toEqual([100, 200])
    // Verifica que se llamó delete sobre exercise_session_stats (para limpiar el ejercicio sin sets)
    const allCalls = client.from.mock.calls.map(c => c[0])
    const statsCalls = allCalls.filter(c => c === 'exercise_session_stats')
    expect(statsCalls.length).toBeGreaterThanOrEqual(2) // al menos upsert + delete
  })

  it('no rompe si la sesión no tiene sets', async () => {
    const client = buildClient({
      session: { user_id: USER_ID, started_at: STARTED_AT },
      sessionExercises: [
        { id: 'se-1', exercise_id: 100, exercise: { tracked_fields: ['weight', 'reps'] } },
      ],
      sets: [],
    })
    getClient.mockReturnValue(client)

    const result = await recalculateSessionStats(SESSION_ID)
    expect(result.affectedExerciseIds).toEqual([100])
  })
})

describe('fetchRecentExerciseStats', () => {
  it('reads the latest rows newest first, with a stable order inside a session, up to the lookback', async () => {
    const rows = [{ exercise_id: 100, session_date: STARTED_AT }]
    const client = makeClientMock({ exercise_session_stats: { data: rows, error: null } })
    getClient.mockReturnValue(client)

    const result = await fetchRecentExerciseStats()

    expect(result).toEqual(rows)
    expect(client.from).toHaveBeenCalledWith('exercise_session_stats')
    const query = client.from.mock.results[0].value
    expect(query.select).toHaveBeenCalledWith('exercise_id, session_date')
    expect(query.order.mock.calls).toEqual([
      ['session_date', { ascending: false }],
      ['exercise_id', { ascending: true }],
    ])
    expect(query.limit).toHaveBeenCalledWith(RECENT_STATS_LOOKBACK)
  })

  it('takes a custom limit', async () => {
    const client = makeClientMock({ exercise_session_stats: { data: [], error: null } })
    getClient.mockReturnValue(client)

    await fetchRecentExerciseStats(10)

    expect(client.from.mock.results[0].value.limit).toHaveBeenCalledWith(10)
  })

  it('throws the Supabase error', async () => {
    const error = { message: 'network down' }
    getClient.mockReturnValue(makeClientMock({ exercise_session_stats: { data: null, error } }))

    await expect(fetchRecentExerciseStats()).rejects.toBe(error)
  })
})

describe('fetchWeeklyPRs', () => {
  it('filters by the date range, keeps rep records and leaves pace out', async () => {
    const rows = [{ session_id: 's1', exercise_id: 1 }]
    const client = makeClientMock({ exercise_session_stats: { data: rows, error: null } })
    getClient.mockReturnValue(client)

    const result = await fetchWeeklyPRs('2026-05-04T00:00:00.000Z', '2026-05-10T23:59:59.000Z')

    expect(result).toEqual(rows)
    const query = client.from.mock.results[0].value
    expect(query.gte).toHaveBeenCalledWith('session_date', '2026-05-04T00:00:00.000Z')
    expect(query.lte).toHaveBeenCalledWith('session_date', '2026-05-10T23:59:59.000Z')
    const filter = query.or.mock.calls[0][0]
    expect(filter).toContain('pr_rep_counts.not.is.null')
    expect(filter).not.toContain('is_pr_pace')
  })

  it('returns an empty array when there is no data', async () => {
    getClient.mockReturnValue(makeClientMock({ exercise_session_stats: { data: null, error: null } }))
    expect(await fetchWeeklyPRs('a', 'b')).toEqual([])
  })

  it('throws the Supabase error', async () => {
    const error = { message: 'boom' }
    getClient.mockReturnValue(makeClientMock({ exercise_session_stats: { data: null, error } }))
    await expect(fetchWeeklyPRs('a', 'b')).rejects.toBe(error)
  })
})

describe('fetchExerciseChartData', () => {
  it('orders by date with the row id as tiebreaker, so pages neither skip nor repeat', async () => {
    const mock = makeRangedQueryMock([])
    getClient.mockReturnValue({ from: () => mock })
    await fetchExerciseChartData({ exerciseId: 1, routineDayId: null, gymId: null })
    expect(mock.order.mock.calls).toEqual([
      ['session_date', { ascending: true }],
      ['id', { ascending: true }],
    ])
  })

  // The history modal filters the chart by routine day on the client, and pages dedupe by id.
  it('selects the row id and the session routine day', async () => {
    const mock = makeRangedQueryMock([])
    getClient.mockReturnValue({ from: () => mock })
    await fetchExerciseChartData({ exerciseId: 1, routineDayId: null, gymId: null })
    const selectArg = mock.select.mock.calls[0][0]
    expect(selectArg).toMatch(/^\s*id,/)
    expect(selectArg).toContain('routine_day_id')
  })

  it('reads every page, not only the first 1000 rows', async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => ({ id: `stat-${i}`, session_date: '2026-01-01' }))
    const mock = makeRangedQueryMock(rows)
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchExerciseChartData({ exerciseId: 1, routineDayId: null, gymId: null })).resolves.toHaveLength(1001)
  })

  it('filters by gym only when one is given', async () => {
    const mock = makeRangedQueryMock([])
    getClient.mockReturnValue({ from: () => mock })
    await fetchExerciseChartData({ exerciseId: 1, routineDayId: null, gymId: 7 })
    expect(mock.eq).toHaveBeenCalledWith('gym_id', 7)

    mock.eq.mockClear()
    await fetchExerciseChartData({ exerciseId: 1, routineDayId: null, gymId: null })
    expect(mock.eq).not.toHaveBeenCalledWith('gym_id', expect.anything())
  })

  it('throws the Supabase error', async () => {
    const error = new Error('boom')
    getClient.mockReturnValue({ from: () => makeRangedQueryMock([], error) })
    await expect(fetchExerciseChartData({ exerciseId: 1, routineDayId: null, gymId: null })).rejects.toBe(error)
  })
})

// ============================================
// ASSISTANCE: LEAST IS BEST, 0 KEPT (issue #202)
// ============================================

describe('assistance in the stats API', () => {
  const ASSISTED = { tracked_fields: ['assistance', 'reps'] }
  const WEIGHTED = { tracked_fields: ['weight', 'reps'] }

  it('fetchExerciseBests keeps the least assistance and the least per rep count, 0 included', async () => {
    const rows = [
      { exercise_id: 1, best_assistance: 20, best_per_reps: { 8: 20, 5: 10 }, exercise: ASSISTED },
      { exercise_id: 1, best_assistance: 0, best_per_reps: { 8: 25, 5: 0 }, exercise: ASSISTED },
      { exercise_id: 1, best_assistance: null, best_per_reps: null, exercise: ASSISTED },
      { exercise_id: 2, best_weight: 80, best_per_reps: { 8: 80 }, exercise: WEIGHTED },
      { exercise_id: 2, best_weight: 90, best_per_reps: { 8: 90, 5: 0 }, exercise: WEIGHTED },
    ]
    const client = makeClientMock({ exercise_session_stats: { data: rows, error: null } })
    getClient.mockReturnValue(client)

    const bests = await fetchExerciseBests([1, 2])

    expect(bests[1].bestAssistance).toBe(0)
    expect(bests[1].bestPerReps).toEqual({ 8: 20, 5: 0 })
    expect(bests[1].sessionCount).toBe(3)
    // Weight still keeps the heaviest, and a 0 kg entry is still "no value" there.
    expect(bests[2].bestWeight).toBe(90)
    expect(bests[2].bestPerReps).toEqual({ 8: 90 })
    const select = client.from.mock.results[0].value.select.mock.calls[0][0]
    expect(select).toContain('best_assistance')
    expect(select).toContain('tracked_fields')
  })

  it('fetchWeeklyPRs and fetchSessionsWithPRs include assistance PRs', async () => {
    const client = makeClientMock({ exercise_session_stats: { data: [{ session_id: 's1' }], error: null } })
    getClient.mockReturnValue(client)

    await fetchWeeklyPRs('a', 'b')
    const result = await fetchSessionsWithPRs(['s1'])

    const [weekly, sessions] = client.from.mock.results.map(r => r.value.or.mock.calls[0][0])
    expect(weekly).toContain('is_pr_assistance.eq.true')
    expect(sessions).toContain('is_pr_assistance.eq.true')
    expect(result).toEqual({ s1: true })
    expect(client.from.mock.results[0].value.select.mock.calls[0][0]).toContain('tracked_fields')
  })

  it('fetchExerciseAllTimeStats returns the least assistance, 0 kept, null without any', async () => {
    getClient.mockReturnValue(makeClientMock({ exercise_session_stats: {
      data: [{ best_assistance: 20 }, { best_assistance: 0 }, { best_assistance: null }], error: null,
    } }))
    expect((await fetchExerciseAllTimeStats({ exerciseId: 1 })).leastAssistance).toBe(0)

    getClient.mockReturnValue(makeClientMock({ exercise_session_stats: { data: [{ best_weight: 50 }], error: null } }))
    expect((await fetchExerciseAllTimeStats({ exerciseId: 2 })).leastAssistance).toBeNull()
  })

  it('upsertExerciseSessionStats writes best_assistance (0 kept) and is_pr_assistance', async () => {
    const client = makeClientMock({ exercise_session_stats: { data: [], error: null } })
    getClient.mockReturnValue(client)

    await upsertExerciseSessionStats([{ userId: 'u', exerciseId: 1, sessionId: 's', sessionDate: 'd', totalSets: 1, bestAssistance: 0, isPrAssistance: true }])

    const [row] = client.from.mock.results[0].value.upsert.mock.calls[0][0]
    expect(row.best_assistance).toBe(0)
    expect(row.is_pr_assistance).toBe(true)
  })

  it('recalculateSessionStats rebuilds an assisted exercise with the least assistance', async () => {
    const client = buildClient({
      session: { user_id: USER_ID, started_at: STARTED_AT },
      sessionExercises: [
        { id: 'se-warm', exercise_id: 7, exercise: ASSISTED },
        { id: 'se-main', exercise_id: 7, exercise: ASSISTED },
      ],
      sets: [
        { session_exercise_id: 'se-warm', weight: 40, reps_completed: 8 },
        { session_exercise_id: 'se-main', weight: 0, reps_completed: 8 },
      ],
    })
    getClient.mockReturnValue(client)

    await recalculateSessionStats(SESSION_ID)

    const upsertCall = client.from.mock.results
      .map(r => r.value.upsert?.mock.calls[0]?.[0])
      .find(Boolean)
    expect(upsertCall[0]).toMatchObject({ best_assistance: 0, best_per_reps: { 8: 0 }, best_weight: null, best_1rm: null, total_volume: null })
  })
})
