import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('../api/routineQueryApi.js', () => ({ fetchRoutineDays: vi.fn() }))
vi.mock('../api/workoutSessionApi.js', () => ({
  fetchLastCompletedSessionForRoutine: vi.fn(),
  fetchWeeklySessionStats: vi.fn(),
}))
vi.mock('../api/exerciseStatsApi.js', () => ({ fetchWeeklyPRs: vi.fn() }))
vi.mock('./usePreferences.js', () => ({ usePreference: vi.fn() }))
vi.mock('./useExercises.js', () => ({
  useAllUserExerciseGymUnits: vi.fn(),
  useUserExerciseDistanceUnits: vi.fn(),
}))

import { fetchWeeklyPRs } from '../api/exerciseStatsApi.js'
import { usePreference } from './usePreferences.js'
import { useAllUserExerciseGymUnits, useUserExerciseDistanceUnits } from './useExercises.js'
import { useWeeklyPRs } from './useHomeScreen.js'

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
})
