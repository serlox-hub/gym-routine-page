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
  setRoutineExerciseSupersetGroup: vi.fn(),
  addExerciseToDay: vi.fn(),
  duplicateRoutineExercise: vi.fn(),
  duplicateRoutineDay: vi.fn(),
  createRoutineDayWithExercises: vi.fn(),
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
  createRoutineDay,
  deleteRoutine,
  deleteRoutineDay,
  updateRoutineDay,
  deleteRoutineExercise,
  duplicateRoutineExercise,
  updateRoutineExercise,
  addExerciseToDay,
  duplicateRoutineDay,
  duplicateRoutine,
  reorderRoutineDays,
  reorderRoutineExercises,
  setRoutineExerciseSupersetGroup,
  updateRoutine,
  createRoutineDayWithExercises,
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
  useCreateRoutineDay,
  useAddRoutineDay,
  useDeleteRoutine,
  useDeleteRoutineDay,
  useUpdateRoutineDay,
  useDeleteRoutineExercise,
  useDuplicateRoutineExercise,
  useUpdateRoutineExercise,
  useAddExerciseToDay,
  useDuplicateRoutine,
  useDuplicateRoutineDay,
  useReorderRoutineDays,
  useReorderRoutineExercises,
  useSetRoutineExerciseSupersetGroup,
  useRoutineDetailsForm,
  useCreateRoutineDayWithExercises,
  useConvertSessionToRoutineDayForm,
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

describe('useCreateRoutineDay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const variables = { routineId: 7, day: { name: 'Día 3', sort_order: 3 } }

  // The screen numbers the next day from the days list: re-enabling the button before that list
  // is back would let a second tap reuse the number.
  it('stays pending until the days list has been refetched', async () => {
    createRoutineDay.mockResolvedValueOnce({ id: 'day-3' })
    const queryClient = createQueryClient()
    let finishRefetch
    vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(new Promise(resolve => { finishRefetch = resolve }))

    const { result } = renderHook(() => useCreateRoutineDay(), { wrapper: createWrapper(queryClient) })

    act(() => { result.current.mutate(variables) })

    await waitFor(() => expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, '7'] }))
    // The routines list shows "N days": it is refreshed too, without holding the button.
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.ROUTINES] })
    expect(result.current.isPending).toBe(true)

    await act(async () => { finishRefetch() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('tells the user when the day could not be created', async () => {
    createRoutineDay.mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() => useCreateRoutineDay(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(variables).catch(() => {})
    })

    expect(notify).toHaveBeenCalledWith(t('routine:day.addError'), 'error')
  })
})

// The routines list shows "N days" per routine: deleting or duplicating a day changes that number.
describe('useDeleteRoutineDay / useDuplicateRoutineDay — invalidación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function spyOnInvalidation() {
    const queryClient = createQueryClient()
    vi.spyOn(queryClient, 'invalidateQueries')
    return queryClient
  }

  it('useDeleteRoutineDay: refresca los días de la rutina y la lista de rutinas', async () => {
    deleteRoutineDay.mockResolvedValueOnce(undefined)
    const queryClient = spyOnInvalidation()

    const { result } = renderHook(() => useDeleteRoutineDay(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ dayId: 'day-1', routineId: 7 })
    })

    expect(deleteRoutineDay).toHaveBeenCalledWith('day-1')
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, '7'] })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.ROUTINES] })
  })

  it('useDeleteRoutineDay: no invalida nada si el borrado falla', async () => {
    deleteRoutineDay.mockRejectedValueOnce(new Error('network down'))
    const queryClient = spyOnInvalidation()

    const { result } = renderHook(() => useDeleteRoutineDay(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ dayId: 'day-1', routineId: 7 }).catch(() => {})
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
  })

  it('useDuplicateRoutineDay: refresca los días de la rutina y la lista de rutinas', async () => {
    duplicateRoutineDay.mockResolvedValueOnce({ id: 'day-copy' })
    const queryClient = spyOnInvalidation()

    const { result } = renderHook(() => useDuplicateRoutineDay(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ dayId: 'day-1', newName: 'Día 1 (copia)', routineId: 7 })
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.ROUTINE_DAYS, '7'] })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.ROUTINES] })
    expect(notify).toHaveBeenCalledWith(t('routine:day.duplicated'), 'success')
  })
})

