import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock the routineApi module
vi.mock('../api/routineApi.js', () => ({
  fetchRoutines: vi.fn(),
  fetchRoutine: vi.fn(),
  fetchRoutineDays: vi.fn(),
  fetchRoutineDay: vi.fn(),
  fetchRoutineBlocks: vi.fn(),
  fetchRoutineAllExercises: vi.fn(),
  createRoutine: vi.fn(),
  createRoutineDay: vi.fn(),
  updateRoutine: vi.fn(),
  deleteRoutine: vi.fn(),
  deleteRoutines: vi.fn(),
  setFavoriteRoutine: vi.fn(),
  updateRoutineDay: vi.fn(),
  deleteRoutineDay: vi.fn(),
  reorderRoutineDays: vi.fn(),
  deleteRoutineExercise: vi.fn(),
  updateRoutineExercise: vi.fn(),
  reorderRoutineExercises: vi.fn(),
  addExerciseToDay: vi.fn(),
  duplicateRoutineExercise: vi.fn(),
  moveRoutineExerciseToDay: vi.fn(),
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
  fetchRoutines,
  fetchRoutine,
  fetchRoutineDays,
  fetchRoutineDay,
  fetchRoutineBlocks,
  fetchRoutineAllExercises,
  createRoutine,
  deleteRoutine,
  updateRoutineExercise,
  addExerciseToDay,
} from '../api/routineApi.js'

import {
  useRoutines,
  useRoutine,
  useRoutineDays,
  useRoutineDay,
  useRoutineBlocks,
  useRoutineAllExercises,
  useCreateRoutine,
  useDeleteRoutine,
  useUpdateRoutineExercise,
  useAddExerciseToDay,
} from './useRoutines.js'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const FAKE_ROUTINES = [
  { id: 'routine-1', nombre: 'Rutina A', es_favorita: false },
  { id: 'routine-2', nombre: 'Rutina B', es_favorita: true },
]

const FAKE_ROUTINE = { id: 'routine-1', nombre: 'Rutina A', es_favorita: false }

const FAKE_DAYS = [
  { id: 'day-1', nombre: 'Día 1', sort_order: 0 },
  { id: 'day-2', nombre: 'Día 2', sort_order: 1 },
]

const FAKE_BLOCKS = [
  { id: 'block-1', nombre: 'Principal', exercises: [] },
]

describe('useRoutines — queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useRoutines: devuelve la lista de rutinas', async () => {
    fetchRoutines.mockResolvedValueOnce(FAKE_ROUTINES)

    const { result } = renderHook(() => useRoutines(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(FAKE_ROUTINES)
    expect(fetchRoutines).toHaveBeenCalledOnce()
  })

  it('useRoutines: queda en loading si fetchRoutines no resuelve', () => {
    fetchRoutines.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useRoutines(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
  })

  it('useRoutine: devuelve una rutina por id', async () => {
    fetchRoutine.mockResolvedValueOnce(FAKE_ROUTINE)

    const { result } = renderHook(() => useRoutine('routine-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(FAKE_ROUTINE)
    expect(fetchRoutine).toHaveBeenCalledWith('routine-1')
  })

  it('useRoutine: no ejecuta la query si routineId es falsy', () => {
    const { result } = renderHook(() => useRoutine(null), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchRoutine).not.toHaveBeenCalled()
  })

  it('useRoutineDays: devuelve los días de una rutina', async () => {
    fetchRoutineDays.mockResolvedValueOnce(FAKE_DAYS)

    const { result } = renderHook(() => useRoutineDays('routine-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(FAKE_DAYS)
    expect(fetchRoutineDays).toHaveBeenCalledWith('routine-1')
  })

  it('useRoutineDays: no ejecuta la query si routineId es falsy', () => {
    const { result } = renderHook(() => useRoutineDays(undefined), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchRoutineDays).not.toHaveBeenCalled()
  })

  it('useRoutineDay: devuelve un día por id', async () => {
    const fakeDay = { id: 'day-1', nombre: 'Día 1' }
    fetchRoutineDay.mockResolvedValueOnce(fakeDay)

    const { result } = renderHook(() => useRoutineDay('day-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(fakeDay)
    expect(fetchRoutineDay).toHaveBeenCalledWith('day-1')
  })

  it('useRoutineDay: no ejecuta la query si dayId es falsy', () => {
    const { result } = renderHook(() => useRoutineDay(null), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchRoutineDay).not.toHaveBeenCalled()
  })

  it('useRoutineBlocks: devuelve los bloques de un día', async () => {
    fetchRoutineBlocks.mockResolvedValueOnce(FAKE_BLOCKS)

    const { result } = renderHook(() => useRoutineBlocks('day-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(FAKE_BLOCKS)
    expect(fetchRoutineBlocks).toHaveBeenCalledWith('day-1')
  })

  it('useRoutineBlocks: no ejecuta la query si dayId es falsy', () => {
    const { result } = renderHook(() => useRoutineBlocks(null), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchRoutineBlocks).not.toHaveBeenCalled()
  })

  it('useRoutineAllExercises: devuelve todos los ejercicios de una rutina', async () => {
    const fakeExercises = [{ id: 'ex-1', nombre: 'Press Banca' }]
    fetchRoutineAllExercises.mockResolvedValueOnce(fakeExercises)

    const { result } = renderHook(() => useRoutineAllExercises('routine-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(fakeExercises)
    expect(fetchRoutineAllExercises).toHaveBeenCalledWith('routine-1')
  })

  it('useRoutineAllExercises: no ejecuta la query si routineId es falsy', () => {
    const { result } = renderHook(() => useRoutineAllExercises(undefined), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchRoutineAllExercises).not.toHaveBeenCalled()
  })
})

describe('useRoutines — mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useCreateRoutine: llama a createRoutine con userId y los datos de la rutina', async () => {
    const newRoutineData = { nombre: 'Nueva Rutina' }
    createRoutine.mockResolvedValueOnce({ id: 'routine-new', ...newRoutineData })

    const { result } = renderHook(() => useCreateRoutine(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(newRoutineData)
    })

    expect(createRoutine).toHaveBeenCalledWith({ userId: 'user-123', routine: newRoutineData })
  })

  it('useDeleteRoutine: llama a deleteRoutine con el routineId', async () => {
    deleteRoutine.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteRoutine(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync('routine-1')
    })

    expect(deleteRoutine).toHaveBeenCalledWith('routine-1')
  })

  it('useUpdateRoutineExercise: llama a updateRoutineExercise con exerciseId y data', async () => {
    const updateArgs = { exerciseId: 'ex-1', dayId: 'day-1', data: { series: 4 } }
    updateRoutineExercise.mockResolvedValueOnce({ id: 'ex-1', series: 4 })

    const { result } = renderHook(() => useUpdateRoutineExercise(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(updateArgs)
    })

    expect(updateRoutineExercise).toHaveBeenCalledWith({ exerciseId: 'ex-1', data: { series: 4 } })
  })

  it('useAddExerciseToDay: llama a addExerciseToDay con los parámetros correctos', async () => {
    const addArgs = { dayId: 'day-1', exerciseId: 'ex-1', series: 3, reps: '10' }
    addExerciseToDay.mockResolvedValueOnce({ id: 're-1' })

    const { result } = renderHook(() => useAddExerciseToDay(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(addArgs)
    })

    expect(addExerciseToDay).toHaveBeenCalledWith(addArgs)
  })
})
