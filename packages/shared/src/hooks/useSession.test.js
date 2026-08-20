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
    setActiveSessionSynced: vi.fn(),
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
vi.mock('./useAuth.js', () => {
  const state = { userId: 'user-1' }
  return { useUserId: () => state.userId, _authState: state }
})
vi.mock('./usePreferences.js', () => ({ usePreference: () => ({ value: null }) }))
vi.mock('./useGyms.js', () => ({ useSetSelectedGym: () => vi.fn() }))
vi.mock('./useExercises.js', () => ({ useAllUserExerciseGymUnits: () => ({ data: [] }) }))

vi.mock('../notifications.js', () => {
  const show = vi.fn()
  return { getNotifier: () => ({ show }), initNotifications: vi.fn(), _notifierShow: show }
})

import { startWorkoutSession, fetchActiveSession } from '../api/workoutApi.js'
import * as notificationsMock from '../notifications.js'
import * as storesMock from './_stores.js'
import * as authMock from './useAuth.js'
import { useStartSession, useRestoreActiveSession } from './useSession.js'

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

// El servidor guarda el invariante (migración 058) y levanta `session_already_in_progress`.
// Este es el punto donde ese contrato se traduce a UI: si el token cambia y nadie lo nota,
// el aviso degrada al genérico sin que falle nada.
describe('useStartSession · rechazo por sesión ya en curso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock._authState.userId = 'user-1'
  })

  it('avisa con el mensaje específico y como info, no como error', async () => {
    startWorkoutSession.mockRejectedValue(new Error('session_already_in_progress'))
    const { result } = renderHook(() => useStartSession(), { wrapper: wrapper() })

    result.current.mutate({ gymId: null })

    await waitFor(() => expect(notificationsMock._notifierShow).toHaveBeenCalled())
    const [, level] = notificationsMock._notifierShow.mock.calls.at(-1)
    expect(level).toBe('info')
  })

  it('vuelve a sincronizar: si no, el aviso pide terminar algo que la UI dice que no existe', async () => {
    startWorkoutSession.mockRejectedValue(new Error('session_already_in_progress'))
    fetchActiveSession.mockResolvedValue(null)
    const { result } = renderHook(() => useStartSession(), { wrapper: wrapper() })

    result.current.mutate({ gymId: null })

    await waitFor(() => expect(fetchActiveSession).toHaveBeenCalled())
  })

  it('un fallo cualquiera sigue siendo error genérico y no re-sincroniza', async () => {
    startWorkoutSession.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useStartSession(), { wrapper: wrapper() })

    result.current.mutate({ gymId: null })

    await waitFor(() => expect(notificationsMock._notifierShow).toHaveBeenCalled())
    const [, level] = notificationsMock._notifierShow.mock.calls.at(-1)
    expect(level).toBe('error')
    expect(fetchActiveSession).not.toHaveBeenCalled()
  })
})

// Regresión con coste real: al meter la escritura de la bandera dentro del efecto, tenerlo
// colgado de la identidad de `onVisibilityChange` disparó 14 consultas por arranque en vez
// de 2. La suite pasaba igual, así que aquí se fija el NÚMERO de llamadas.
describe('useRestoreActiveSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock._authState.userId = 'user-1'
    fetchActiveSession.mockResolvedValue(null)
  })

  // Un suscriptor nuevo en cada render, como hacen los wrappers reales de web y native.
  const nuevoSuscriptor = () => ({ onVisibilityChange: () => () => {} })

  it('sincroniza una sola vez por montaje', async () => {
    renderHook(() => useRestoreActiveSession(nuevoSuscriptor()))
    await waitFor(() => expect(fetchActiveSession).toHaveBeenCalledTimes(1))
  })

  it('no vuelve a sincronizar aunque el suscriptor cambie de identidad en cada render', async () => {
    const { rerender } = renderHook(() => useRestoreActiveSession(nuevoSuscriptor()))
    await waitFor(() => expect(fetchActiveSession).toHaveBeenCalledTimes(1))

    rerender()
    rerender()
    rerender()

    expect(fetchActiveSession).toHaveBeenCalledTimes(1)
  })

  it('vuelve a sincronizar cuando cambia el usuario (el login)', async () => {
    const { rerender } = renderHook(() => useRestoreActiveSession(nuevoSuscriptor()))
    await waitFor(() => expect(fetchActiveSession).toHaveBeenCalledTimes(1))

    authMock._authState.userId = 'user-2'
    rerender()

    await waitFor(() => expect(fetchActiveSession).toHaveBeenCalledTimes(2))
  })

  it('sin usuario no consulta nada y deja la bandera en false', async () => {
    authMock._authState.userId = null
    renderHook(() => useRestoreActiveSession(nuevoSuscriptor()))

    await waitFor(() => expect(storesMock.useWorkoutStore._mockStore.setActiveSessionSynced)
      .toHaveBeenCalledWith(false))
    expect(fetchActiveSession).not.toHaveBeenCalled()
  })

  it('marca sincronizado incluso si la consulta falla: si no, los botones quedarían inertes sin red', async () => {
    fetchActiveSession.mockRejectedValue(new Error('sin red'))
    renderHook(() => useRestoreActiveSession(nuevoSuscriptor()))

    await waitFor(() => expect(storesMock.useWorkoutStore._mockStore.setActiveSessionSynced)
      .toHaveBeenCalledWith(true))
  })
})
