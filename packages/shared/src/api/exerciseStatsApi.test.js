import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from './_client.js'

import { recalculateSessionStats } from './exerciseStatsApi.js'

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
        { id: 'se-1', exercise_id: 100, exercise: { measurement_type: 'weight_reps' } },
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
        { id: 'se-warm', exercise_id: 100, exercise: { measurement_type: 'weight_reps' } },
        { id: 'se-main', exercise_id: 100, exercise: { measurement_type: 'weight_reps' } },
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
        { id: 'se-1', exercise_id: 100, exercise: { measurement_type: 'weight_reps' } },
        { id: 'se-2', exercise_id: 200, exercise: { measurement_type: 'weight_reps' } },
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
        { id: 'se-1', exercise_id: 100, exercise: { measurement_type: 'weight_reps' } },
      ],
      sets: [],
    })
    getClient.mockReturnValue(client)

    const result = await recalculateSessionStats(SESSION_ID)
    expect(result.affectedExerciseIds).toEqual([100])
  })
})
