import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import React from 'react'
import { useExerciseHistory, useExerciseHistorySummary, usePreviousWorkout, useRescheduleSession, useUpdateSessionMetadata, useUpsertCompletedSet, useDeleteCompletedSet, useCorrectSessionExercise } from './useWorkoutHistory.js'

// Mock the workoutApi module
vi.mock('../api/workoutApi.js', () => ({
  fetchWorkoutHistory: vi.fn(),
  fetchSessionDetail: vi.fn(),
  fetchExerciseHistorySummary: vi.fn(),
  fetchExerciseHistory: vi.fn(),
  fetchPreviousWorkout: vi.fn(),
  deleteWorkoutSession: vi.fn(),
  updateSessionMetadata: vi.fn(),
  rescheduleSession: vi.fn(),
  upsertCompletedSet: vi.fn(),
  deleteCompletedSet: vi.fn(),
  fetchCompletedSessionCount: vi.fn(),
  correctSessionExercise: vi.fn(),
}))

vi.mock('../api/exerciseStatsApi.js', () => ({
  fetchExerciseChartData: vi.fn(),
  fetchExerciseAllTimeStats: vi.fn(),
  fetchSessionPRs: vi.fn(),
  recalculateExercisePRs: vi.fn(),
  recalculateSessionStats: vi.fn(),
}))
vi.mock('../api/exerciseApi.js', () => ({ fetchUserExerciseGymUnit: vi.fn() }))
vi.mock('../api/preferencesApi.js', () => ({ fetchPreferences: vi.fn() }))
vi.mock('./useAuth.js', () => ({ useUserId: () => 'user-1' }))

const notify = vi.fn()
vi.mock('../notifications.js', () => ({ getNotifier: () => ({ show: notify }) }))

import { fetchExerciseHistory, fetchExerciseHistorySummary, fetchPreviousWorkout, rescheduleSession, updateSessionMetadata, upsertCompletedSet, deleteCompletedSet, correctSessionExercise } from '../api/workoutApi.js'
import { t } from '../i18n/index.js'
import { recalculateSessionStats } from '../api/exerciseStatsApi.js'
import { fetchUserExerciseGymUnit } from '../api/exerciseApi.js'
import { fetchPreferences } from '../api/preferencesApi.js'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const FAKE_SESSIONS = [
  {
    session: { id: 'session-1', started_at: '2024-01-15T10:00:00Z', gym_id: 'gym-1' },
    completed_sets: [
      { id: 'set-1', set_number: 1, weight: 100, reps_completed: 5 },
    ],
  },
  {
    // sin gym_id → gymId debe caer a null (sesión legacy / sin gym)
    session: { id: 'session-2', started_at: '2024-01-10T10:00:00Z' },
    completed_sets: [
      { id: 'set-2', set_number: 1, weight: 95, reps_completed: 5 },
    ],
  },
]

