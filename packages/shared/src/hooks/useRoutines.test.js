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
  duplicateRoutineDay: vi.fn(),
  moveRoutineExerciseToDay: vi.fn(),
  duplicateRoutine: vi.fn(),
}))

// Mock useAuth to avoid _stores.js initStores requirement
vi.mock('./useAuth.js', () => ({
  useUserId: vi.fn(() => 'user-123'),
}))

// Mock notifications
const notify = vi.fn()
vi.mock('../notifications.js', () => ({
  getNotifier: vi.fn(() => ({ show: notify })),
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
  duplicateRoutineDay,
  duplicateRoutine,
  reorderRoutineDays,
  updateRoutine,
} from '../api/routineApi.js'

import { QUERY_KEYS } from '../lib/constants.js'
import { t } from '../i18n/index.js'

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
  useDuplicateRoutine,
  useDuplicateRoutineDay,
  useReorderRoutineDays,
  useRoutineDetailsForm,
} from './useRoutines.js'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient = createQueryClient()) {
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

  it('useDuplicateRoutine: llama a duplicateRoutine con routineId, userId y newName', async () => {
    duplicateRoutine.mockResolvedValueOnce({ id: 'routine-copy' })

    const { result } = renderHook(() => useDuplicateRoutine(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({ routineId: 'routine-1', newName: 'Copia' })
    })

    expect(duplicateRoutine).toHaveBeenCalledWith('routine-1', 'user-123', 'Copia')
  })

  it('useDuplicateRoutine: newName es opcional', async () => {
    duplicateRoutine.mockResolvedValueOnce({ id: 'routine-copy' })

    const { result } = renderHook(() => useDuplicateRoutine(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({ routineId: 'routine-1' })
    })

    expect(duplicateRoutine).toHaveBeenCalledWith('routine-1', 'user-123', undefined)
  })

  it('useDuplicateRoutineDay: llama a duplicateRoutineDay con dayId y newName', async () => {
    duplicateRoutineDay.mockResolvedValueOnce({ id: 'day-copy' })

    const { result } = renderHook(() => useDuplicateRoutineDay(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({ dayId: 'day-1', newName: 'Día 1 (copia)', routineId: 'routine-1' })
    })

    expect(duplicateRoutineDay).toHaveBeenCalledWith({ dayId: 'day-1', newName: 'Día 1 (copia)' })
  })
})

describe('useReorderRoutineDays — actualización optimista', () => {
  const ROUTINE_ID = 'routine-1'
  const QUERY_KEY = [QUERY_KEYS.ROUTINE_DAYS, ROUTINE_ID]
  const CACHED_DAYS = [
    { id: 'day-1', name: 'Empuje', sort_order: 1 },
    { id: 'day-2', name: 'Tirón', sort_order: 2 },
    { id: 'day-3', name: 'Pierna', sort_order: 3 },
  ]
  // Lo que produciría `moveItemToPosition` al mover «Pierna» a la primera posición.
  const REORDERED = [CACHED_DAYS[2], CACHED_DAYS[0], CACHED_DAYS[1]]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('escribe el orden nuevo en la caché con sort_order renumerado 1..n antes de que responda la API', async () => {
    let resolveApi
    reorderRoutineDays.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve }))
    const queryClient = createQueryClient()
    queryClient.setQueryData(QUERY_KEY, CACHED_DAYS)

    const { result } = renderHook(() => useReorderRoutineDays(), { wrapper: createWrapper(queryClient) })

    act(() => {
      result.current.mutate({ routineId: ROUTINE_ID, days: REORDERED })
    })

    await waitFor(() => expect(queryClient.getQueryData(QUERY_KEY)).toEqual([
      { id: 'day-3', name: 'Pierna', sort_order: 1 },
      { id: 'day-1', name: 'Empuje', sort_order: 2 },
      { id: 'day-2', name: 'Tirón', sort_order: 3 },
    ]))

    resolveApi()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('restaura la caché y avisa si la API falla', async () => {
    reorderRoutineDays.mockRejectedValueOnce(new Error('network down'))
    const queryClient = createQueryClient()
    queryClient.setQueryData(QUERY_KEY, CACHED_DAYS)

    const { result } = renderHook(() => useReorderRoutineDays(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ routineId: ROUTINE_ID, days: REORDERED }).catch(() => {})
    })

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual(CACHED_DAYS)
    expect(notify).toHaveBeenCalledWith(t('routine:day.reorderFailed'), 'error')
  })

  it('normaliza el routineId a String para dar con la caché registrada por la query', async () => {
    reorderRoutineDays.mockResolvedValueOnce(undefined)
    const queryClient = createQueryClient()
    queryClient.setQueryData([QUERY_KEYS.ROUTINE_DAYS, '7'], CACHED_DAYS)

    const { result } = renderHook(() => useReorderRoutineDays(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ routineId: 7, days: REORDERED })
    })

    expect(queryClient.getQueryData([QUERY_KEYS.ROUTINE_DAYS, '7']).map(d => d.id))
      .toEqual(['day-3', 'day-1', 'day-2'])
  })
})

