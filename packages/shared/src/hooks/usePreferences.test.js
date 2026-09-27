import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('../api/preferencesApi.js', () => ({ fetchPreferences: vi.fn(), upsertPreference: vi.fn() }))
vi.mock('./useAuth.js', () => ({ useUserId: () => 'user-1' }))

import { fetchPreferences, upsertPreference } from '../api/preferencesApi.js'
import { usePreference, useUpdatePreference } from './usePreferences.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { initNotifications } from '../notifications.js'

const QUERY_KEY = [QUERY_KEYS.USER_PREFERENCES, 'user-1']

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

describe('usePreference — errores (issue #98)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sin datos, un fallo de carga es isError y el valor es el por defecto', async () => {
    fetchPreferences.mockRejectedValueOnce(new Error('network'))
    const { wrapper } = setup()

    const { result } = renderHook(() => usePreference('training_days_per_week'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.value).toBeNull()
  })

  it('con datos en caché, un refresco fallido no es isError y el valor sigue siendo el del usuario', async () => {
    fetchPreferences
      .mockResolvedValueOnce([{ key: 'training_days_per_week', value: 4 }])
      .mockRejectedValueOnce(new Error('network'))
    const { wrapper } = setup()

    const { result } = renderHook(() => usePreference('training_days_per_week'), { wrapper })
    await waitFor(() => expect(result.current.value).toBe(4))

    await act(async () => { await result.current.refetch() })
    expect(fetchPreferences).toHaveBeenCalledTimes(2)
    expect(result.current.isError).toBe(false)
    expect(result.current.value).toBe(4)
  })
})

describe('useUpdatePreference', () => {
  beforeEach(() => vi.clearAllMocks())

  it('con caché, escribe la clave guardada encima del resto', async () => {
    upsertPreference.mockResolvedValueOnce({ key: 'weight_unit', value: 'lb' })
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(QUERY_KEY, { weight_unit: 'kg', training_days_per_week: 4 })

    const { result } = renderHook(() => useUpdatePreference(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ key: 'weight_unit', value: 'lb' }) })

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual({ weight_unit: 'lb', training_days_per_week: 4 })
  })

  it('sin caché no escribe un objeto parcial: vuelve a pedir las preferencias enteras', async () => {
    upsertPreference.mockResolvedValueOnce({ key: 'last_gym_id', value: '3' })
    const { queryClient, wrapper } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdatePreference(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ key: 'last_gym_id', value: '3' }) })

    expect(queryClient.getQueryData(QUERY_KEY)).toBeUndefined()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY_KEY })
  })
})

