import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('../api/preferencesApi.js', () => ({ fetchPreferences: vi.fn(), upsertPreference: vi.fn() }))
vi.mock('./useAuth.js', () => ({ useUserId: () => 'user-1' }))

import { fetchPreferences, upsertPreference } from '../api/preferencesApi.js'
import { usePreference, useUpdatePreference } from './usePreferences.js'
import { QUERY_KEYS } from '../lib/constants.js'

const QUERY_KEY = [QUERY_KEYS.USER_PREFERENCES, 'user-1']

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