describe('useRoutineDetailsForm', () => {
  const ROUTINE = { id: 7, name: 'PPL', description: 'Push pull legs' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderForm(routine = ROUTINE) {
    return renderHook(() => useRoutineDetailsForm(routine, 7), { wrapper: createWrapper() })
  }

  it('siembra el form desde la rutina', () => {
    const { result } = renderForm()

    expect(result.current.form).toEqual({ name: 'PPL', description: 'Push pull legs' })
    expect(result.current.error).toBeNull()
  })

  it('una rutina todavía sin cargar siembra campos vacíos', () => {
    const { result } = renderForm(null)

    expect(result.current.form).toEqual({ name: '', description: '' })
  })

  it('un nombre vacío no llega a la API: deja el error de validación y resuelve false', async () => {
    const { result } = renderForm()

    act(() => { result.current.setField('name', '   ') })

    let ok
    await act(async () => { ok = await result.current.submit() })

    expect(ok).toBe(false)
    expect(updateRoutine).not.toHaveBeenCalled()
    expect(result.current.error).toBe(t('validation:nameRequired'))
  })

  it('un fallo de la mutación deja error genérico y resuelve false, sin rechazar', async () => {
    updateRoutine.mockRejectedValueOnce(new Error('network down'))
    const { result } = renderForm()

    let ok
    await act(async () => { ok = await result.current.submit() })

    expect(ok).toBe(false)
    expect(result.current.error).toBe(t('common:errors.generic'))
  })

  it('guarda el nombre y la descripción recortados y resuelve true', async () => {
    updateRoutine.mockResolvedValueOnce({ id: 7 })
    const { result } = renderForm()

    act(() => { result.current.setField('name', '  Full body  ') })
    act(() => { result.current.setField('description', '  3 días  ') })

    let ok
    await act(async () => { ok = await result.current.submit() })

    expect(ok).toBe(true)
    expect(updateRoutine).toHaveBeenCalledWith({
      routineId: 7,
      data: { name: 'Full body', description: '3 días' },
    })
    expect(result.current.error).toBeNull()
  })

  it('una descripción vacía se guarda como null', async () => {
    updateRoutine.mockResolvedValueOnce({ id: 7 })
    const { result } = renderForm()

    act(() => { result.current.setField('description', '   ') })
    await act(async () => { await result.current.submit() })

    expect(updateRoutine).toHaveBeenCalledWith({
      routineId: 7,
      data: { name: 'PPL', description: null },
    })
  })

  it('setField limpia el error anterior', async () => {
    const { result } = renderForm()

    act(() => { result.current.setField('name', '') })
    await act(async () => { await result.current.submit() })
    expect(result.current.error).not.toBeNull()

    act(() => { result.current.setField('name', 'Otra') })
    expect(result.current.error).toBeNull()
  })

  it('no vuelve a sembrarse cuando cambia `routine`: un refetch de fondo no pisa lo tecleado', () => {
    const { result, rerender } = renderHook(
      ({ routine }) => useRoutineDetailsForm(routine, 7),
      { wrapper: createWrapper(), initialProps: { routine: ROUTINE } }
    )

    act(() => { result.current.setField('name', 'A medio escribir') })
    rerender({ routine: { ...ROUTINE, name: 'Nombre del servidor' } })

    expect(result.current.form.name).toBe('A medio escribir')
  })
})
