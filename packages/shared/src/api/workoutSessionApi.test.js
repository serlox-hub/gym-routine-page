import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeQueryMock, makeRangedQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from './_client.js'

vi.mock('./exerciseStatsApi.js', () => ({
  recalculateSessionStats: vi.fn(),
  recalculateExercisePRs: vi.fn(),
}))
import { recalculateSessionStats, recalculateExercisePRs } from './exerciseStatsApi.js'

import {
  hasAuthSession,
  fetchActiveSession,
  fetchCompletedSetsForSession,
  fetchLastSetPerformedAt,
  startWorkoutSession,
  fetchExerciseIdsWithSets,
  deleteSessionExercisesWithoutSets,
  completeWorkoutSession,
  deleteWorkoutSession,
  fetchWorkoutHistory,
  fetchSessionDetail,
  fetchExerciseHistorySummary,
  fetchPreviousWorkout,
  fetchCompletedSessionCount,
  rescheduleSession,
} from './workoutSessionApi.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// hasAuthSession
// ============================================

// El store de auth puede conocer al usuario sin que auth-js tenga sesión (token caducado y refresh
// fallando, #221). Esta función es lo único que lo distingue de "no hay sesión activa".
describe('hasAuthSession', () => {
  const clientWithSession = (result) => ({
    auth: { getSession: vi.fn().mockResolvedValue(result) },
  })

  it('devuelve true cuando el cliente tiene sesión', async () => {
    getClient.mockReturnValue(clientWithSession({
      data: { session: { access_token: 'token', user: { id: 'user-1' } } },
      error: null,
    }))
    expect(await hasAuthSession()).toBe(true)
  })

  it('devuelve false cuando no hay sesión', async () => {
    getClient.mockReturnValue(clientWithSession({ data: { session: null }, error: null }))
    expect(await hasAuthSession()).toBe(false)
  })

  it('devuelve false cuando getSession responde con error y sin sesión', async () => {
    getClient.mockReturnValue(clientWithSession({
      data: { session: null },
      error: new Error('Failed to fetch'),
    }))
    expect(await hasAuthSession()).toBe(false)
  })

  it('devuelve false si la respuesta no trae data', async () => {
    getClient.mockReturnValue(clientWithSession({ data: null, error: new Error('boom') }))
    expect(await hasAuthSession()).toBe(false)
  })
})

// ============================================
// fetchActiveSession
// ============================================

describe('fetchActiveSession', () => {
  it('returns active session when one exists', async () => {
    const session = { id: 'session-1', routine_day_id: 'day-1', started_at: '2026-01-01T10:00:00Z', routine_days: { routine_id: 'routine-1' } }
    getClient.mockReturnValue(makeClientMock({
      workout_sessions: { data: session, error: null },
    }))
    const result = await fetchActiveSession()
    expect(result).toEqual(session)
  })

  it('returns null when no active session exists', async () => {
    getClient.mockReturnValue(makeClientMock({
      workout_sessions: { data: null, error: null },
    }))
    const result = await fetchActiveSession()
    expect(result).toBeNull()
  })

  it('throws when Supabase returns error', async () => {
    getClient.mockReturnValue(makeClientMock({
      workout_sessions: { data: null, error: new Error('DB error') },
    }))
    await expect(fetchActiveSession()).rejects.toThrow('DB error')
  })
})

// ============================================
// fetchCompletedSetsForSession
// ============================================

describe('fetchLastSetPerformedAt', () => {
  it('pide solo la serie más reciente de la sesión', async () => {
    const mock = makeQueryMock({ data: [{ performed_at: '2026-01-01T11:00:00+00:00' }], error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchLastSetPerformedAt('session-1')
    expect(result).toBe('2026-01-01T11:00:00+00:00')
    expect(mock.eq).toHaveBeenCalledWith('session_id', 'session-1')
    expect(mock.order).toHaveBeenCalledWith('performed_at', { ascending: false })
    expect(mock.limit).toHaveBeenCalledWith(1)
  })

  it('devuelve null si la sesión no tiene series', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    expect(await fetchLastSetPerformedAt('session-1')).toBeNull()
  })

  it('lanza si Supabase devuelve error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('boom') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchLastSetPerformedAt('session-1')).rejects.toThrow('boom')
  })
})

