import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock the exerciseApi module
vi.mock('../api/exerciseApi.js', () => ({
  fetchExercisesWithMuscleGroup: vi.fn(),
  fetchMuscleGroups: vi.fn(),
  fetchExercise: vi.fn(),
  createExercise: vi.fn(),
  updateExercise: vi.fn(),
  deleteExercise: vi.fn(),
}))

vi.mock('../api/exerciseStatsApi.js', () => ({
  fetchRecentExerciseStats: vi.fn(),
}))

// Mock useAuth to avoid _stores.js initStores requirement
vi.mock('./useAuth.js', () => ({
  useUserId: vi.fn(() => 'user-123'),
}))

// Mock notifications
vi.mock('../notifications.js', () => ({
  getNotifier: vi.fn(() => ({ show: vi.fn() })),
}))

import {
  fetchExercisesWithMuscleGroup,
  fetchMuscleGroups,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../api/exerciseApi.js'
import { fetchRecentExerciseStats } from '../api/exerciseStatsApi.js'

import {
  useExercisesWithMuscleGroup,
  useMuscleGroups,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
  useRecentExerciseStats,
  usePromptExerciseCatalog,
} from './useExercises.js'
import { PROMPT_CATALOG_STATUS } from '../lib/routineIO.js'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const FAKE_EXERCISES = [
  { id: 'ex-1', nombre: 'Press Banca', muscle_group: { nombre: 'Pecho' } },
  { id: 'ex-2', nombre: 'Sentadilla', muscle_group: { nombre: 'Cuádriceps' } },
]

const FAKE_MUSCLE_GROUPS = [
  { id: 'mg-1', nombre: 'Pecho' },
  { id: 'mg-2', nombre: 'Espalda' },
  { id: 'mg-3', nombre: 'Cuádriceps' },
]

describe('useExercises — queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useExercisesWithMuscleGroup: devuelve la lista de ejercicios con grupo muscular', async () => {
    fetchExercisesWithMuscleGroup.mockResolvedValueOnce(FAKE_EXERCISES)

    const { result } = renderHook(() => useExercisesWithMuscleGroup(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(FAKE_EXERCISES)
    expect(fetchExercisesWithMuscleGroup).toHaveBeenCalledOnce()
  })

  it('useExercisesWithMuscleGroup: devuelve array vacío si no hay ejercicios', async () => {
    fetchExercisesWithMuscleGroup.mockResolvedValueOnce([])

    const { result } = renderHook(() => useExercisesWithMuscleGroup(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('useMuscleGroups: devuelve la lista de grupos musculares', async () => {
    fetchMuscleGroups.mockResolvedValueOnce(FAKE_MUSCLE_GROUPS)

    const { result } = renderHook(() => useMuscleGroups(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(FAKE_MUSCLE_GROUPS)
    expect(fetchMuscleGroups).toHaveBeenCalledOnce()
  })

  it('useMuscleGroups: queda en loading si la API no resuelve', () => {
    fetchMuscleGroups.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useMuscleGroups(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
  })
})

describe('useExercises — mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useCreateExercise: llama a createExercise con userId y los parámetros del ejercicio', async () => {
    const newExercise = { nombre: 'Curl Bíceps', muscle_group_id: 'mg-1' }
    createExercise.mockResolvedValueOnce({ id: 'ex-new', ...newExercise })

    const { result } = renderHook(() => useCreateExercise(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(newExercise)
    })

    expect(createExercise).toHaveBeenCalledWith({ userId: 'user-123', ...newExercise })
  })

  it('useUpdateExercise: llama a updateExercise con los parámetros del ejercicio', async () => {
    const updateArgs = { id: 'ex-1', nombre: 'Press Banca Inclinado', muscle_group_id: 'mg-1' }
    updateExercise.mockResolvedValueOnce({ ...updateArgs })

    const { result } = renderHook(() => useUpdateExercise(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(updateArgs)
    })

    expect(updateExercise).toHaveBeenCalledWith(updateArgs, expect.anything())
  })

  it('useDeleteExercise: llama a deleteExercise con el ejercicio (soft delete)', async () => {
    const exerciseToDelete = { id: 'ex-1' }
    deleteExercise.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteExercise(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(exerciseToDelete)
    })

    expect(deleteExercise).toHaveBeenCalledWith(exerciseToDelete, expect.anything())
  })
})

describe('useRecentExerciseStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const ROWS = [{ exercise_id: 1, session_date: '2026-09-30T18:00:00+00:00' }]

  it('fetches with the default lookback, not with the query context as the limit', async () => {
    fetchRecentExerciseStats.mockResolvedValueOnce(ROWS)

    const { result } = renderHook(() => useRecentExerciseStats(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(ROWS)
    expect(fetchRecentExerciseStats).toHaveBeenCalledWith()
  })

  it('does not fetch while disabled (picker closed)', () => {
    const { result } = renderHook(() => useRecentExerciseStats({ enabled: false }), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchRecentExerciseStats).not.toHaveBeenCalled()
  })

  it('refetches on every enable, showing the cached rows meanwhile', async () => {
    fetchRecentExerciseStats.mockResolvedValueOnce(ROWS)
    const newer = [{ exercise_id: 2, session_date: '2026-10-01T18:00:00+00:00' }, ...ROWS]
    fetchRecentExerciseStats.mockResolvedValueOnce(newer)

    const { result, rerender } = renderHook(
      ({ enabled }) => useRecentExerciseStats({ enabled }),
      { wrapper: createWrapper(), initialProps: { enabled: true } },
    )
    await waitFor(() => expect(result.current.data).toEqual(ROWS))

    rerender({ enabled: false })
    rerender({ enabled: true })

    expect(result.current.data).toEqual(ROWS)
    await waitFor(() => expect(result.current.data).toEqual(newer))
    expect(fetchRecentExerciseStats).toHaveBeenCalledTimes(2)
  })
})

describe('usePromptExerciseCatalog', () => {
  const ROWS = [
    { id: 1, name: 'Press de banca', name_en: 'Barbell Bench Press', is_system: true, muscle_group: { name: 'Pecho', name_en: 'Chest' } },
    { id: 2, name: 'Mi press', name_en: null, is_system: false, muscle_group: { name: 'Pecho', name_en: 'Chest' } },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is loading with no catalog until the exercises arrive, then ready with the system catalog', async () => {
    let resolveFetch
    fetchExercisesWithMuscleGroup.mockReturnValueOnce(new Promise(resolve => { resolveFetch = resolve }))

    const { result } = renderHook(() => usePromptExerciseCatalog(), { wrapper: createWrapper() })

    expect(result.current).toMatchObject({ status: PROMPT_CATALOG_STATUS.LOADING, catalog: '' })

    resolveFetch(ROWS)
    await waitFor(() => expect(result.current.status).toBe(PROMPT_CATALOG_STATUS.READY))
    expect(result.current.catalog).toContain('## Chest\n- Barbell Bench Press')
    expect(result.current.catalog).not.toContain('Mi press')
  })

  it('reports the error, and retry loads the catalog', async () => {
    fetchExercisesWithMuscleGroup.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ROWS)

    const { result } = renderHook(() => usePromptExerciseCatalog(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.status).toBe(PROMPT_CATALOG_STATUS.ERROR))
    expect(result.current.catalog).toBe('')

    act(() => { result.current.retry() })

    await waitFor(() => expect(result.current.status).toBe(PROMPT_CATALOG_STATUS.READY))
    expect(fetchExercisesWithMuscleGroup).toHaveBeenCalledTimes(2)
  })
})
