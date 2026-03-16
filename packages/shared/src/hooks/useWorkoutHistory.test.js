import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useExerciseHistory } from './useWorkoutHistory.js'

// Mock the workoutApi module
vi.mock('../api/workoutApi.js', () => ({
  fetchWorkoutHistory: vi.fn(),
  fetchSessionDetail: vi.fn(),
  fetchExerciseHistorySummary: vi.fn(),
  fetchExerciseHistory: vi.fn(),
  fetchPreviousWorkout: vi.fn(),
  deleteWorkoutSession: vi.fn(),
}))

import { fetchExerciseHistory } from '../api/workoutApi.js'

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
    session: { id: 'session-1', started_at: '2024-01-15T10:00:00Z' },
    completed_sets: [
      { id: 'set-1', set_number: 1, weight: 100, reps_completed: 5 },
    ],
  },
  {
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