// Issue #174: each action waits for the list it changes, so the modal closes (or the menu option
// comes back) onto the new list, and its failure is told once: inline in the modal that waits for
// it, or as a toast when nothing on screen does.
describe('mutations that wait for the list they change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Holds the refetch of `heldKey` until `finish()`; any other invalidation resolves at once, so a
  // hook that held the wrong list would settle early.
  function holdRefetch(queryClient, heldKey) {
    let finish
    const held = new Promise(resolve => { finish = resolve })
    vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(({ queryKey }) =>
      JSON.stringify(queryKey) === JSON.stringify(heldKey) ? held : Promise.resolve())
    return () => finish()
  }

  const CASES = [
    {
      name: 'useDeleteRoutineExercise',
      useHook: useDeleteRoutineExercise,
      api: deleteRoutineExercise,
      variables: { exerciseId: 're-1', dayId: 3 },
      heldKey: [QUERY_KEYS.ROUTINE_BLOCKS, '3'],
    },
    {
      name: 'useUpdateRoutineDay',
      useHook: useUpdateRoutineDay,
      api: updateRoutineDay,
      variables: { dayId: 'day-1', routineId: 7, data: { name: 'Pierna' } },
      heldKey: [QUERY_KEYS.ROUTINE_DAYS, '7'],
    },
    {
      name: 'useDeleteRoutineDay',
      useHook: useDeleteRoutineDay,
      api: deleteRoutineDay,
      variables: { dayId: 'day-1', routineId: 7 },
      heldKey: [QUERY_KEYS.ROUTINE_DAYS, '7'],
    },
    {
      name: 'useDeleteRoutine',
      useHook: useDeleteRoutine,
      api: deleteRoutine,
      variables: 7,
      heldKey: [QUERY_KEYS.ROUTINES],
    },
    {
      name: 'useDuplicateRoutineExercise',
      useHook: useDuplicateRoutineExercise,
      api: duplicateRoutineExercise,
      variables: { routineExercise: { id: 're-1' }, dayId: 3 },
      heldKey: [QUERY_KEYS.ROUTINE_BLOCKS, '3'],
    },
  ]

  it.each(CASES)('$name stays pending until its list has been refetched', async ({ useHook, api, variables, heldKey }) => {
    api.mockResolvedValueOnce(undefined)
    const queryClient = createQueryClient()
    const finishRefetch = holdRefetch(queryClient, heldKey)

    const { result } = renderHook(() => useHook(), { wrapper: createWrapper(queryClient) })

    act(() => { result.current.mutate(variables) })

    await waitFor(() => expect(queryClient.invalidateQueries).toHaveBeenCalledWith(expect.objectContaining({ queryKey: heldKey })))
    expect(result.current.isPending).toBe(true)

    await act(async () => { finishRefetch() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  // These run inside a modal that cannot close while they are pending: it shows the failure.
  it.each([
    { name: 'useCreateRoutine', useHook: useCreateRoutine, api: createRoutine, variables: { name: 'Mi rutina' } },
    ...CASES.filter(({ name }) => name !== 'useDuplicateRoutineExercise'),
  ])('$name leaves its failure to the modal: no toast', async ({ useHook, api, variables }) => {
    api.mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() => useHook(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync(variables).catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(notify).not.toHaveBeenCalled()
  })

  // The exercise menu closes on tap: nothing on screen waits for the copy, so the toast tells.
  it('useDuplicateRoutineExercise tells the user when the copy could not be made', async () => {
    duplicateRoutineExercise.mockRejectedValueOnce(new Error('network down'))

    const { result } = renderHook(() => useDuplicateRoutineExercise(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.mutateAsync({ routineExercise: { id: 're-1' }, dayId: 3 }).catch(() => {})
    })

    expect(notify).toHaveBeenCalledWith(t('routine:exercise.duplicateError'), 'error')
  })

  // The "deleted" toast goes out with the screen the user lands on, not over the open modal.
  it('useDeleteRoutine says the routine is deleted only once the routines list is back', async () => {
    deleteRoutine.mockResolvedValueOnce(undefined)
    const queryClient = createQueryClient()
    const finishRefetch = holdRefetch(queryClient, [QUERY_KEYS.ROUTINES])

    const { result } = renderHook(() => useDeleteRoutine(), { wrapper: createWrapper(queryClient) })

    act(() => { result.current.mutate(7) })
    await waitFor(() => expect(queryClient.invalidateQueries).toHaveBeenCalled())
    expect(notify).not.toHaveBeenCalled()

    await act(async () => { finishRefetch() })
    await waitFor(() => expect(notify).toHaveBeenCalledWith(t('routine:deleted'), 'success'))
  })

  // `holdRefetch` mocks `invalidateQueries`, so it cannot tell WHICH queries get refetched. From the
  // routine page nothing observes the routines list (Home is unmounted) and the default refetches
  // only observed queries: Home would mount with the deleted routine still cached.
  it('useDeleteRoutine has refetched the routines list, even with nothing observing it, by the time it resolves', async () => {
    const queryClient = createQueryClient()
    const routinesKey = [QUERY_KEYS.ROUTINES]
    const idsInCache = () => queryClient.getQueryData(routinesKey)?.map(routine => routine.id)

    // Home was open once and then left: the list stays cached, with no observer.
    fetchRoutines.mockResolvedValueOnce(FAKE_ROUTINES)
    const home = renderHook(() => useRoutines(), { wrapper: createWrapper(queryClient) })
    await waitFor(() => expect(home.result.current.isSuccess).toBe(true))
    home.unmount()
    expect(queryClient.getQueryCache().find({ queryKey: routinesKey }).getObserversCount()).toBe(0)
    expect(idsInCache()).toEqual(['routine-1', 'routine-2'])

    deleteRoutine.mockResolvedValueOnce(undefined)
    fetchRoutines.mockResolvedValueOnce(FAKE_ROUTINES.filter(routine => routine.id !== 'routine-1'))
    let idsWhenToastShown
    notify.mockImplementationOnce(() => { idsWhenToastShown = idsInCache() })

    const { result } = renderHook(() => useDeleteRoutine(), { wrapper: createWrapper(queryClient) })
    await act(async () => { await result.current.mutateAsync('routine-1') })

    expect(idsInCache()).toEqual(['routine-2'])
    expect(idsWhenToastShown).toEqual(['routine-2'])
  })
})

describe('useAddRoutineDay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderAddRoutineDay(routineId, cachedDays) {
    const queryClient = createQueryClient()
    if (cachedDays) queryClient.setQueryData([QUERY_KEYS.ROUTINE_DAYS, '7'], cachedDays)
    return renderHook(() => useAddRoutineDay(routineId), { wrapper: createWrapper(queryClient) })
  }

  it('names and numbers the new day after the last one in the cached days list', async () => {
    createRoutineDay.mockResolvedValueOnce({ id: 'day-3' })
    const { result } = renderAddRoutineDay(7, [{ id: 'day-1', sort_order: 1 }, { id: 'day-2', sort_order: 2 }])

    await act(async () => { await result.current.addDay() })

    expect(createRoutineDay).toHaveBeenCalledWith({
      routineId: 7,
      day: { name: t('routine:day.title', { number: 3 }), sort_order: 3 },
    })
  })

  it('creates "Day 1" when the routine has no days yet', async () => {
    createRoutineDay.mockResolvedValueOnce({ id: 'day-1' })
    const { result } = renderAddRoutineDay(7, [])

    await act(async () => { await result.current.addDay() })

    expect(createRoutineDay).toHaveBeenCalledWith({
      routineId: 7,
      day: { name: t('routine:day.title', { number: 1 }), sort_order: 1 },
    })
  })

  // Web route params are strings, native ones numbers: both must find the same cached list.
  it('reads the cached days list when the routine id comes as a string', async () => {
    createRoutineDay.mockResolvedValueOnce({ id: 'day-2' })
    const { result } = renderAddRoutineDay('7', [{ id: 'day-1', sort_order: 1 }])

    await act(async () => { await result.current.addDay() })

    expect(createRoutineDay).toHaveBeenCalledWith({
      routineId: '7',
      day: { name: t('routine:day.title', { number: 2 }), sort_order: 2 },
    })
  })

  // TanStack Query publishes `isPending` on a timer, so the second tap lands on a button that
  // still looks idle: only the hook's own guard stops it.
  it('creates a single day when tapped again before the first save finishes', async () => {
    createRoutineDay.mockReturnValue(new Promise(() => {}))
    const { result } = renderAddRoutineDay(7, [])

    act(() => {
      result.current.addDay()
      result.current.addDay()
    })

    await waitFor(() => expect(createRoutineDay).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(createRoutineDay).toHaveBeenCalledTimes(1)
  })

  it('lets the user try again after a failed save, and tells them it failed', async () => {
    createRoutineDay.mockRejectedValueOnce(new Error('network down'))
    createRoutineDay.mockResolvedValueOnce({ id: 'day-1' })
    const { result } = renderAddRoutineDay(7, [])

    await act(async () => { await result.current.addDay() })
    expect(notify).toHaveBeenCalledWith(t('routine:day.addError'), 'error')

    await act(async () => { await result.current.addDay() })
    expect(createRoutineDay).toHaveBeenCalledTimes(2)
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

describe('useReorderRoutineExercises — actualización optimista', () => {
  const DAY_ID = 'day-1'
  const QUERY_KEY = [QUERY_KEYS.ROUTINE_BLOCKS, DAY_ID]
  const CACHED_BLOCKS = [
    { name: 'Calentamiento', is_warmup: true, routine_exercises: [{ id: 10, sort_order: 1 }] },
    {
      name: 'Principal',
      is_warmup: false,
      routine_exercises: [
        { id: 20, sort_order: 2, superset_group: null },
        { id: 21, sort_order: 3, superset_group: 1 },
        { id: 22, sort_order: 4, superset_group: 1 },
      ],
    },
  ]
  // El día entero, calentamiento primero: la superserie (21, 22) pasa delante del individual.
  const REORDERED = [{ id: 10 }, { id: 21 }, { id: 22 }, { id: 20 }]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('escribe el orden nuevo en la caché antes de que responda la API, sin tocar superset_group', async () => {
    let resolveApi
    reorderRoutineExercises.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve }))
    const queryClient = createQueryClient()
    queryClient.setQueryData(QUERY_KEY, CACHED_BLOCKS)

    const { result } = renderHook(() => useReorderRoutineExercises(), { wrapper: createWrapper(queryClient) })

    act(() => {
      result.current.mutate({ dayId: DAY_ID, exercises: REORDERED })
    })

    await waitFor(() => expect(queryClient.getQueryData(QUERY_KEY)[1].routine_exercises).toEqual([
      { id: 21, sort_order: 2, superset_group: 1 },
      { id: 22, sort_order: 3, superset_group: 1 },
      { id: 20, sort_order: 4, superset_group: null },
    ]))

    resolveApi()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('restaura la caché y avisa si la API falla', async () => {
    reorderRoutineExercises.mockRejectedValueOnce(new Error('network down'))
    const queryClient = createQueryClient()
    queryClient.setQueryData(QUERY_KEY, CACHED_BLOCKS)

    const { result } = renderHook(() => useReorderRoutineExercises(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ dayId: DAY_ID, exercises: REORDERED }).catch(() => {})
    })

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual(CACHED_BLOCKS)
    expect(notify).toHaveBeenCalledWith(t('routine:exercise.reorderFailed'), 'error')
  })

  it('normaliza el dayId a String para dar con la caché registrada por la query', async () => {
    reorderRoutineExercises.mockResolvedValueOnce(undefined)
    const queryClient = createQueryClient()
    queryClient.setQueryData([QUERY_KEYS.ROUTINE_BLOCKS, '7'], CACHED_BLOCKS)

    const { result } = renderHook(() => useReorderRoutineExercises(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ dayId: 7, exercises: REORDERED })
    })

    expect(queryClient.getQueryData([QUERY_KEYS.ROUTINE_BLOCKS, '7'])[1].routine_exercises.map(re => re.id))
      .toEqual([21, 22, 20])
  })

  it('also applies the membership of items carrying supersetGroup', async () => {
    let resolveApi
    reorderRoutineExercises.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve }))
    const queryClient = createQueryClient()
    queryClient.setQueryData(QUERY_KEY, CACHED_BLOCKS)

    const { result } = renderHook(() => useReorderRoutineExercises(), { wrapper: createWrapper(queryClient) })

    // Individual 20 joins the superset between its two members.
    act(() => {
      result.current.mutate({ dayId: DAY_ID, exercises: [{ id: 10 }, { id: 21 }, { id: 20, supersetGroup: 1 }, { id: 22 }] })
    })

    await waitFor(() => expect(queryClient.getQueryData(QUERY_KEY)[1].routine_exercises).toEqual([
      { id: 21, sort_order: 2, superset_group: 1 },
      { id: 20, sort_order: 3, superset_group: 1 },
      { id: 22, sort_order: 4, superset_group: 1 },
    ]))

    resolveApi()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useSetRoutineExerciseSupersetGroup — optimistic update', () => {
  const DAY_ID = 'day-1'
  const QUERY_KEY = [QUERY_KEYS.ROUTINE_BLOCKS, DAY_ID]
  const CACHED_BLOCKS = [
    { name: 'Calentamiento', is_warmup: true, routine_exercises: [{ id: 10, sort_order: 1, is_warmup: true, superset_group: null }] },
    {
      name: 'Principal',
      is_warmup: false,
      routine_exercises: [
        { id: 21, sort_order: 2, is_warmup: false, superset_group: 1 },
        { id: 22, sort_order: 3, is_warmup: false, superset_group: 1 },
        { id: 20, sort_order: 4, is_warmup: false, superset_group: null },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('takes the exercise out in the cache before the API answers, right after its run', async () => {
    let resolveApi
    setRoutineExerciseSupersetGroup.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve }))
    const queryClient = createQueryClient()
    queryClient.setQueryData(QUERY_KEY, CACHED_BLOCKS)

    const { result } = renderHook(() => useSetRoutineExerciseSupersetGroup(), { wrapper: createWrapper(queryClient) })

    act(() => {
      result.current.mutate({ dayId: DAY_ID, routineExerciseId: 21, supersetGroup: null })
    })

    await waitFor(() => expect(queryClient.getQueryData(QUERY_KEY)[1].routine_exercises.map(re => [re.id, re.superset_group]))
      .toEqual([[22, 1], [21, null], [20, null]]))
    expect(setRoutineExerciseSupersetGroup).toHaveBeenCalledWith({ dayId: DAY_ID, routineExerciseId: 21, supersetGroup: null })

    resolveApi(null)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('restores the cache and notifies if the API fails', async () => {
    setRoutineExerciseSupersetGroup.mockRejectedValueOnce(new Error('network down'))
    const queryClient = createQueryClient()
    queryClient.setQueryData(QUERY_KEY, CACHED_BLOCKS)

    const { result } = renderHook(() => useSetRoutineExerciseSupersetGroup(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ dayId: DAY_ID, routineExerciseId: 21, supersetGroup: null }).catch(() => {})
    })

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual(CACHED_BLOCKS)
    expect(notify).toHaveBeenCalledWith(t('routine:exercise.supersetMoveFailed'), 'error')
  })

  it('invalidates the day\'s blocks when settled, with dayId normalized to String', async () => {
    setRoutineExerciseSupersetGroup.mockResolvedValueOnce(null)
    const queryClient = createQueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSetRoutineExerciseSupersetGroup(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync({ dayId: 7, routineExerciseId: 21, supersetGroup: null })
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.ROUTINE_BLOCKS, '7'] })
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

describe('useCreateRoutineDayWithExercises', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the params to the API and invalidates exactly the list and the target routine', async () => {
    const params = { routineId: null, newRoutineName: 'Summer', dayName: 'Push', exercises: [{ exercise_id: 1 }] }
    createRoutineDayWithExercises.mockResolvedValueOnce({ routineId: 12, dayId: 40 })
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateRoutineDayWithExercises(), { wrapper: createWrapper(queryClient) })

    await act(async () => {
      await result.current.mutateAsync(params)
    })

    expect(createRoutineDayWithExercises).toHaveBeenCalledWith(params)
    expect(invalidateSpy.mock.calls.map(([filters]) => filters.queryKey)).toEqual([
      [QUERY_KEYS.ROUTINES],
      [QUERY_KEYS.ROUTINE, '12'],
      [QUERY_KEYS.ROUTINE_DAYS, '12'],
      [QUERY_KEYS.ROUTINE_ALL_EXERCISES, '12'],
    ])
  })
})