describe('fetchCompletedSetsForSession', () => {
  it('returns array of completed sets for the session', async () => {
    const sets = [
      { session_exercise_id: 'ex-1', set_number: 1, weight: 100, reps_completed: 5 },
      { session_exercise_id: 'ex-1', set_number: 2, weight: 100, reps_completed: 4 },
    ]
    const mock = makeQueryMock({ data: sets, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchCompletedSetsForSession('session-1')
    expect(result).toHaveLength(2)
    expect(result[0].set_number).toBe(1)
  })

  it('returns empty array when session has no sets', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchCompletedSetsForSession('session-1')
    expect(result).toEqual([])
  })

  // issue #11: el SELECT de restauración debe traer level y calories_burned
  it('incluye level y calories_burned en el select', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    await fetchCompletedSetsForSession('session-1')
    const selectArg = mock.select.mock.calls[0][0]
    expect(selectArg).toContain('level')
    expect(selectArg).toContain('calories_burned')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('connection failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchCompletedSetsForSession('session-1')).rejects.toThrow('connection failed')
  })
})

// ============================================
// startWorkoutSession
// ============================================

describe('startWorkoutSession', () => {
  it('returns session data from rpc on success', async () => {
    const sessionData = { session_id: 'session-new', session_exercises: [{ id: 'se-1' }] }
    const mock = makeClientMock()
    mock.rpc.mockResolvedValue({ data: sessionData, error: null })
    getClient.mockReturnValue(mock)

    const result = await startWorkoutSession({
      routineDayId: 'day-1',
      routineName: 'Fuerza',
      dayName: 'Día 1',
      exercises: [{ id: 'ex-1', series: 3 }],
    })

    expect(result).toEqual(sessionData)
    expect(mock.rpc).toHaveBeenCalledWith('start_workout_session', {
      p_routine_day_id: 'day-1',
      p_routine_name: 'Fuerza',
      p_day_name: 'Día 1',
      p_exercises: [{ id: 'ex-1', series: 3 }],
      p_gym_id: null,
    })
  })

  it('throws when rpc returns error', async () => {
    const mock = makeClientMock()
    mock.rpc.mockResolvedValue({ data: null, error: new Error('rpc error') })
    getClient.mockReturnValue(mock)

    await expect(startWorkoutSession({
      routineDayId: 'day-1',
      routineName: 'Fuerza',
      dayName: 'Día 1',
      exercises: [],
    })).rejects.toThrow('rpc error')
  })
})

// ============================================
// fetchExerciseIdsWithSets
// ============================================

describe('fetchExerciseIdsWithSets', () => {
  it('returns array of session_exercise_id values', async () => {
    const data = [
      { session_exercise_id: 'se-1' },
      { session_exercise_id: 'se-2' },
    ]
    const mock = makeQueryMock({ data, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchExerciseIdsWithSets('session-1')
    expect(result).toEqual(['se-1', 'se-2'])
  })

  it('returns empty array when no sets exist', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchExerciseIdsWithSets('session-1')
    expect(result).toEqual([])
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('query failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchExerciseIdsWithSets('session-1')).rejects.toThrow('query failed')
  })
})

// ============================================
// deleteSessionExercisesWithoutSets
// ============================================

describe('deleteSessionExercisesWithoutSets', () => {
  it('completes without throwing when deletion is successful', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(
      deleteSessionExercisesWithoutSets('session-1', ['se-1', 'se-2'])
    ).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('delete failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(
      deleteSessionExercisesWithoutSets('session-1', ['se-1'])
    ).rejects.toThrow('delete failed')
  })

  it('works with empty exerciseIdsWithSets array', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(
      deleteSessionExercisesWithoutSets('session-1', [])
    ).resolves.toBeUndefined()
  })
})

// ============================================
// completeWorkoutSession
// ============================================

describe('completeWorkoutSession', () => {
  it('returns updated session on success', async () => {
    const updatedSession = {
      id: 'session-1',
      status: 'completed',
      completed_at: '2026-01-01T11:00:00Z',
      duration_minutes: 60,
    }
    const mock = makeQueryMock({ data: updatedSession, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await completeWorkoutSession({
      sessionId: 'session-1',
      completedAt: '2026-01-01T11:00:00Z',
      durationMinutes: 60,
      overallFeeling: 4,
      notes: 'Buena sesión',
    })
    expect(result).toEqual(updatedSession)
    expect(result.status).toBe('completed')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('update failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(completeWorkoutSession({
      sessionId: 'session-1',
      completedAt: '2026-01-01T11:00:00Z',
      durationMinutes: 60,
    })).rejects.toThrow('update failed')
  })

  it('accepts null optional fields', async () => {
    const updatedSession = { id: 'session-1', status: 'completed', overall_feeling: null, notes: null }
    const mock = makeQueryMock({ data: updatedSession, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await completeWorkoutSession({
      sessionId: 'session-1',
      completedAt: '2026-01-01T11:00:00Z',
      durationMinutes: 45,
      overallFeeling: null,
      notes: null,
    })
    expect(result.overall_feeling).toBeNull()
  })
})

// ============================================
// deleteWorkoutSession
// ============================================

describe('deleteWorkoutSession', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteWorkoutSession('session-1')).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('delete failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteWorkoutSession('session-1')).rejects.toThrow('delete failed')
  })
})

