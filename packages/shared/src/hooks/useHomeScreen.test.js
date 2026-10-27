import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('../api/routineQueryApi.js', () => ({ fetchRoutineDays: vi.fn() }))
vi.mock('../api/workoutSessionApi.js', () => ({ fetchLastCompletedSessionForRoutine: vi.fn() }))
vi.mock('../api/exerciseStatsApi.js', () => ({ fetchWeeklyPRs: vi.fn() }))
vi.mock('./usePreferences.js', () => ({ usePreference: vi.fn() }))
vi.mock('./useExercises.js', () => ({
  useAllUserExerciseGymUnits: vi.fn(),
  useUserExerciseDistanceUnits: vi.fn(),
}))
vi.mock('./useTrainingGoals.js', () => ({ useTrainingGoal: vi.fn() }))

import { fetchWeeklyPRs } from '../api/exerciseStatsApi.js'
import { usePreference } from './usePreferences.js'
import { useAllUserExerciseGymUnits, useUserExerciseDistanceUnits } from './useExercises.js'
import { useTrainingGoal } from './useTrainingGoals.js'
import { useWeeklyPRs, useWeeklyStats, useHomeCycleOffset, useHomeWeekLifecycle } from './useHomeScreen.js'
import { useHomeWeekStore } from '../stores/homeWeekStore.js'
import { getWeekQueryRange, HOME_WEEK_RESET_MS } from '../lib/homeUtils.js'