describe('useConvertSessionToRoutineDayForm', () => {
  const SESSION = {
    id: 'session-1',
    day_name: 'Push',
    routine_day: { id: 5, name: 'Push', routine: { id: 3, name: 'PPL' } },
    exercises: [
      {
        sessionExerciseId: 100,
        exercise: { id: 7, deleted_at: null },
        series: 3, target_field: 'reps', reps: '8-12', level: null, rir: 2, rest_seconds: 90, notes: null,
        superset_group: null, is_extra: false, is_warmup: false,
        sets: [{ id: 1, set_number: 1 }, { id: 2, set_number: 2 }],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchRoutines.mockResolvedValue([{ id: 3, name: 'PPL' }, { id: 4, name: 'Full body' }])
  })

  function renderForm(session = SESSION, onSuccess = vi.fn(), queryClient = createQueryClient()) {
    return renderHook(() => useConvertSessionToRoutineDayForm({ session, onSuccess }), { wrapper: createWrapper(queryClient) })
  }

  it('prefills the day name and preselects the source routine once the routines load', async () => {
    const { result } = renderForm()

    expect(result.current.dayName).toBe('Push')
    await waitFor(() => expect(result.current.selectedRoutineId).toBe('3'))
    expect(result.current.isBlocked).toBe(false)
  })

  it('surfaces a first-load failure as isRoutinesError, and retryRoutines recovers the list', async () => {
    fetchRoutines.mockRejectedValueOnce(new Error('network error'))
    const { result } = renderForm()

    await waitFor(() => expect(result.current.isRoutinesError).toBe(true))
    expect(result.current.isLoadingRoutines).toBe(false)
    expect(result.current.routines).toEqual([])

    act(() => result.current.retryRoutines())

    await waitFor(() => expect(result.current.isRoutinesError).toBe(false))
    expect(result.current.routines).toEqual([{ id: 3, name: 'PPL' }, { id: 4, name: 'Full body' }])
  })

  it('explains why Confirm is blocked and does not call the API', async () => {
    const { result } = renderForm({ ...SESSION, routine_day: null })
    await waitFor(() => expect(result.current.isLoadingRoutines).toBe(false))

    act(() => result.current.submit())

    expect(result.current.notice).toEqual({ type: 'info', text: t('workout:history.convertToDay.blocked.noRoutine') })
    expect(createRoutineDayWithExercises).not.toHaveBeenCalled()

    act(() => result.current.selectNewRoutine())
    expect(result.current.notice).toBeNull()
  })

  it('creates the day from the built rows with trimmed names, then toasts and calls onSuccess', async () => {
    createRoutineDayWithExercises.mockResolvedValueOnce({ routineId: 9, dayId: 30 })
    const onSuccess = vi.fn()
    const { result } = renderForm(SESSION, onSuccess)
    await waitFor(() => expect(result.current.isLoadingRoutines).toBe(false))

    act(() => {
      result.current.selectNewRoutine()
      result.current.setNewRoutineName('  Summer ')
      result.current.setDayName(' Push A ')
    })
    act(() => result.current.submit())

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ routineId: 9, dayId: 30 }))
    expect(createRoutineDayWithExercises).toHaveBeenCalledWith({
      routineId: null,
      newRoutineName: 'Summer',
      dayName: 'Push A',
      exercises: [expect.objectContaining({ exercise_id: 7, series: 2, sort_order: 1 })],
    })
    expect(notify).toHaveBeenCalledWith(t('workout:history.convertToDay.success'), 'success')
  })

  it('keeps the dialog state, shows the mapped error and refetches the session on exercise_not_available', async () => {
    createRoutineDayWithExercises.mockRejectedValueOnce({ message: 'exercise_not_available', code: 'P0002' })
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const onSuccess = vi.fn()
    const { result } = renderForm(SESSION, onSuccess, queryClient)
    await waitFor(() => expect(result.current.selectedRoutineId).toBe('3'))

    act(() => result.current.submit())

    await waitFor(() => expect(result.current.notice?.type).toBe('error'))
    expect(result.current.notice.text).toBe(t('workout:history.convertToDay.errors.exerciseNotAvailable'))
    expect(createRoutineDayWithExercises).toHaveBeenCalledWith(expect.objectContaining({ routineId: 3, newRoutineName: null }))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.SESSION_DETAIL, 'session-1'] })
    expect(result.current.dayName).toBe('Push')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('does not refetch the session for any other error, but does invalidate the routines list', async () => {
    createRoutineDayWithExercises.mockRejectedValueOnce({ message: 'routine_not_found' })
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderForm(SESSION, vi.fn(), queryClient)
    await waitFor(() => expect(result.current.selectedRoutineId).toBe('3'))

    act(() => result.current.submit())

    await waitFor(() => expect(result.current.notice?.text).toBe(t('workout:history.convertToDay.errors.routineNotFound')))
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.SESSION_DETAIL, 'session-1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [QUERY_KEYS.ROUTINES] })
  })

  it('falls back to the source routine after routine_not_found drops an explicit pick, if it is still in the list', async () => {
    createRoutineDayWithExercises.mockRejectedValueOnce({ message: 'routine_not_found' })
    const queryClient = createQueryClient()
    const { result } = renderForm(SESSION, vi.fn(), queryClient)
    await waitFor(() => expect(result.current.selectedRoutineId).toBe('3'))

    act(() => result.current.selectRoutine(4))
    expect(result.current.selectedRoutineId).toBe('4')

    act(() => result.current.submit())

    await waitFor(() => expect(result.current.notice?.text).toBe(t('workout:history.convertToDay.errors.routineNotFound')))
    // The invalidated routines list refetches and still has the source routine (id 3, from beforeEach).
    await waitFor(() => expect(result.current.selectedRoutineId).toBe('3'))
  })

  it('drops the selection once the refetched list no longer has the source routine either', async () => {
    createRoutineDayWithExercises.mockRejectedValueOnce({ message: 'routine_not_found' })
    const queryClient = createQueryClient()
    const { result } = renderForm(SESSION, vi.fn(), queryClient)
    await waitFor(() => expect(result.current.selectedRoutineId).toBe('3'))

    act(() => result.current.selectRoutine(4))
    // The refetch triggered by the ROUTINES invalidation returns a list without the source routine.
    fetchRoutines.mockResolvedValueOnce([{ id: 4, name: 'Full body' }])

    act(() => result.current.submit())

    await waitFor(() => expect(result.current.notice?.text).toBe(t('workout:history.convertToDay.errors.routineNotFound')))
    await waitFor(() => expect(result.current.selectedRoutineId).toBeNull())
  })

  it('says there is nothing to copy when every exercise was skipped', async () => {
    const empty = { ...SESSION, exercises: [{ ...SESSION.exercises[0], sets: [] }] }
    const { result } = renderForm(empty)
    await waitFor(() => expect(result.current.selectedRoutineId).toBe('3'))

    act(() => result.current.submit())

    expect(result.current.notice).toEqual({ type: 'info', text: t('workout:history.convertToDay.nothingToCopy') })
    expect(createRoutineDayWithExercises).not.toHaveBeenCalled()
  })
})