// ============================================
// fetchWorkoutHistory
// ============================================

describe('fetchWorkoutHistory', () => {
  it('returns array of sessions in date range', async () => {
    const sessions = [
      { id: 'session-1', started_at: '2026-01-15T10:00:00Z', status: 'completed' },
      { id: 'session-2', started_at: '2026-01-10T10:00:00Z', status: 'completed' },
    ]
    const mock = makeQueryMock({ data: sessions, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchWorkoutHistory({
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T23:59:59Z',
    })
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('session-1')
  })

  it('returns empty array when no sessions in range', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchWorkoutHistory({
      from: '2026-06-01T00:00:00Z',
      to: '2026-06-30T23:59:59Z',
    })
    expect(result).toEqual([])
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('query error') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchWorkoutHistory({
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T23:59:59Z',
    })).rejects.toThrow('query error')
  })
})

// ============================================
// fetchCompletedSessionCount
// ============================================

describe('fetchCompletedSessionCount', () => {
  it('returns count of completed sessions', async () => {
    const mock = makeQueryMock({ count: 42, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchCompletedSessionCount()
    expect(result).toBe(42)
  })

  it('returns 0 when count is null', async () => {
    const mock = makeQueryMock({ count: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchCompletedSessionCount()
    expect(result).toBe(0)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ count: null, error: new Error('count error') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchCompletedSessionCount()).rejects.toThrow('count error')
  })
})

// ============================================
// fetchSessionDetail
// ============================================

describe('fetchSessionDetail', () => {
  it('returns full session detail on success', async () => {
    const detail = {
      id: 'session-1',
      started_at: '2026-01-01T10:00:00Z',
      status: 'completed',
      session_exercises: [{ id: 'se-1', completed_sets: [] }],
    }
    const mock = makeQueryMock({ data: detail, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchSessionDetail('session-1')
    expect(result).toEqual(detail)
    expect(result.session_exercises).toHaveLength(1)
  })

  it('throws when session not found (Supabase single throws)', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('Row not found') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchSessionDetail('nonexistent-id')).rejects.toThrow('Row not found')
  })

  // issue #11: el detalle de sesión debe traer level y calories_burned de completed_sets
  it('incluye level y calories_burned en el select de completed_sets', async () => {
    const mock = makeQueryMock({ data: { id: 'session-1', session_exercises: [] }, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await fetchSessionDetail('session-1')
    const selectArg = mock.select.mock.calls[0][0]
    expect(selectArg).toContain('level')
    expect(selectArg).toContain('calories_burned')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('permission denied') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchSessionDetail('session-1')).rejects.toThrow('permission denied')
  })
})

// ============================================
// fetchExerciseHistorySummary
// ============================================

describe('fetchExerciseHistorySummary', () => {
  it('returns summary data for exercise without routineDayId filter', async () => {
    const data = [
      { id: 'se-1', session: { id: 's-1', started_at: '2026-01-01T10:00:00Z' }, completed_sets: [{ weight: 100, reps_completed: 5 }] },
    ]
    const mock = makeRangedQueryMock(data)
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchExerciseHistorySummary({ exerciseId: 'ex-1', routineDayId: null })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('se-1')
  })

  it('returns summary data filtered by routineDayId', async () => {
    const data = [
      { id: 'se-2', session: { id: 's-2', started_at: '2026-01-10T10:00:00Z', routine_day_id: 'day-1' }, completed_sets: [] },
    ]
    const mock = makeRangedQueryMock(data)
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchExerciseHistorySummary({ exerciseId: 'ex-1', routineDayId: 'day-1' })
    expect(result).toHaveLength(1)
    expect(mock.eq).toHaveBeenCalledWith('session.routine_day_id', 'day-1')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeRangedQueryMock([], new Error('query failed'))
    getClient.mockReturnValue({ from: () => mock })
    await expect(
      fetchExerciseHistorySummary({ exerciseId: 'ex-1', routineDayId: null })
    ).rejects.toThrow('query failed')
  })

  // The multi-gym overlay converts per gym, so the SELECT needs session.gym_id.
  it('incluye gym_id de la sesión en el select', async () => {
    const mock = makeRangedQueryMock([])
    getClient.mockReturnValue({ from: () => mock })
    await fetchExerciseHistorySummary({ exerciseId: 'ex-1', routineDayId: null })
    expect(mock.select.mock.calls[0][0]).toContain('gym_id')
  })

  // The history modal renders its list from this query: the routine day marks each session, and
  // each set row shows its effort and opens its note or video.
  it('selects what the history list shows', async () => {
    const mock = makeRangedQueryMock([])
    getClient.mockReturnValue({ from: () => mock })
    await fetchExerciseHistorySummary({ exerciseId: 'ex-1', routineDayId: null })
    const selectArg = mock.select.mock.calls[0][0]
    for (const field of ['routine_day_id', 'rir_actual', 'notes', 'video_url', 'level', 'calories_burned']) {
      expect(selectArg).toContain(field)
    }
    expect(selectArg).toMatch(/completed_sets!inner \(\s*id,/)
  })

  it('orders newest first with the row id as tiebreaker, so pages neither skip nor repeat', async () => {
    const mock = makeRangedQueryMock([])
    getClient.mockReturnValue({ from: () => mock })
    await fetchExerciseHistorySummary({ exerciseId: 'ex-1', routineDayId: null })
    expect(mock.order.mock.calls).toEqual([
      ['session(started_at)', { ascending: false }],
      ['id', { ascending: false }],
    ])
  })

  it('reads every page, not only the first 1000 rows', async () => {
    const data = Array.from({ length: 1500 }, (_, i) => ({ id: `se-${i}`, session: {}, completed_sets: [] }))
    const mock = makeRangedQueryMock(data)
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchExerciseHistorySummary({ exerciseId: 'ex-1', routineDayId: null })
    expect(result).toHaveLength(1500)
    expect(mock.range).toHaveBeenCalledTimes(3)
  })
})

// ============================================
// fetchPreviousWorkout
// ============================================

describe('fetchPreviousWorkout', () => {
  it('devuelve fallback (cualquier día) y sameSlot null sin routineDayId', async () => {
    const data = [
      {
        id: 'se-1',
        session: { id: 's-1', started_at: '2026-01-01T10:00:00Z', status: 'completed', routine_day_id: 7, day_name: 'Push' },
        completed_sets: [{ set_number: 1, weight: 100, reps_completed: 5 }],
      },
    ]
    const mock = makeQueryMock({ data, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchPreviousWorkout({ exerciseId: 'ex-1' })
    expect(result.fallback.id).toBe('se-1')
    expect(result.sameSlot).toBeNull()
  })

  it('con routineDayId lanza también la query de mismo slot (filtra por routine_day_id y gym_id)', async () => {
    const data = [
      {
        id: 'se-9',
        session: { id: 's-9', started_at: '2026-02-01T10:00:00Z', status: 'completed', routine_day_id: 3, day_name: 'Pull' },
        completed_sets: [{ set_number: 1, weight: 80, reps_completed: 8 }],
      },
    ]
    const mock = makeQueryMock({ data, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchPreviousWorkout({ exerciseId: 'ex-1', gymId: 5, routineDayId: 3 })
    expect(result.sameSlot.id).toBe('se-9')
    expect(result.fallback.id).toBe('se-9')
    const eqKeys = mock.eq.mock.calls.map(c => c[0])
    expect(eqKeys).toContain('session.routine_day_id')
    expect(eqKeys).toContain('session.gym_id')
  })

  it('devuelve nulls cuando el ejercicio no tiene sesión previa', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await fetchPreviousWorkout({ exerciseId: 'ex-new' })
    expect(result).toEqual({ sameSlot: null, fallback: null })
  })

  // issue #11: el prefill de "sesión anterior" necesita level y calories_burned
  it('incluye level y calories_burned en el select', async () => {
    const mock = makeQueryMock({ data: [], error: null })
    getClient.mockReturnValue({ from: () => mock })
    await fetchPreviousWorkout({ exerciseId: 'ex-1' })
    const selectArg = mock.select.mock.calls[0][0]
    expect(selectArg).toContain('level')
    expect(selectArg).toContain('calories_burned')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('query failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(fetchPreviousWorkout({ exerciseId: 'ex-1' })).rejects.toThrow('query failed')
  })
})

// ============================================
// rescheduleSession
// ============================================

describe('rescheduleSession', () => {
  const OLD_START = '2026-03-10T18:00:00Z'

  // Un único chain compartido: permite inspeccionar el update sobre workout_sessions.
  function mockClient(session) {
    const chain = makeQueryMock({ data: session, error: null })
    getClient.mockReturnValue({ from: vi.fn(() => chain), rpc: vi.fn() })
    return chain
  }

  beforeEach(() => {
    recalculateSessionStats.mockResolvedValue({ affectedExerciseIds: [7, 9], gymId: 'gym-1' })
    recalculateExercisePRs.mockResolvedValue(undefined)
  })

  it('rechaza una sesión que no está terminada', async () => {
    const chain = mockClient({ started_at: OLD_START, gym_id: 'gym-1', status: 'in_progress' })
    await expect(
      rescheduleSession({ sessionId: 's-1', startedAt: '2026-03-09T18:00:00Z', durationMinutes: 60 })
    ).rejects.toThrow()
    expect(chain.update).not.toHaveBeenCalled()
    expect(recalculateSessionStats).not.toHaveBeenCalled()
  })

  it('es un no-op cuando el inicio propuesto es el mismo instante', async () => {
    const chain = mockClient({ started_at: OLD_START, gym_id: 'gym-1', status: 'completed' })
    const result = await rescheduleSession({
      sessionId: 's-1',
      startedAt: '2026-03-10T18:00:00.000Z',
      durationMinutes: 60,
    })
    expect(result).toEqual({ affectedExerciseIds: [], movedForward: false, statsSynced: true })
    expect(chain.update).not.toHaveBeenCalled()
    expect(recalculateSessionStats).not.toHaveBeenCalled()
  })

  it('escribe inicio y duración y resincroniza session_date vía recalculateSessionStats', async () => {
    const chain = mockClient({ started_at: OLD_START, gym_id: 'gym-1', status: 'completed' })
    const result = await rescheduleSession({
      sessionId: 's-1',
      startedAt: '2026-03-09T18:00:00.000Z',
      durationMinutes: 75,
    })
    expect(chain.update).toHaveBeenCalledWith({
      started_at: '2026-03-09T18:00:00.000Z',
      duration_minutes: 75,
    })
    expect(recalculateSessionStats).toHaveBeenCalledWith('s-1')
    expect(result).toEqual({ affectedExerciseIds: [7, 9], movedForward: false, statsSynced: true })
  })

  it('al mover hacia atrás no recalcula desde la fecha vieja', async () => {
    mockClient({ started_at: OLD_START, gym_id: 'gym-1', status: 'completed' })
    await rescheduleSession({ sessionId: 's-1', startedAt: '2026-03-09T18:00:00.000Z', durationMinutes: 60 })
    expect(recalculateExercisePRs).not.toHaveBeenCalled()
  })

  it('al mover hacia adelante recalcula además la posición que la sesión deja libre', async () => {
    mockClient({ started_at: OLD_START, gym_id: 'gym-1', status: 'completed' })
    const result = await rescheduleSession({
      sessionId: 's-1',
      startedAt: '2026-03-12T18:00:00.000Z',
      durationMinutes: 60,
    })
    expect(result.movedForward).toBe(true)
    expect(recalculateExercisePRs).toHaveBeenCalledTimes(2)
    expect(recalculateExercisePRs).toHaveBeenCalledWith(7, OLD_START, 'gym-1')
    expect(recalculateExercisePRs).toHaveBeenCalledWith(9, OLD_START, 'gym-1')
  })

  it('si falla la resincronización de stats la mutación resuelve con statsSynced:false y el UPDATE sigue en pie', async () => {
    recalculateSessionStats.mockRejectedValue(new Error('resync failed'))
    const chain = mockClient({ started_at: OLD_START, gym_id: 'gym-1', status: 'completed' })
    const result = await rescheduleSession({
      sessionId: 's-1',
      startedAt: '2026-03-09T18:00:00.000Z',
      durationMinutes: 60,
    })
    expect(chain.update).toHaveBeenCalledWith({
      started_at: '2026-03-09T18:00:00.000Z',
      duration_minutes: 60,
    })
    expect(result).toEqual({ affectedExerciseIds: [], movedForward: false, statsSynced: false })
    expect(recalculateExercisePRs).not.toHaveBeenCalled()
  })

  it('si falla el recálculo de PRs (movimiento hacia adelante) la mutación resuelve con statsSynced:false', async () => {
    recalculateExercisePRs.mockRejectedValue(new Error('pr recalculation failed'))
    const chain = mockClient({ started_at: OLD_START, gym_id: 'gym-1', status: 'completed' })
    const result = await rescheduleSession({
      sessionId: 's-1',
      startedAt: '2026-03-12T18:00:00.000Z',
      durationMinutes: 60,
    })
    expect(chain.update).toHaveBeenCalled()
    expect(result.movedForward).toBe(true)
    expect(result.statsSynced).toBe(false)
  })

  it('propaga el error si falla la lectura de la sesión', async () => {
    getClient.mockReturnValue({ from: () => makeQueryMock({ data: null, error: new Error('read failed') }) })
    await expect(
      rescheduleSession({ sessionId: 's-1', startedAt: '2026-03-09T18:00:00Z', durationMinutes: 60 })
    ).rejects.toThrow('read failed')
  })
})