describe('useExerciseHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna { pages: [...] } shape con useInfiniteQuery', async () => {
    fetchExerciseHistory.mockResolvedValueOnce(FAKE_SESSIONS)

    const { result } = renderHook(
      () => useExerciseHistory('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(result.current.data.pages).toBeDefined()
    expect(Array.isArray(result.current.data.pages)).toBe(true)
  })

  it('la primera página contiene los resultados de la API', async () => {
    fetchExerciseHistory.mockResolvedValueOnce(FAKE_SESSIONS)

    const { result } = renderHook(
      () => useExerciseHistory('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const firstPage = result.current.data.pages[0]
    expect(Array.isArray(firstPage)).toBe(true)
    expect(firstPage).toHaveLength(2)
    expect(firstPage[0].sessionId).toBe('session-1')
    expect(firstPage[0].date).toBe('2024-01-15T10:00:00Z')
    expect(Array.isArray(firstPage[0].sets)).toBe(true)
  })

  it('propaga gymId por sesión (null si la sesión no tiene gym_id)', async () => {
    fetchExerciseHistory.mockResolvedValueOnce(FAKE_SESSIONS)

    const { result } = renderHook(
      () => useExerciseHistory('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const firstPage = result.current.data.pages[0]
    expect(firstPage[0].gymId).toBe('gym-1')
    expect(firstPage[1].gymId).toBeNull()
  })

  it('data.pages.flat() produce array plano de sesiones', async () => {
    fetchExerciseHistory.mockResolvedValueOnce(FAKE_SESSIONS)

    const { result } = renderHook(
      () => useExerciseHistory('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const flatSessions = result.current.data.pages.flat()
    expect(Array.isArray(flatSessions)).toBe(true)
    expect(flatSessions).toHaveLength(2)
  })

  it('hasNextPage es false cuando la página tiene menos de 30 items', async () => {
    fetchExerciseHistory.mockResolvedValueOnce(FAKE_SESSIONS) // 2 items < 30

    const { result } = renderHook(
      () => useExerciseHistory('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.hasNextPage).toBe(false)
  })

  it('hasNextPage es true cuando la página tiene exactamente 30 items', async () => {
    const fullPage = Array.from({ length: 30 }, (_, i) => ({
      session: { id: `session-${i}`, started_at: '2024-01-15T10:00:00Z' },
      completed_sets: [{ id: `set-${i}`, set_number: 1 }],
    }))
    fetchExerciseHistory.mockResolvedValueOnce(fullPage)

    const { result } = renderHook(
      () => useExerciseHistory('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.hasNextPage).toBe(true)
  })

  it('la primera página está vacía cuando la API devuelve []', async () => {
    fetchExerciseHistory.mockResolvedValueOnce([])

    const { result } = renderHook(
      () => useExerciseHistory('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.pages[0]).toEqual([])
    expect(result.current.hasNextPage).toBe(false)
  })

  it('fetchNextPage agrega una segunda página a data.pages', async () => {
    const page1 = Array.from({ length: 30 }, (_, i) => ({
      session: { id: `session-p1-${i}`, started_at: '2024-01-15T10:00:00Z' },
      completed_sets: [{ id: `set-p1-${i}`, set_number: 1 }],
    }))
    const page2 = [
      {
        session: { id: 'session-p2-0', started_at: '2024-01-01T10:00:00Z' },
        completed_sets: [{ id: 'set-p2-0', set_number: 1 }],
      },
    ]

    fetchExerciseHistory
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)

    const { result } = renderHook(
      () => useExerciseHistory('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.pages).toHaveLength(1)

    result.current.fetchNextPage()

    await waitFor(() => expect(result.current.data.pages).toHaveLength(2))

    const allSessions = result.current.data.pages.flat()
    expect(allSessions).toHaveLength(31)
  })

  it('no ejecuta la query si exerciseId es falsy', () => {
    const { result } = renderHook(
      () => useExerciseHistory(null),
      { wrapper: createWrapper() }
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchExerciseHistory).not.toHaveBeenCalled()
  })
})

describe('useExerciseHistorySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('propaga gymId por sesión (null si la sesión no tiene gym_id)', async () => {
    fetchExerciseHistorySummary.mockResolvedValueOnce(FAKE_SESSIONS)

    const { result } = renderHook(
      () => useExerciseHistorySummary('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data[0].gymId).toBe('gym-1')
    expect(result.current.data[1].gymId).toBeNull()
  })
})

describe('usePreviousWorkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // issue #11: el prefill de "sesión anterior" debe mapear level y caloriesBurned
  it('mapea level y caloriesBurned de los sets (cardio LEVEL_CALORIES)', async () => {
    fetchPreviousWorkout.mockResolvedValueOnce({
      sameSlot: null,
      fallback: {
        session: { id: 'session-1', started_at: '2024-01-15T10:00:00Z', status: 'completed', routine_day_id: 1, day_name: 'Día 1' },
        completed_sets: [
          { set_number: 1, weight: null, reps_completed: null, level: 8, calories_burned: 120 },
        ],
      },
    })

    const { result } = renderHook(
      () => usePreviousWorkout('exercise-123', { gymId: 'gym-1', sessionId: 'session-1' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.sets[0].level).toBe(8)
    expect(result.current.data.sets[0].caloriesBurned).toBe(120)
  })

  it('retorna null cuando no hay sesión previa', async () => {
    fetchPreviousWorkout.mockResolvedValueOnce({ sameSlot: null, fallback: null })

    const { result } = renderHook(
      () => usePreviousWorkout('exercise-123', { gymId: 'gym-1', sessionId: 'session-1' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  // Sin sessionId la sesión aún no está cargada en el store → gymId sería null espurio y
  // fetchPreviousWorkout, sin filtro, devolvería la última sesión de cualquier gym (fuga cross-gym).
  it('no consulta mientras la sesión no esté cargada (sessionId null)', async () => {
    const { result } = renderHook(
      () => usePreviousWorkout('exercise-123', { gymId: 'gym-1', sessionId: null }),
      { wrapper: createWrapper() }
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.isSuccess).toBe(false)
    expect(fetchPreviousWorkout).not.toHaveBeenCalled()
  })

  // Usuario SIN gym: gymId null es legítimo (un único bucket). Con la sesión cargada (sessionId
  // presente) SÍ debe consultar y mostrar "Anterior"; gatear por gymId lo ocultaría.
  it('consulta con sesión cargada aunque no haya gym (gymId null legítimo)', async () => {
    fetchPreviousWorkout.mockResolvedValueOnce({ sameSlot: null, fallback: null })

    const { result } = renderHook(
      () => usePreviousWorkout('exercise-123', { gymId: null, sessionId: 'session-1' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchPreviousWorkout).toHaveBeenCalledWith({ exerciseId: 'exercise-123', gymId: null, routineDayId: null })
  })
})

// Mover una sesión (o su fin) cambia lo que devuelven queries agregadas por semana o por
// fecha: si no se invalidan, la app sigue pintando los totales de antes sin refrescar.
describe('invalidaciones al mover una sesión en el tiempo', () => {
  function renderWithSpy(useHook) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
    const { result } = renderHook(useHook, { wrapper })
    return { result, spy }
  }

  const invalidatedKeys = (spy) => spy.mock.calls.map(([arg]) => arg.queryKey[0])

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useRescheduleSession invalida todo lo que se ordena o agrega por fecha y duración', async () => {
    rescheduleSession.mockResolvedValue({ affectedExerciseIds: [1], movedForward: false })
    const { result, spy } = renderWithSpy(() => useRescheduleSession())

    result.current.mutate({ sessionId: 's-1', startedAt: '2026-03-09T18:00:00.000Z', durationMinutes: 60 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(new Set(invalidatedKeys(spy))).toEqual(new Set([
      'session-detail',
      'workout-history',
      'exercise-history',
      'previous-workout',
      'weekly-prs',
      'last-session-for-routine',
      'weekly-session-stats',
      'training-goal-sessions',
    ]))
  })

  it('useUpdateSessionMetadata invalida también las agregadas por semana (mover el fin cruza de semana)', async () => {
    updateSessionMetadata.mockResolvedValue({ id: 's-1' })
    const { result, spy } = renderWithSpy(() => useUpdateSessionMetadata())

    result.current.mutate({ sessionId: 's-1', completedAt: '2026-03-09T19:00:00.000Z', durationMinutes: 60 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = invalidatedKeys(spy)
    expect(keys).toContain('weekly-session-stats')
    expect(keys).toContain('weekly-prs')
    expect(keys).toContain('last-session-for-routine')
  })
})

// Editing a past session saves on blur with no "saving" state: a failure the user is not told about
// reads as a kept change (issue #175).
describe('a failed save of a past session tells the user', () => {
  const CASES = [
    {
      name: 'useRescheduleSession',
      useHook: useRescheduleSession,
      api: rescheduleSession,
      variables: { sessionId: 's-1', startedAt: '2026-03-09T18:00:00.000Z', durationMinutes: 60 },
      messageKey: 'workout:history.saveFailed',
    },
    {
      name: 'useUpdateSessionMetadata',
      useHook: useUpdateSessionMetadata,
      api: updateSessionMetadata,
      variables: { sessionId: 's-1', completedAt: '2026-03-09T19:00:00.000Z', durationMinutes: 60, notes: 'x' },
      messageKey: 'workout:history.saveFailed',
    },
    {
      name: 'useUpsertCompletedSet',
      useHook: useUpsertCompletedSet,
      api: upsertCompletedSet,
      variables: { sessionId: 's-1', sessionExerciseId: 5, setNumber: 1, weight: 80 },
      messageKey: 'workout:history.saveFailed',
    },
    {
      name: 'useDeleteCompletedSet',
      useHook: useDeleteCompletedSet,
      api: deleteCompletedSet,
      variables: { sessionId: 's-1', sessionExerciseId: 5, setNumber: 1 },
      messageKey: 'workout:history.deleteSetFailed',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    onlineManager.setOnline(true)
  })

  it.each(CASES)('$name shows its error notice when the call fails', async ({ useHook, api, variables, messageKey }) => {
    api.mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useHook(), { wrapper: createWrapper() })

    result.current.mutate(variables)
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(notify).toHaveBeenCalledWith(t(messageKey), 'error')
  })

  // With the default networkMode the mutation would pause offline, never reach onError, and the
  // change would be lost silently when the page closes.
  it.each(CASES)('$name fails at once offline instead of pausing', async ({ useHook, api, variables, messageKey }) => {
    api.mockRejectedValue(new TypeError('Failed to fetch'))
    onlineManager.setOnline(false)
    const { result } = renderHook(() => useHook(), { wrapper: createWrapper() })

    result.current.mutate(variables)
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(api).toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(t(messageKey), 'error')
  })

  it('a successful save shows no notice', async () => {
    updateSessionMetadata.mockResolvedValue({ id: 's-1' })
    const { result } = renderHook(() => useUpdateSessionMetadata(), { wrapper: createWrapper() })

    result.current.mutate(CASES[1].variables)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(notify).not.toHaveBeenCalled()
  })

  // `useHistorySetEditor` decides from this callback whether a failed write is shown inline (the
  // open details sheet) or toasted, by comparing `variables` against the write it made itself.
  describe('useUpsertCompletedSet shouldToastError', () => {
    const variables = { sessionId: 's-1', sessionExerciseId: 5, setNumber: 1, weight: 80 }

    it('is asked with the error and the very object that was written, which is also the mutation\'s `variables`', async () => {
      const error = new Error('network')
      upsertCompletedSet.mockRejectedValue(error)
      const shouldToastError = vi.fn(() => true)
      const { result } = renderHook(() => useUpsertCompletedSet({ shouldToastError }), { wrapper: createWrapper() })

      result.current.mutate(variables)
      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(shouldToastError).toHaveBeenCalledTimes(1)
      expect(shouldToastError.mock.calls[0][0]).toBe(error)
      expect(shouldToastError.mock.calls[0][1]).toBe(variables)
      expect(result.current.variables).toBe(variables)
    })

    it('shows no notice when it returns false, and the mutation still ends in error', async () => {
      upsertCompletedSet.mockRejectedValue(new Error('network'))
      const { result } = renderHook(() => useUpsertCompletedSet({ shouldToastError: () => false }), { wrapper: createWrapper() })

      result.current.mutate(variables)
      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(notify).not.toHaveBeenCalled()
    })

    it('shows the notice when it returns true', async () => {
      upsertCompletedSet.mockRejectedValue(new Error('network'))
      const { result } = renderHook(() => useUpsertCompletedSet({ shouldToastError: () => true }), { wrapper: createWrapper() })

      result.current.mutate(variables)
      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(notify).toHaveBeenCalledWith(t('workout:history.saveFailed'), 'error')
    })

    it('still fails at once offline instead of pausing, with no notice when it returns false', async () => {
      upsertCompletedSet.mockRejectedValue(new TypeError('Failed to fetch'))
      onlineManager.setOnline(false)
      const { result } = renderHook(() => useUpsertCompletedSet({ shouldToastError: () => false }), { wrapper: createWrapper() })

      result.current.mutate(variables)
      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(notify).not.toHaveBeenCalled()
    })
  })
})

describe('useCorrectSessionExercise', () => {
  const PARAMS = { sessionId: 's-1', sessionExerciseId: 5, oldExerciseId: 10, newExerciseId: 20, gymId: 3 }

  beforeEach(() => {
    vi.clearAllMocks()
    correctSessionExercise.mockResolvedValue(undefined)
    recalculateSessionStats.mockResolvedValue({ affectedExerciseIds: [] })
    fetchUserExerciseGymUnit.mockResolvedValue(null)
    fetchPreferences.mockResolvedValue([{ key: 'weight_unit', value: 'kg' }])
  })

  function renderCorrect() {
    return renderHook(() => useCorrectSessionExercise(), { wrapper: createWrapper() })
  }

  it('passes factor 1 when both exercises resolve to the same unit, then recalculates the stats', async () => {
    const { result } = renderCorrect()
    await result.current.mutateAsync(PARAMS)

    expect(fetchUserExerciseGymUnit).toHaveBeenCalledWith(10, 3)
    expect(fetchUserExerciseGymUnit).toHaveBeenCalledWith(20, 3)
    expect(fetchPreferences).toHaveBeenCalledWith('user-1')
    expect(correctSessionExercise).toHaveBeenCalledWith({ sessionExerciseId: 5, newExerciseId: 20, weightFactor: 1 })
    expect(recalculateSessionStats).toHaveBeenCalledWith('s-1')
  })

  it('converts kg to lb when only the new exercise has a lb override in that gym', async () => {
    fetchUserExerciseGymUnit.mockImplementation(async (exerciseId) => (exerciseId === 20 ? 'lb' : null))
    const { result } = renderCorrect()
    await result.current.mutateAsync(PARAMS)

    expect(correctSessionExercise).toHaveBeenCalledWith({ sessionExerciseId: 5, newExerciseId: 20, weightFactor: 2.20462262 })
  })

  it('uses the global preference for an exercise without override', async () => {
    fetchPreferences.mockResolvedValue([{ key: 'weight_unit', value: 'lb' }])
    fetchUserExerciseGymUnit.mockImplementation(async (exerciseId) => (exerciseId === 20 ? 'kg' : null))
    const { result } = renderCorrect()
    await result.current.mutateAsync(PARAMS)

    expect(correctSessionExercise).toHaveBeenCalledWith({ sessionExerciseId: 5, newExerciseId: 20, weightFactor: 0.45359237 })
  })

  it('aborts before writing when a unit read fails', async () => {
    fetchPreferences.mockRejectedValue(new Error('network'))
    const { result } = renderCorrect()
    await expect(result.current.mutateAsync(PARAMS)).rejects.toThrow('network')

    expect(correctSessionExercise).not.toHaveBeenCalled()
  })

  it('propagates a failed recalculation instead of swallowing it', async () => {
    recalculateSessionStats.mockRejectedValue(new Error('recalc failed'))
    const { result } = renderCorrect()
    await expect(result.current.mutateAsync(PARAMS)).rejects.toThrow('recalc failed')

    expect(correctSessionExercise).toHaveBeenCalled()
  })
})
