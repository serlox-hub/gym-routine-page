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
  replaceSessionExercise: vi.fn(),
  updateSessionExerciseFields: vi.fn(),
  deleteSessionExercise: vi.fn(),
  reorderSessionExercises: vi.fn(),
}))

vi.mock('../notifications.js', () => {
  const show = vi.fn()
  return {
    getNotifier: () => ({ show }),
    initNotifications: vi.fn(),
    _notifierShow: show,
  }
})

import {
  fetchSessionExercises,
  fetchSessionExercisesSortOrder,
  insertSessionExercise,
  deleteSessionExercise,
  reorderSessionExercises,
  updateSessionExerciseFields,
  replaceSessionExercise,
} from '../api/workoutApi.js'
import * as notificationsMock from '../notifications.js'
import { QUERY_KEYS } from '../lib/constants.js'

import {
  useSessionExercises,
  useAddSessionExercise,
  useRemoveSessionExercise,
  useReorderSessionExercises,
  useUpdateSessionExerciseFields,
  useReplaceSessionExercise,
} from './useSessionExercises.js'

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { wrapper, queryClient }
}

function createWrapper() {
  return createWrapperWithClient().wrapper
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

  it('useReorderSessionExercises: llama a reorderSessionExercises con los items ordenados', async () => {
    reorderSessionExercises.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useReorderSessionExercises(), { wrapper: createWrapper() })

    const items = [{ id: 'se-2' }, { id: 'se-1', supersetGroup: null }, { id: 'se-3' }]

    await act(async () => {
      await result.current.mutateAsync(items)
    })

    expect(reorderSessionExercises).toHaveBeenCalledWith(items)
  })

  it('useUpdateSessionExerciseFields: aplica el cambio al cache de forma optimista antes del servidor', async () => {
    const { wrapper, queryClient } = createWrapperWithClient()
    queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, 'session-123'], FAKE_SESSION_EXERCISES)
    let resolveUpdate
    updateSessionExerciseFields.mockReturnValueOnce(new Promise(resolve => { resolveUpdate = resolve }))

    const { result } = renderHook(() => useUpdateSessionExerciseFields(), { wrapper })

    act(() => {
      result.current.mutate({ sessionExerciseId: 'se-1', fields: { reps: '12', rir: 1 } })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, 'session-123'])
      expect(cached.find(e => e.id === 'se-1')).toMatchObject({ reps: '12', rir: 1 })
    })

    await act(async () => { resolveUpdate() })
  })

  it('useUpdateSessionExerciseFields: hace rollback al estado anterior si el servidor falla', async () => {
    const { wrapper, queryClient } = createWrapperWithClient()
    queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, 'session-123'], FAKE_SESSION_EXERCISES)
    updateSessionExerciseFields.mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => useUpdateSessionExerciseFields(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ sessionExerciseId: 'se-1', fields: { reps: '12' } }).catch(() => {})
    })

    const cached = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, 'session-123'])
    expect(cached.find(e => e.id === 'se-1').reps).toBe('10')
    expect(notificationsMock._notifierShow).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('useUpdateSessionExerciseFields: refresca también los ejercicios de la rutina (ROUTINE_BLOCKS)', async () => {
    updateSessionExerciseFields.mockResolvedValue(undefined)
    const { wrapper, queryClient } = createWrapperWithClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateSessionExerciseFields(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ sessionExerciseId: 'se-1', fields: { reps: '6-8' } })
    })

    const keys = invalidate.mock.calls.map(([arg]) => arg.queryKey[0])
    expect(keys).toEqual(expect.arrayContaining([QUERY_KEYS.ROUTINE_BLOCKS, QUERY_KEYS.ROUTINE_DAY, QUERY_KEYS.ROUTINE_DAYS, QUERY_KEYS.ROUTINE_ALL_EXERCISES]))
  })

  it('useReorderSessionExercises: aplica el orden al cache de forma optimista', async () => {
    const { wrapper, queryClient } = createWrapperWithClient()
    queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, 'session-123'], FAKE_SESSION_EXERCISES)
    let resolveReorder
    reorderSessionExercises.mockReturnValueOnce(new Promise(resolve => { resolveReorder = resolve }))

    const { result } = renderHook(() => useReorderSessionExercises(), { wrapper })

    act(() => { result.current.mutate([{ id: 'se-2', supersetGroup: 7 }, { id: 'se-1' }]) })

    await waitFor(() => {
      const cached = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, 'session-123'])
      expect(cached.map(e => e.id)).toEqual(['se-2', 'se-1'])
      expect(cached[0].superset_group).toBe(7)
    })

    await act(async () => { resolveReorder() })
  })

  it('useReorderSessionExercises: hace rollback si el servidor falla', async () => {
    const { wrapper, queryClient } = createWrapperWithClient()
    queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, 'session-123'], FAKE_SESSION_EXERCISES)
    reorderSessionExercises.mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => useReorderSessionExercises(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync([{ id: 'se-2' }, { id: 'se-1' }]).catch(() => {})
    })

    const cached = queryClient.getQueryData([QUERY_KEYS.SESSION_EXERCISES, 'session-123'])
    expect(cached.map(e => e.id)).toEqual(['se-1', 'se-2'])
    expect(notificationsMock._notifierShow).toHaveBeenCalledWith(expect.any(String), 'error')
  })
})

