import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import React from 'react'
import { useExerciseHistorySummary, useExerciseHistoryFilter, usePreviousWorkout, useRescheduleSession, useUpdateSessionMetadata, useUpsertCompletedSet, useDeleteCompletedSet, useCorrectSessionExercise } from './useWorkoutHistory.js'

// Mock the workoutApi module
vi.mock('../api/workoutApi.js', () => ({
  fetchWorkoutHistory: vi.fn(),
  fetchSessionDetail: vi.fn(),
  fetchExerciseHistorySummary: vi.fn(),
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

// The routine's days, as `useRoutineDays` returns them, varied per test.
const { routineDaysQuery } = vi.hoisted(() => ({ routineDaysQuery: vi.fn() }))
vi.mock('./useRoutines.js', () => ({ useRoutineDays: routineDaysQuery }))

const notify = vi.fn()
vi.mock('../notifications.js', () => ({ getNotifier: () => ({ show: notify }) }))

import { fetchExerciseHistorySummary, fetchPreviousWorkout, rescheduleSession, updateSessionMetadata, upsertCompletedSet, deleteCompletedSet, correctSessionExercise } from '../api/workoutApi.js'
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

  // The history modal marks and filters each session by its routine day. A session whose day was
  // deleted has routine_day_id NULL (FK ON DELETE SET NULL), and a free session never had one.
  it('propaga routineDayId por sesión (null si la sesión no tiene día)', async () => {
    fetchExerciseHistorySummary.mockResolvedValueOnce([
      { ...FAKE_SESSIONS[0], session: { ...FAKE_SESSIONS[0].session, routine_day_id: 12 } },
      FAKE_SESSIONS[1],
    ])

    const { result } = renderHook(
      () => useExerciseHistorySummary('exercise-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.map(item => item.routineDayId)).toEqual([12, null])
    expect(result.current.data[0]).toEqual({
      sessionId: 'session-1',
      date: '2024-01-15T10:00:00Z',
      gymId: 'gym-1',
      routineDayId: 12,
      sets: FAKE_SESSIONS[0].completed_sets,
    })
  })
})

describe('useExerciseHistoryFilter', () => {
  const SESSIONS = [
    { sessionId: 'same', routineDayId: 1 },
    { sessionId: 'other-day', routineDayId: 2 },
    { sessionId: 'elsewhere', routineDayId: 9 },
    { sessionId: 'free', routineDayId: null },
  ]
  const CHART_ROWS = [
    { id: 'r-same', session: { routine_day_id: 1 } },
    { id: 'r-other-day', session: { routine_day_id: 2 } },
    { id: 'r-free', session: { routine_day_id: null } },
  ]
  const ROUTINE_DAYS = [{ id: 1 }, { id: 2 }]
  const values = (options) => options.map(option => option.value)
  const sessionIds = (sessions) => sessions.map(session => session.sessionId)

  function renderFilter(params) {
    return renderHook(() => useExerciseHistoryFilter({ sessions: SESSIONS, chartRows: CHART_ROWS, ...params }))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    routineDaysQuery.mockReturnValue({ data: ROUTINE_DAYS, isLoading: false })
  })

  it('without a routine day: no selector, no marks, everything listed, the routine not asked for', () => {
    const { result } = renderFilter({ routineDayId: null, routineId: 5 })

    expect(result.current.options).toEqual([])
    expect(result.current.membershipOf(SESSIONS[0])).toBeNull()
    expect(result.current.sessions).toBe(SESSIONS)
    expect(result.current.chartRows).toBe(CHART_ROWS)
    expect(routineDaysQuery).toHaveBeenCalledWith(null)
  })

  it('with a routine day: three segments on ALL, and each session marked against the day and routine', () => {
    const { result } = renderFilter({ routineDayId: '1', routineId: 5 })

    expect(routineDaysQuery).toHaveBeenCalledWith(5)
    expect(values(result.current.options)).toEqual(['all', 'routine', 'day'])
    expect(result.current.filter).toBe('all')
    expect(SESSIONS.map(result.current.membershipOf)).toEqual(['day', 'routine', 'other', 'other'])
  })

  it('filters the sessions and the chart rows with the same rule', () => {
    const { result } = renderFilter({ routineDayId: 1, routineId: 5 })

    act(() => result.current.setFilter('routine'))
    expect(sessionIds(result.current.sessions)).toEqual(['same', 'other-day'])
    expect(result.current.chartRows.map(row => row.id)).toEqual(['r-same', 'r-other-day'])

    act(() => result.current.setFilter('day'))
    expect(sessionIds(result.current.sessions)).toEqual(['same'])
    expect(result.current.chartRows.map(row => row.id)).toEqual(['r-same'])
  })

  it('days that failed to load (or no routine id): no "this routine" segment and no "other day" mark', () => {
    routineDaysQuery.mockReturnValue({ data: undefined, isLoading: false })
    const { result } = renderFilter({ routineDayId: 1, routineId: null })

    expect(values(result.current.options)).toEqual(['all', 'day'])
    expect(SESSIONS.map(result.current.membershipOf)).toEqual(['day', 'other', 'other', 'other'])
  })

  it('while the days load: no selector yet, and it reports loading', () => {
    routineDaysQuery.mockReturnValue({ data: undefined, isLoading: true })
    const { result } = renderFilter({ routineDayId: 1, routineId: 5 })

    expect(result.current.options).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  it('a selected segment that goes away falls back to ALL', () => {
    const { result, rerender } = renderFilter({ routineDayId: 1, routineId: 5 })
    act(() => result.current.setFilter('routine'))

    routineDaysQuery.mockReturnValue({ data: undefined, isLoading: false })
    rerender()

    expect(result.current.filter).toBe('all')
    expect(result.current.sessions).toBe(SESSIONS)
  })

  it('day id 0 is a day', () => {
    routineDaysQuery.mockReturnValue({ data: [{ id: 0 }], isLoading: false })
    const { result } = renderFilter({ routineDayId: 0, routineId: 5 })

    expect(values(result.current.options)).toEqual(['all', 'routine', 'day'])
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
      'training-goal-sessions',
    ]))
  })

  it('useUpdateSessionMetadata invalida también las agregadas por semana (mover el fin cruza de semana)', async () => {
    updateSessionMetadata.mockResolvedValue({ id: 's-1' })
    const { result, spy } = renderWithSpy(() => useUpdateSessionMetadata())

    result.current.mutate({ sessionId: 's-1', completedAt: '2026-03-09T19:00:00.000Z', durationMinutes: 60 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = invalidatedKeys(spy)
    expect(keys).toContain('training-goal-sessions')
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