describe('useUpdatePreference — cola y update optimista (issue #99)', () => {
  const showToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    initNotifications(showToast)
  })

  // Lo mismo que el botón de descanso: lee la lista de la caché y guarda la lista entera
  function renderRestWeeks(wrapper) {
    return renderHook(() => ({
      restWeeks: usePreference('training_rest_weeks').value,
      update: useUpdatePreference(),
    }), { wrapper })
  }

  function seed(queryClient, restWeeks) {
    queryClient.setQueryData(QUERY_KEY, { training_rest_weeks: restWeeks })
    fetchPreferences.mockResolvedValue([{ key: 'training_rest_weeks', value: restWeeks }])
  }

  it('cambia la caché al instante, antes de que responda el servidor', async () => {
    const { queryClient, wrapper } = setup()
    seed(queryClient, [])
    const request = deferred()
    upsertPreference.mockReturnValueOnce(request.promise)

    const { result } = renderRestWeeks(wrapper)
    act(() => { result.current.update.mutate({ key: 'training_rest_weeks', value: ['w1'] }) })

    await waitFor(() => expect(result.current.restWeeks).toEqual(['w1']))
    await act(async () => { request.resolve({ key: 'training_rest_weeks', value: ['w1'] }) })
  })

  it('dos toques seguidos con la primera en vuelo: la segunda sale después y lleva las dos semanas', async () => {
    const { queryClient, wrapper } = setup()
    seed(queryClient, [])
    const first = deferred()
    const second = deferred()
    upsertPreference.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = renderRestWeeks(wrapper)
    act(() => { result.current.update.mutate({ key: 'training_rest_weeks', value: [...result.current.restWeeks, 'w1'] }) })
    await waitFor(() => expect(result.current.restWeeks).toEqual(['w1']))
    act(() => { result.current.update.mutate({ key: 'training_rest_weeks', value: [...result.current.restWeeks, 'w2'] }) })
    await waitFor(() => expect(result.current.restWeeks).toEqual(['w1', 'w2']))

    // En cola: la segunda no llega al servidor hasta que responde la primera
    expect(upsertPreference).toHaveBeenCalledTimes(1)
    fetchPreferences.mockResolvedValue([{ key: 'training_rest_weeks', value: ['w1', 'w2'] }])
    await act(async () => { first.resolve({ key: 'training_rest_weeks', value: ['w1'] }) })
    await waitFor(() => expect(upsertPreference).toHaveBeenCalledTimes(2))
    expect(upsertPreference).toHaveBeenLastCalledWith({ userId: 'user-1', key: 'training_rest_weeks', value: ['w1', 'w2'] })
    // El éxito de la primera no pisa el optimista de la segunda
    expect(result.current.restWeeks).toEqual(['w1', 'w2'])

    await act(async () => { second.resolve({ key: 'training_rest_weeks', value: ['w1', 'w2'] }) })
    await waitFor(() => expect(result.current.update.isPending).toBe(false))
    expect(result.current.restWeeks).toEqual(['w1', 'w2'])
  })

  it('si falla, la caché vuelve al valor anterior y avisa con un toast', async () => {
    const { queryClient, wrapper } = setup()
    seed(queryClient, ['w0'])
    upsertPreference.mockRejectedValueOnce(new Error('network'))
    // La recarga final no responde: lo que se comprueba es el rollback, no lo que trae el servidor
    fetchPreferences.mockReturnValue(new Promise(() => {}))

    const { result } = renderRestWeeks(wrapper)
    await act(async () => {
      await result.current.update.mutateAsync({ key: 'training_rest_weeks', value: ['w0', 'w1'] }).catch(() => {})
    })

    expect(queryClient.getQueryData(QUERY_KEY).training_rest_weeks).toEqual(['w0'])
    expect(showToast).toHaveBeenCalledWith('No se ha podido guardar el cambio', 'error')
  })

  it('sin caché, si falla la escritura no intenta deshacer nada pero sí avisa y recarga', async () => {
    const { queryClient, wrapper } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    upsertPreference.mockRejectedValueOnce(new Error('network'))
    fetchPreferences.mockResolvedValue([{ key: 'training_rest_weeks', value: ['servidor'] }])

    const { result } = renderHook(() => useUpdatePreference(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ key: 'training_rest_weeks', value: ['w1'] }).catch(() => {})
    })

    expect(queryClient.getQueryData(QUERY_KEY)).toBeUndefined()
    expect(showToast).toHaveBeenCalledWith('No se ha podido guardar el cambio', 'error')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY_KEY })
  })

  it('si falla la primera con la segunda ya pintada, el rollback no pisa la segunda', async () => {
    const { queryClient, wrapper } = setup()
    seed(queryClient, [])
    const first = deferred()
    const second = deferred()
    upsertPreference.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = renderRestWeeks(wrapper)
    act(() => { result.current.update.mutate({ key: 'training_rest_weeks', value: ['w1'] }) })
    await waitFor(() => expect(result.current.restWeeks).toEqual(['w1']))
    act(() => { result.current.update.mutate({ key: 'training_rest_weeks', value: ['w1', 'w2'] }) })
    await waitFor(() => expect(result.current.restWeeks).toEqual(['w1', 'w2']))

    // Con la segunda aún en vuelo no hay recarga que tape un rollback equivocado
    await act(async () => { first.reject(new Error('network')) })
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1))
    expect(result.current.restWeeks).toEqual(['w1', 'w2'])

    fetchPreferences.mockResolvedValue([{ key: 'training_rest_weeks', value: ['w1', 'w2'] }])
    await act(async () => { second.resolve({}) })
  })

  it('si falla la última de la cola, deshace su lista aunque haya otra escritura antes', async () => {
    const { queryClient, wrapper } = setup()
    seed(queryClient, [])
    const first = deferred()
    const second = deferred()
    upsertPreference.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = renderRestWeeks(wrapper)
    act(() => { result.current.update.mutate({ key: 'training_rest_weeks', value: ['w1'] }) })
    await waitFor(() => expect(result.current.restWeeks).toEqual(['w1']))
    act(() => { result.current.update.mutate({ key: 'training_rest_weeks', value: ['w1', 'w2'] }) })
    await waitFor(() => expect(result.current.restWeeks).toEqual(['w1', 'w2']))

    fetchPreferences.mockReturnValue(new Promise(() => {}))
    await act(async () => { first.resolve({}) })
    await waitFor(() => expect(upsertPreference).toHaveBeenCalledTimes(2))
    await act(async () => { second.reject(new Error('network')) })

    await waitFor(() => expect(result.current.restWeeks).toEqual(['w1']))
  })

  it('al acabar la última escritura de la cola vuelve a pedir las preferencias al servidor', async () => {
    const { queryClient, wrapper } = setup()
    seed(queryClient, [])
    upsertPreference.mockRejectedValueOnce(new Error('network'))
    fetchPreferences.mockResolvedValue([{ key: 'training_rest_weeks', value: ['servidor'] }])

    const { result } = renderRestWeeks(wrapper)
    await act(async () => {
      await result.current.update.mutateAsync({ key: 'training_rest_weeks', value: ['w1'] }).catch(() => {})
    })

    await waitFor(() => expect(result.current.restWeeks).toEqual(['servidor']))
  })
})