describe('useReplaceSessionExercise', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const BENCH_ROW = {
    id: 7, exercise_id: 1, routine_exercise_id: 30, is_extra: false,
    target_field: 'reps', reps: '8-12', level: null, rir: 2, notes: 'codos',
    exercise: { id: 1, tracked_fields: ['weight', 'reps'] },
  }
  const TREADMILL = { id: 2, tracked_fields: ['distance', 'time'] }

  function seedSession(queryClient) {
    queryClient.setQueryData([QUERY_KEYS.SESSION_EXERCISES, 'session-123'], [BENCH_ROW])
  }

  it('adapta el objetivo al ejercicio nuevo y manda el alcance al RPC', async () => {
    replaceSessionExercise.mockResolvedValue(undefined)
    const { wrapper, queryClient } = createWrapperWithClient()
    seedSession(queryClient)
    const { result } = renderHook(() => useReplaceSessionExercise(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ sessionExerciseId: '7', newExercise: TREADMILL, applyToRoutine: false })
    })

    expect(replaceSessionExercise).toHaveBeenCalledWith({
      sessionExerciseId: '7',
      newExerciseId: 2,
      fields: expect.objectContaining({ target_field: 'distance', reps: '5km', rir: null, notes: null, level: null }),
      applyToRoutine: false,
    })
  })

  it('con "también en la rutina" invalida las queries de la rutina', async () => {
    replaceSessionExercise.mockResolvedValue(undefined)
    const { wrapper, queryClient } = createWrapperWithClient()
    seedSession(queryClient)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useReplaceSessionExercise(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ sessionExerciseId: 7, newExercise: TREADMILL, applyToRoutine: true })
    })

    const keys = invalidate.mock.calls.map(([arg]) => arg.queryKey[0])
    expect(keys).toEqual(expect.arrayContaining([QUERY_KEYS.ROUTINE_BLOCKS, QUERY_KEYS.ROUTINE_DAY, QUERY_KEYS.ROUTINE_DAYS, QUERY_KEYS.ROUTINE_ALL_EXERCISES]))
  })

  it('con "solo hoy" no invalida la rutina', async () => {
    replaceSessionExercise.mockResolvedValue(undefined)
    const { wrapper, queryClient } = createWrapperWithClient()
    seedSession(queryClient)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useReplaceSessionExercise(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ sessionExerciseId: 7, newExercise: TREADMILL, applyToRoutine: false })
    })

    const keys = invalidate.mock.calls.map(([arg]) => arg.queryKey[0])
    expect(keys).not.toContain(QUERY_KEYS.ROUTINE_BLOCKS)
    expect(keys).not.toContain(QUERY_KEYS.ROUTINE_DAY)
  })

  it('avisa si falla y no llama al RPC sin la fila en caché', async () => {
    const { wrapper } = createWrapperWithClient()
    const { result } = renderHook(() => useReplaceSessionExercise(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ sessionExerciseId: 7, newExercise: TREADMILL, applyToRoutine: false }).catch(() => {})
    })

    expect(replaceSessionExercise).not.toHaveBeenCalled()
    await waitFor(() => expect(notificationsMock._notifierShow).toHaveBeenCalledWith(expect.any(String), 'error'))
  })
})
