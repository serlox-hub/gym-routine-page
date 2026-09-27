import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('../api/trainingGoalsApi.js', () => ({ fetchCompletedSessionDates: vi.fn() }))
vi.mock('./useAuth.js', () => ({ useUserId: () => 'user-1' }))
vi.mock('./usePreferences.js', () => {
  const prefs = {}
  const state = { loading: false, error: false }
  const mutate = vi.fn()
  const refetch = vi.fn()
  return {
    usePreference: (key) => ({ value: prefs[key] ?? null, isLoading: state.loading, isError: state.error, refetch }),
    useUpdatePreference: () => ({ mutate }),
    _prefs: prefs,
    _state: state,
    _mutate: mutate,
    _refetch: refetch,
  }
})

import { fetchCompletedSessionDates } from '../api/trainingGoalsApi.js'
import * as prefsMock from './usePreferences.js'
import { useTrainingGoal, useViewedTrainingCycle } from './useTrainingGoals.js'

const SESSIONS = [{ id: 1, completed_at: '2026-09-21T10:00:00Z', duration_minutes: 60 }]

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTrainingGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(prefsMock._prefs)) delete prefsMock._prefs[key]
    prefsMock._state.loading = false
    prefsMock._state.error = false
    prefsMock._state.fetching = false
    fetchCompletedSessionDates.mockResolvedValue(SESSIONS)
  })

  it('sin objetivo configurado sigue devolviendo las sesiones para la gráfica', async () => {
    prefsMock._prefs.week_start_day = 'sunday'

    const { result } = renderHook(() => useTrainingGoal(), { wrapper: wrapper() })
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isConfigured).toBe(false)
    expect(result.current.weekStartDay).toBe('sunday')
    expect(result.current.streak).toBeUndefined()
    expect(fetchCompletedSessionDates).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }))
  })

  it('sin objetivo ni inicio de semana usa lunes por defecto', async () => {
    const { result } = renderHook(() => useTrainingGoal(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS))
    expect(result.current.weekStartDay).toBe('monday')
  })

  it('con objetivo configurado devuelve también la racha', async () => {
    prefsMock._prefs.training_days_per_week = 3

    const { result } = renderHook(() => useTrainingGoal(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS))
    expect(result.current.isConfigured).toBe(true)
    expect(result.current.daysPerCycle).toBe(3)
    expect(typeof result.current.streak).toBe('number')
  })

  it('sigue cargando mientras no llegan las preferencias, aunque las sesiones ya estén', async () => {
    prefsMock._state.loading = true

    const { result } = renderHook(() => useTrainingGoal(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS))
    expect(result.current.isLoading).toBe(true)
  })

  // Issue #98: un fallo de red no se puede pintar como "sin objetivo" ni como "sin sesiones".
  it('con error en preferencias no decide si hay objetivo, pero sigue dando las sesiones', async () => {
    prefsMock._state.error = true

    const { result } = renderHook(() => useTrainingGoal(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS))
    expect(result.current.isConfigured).toBeNull()
    expect(result.current.preferencesError).toBe(true)
    expect(result.current.sessionsError).toBe(false)
    expect(result.current.streak).toBeUndefined()

    result.current.retry()
    expect(prefsMock._refetch).toHaveBeenCalled()
    // Las sesiones no fallaron: reintentar no las vuelve a pedir.
    expect(fetchCompletedSessionDates).toHaveBeenCalledTimes(1)
  })

  it('con error en sesiones lo expone, y reintentar vuelve a pedirlas', async () => {
    prefsMock._prefs.training_days_per_week = 3
    fetchCompletedSessionDates.mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => useTrainingGoal(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.sessionsError).toBe(true))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isConfigured).toBe(true)
    expect(result.current.preferencesError).toBe(false)

    result.current.retry()
    await waitFor(() => expect(result.current.sessionsError).toBe(false))
    expect(result.current.sessions).toEqual(SESSIONS)
    expect(fetchCompletedSessionDates).toHaveBeenCalledTimes(2)
    expect(prefsMock._refetch).not.toHaveBeenCalled()
  })

  // El feedback de «Reintentar»: sin datos, TanStack v5 vuelve la query a `pending` al reintentar,
  // así que la tarjeta pinta su skeleton en vez de quedarse igual.
  it('mientras reintenta las sesiones, vuelve a estar cargando y ya no en error', async () => {
    prefsMock._prefs.training_days_per_week = 3
    fetchCompletedSessionDates.mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => useTrainingGoal(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.sessionsError).toBe(true))

    let resolve
    fetchCompletedSessionDates.mockReturnValueOnce(new Promise(r => { resolve = r }))
    result.current.retry()

    await waitFor(() => expect(result.current.isLoading).toBe(true))
    expect(result.current.sessionsError).toBe(false)

    resolve(SESSIONS)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.sessions).toEqual(SESSIONS)
  })

  it('si ya hay sesiones en caché, un refresco fallido no cuenta como error', async () => {
    prefsMock._prefs.training_days_per_week = 3
    fetchCompletedSessionDates.mockResolvedValueOnce(SESSIONS).mockRejectedValueOnce(new Error('network'))

    const { result } = renderHook(() => useTrainingGoal(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS))

    await result.current.refetchSessions()
    await waitFor(() => expect(fetchCompletedSessionDates).toHaveBeenCalledTimes(2))
    expect(result.current.sessionsError).toBe(false)
    expect(result.current.sessions).toEqual(SESSIONS)
  })
})

describe('useViewedTrainingCycle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marcar descanso añade el ciclo visto a los que ya había', () => {
    const goal = { sessions: [], restCycles: ['2020-01-06'], daysPerCycle: 3, weekStartDay: 'monday' }

    const { result } = renderHook(() => useViewedTrainingCycle(goal, 0))
    result.current.toggleViewedRest()

    expect(prefsMock._mutate).toHaveBeenCalledWith({
      key: 'training_rest_weeks',
      value: ['2020-01-06', result.current.cycleKey],
    })
  })

  it('desmarcar descanso quita solo el ciclo visto', () => {
    const base = { sessions: [], restCycles: [], daysPerCycle: 3, weekStartDay: 'monday' }
    const { result: probe } = renderHook(() => useViewedTrainingCycle(base, -1))
    const viewedKey = probe.current.cycleKey
    const goal = { ...base, restCycles: ['2020-01-06', viewedKey] }

    const { result } = renderHook(() => useViewedTrainingCycle(goal, -1))
    expect(result.current.isRest).toBe(true)
    result.current.toggleViewedRest()

    expect(prefsMock._mutate).toHaveBeenLastCalledWith({ key: 'training_rest_weeks', value: ['2020-01-06'] })
  })
})
