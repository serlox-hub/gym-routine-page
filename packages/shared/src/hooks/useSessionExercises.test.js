import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  addSessionExercise: vi.fn(),
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
  addSessionExercise,
  deleteSessionExercise,
  reorderSessionExercises,
  updateSessionExerciseFields,
  replaceSessionExercise,
} from '../api/workoutApi.js'
import * as notificationsMock from '../notifications.js'
import { useWorkoutStore } from './_stores.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { t } from '../i18n/index.js'

import {
  useSessionExercises,
  useAddSessionExercise,
  useAddSessionExerciseAttempt,
  useAddSessionExerciseFlow,
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

describe('useAddSessionExercise', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const TREADMILL = { id: 2, tracked_fields: ['distance', 'time'] }
  // The add form's submit payload (`AddExerciseModal`), already parsed.
  const FORM_DATA = {
    exerciseId: 2, exercise: TREADMILL,
    series: 1, target_field: 'time', reps: '20min', level: 8, rir: null, rest_seconds: 60, notes: null,
    superset_group: 3,
  }
  const ROUTINE_KEYS = [QUERY_KEYS.ROUTINE_BLOCKS, QUERY_KEYS.ROUTINE_DAY, QUERY_KEYS.ROUTINE_DAYS, QUERY_KEYS.ROUTINE_ALL_EXERCISES, QUERY_KEYS.ROUTINES]

  async function add(data) {
    const { wrapper, queryClient } = createWrapperWithClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAddSessionExercise(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync(data).catch(() => {})
    })
    return invalidate.mock.calls.map(([arg]) => arg.queryKey)
  }

  it('sends the column fields, the superset and the scope, with target_field and level', async () => {
    addSessionExercise.mockResolvedValue({ session_exercise_id: 40, routine_exercise_id: 90 })

    await add({ ...FORM_DATA, addToRoutine: true })

    expect(addSessionExercise).toHaveBeenCalledWith({
      sessionId: 'session-123',
      exerciseId: 2,
      fields: { series: 1, target_field: 'time', reps: '20min', level: 8, rir: null, rest_seconds: 60, notes: null },
      supersetGroup: 3,
      addToRoutine: true,
    })
  })

  it('with a routine row, refreshes the session, the routine caches and the routine list', async () => {
    addSessionExercise.mockResolvedValue({ session_exercise_id: 40, routine_exercise_id: 90 })

    const keys = await add({ ...FORM_DATA, addToRoutine: true })

    expect(keys).toContainEqual([QUERY_KEYS.SESSION_EXERCISES, 'session-123'])
    expect(keys.map(key => key[0])).toEqual(expect.arrayContaining(ROUTINE_KEYS))
    expect(notificationsMock._notifierShow).not.toHaveBeenCalled()
  })

  it('"only today" refreshes the session and leaves the routine alone', async () => {
    addSessionExercise.mockResolvedValue({ session_exercise_id: 40, routine_exercise_id: null })

    const keys = await add({ ...FORM_DATA, addToRoutine: false })

    expect(keys).toEqual([[QUERY_KEYS.SESSION_EXERCISES, 'session-123']])
    expect(notificationsMock._notifierShow).not.toHaveBeenCalled()
  })

  // The day was deleted mid-session: the RPC adds to the session only and says so with a null id.
  it('asked for the routine but got no routine row, tells the user the day is gone', async () => {
    addSessionExercise.mockResolvedValue({ session_exercise_id: 40, routine_exercise_id: null })

    const keys = await add({ ...FORM_DATA, addToRoutine: true })

    expect(keys).toEqual([[QUERY_KEYS.SESSION_EXERCISES, 'session-123']])
    expect(notificationsMock._notifierShow).toHaveBeenCalledWith(t('workout:exercise.addRoutineDayGone'), 'info')
  })

  it('shows addFailed when the RPC fails', async () => {
    addSessionExercise.mockRejectedValue(new Error('exercise_not_available'))

    const keys = await add({ ...FORM_DATA, addToRoutine: true })

    expect(keys).toEqual([])
    expect(notificationsMock._notifierShow).toHaveBeenCalledWith(t('workout:exercise.addFailed'), 'error')
  })

  async function failWith(shouldToastError) {
    addSessionExercise.mockRejectedValue(new Error('session_not_found'))
    const variables = { ...FORM_DATA, addToRoutine: false }
    const { result } = renderHook(() => useAddSessionExercise({ shouldToastError }), { wrapper: createWrapper() })
    await act(async () => {
      await result.current.mutateAsync(variables).catch(() => {})
    })
    return variables
  }

  it('shows no toast when shouldToastError returns false, and hands it the mutation variables', async () => {
    const shouldToastError = vi.fn(() => false)

    const variables = await failWith(shouldToastError)

    expect(shouldToastError).toHaveBeenCalledTimes(1)
    expect(shouldToastError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(shouldToastError.mock.calls[0][1]).toBe(variables)
    expect(notificationsMock._notifierShow).not.toHaveBeenCalled()
  })

  it('still shows addFailed when shouldToastError returns true', async () => {
    await failWith(() => true)

    expect(notificationsMock._notifierShow).toHaveBeenCalledWith(t('workout:exercise.addFailed'), 'error')
  })
})

