import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('./_stores.js', () => {
  const mockWorkoutStore = {
    sessionId: null,
    startSession: vi.fn(),
    endSession: vi.fn(),
    restoreSession: vi.fn(),
  }
  const useWorkoutStore = vi.fn((selector) => (selector ? selector(mockWorkoutStore) : mockWorkoutStore))
  useWorkoutStore._mockStore = mockWorkoutStore
  const getWorkoutStore = vi.fn(() => ({ getState: () => mockWorkoutStore }))
  return { useWorkoutStore, getWorkoutStore, useAuthStore: vi.fn() }
})

vi.mock('../api/workoutApi.js', () => ({
  fetchActiveSession: vi.fn(),
  fetchCompletedSetsForSession: vi.fn(),
  startWorkoutSession: vi.fn(),
  fetchExerciseIdsWithSets: vi.fn(),
  deleteSessionExercisesWithoutSets: vi.fn(),
  completeWorkoutSession: vi.fn(),
  deleteWorkoutSession: vi.fn(),
}))

vi.mock('../api/exerciseStatsApi.js', () => ({
  fetchExerciseBests: vi.fn(),
  upsertExerciseSessionStats: vi.fn(),
}))

vi.mock('../api/sessionExercisesApi.js', () => ({ fetchSessionExercises: vi.fn() }))
vi.mock('../api/gymsApi.js', () => ({ changeSessionGym: vi.fn() }))
vi.mock('./useAuth.js', () => ({ useUserId: () => 'user-1' }))
vi.mock('./usePreferences.js', () => ({ usePreference: () => ({ value: null }) }))
vi.mock('./useGyms.js', () => ({ useSetSelectedGym: () => vi.fn() }))
vi.mock('./useExercises.js', () => ({ useAllUserExerciseGymUnits: () => ({ data: [] }) }))

vi.mock('../notifications.js', () => {
  const show = vi.fn()
  return { getNotifier: () => ({ show }), initNotifications: vi.fn(), _notifierShow: show }
})

import { startWorkoutSession } from '../api/workoutApi.js'
import * as notificationsMock from '../notifications.js'
import { useStartSession } from './useSession.js'

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useStartSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // La navegación cuelga de onSuccess, así que un fallo sin aviso deja la pantalla igual y parece
  // que el botón no hace nada. Pasó de verdad: con la BD local recién reseteada, el insert de
  // `workout_sessions` fallaba por FK y "Entrenamiento libre" no daba señal de vida.
  it('avisa cuando el arranque falla', async () => {
    startWorkoutSession.mockRejectedValue(new Error('violates foreign key constraint'))
    const { result } = renderHook(() => useStartSession(), { wrapper: wrapper() })

    result.current.mutate({ gymId: null })

    await waitFor(() => expect(notificationsMock._notifierShow).toHaveBeenCalled())
    const [message, level] = notificationsMock._notifierShow.mock.calls.at(-1)
    expect(message).toBeTruthy()
    expect(level).toBe('error')
  })

  it('el aviso no impide la limpieza propia de la plataforma (onStartError)', async () => {
    startWorkoutSession.mockRejectedValue(new Error('boom'))
    const onStartError = vi.fn()
    const { result } = renderHook(() => useStartSession({ onStartError }), { wrapper: wrapper() })

    result.current.mutate({ gymId: null })

    await waitFor(() => expect(onStartError).toHaveBeenCalledTimes(1))
    expect(notificationsMock._notifierShow).toHaveBeenCalled()
  })

  it('no avisa cuando el arranque va bien', async () => {
    startWorkoutSession.mockResolvedValue({ id: 'session-1', gym_id: null, session_exercises: [] })
    const { result } = renderHook(() => useStartSession(), { wrapper: wrapper() })

    result.current.mutate({ gymId: null })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(notificationsMock._notifierShow).not.toHaveBeenCalled()
  })
})