function wrapper({ children }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const ROW = {
  session_id: 's1',
  session_date: '2026-05-05T10:00:00Z',
  gym_id: 1,
  exercise_id: 10,
  exercise: { name: 'Press', name_en: 'Bench', distance_unit: null },
  session: { day_name: 'Push' },
  is_pr_weight: true,
  best_weight: 100,
}

beforeEach(() => {
  vi.clearAllMocks()
  usePreference.mockReturnValue({ value: 'monday' })
  useAllUserExerciseGymUnits.mockReturnValue({ data: [], isLoading: false })
  useUserExerciseDistanceUnits.mockReturnValue({ data: {}, isLoading: false })
})

describe('useWeeklyPRs', () => {
  it('queries with ISO instants: week start to 23:59:59 local of the last day', async () => {
    fetchWeeklyPRs.mockResolvedValue([])
    const { result } = renderHook(() => useWeeklyPRs(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [from, to] = fetchWeeklyPRs.mock.calls[0]
    expect(from).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
    const end = new Date(to)
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([23, 59, 59])
    expect(new Date(from).getTime()).toBeLessThan(end.getTime())
  })

  it('returns the sessions and the record count', async () => {
    fetchWeeklyPRs.mockResolvedValue([ROW])
    const { result } = renderHook(() => useWeeklyPRs(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.count).toBe(1)
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].dayName).toBe('Push')
  })

  it('keeps detailsLoading true while the weight units are loading', async () => {
    fetchWeeklyPRs.mockResolvedValue([ROW])
    useAllUserExerciseGymUnits.mockReturnValue({ data: undefined, isLoading: true })
    const { result } = renderHook(() => useWeeklyPRs(), { wrapper })
    await waitFor(() => expect(fetchWeeklyPRs).toHaveBeenCalled())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.detailsLoading).toBe(true)
  })

  it('keeps detailsLoading true while the distance units are loading', async () => {
    fetchWeeklyPRs.mockResolvedValue([])
    useUserExerciseDistanceUnits.mockReturnValue({ data: undefined, isLoading: true })
    const { result } = renderHook(() => useWeeklyPRs(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.detailsLoading).toBe(true)
  })

  it('reports the query error', async () => {
    fetchWeeklyPRs.mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useWeeklyPRs(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.count).toBe(0)
  })

  describe('viewed week', () => {
    // Thursday 19 March 2026, 12:00 local
    const NOW = new Date(2026, 2, 19, 12, 0)

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(NOW)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('without an offset keeps the current week range', async () => {
      fetchWeeklyPRs.mockResolvedValue([])
      const { result } = renderHook(() => useWeeklyPRs(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(fetchWeeklyPRs).toHaveBeenCalledWith(
        new Date(2026, 2, 16, 0, 0, 0).toISOString(),
        new Date(2026, 2, 22, 23, 59, 59).toISOString(),
      )
    })

    it('with -1 queries last week', async () => {
      fetchWeeklyPRs.mockResolvedValue([])
      const { result } = renderHook(() => useWeeklyPRs(-1), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const { from, to } = getWeekQueryRange(-1, NOW, 'monday')
      expect(fetchWeeklyPRs).toHaveBeenCalledWith(from, to)
      expect(from).toBe(new Date(2026, 2, 9, 0, 0, 0).toISOString())
    })

    it('uses the week start preference', async () => {
      usePreference.mockImplementation((key) => ({ value: key === 'week_start_day' ? 'sunday' : undefined }))
      fetchWeeklyPRs.mockResolvedValue([])
      const { result } = renderHook(() => useWeeklyPRs(-1), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const { from, to } = getWeekQueryRange(-1, NOW, 'sunday')
      expect(fetchWeeklyPRs).toHaveBeenCalledWith(from, to)
      expect(from).toBe(new Date(2026, 2, 8, 0, 0, 0).toISOString())
    })
  })
})

describe('useWeeklyStats', () => {
  const NOW = new Date(2026, 2, 19, 12, 0)
  const sessions = [
    { completed_at: new Date(2026, 2, 17, 10, 0).toISOString(), duration_minutes: 40 }, // this week
    { completed_at: new Date(2026, 2, 10, 10, 0).toISOString(), duration_minutes: 75 }, // last week
  ]

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sums the viewed week from the streak card sessions, without a query of its own', () => {
    useTrainingGoal.mockReturnValue({ sessions, weekStartDay: 'monday', isLoading: false, sessionsError: false })

    expect(renderHook(() => useWeeklyStats()).result.current).toEqual({ totalMinutes: 40, isLoading: false, isError: false })
    expect(renderHook(() => useWeeklyStats(-1)).result.current.totalMinutes).toBe(75)
  })

  it('passes through the loading and error state of the sessions', () => {
    useTrainingGoal.mockReturnValue({ sessions: [], weekStartDay: 'monday', isLoading: true, sessionsError: true })

    expect(renderHook(() => useWeeklyStats()).result.current).toEqual({ totalMinutes: 0, isLoading: true, isError: true })
  })
})

describe('useHomeCycleOffset', () => {
  beforeEach(() => {
    useHomeWeekStore.setState({ cycleOffset: 0, leftAt: null })
  })

  it('returns the stored offset while on Home', () => {
    useHomeWeekStore.setState({ cycleOffset: -2 })

    expect(renderHook(() => useHomeCycleOffset()).result.current).toBe(-2)
  })

  it('returns the current week when the stored one is due for reset, before enterHome runs', () => {
    useHomeWeekStore.setState({ cycleOffset: -2, leftAt: Date.now() - HOME_WEEK_RESET_MS - 1000 })

    expect(renderHook(() => useHomeCycleOffset()).result.current).toBe(0)
    expect(useHomeWeekStore.getState().cycleOffset).toBe(-2)
  })
})

describe('useHomeWeekLifecycle', () => {
  function fakeSubscribe() {
    const handlers = {}
    const unsubscribe = vi.fn()
    const subscribe = vi.fn((onEnter, onLeave) => {
      Object.assign(handlers, { onEnter, onLeave })
      return unsubscribe
    })
    return { subscribe, unsubscribe, handlers }
  }

  beforeEach(() => {
    useHomeWeekStore.setState({ cycleOffset: 0, leftAt: null })
  })

  it('enters on start: a week left more than the window ago goes back to the current one', () => {
    useHomeWeekStore.setState({ cycleOffset: -3, leftAt: Date.now() - HOME_WEEK_RESET_MS - 1000 })
    const { subscribe } = fakeSubscribe()

    renderHook(() => useHomeWeekLifecycle({ subscribe }))

    expect(useHomeWeekStore.getState()).toMatchObject({ cycleOffset: 0, leftAt: null })
    expect(subscribe).toHaveBeenCalledTimes(1)
  })

  it('leaves and enters when the platform says so', () => {
    useHomeWeekStore.setState({ cycleOffset: -3 })
    const { subscribe, handlers } = fakeSubscribe()
    renderHook(() => useHomeWeekLifecycle({ subscribe }))

    act(() => handlers.onLeave())
    expect(useHomeWeekStore.getState().leftAt).toEqual(expect.any(Number))

    act(() => handlers.onEnter())
    expect(useHomeWeekStore.getState()).toMatchObject({ cycleOffset: -3, leftAt: null })
  })

  it('unsubscribes and leaves on unmount', () => {
    const { subscribe, unsubscribe } = fakeSubscribe()
    const { unmount } = renderHook(() => useHomeWeekLifecycle({ subscribe }))

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(useHomeWeekStore.getState().leftAt).toEqual(expect.any(Number))
  })
})