describe('useAddSessionExerciseAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const DATA = { exerciseId: 2, exercise: { id: 2, tracked_fields: ['weight', 'reps'] }, series: 3, reps: '10', addToRoutine: false }

  /** The RPC answers only when the test says so. */
  function holdRpc() {
    const held = {}
    addSessionExercise.mockReturnValueOnce(new Promise((resolve, reject) => {
      held.resolve = resolve
      held.reject = reject
    }))
    return held
  }

  function renderAttempt() {
    return renderHook(() => useAddSessionExerciseAttempt(), { wrapper: createWrapper() })
  }

  it('is pending while its own add is in flight, and calls onSuccess when it lands', async () => {
    const held = holdRpc()
    const onSuccess = vi.fn()
    const { result } = renderAttempt()

    act(() => { result.current.start({ ...DATA }, onSuccess) })
    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(result.current.isFailed).toBe(false)

    await act(async () => { held.resolve({ session_exercise_id: 1, routine_exercise_id: null }) })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(result.current.isPending).toBe(false)
  })

  it('a failure of its own add is shown as failed, with no toast', async () => {
    const held = holdRpc()
    const { result } = renderAttempt()

    act(() => { result.current.start({ ...DATA }, vi.fn()) })
    await act(async () => { held.reject(new Error('exercise_not_available')) })

    await waitFor(() => expect(result.current.isFailed).toBe(true))
    expect(result.current.isPending).toBe(false)
    expect(notificationsMock._notifierShow).not.toHaveBeenCalled()
  })

  it('once cleared, a later failure is toasted and not shown as failed', async () => {
    const held = holdRpc()
    const { result } = renderAttempt()

    act(() => { result.current.start({ ...DATA }, vi.fn()) })
    await waitFor(() => expect(result.current.isPending).toBe(true))
    act(() => { result.current.clear() })
    expect(result.current.isPending).toBe(false)

    await act(async () => { held.reject(new Error('network')) })

    await waitFor(() => expect(notificationsMock._notifierShow).toHaveBeenCalledWith(t('workout:exercise.addFailed'), 'error'))
    expect(result.current.isFailed).toBe(false)
  })

  it('once cleared, a later success does not call onSuccess (it would close a newer opening)', async () => {
    const held = holdRpc()
    const onSuccess = vi.fn()
    const { result } = renderAttempt()

    act(() => { result.current.start({ ...DATA }, onSuccess) })
    act(() => { result.current.clear() })
    await act(async () => { held.resolve({ session_exercise_id: 1, routine_exercise_id: null }) })

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('a failed add started without an own attempt is not shown as failed', async () => {
    addSessionExercise.mockRejectedValueOnce(new Error('network'))
    const { result } = renderAttempt()

    await act(async () => {
      await result.current.mutation.mutateAsync({ ...DATA }).catch(() => {})
    })

    await waitFor(() => expect(result.current.mutation.isError).toBe(true))
    expect(result.current.isFailed).toBe(false)
    expect(notificationsMock._notifierShow).toHaveBeenCalledWith(t('workout:exercise.addFailed'), 'error')
  })

  it('a new attempt does not inherit the previous failure', async () => {
    holdRpc().reject(new Error('network'))
    const held = holdRpc()
    const { result } = renderAttempt()

    act(() => { result.current.start({ ...DATA }, vi.fn()) })
    await waitFor(() => expect(result.current.isFailed).toBe(true))

    act(() => { result.current.start({ ...DATA }, vi.fn()) })
    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(result.current.isFailed).toBe(false)

    await act(async () => { held.resolve({ session_exercise_id: 1, routine_exercise_id: null }) })
  })

  it('a failure after the screen unmounts is toasted', async () => {
    const held = holdRpc()
    const { result, unmount } = renderAttempt()

    act(() => { result.current.start({ ...DATA }, vi.fn()) })
    await waitFor(() => expect(result.current.isPending).toBe(true))
    unmount()

    await act(async () => { held.reject(new Error('network')) })

    await waitFor(() => expect(notificationsMock._notifierShow).toHaveBeenCalledWith(t('workout:exercise.addFailed'), 'error'))
  })
})

describe('useAddSessionExerciseFlow', () => {
  const store = useWorkoutStore._mockStore

  beforeEach(() => {
    vi.clearAllMocks()
    store.routineDayId = 'day-1'
  })

  afterEach(() => {
    delete store.routineDayId
  })

  const DATA = { exerciseId: 2, exercise: { id: 2, tracked_fields: ['weight', 'reps'] }, series: 3, reps: '10', superset_group: null }
  const LANDED = { session_exercise_id: 1, routine_exercise_id: null }

  /** The RPC answers only when the test says so. */
  function holdRpc() {
    const held = {}
    addSessionExercise.mockReturnValueOnce(new Promise((resolve, reject) => {
      held.resolve = resolve
      held.reject = reject
    }))
    return held
  }

  function renderFlow() {
    return renderHook(() => useAddSessionExerciseFlow(), { wrapper: createWrapper() })
  }

  /** Opens the modal and submits the form, the way the screen does. */
  function submit(result, data = DATA) {
    act(() => { result.current.openModal() })
    act(() => { result.current.submitModal(data) })
  }

  it('openModal and closeModal toggle the modal', () => {
    const { result } = renderFlow()
    expect(result.current.isModalOpen).toBe(false)

    act(() => { result.current.openModal() })
    expect(result.current.isModalOpen).toBe(true)

    act(() => { result.current.closeModal() })
    expect(result.current.isModalOpen).toBe(false)
  })

  describe('routine session', () => {
    it('submitting closes the modal and opens the scope dialog without adding anything yet', () => {
      const { result } = renderFlow()

      submit(result)

      expect(result.current.isModalOpen).toBe(false)
      expect(result.current.pendingAdd).toBe(DATA)
      expect(addSessionExercise).not.toHaveBeenCalled()
    })

    it.each([[true], [false]])('choosing addToRoutine=%s sends that scope to the RPC', async (addToRoutine) => {
      addSessionExercise.mockResolvedValue(LANDED)
      const { result } = renderFlow()
      submit(result)

      await act(async () => { result.current.chooseScope(addToRoutine) })

      expect(addSessionExercise).toHaveBeenCalledTimes(1)
      expect(addSessionExercise).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'session-123',
        exerciseId: 2,
        addToRoutine,
      }))
    })

    it('keeps the dialog open and pending while the add is in flight, and closes it when it lands', async () => {
      const held = holdRpc()
      const { result } = renderFlow()
      submit(result)

      act(() => { result.current.chooseScope(true) })
      await waitFor(() => expect(result.current.isPending).toBe(true))
      expect(result.current.pendingAdd).not.toBeNull()

      await act(async () => { held.resolve(LANDED) })

      await waitFor(() => expect(result.current.pendingAdd).toBeNull())
      expect(result.current.isPending).toBe(false)
    })

    it('a failed add keeps the dialog open, shows as failed and does not toast', async () => {
      const held = holdRpc()
      const { result } = renderFlow()
      submit(result)

      act(() => { result.current.chooseScope(true) })
      await act(async () => { held.reject(new Error('network')) })

      await waitFor(() => expect(result.current.isFailed).toBe(true))
      expect(result.current.pendingAdd).not.toBeNull()
      expect(notificationsMock._notifierShow).not.toHaveBeenCalled()
    })

    it('after a failure the user can choose again and the second add succeeds', async () => {
      const first = holdRpc()
      const second = holdRpc()
      const { result } = renderFlow()
      submit(result)

      act(() => { result.current.chooseScope(true) })
      await act(async () => { first.reject(new Error('network')) })
      await waitFor(() => expect(result.current.isFailed).toBe(true))

      act(() => { result.current.chooseScope(false) })
      await waitFor(() => expect(result.current.isPending).toBe(true))
      expect(result.current.isFailed).toBe(false)

      await act(async () => { second.resolve(LANDED) })
      await waitFor(() => expect(result.current.pendingAdd).toBeNull())
      expect(addSessionExercise).toHaveBeenCalledTimes(2)
    })

    describe('dismissing the dialog', () => {
      it('before choosing adds to today only and closes the dialog', async () => {
        addSessionExercise.mockResolvedValue(LANDED)
        const { result } = renderFlow()
        submit(result)

        await act(async () => { result.current.dismissScope() })

        expect(result.current.pendingAdd).toBeNull()
        expect(addSessionExercise).toHaveBeenCalledTimes(1)
        expect(addSessionExercise).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: 2, addToRoutine: false }))
      })

      it('before choosing, a failure of that add is toasted because nobody is looking at it', async () => {
        addSessionExercise.mockRejectedValueOnce(new Error('network'))
        const { result } = renderFlow()
        submit(result)

        await act(async () => { result.current.dismissScope() })

        await waitFor(() => expect(notificationsMock._notifierShow).toHaveBeenCalledWith(t('workout:exercise.addFailed'), 'error'))
        expect(result.current.isFailed).toBe(false)
      })

      it('while its own add is pending closes without a second add and lets the first one continue', async () => {
        const held = holdRpc()
        const { result } = renderFlow()
        submit(result)
        act(() => { result.current.chooseScope(true) })
        await waitFor(() => expect(result.current.isPending).toBe(true))

        act(() => { result.current.dismissScope() })

        expect(result.current.pendingAdd).toBeNull()
        expect(result.current.isPending).toBe(false)
        expect(addSessionExercise).toHaveBeenCalledTimes(1)

        await act(async () => { held.reject(new Error('network')) })
        await waitFor(() => expect(notificationsMock._notifierShow).toHaveBeenCalledWith(t('workout:exercise.addFailed'), 'error'))
      })

      it('while its own add is pending, a success afterwards is not an error and adds nothing else', async () => {
        const held = holdRpc()
        const { result } = renderFlow()
        submit(result)
        act(() => { result.current.chooseScope(false) })
        await waitFor(() => expect(result.current.isPending).toBe(true))
        act(() => { result.current.dismissScope() })

        await act(async () => { held.resolve(LANDED) })

        expect(addSessionExercise).toHaveBeenCalledTimes(1)
        expect(notificationsMock._notifierShow).not.toHaveBeenCalled()
      })

      it('after its own add failed closes without adding anything', async () => {
        const held = holdRpc()
        const { result } = renderFlow()
        submit(result)
        act(() => { result.current.chooseScope(true) })
        await act(async () => { held.reject(new Error('network')) })
        await waitFor(() => expect(result.current.isFailed).toBe(true))

        act(() => { result.current.dismissScope() })

        expect(result.current.pendingAdd).toBeNull()
        expect(result.current.isFailed).toBe(false)
        expect(addSessionExercise).toHaveBeenCalledTimes(1)
      })
    })

    it('a routineDayId of 0 is still a routine session and asks for the scope', () => {
      store.routineDayId = 0
      const { result } = renderFlow()

      submit(result)

      expect(result.current.pendingAdd).toBe(DATA)
      expect(addSessionExercise).not.toHaveBeenCalled()
    })
  })

  describe('free session', () => {
    beforeEach(() => {
      store.routineDayId = null
    })

    it('submitting adds to today only right away, without asking', async () => {
      addSessionExercise.mockResolvedValue(LANDED)
      const { result } = renderFlow()

      await act(async () => {
        result.current.openModal()
        result.current.submitModal(DATA)
      })

      expect(result.current.pendingAdd).toBeNull()
      expect(addSessionExercise).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: 2, addToRoutine: false }))
    })

    it('keeps the modal open and pending while the add is in flight, and closes it when it lands', async () => {
      const held = holdRpc()
      const { result } = renderFlow()
      submit(result)

      await waitFor(() => expect(result.current.isPending).toBe(true))
      expect(result.current.isModalOpen).toBe(true)

      await act(async () => { held.resolve(LANDED) })

      await waitFor(() => expect(result.current.isModalOpen).toBe(false))
    })

    it('a failed add keeps the modal open and shows as failed, with no toast', async () => {
      const held = holdRpc()
      const { result } = renderFlow()
      submit(result)

      await act(async () => { held.reject(new Error('network')) })

      await waitFor(() => expect(result.current.isFailed).toBe(true))
      expect(result.current.isModalOpen).toBe(true)
      expect(notificationsMock._notifierShow).not.toHaveBeenCalled()
    })

    it('closing the modal clears the failure, so reopening it does not show the old one', async () => {
      const held = holdRpc()
      const { result } = renderFlow()
      submit(result)
      await act(async () => { held.reject(new Error('network')) })
      await waitFor(() => expect(result.current.isFailed).toBe(true))

      act(() => { result.current.closeModal() })
      act(() => { result.current.openModal() })

      expect(result.current.isFailed).toBe(false)
      expect(result.current.isPending).toBe(false)
    })

    it('going back to the picker clears the failure but leaves the modal open', async () => {
      const held = holdRpc()
      const { result } = renderFlow()
      submit(result)
      await act(async () => { held.reject(new Error('network')) })
      await waitFor(() => expect(result.current.isFailed).toBe(true))

      act(() => { result.current.backToPicker() })

      expect(result.current.isFailed).toBe(false)
      expect(result.current.isModalOpen).toBe(true)
    })
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
