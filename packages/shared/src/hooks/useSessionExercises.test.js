import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock _stores.js to avoid initStores() requirement
vi.mock('./_stores.js', () => {
  const mockWorkoutStore = {
    sessionId: 'session-123',
    clearExercise: vi.fn(),
  }

  const useWorkoutStore = vi.fn((selector) => (selector ? selector(mockWorkoutStore) : mockWorkoutStore))
  useWorkoutStore._mockStore = mockWorkoutStore

  return { useWorkoutStore, useAuthStore: vi.fn() }
})

// Mock the workoutApi barrel
vi.mock('../api/workoutApi.js', () => ({
  fetchSessionExercises: vi.fn(),
  fetchSessionExercisesSortOrder: vi.fn(),
  fetchSessionExerciseBlockName: vi.fn(),
  updateSessionExerciseSortOrder: vi.fn(),
  insertSessionExercise: vi.fn(),
  deleteCompletedSetsByExercise: vi.fn(),
  updateSessionExerciseExerciseId: vi.fn(),
  deleteSessionExercise: vi.fn(),
  reorderSessionExercises: vi.fn(),
}))

import {
  fetchSessionExercises,
  fetchSessionExercisesSortOrder,
  insertSessionExercise,
  deleteSessionExercise,
  reorderSessionExercises,
} from '../api/workoutApi.js'

import {
  useSessionExercises,
  useAddSessionExercise,
  useRemoveSessionExercise,
  useReorderSessionExercises,
} from './useSessionExercises.js'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const FAKE_SESSION_EXERCISES = [
  { id: 'se-1', exercise_id: 'ex-1', sort_order: 0, series: 3, reps: '10' },
  { id: 'se-2', exercise_id: 'ex-2', sort_order: 1, series: 4, reps: '8' },
]

describe('useSessionExercises — queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useSessionExercises: devuelve los ejercicios de la sesión', async () => {
    fetchSessionExercises.mockResolvedValueOnce(FAKE_SESSION_EXERCISES)

    const { result } = renderHook(() => useSessionExercises('session-123'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(FAKE_SESSION_EXERCISES)
    expect(fetchSessionExercises).toHaveBeenCalledWith('session-123')
  })

  it('useSessionExercises: no ejecuta la query si sessionId es falsy', () => {
    const { result } = renderHook(() => useSessionExercises(null), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchSessionExercises).not.toHaveBeenCalled()
  })

  it('useSessionExercises: devuelve array vacío si la sesión no tiene ejercicios', async () => {
    fetchSessionExercises.mockResolvedValueOnce([])

    const { result } = renderHook(() => useSessionExercises('session-empty'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })
})

describe('useSessionExercises — mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useAddSessionExercise: llama a insertSessionExercise con los parámetros correctos', async () => {
    // Sin ejercicios existentes (nuevo ejercicio al final)
    fetchSessionExercisesSortOrder.mockResolvedValueOnce([])
    insertSessionExercise.mockResolvedValueOnce({ id: 'se-new' })

    const { result } = renderHook(() => useAddSessionExercise(), { wrapper: createWrapper() })

    const exercise = { id: 'ex-1', nombre: 'Press Banca' }

    await act(async () => {
      await result.current.mutateAsync({ exercise, series: 3, reps: '10' })
    })

    expect(insertSessionExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-123',
        exerciseId: 'ex-1',
        series: 3,
        reps: '10',
        isWarmup: false,
      })
    )
  })

  it('useAddSessionExercise: añade al final si ya hay ejercicios existentes', async () => {
    const existingExercises = [
      { id: 'se-1', sort_order: 0 },
      { id: 'se-2', sort_order: 1 },
    ]
    fetchSessionExercisesSortOrder.mockResolvedValueOnce(existingExercises)
    insertSessionExercise.mockResolvedValueOnce({ id: 'se-new' })

    const { result } = renderHook(() => useAddSessionExercise(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({ exercise: { id: 'ex-3' }, series: 3, reps: '8' })
    })

    expect(insertSessionExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        sortOrder: 2, // siguiente al sort_order 1
      })
    )
  })

  it('useRemoveSessionExercise: llama a deleteSessionExercise con el sessionExerciseId', async () => {
    deleteSessionExercise.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useRemoveSessionExercise(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync('se-1')
    })

    expect(deleteSessionExercise).toHaveBeenCalledWith('se-1')
  })

  it('useReorderSessionExercises: llama a reorderSessionExercises con los ids ordenados', async () => {
    reorderSessionExercises.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useReorderSessionExercises(), { wrapper: createWrapper() })

    const orderedIds = ['se-2', 'se-1', 'se-3']

    await act(async () => {
      await result.current.mutateAsync(orderedIds)
    })

    expect(reorderSessionExercises).toHaveBeenCalledWith(orderedIds)
  })
})
