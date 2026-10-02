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
  fetchLastSetPerformedAt: vi.fn(),
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
vi.mock('./usePreferences.js', () => {
  const state = { weightUnit: null }
  return {
    usePreference: (key) => ({ value: key === 'weight_unit' ? state.weightUnit : null }),
    _prefState: state,
  }
})
vi.mock('./useGyms.js', () => ({ useSetSelectedGym: () => vi.fn() }))
vi.mock('./useExercises.js', () => {
  const state = { rows: [] }
  return { useAllUserExerciseGymUnits: () => ({ data: state.rows }), _gymUnitsState: state }
})

vi.mock('../notifications.js', () => {
  const show = vi.fn()
  return { getNotifier: () => ({ show }), initNotifications: vi.fn(), _notifierShow: show }
})

import { startWorkoutSession, fetchActiveSession, fetchExerciseIdsWithSets, completeWorkoutSession, fetchLastSetPerformedAt } from '../api/workoutApi.js'
import { fetchSessionExercises } from '../api/sessionExercisesApi.js'
import * as notificationsMock from '../notifications.js'
import * as storesMock from './_stores.js'
import * as authMock from './useAuth.js'
import * as preferencesMock from './usePreferences.js'
import * as exercisesMock from './useExercises.js'
import { useStartSession, useRestoreActiveSession, useEndSession, useLastSetAt, useSessionWeightUnitByExercise } from './useSession.js'

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

describe('useEndSession', () => {
  const startedAt = '2026-01-01T10:00:00.000Z'

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(storesMock.useWorkoutStore._mockStore, { sessionId: 's-1', startedAt, gymId: null, completedSets: {} })
    fetchExerciseIdsWithSets.mockResolvedValue([])
    fetchSessionExercises.mockResolvedValue([])
    completeWorkoutSession.mockResolvedValue({ id: 's-1' })
  })

  it('cierra a la hora elegida y calcula la duración desde el inicio', async () => {
    const { result } = renderHook(() => useEndSession(), { wrapper: wrapper() })
    result.current.mutate({ overallFeeling: null, notes: null, completedAt: '2026-01-01T11:30:00.000Z' })

    await waitFor(() => expect(completeWorkoutSession).toHaveBeenCalled())
    expect(completeWorkoutSession).toHaveBeenCalledWith(expect.objectContaining({
      completedAt: '2026-01-01T11:30:00.000Z',
      durationMinutes: 90,
    }))
  })

  it('sin completedAt cierra ahora', async () => {
    const before = Date.now()
    storesMock.useWorkoutStore._mockStore.startedAt = new Date(before - 3600000).toISOString()
    const { result } = renderHook(() => useEndSession(), { wrapper: wrapper() })
    result.current.mutate({ overallFeeling: null, notes: null })

    await waitFor(() => expect(completeWorkoutSession).toHaveBeenCalled())
    const { completedAt } = completeWorkoutSession.mock.calls[0][0]
    expect(new Date(completedAt).getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(new Date(completedAt).getTime()).toBeLessThanOrEqual(Date.now())
  })
})

describe('useLastSetAt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(storesMock.useWorkoutStore._mockStore, {
      sessionId: 's-1',
      completedSets: { 'a-1': { completedAt: '2026-01-01T10:30:00.000Z' } },
    })
  })

  it('se queda con la más reciente entre servidor y store', async () => {
    fetchLastSetPerformedAt.mockResolvedValue('2026-01-01T11:00:00+00:00')
    const { result } = renderHook(() => useLastSetAt(), { wrapper: wrapper() })

    expect(result.current.isResolved).toBe(false)
    await waitFor(() => expect(result.current.isResolved).toBe(true))
    expect(result.current.lastSetAt).toBe('2026-01-01T11:00:00.000Z')
  })

  it('si el servidor falla se resuelve con el dato local', async () => {
    fetchLastSetPerformedAt.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useLastSetAt(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isResolved).toBe(true))
    expect(result.current.lastSetAt).toBe('2026-01-01T10:30:00.000Z')
  })

  // Al reabrir el modal la caché trae la respuesta anterior: no vale como resuelta mientras se repregunta
  it('no se da por resuelto mientras vuelve a preguntar con datos en caché', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const localWrapper = ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
    fetchLastSetPerformedAt.mockResolvedValueOnce('2026-01-01T11:00:00+00:00')
    const { result } = renderHook(() => useLastSetAt(), { wrapper: localWrapper })
    await waitFor(() => expect(result.current.isResolved).toBe(true))

    let resolveSecond
    fetchLastSetPerformedAt.mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve }))
    queryClient.invalidateQueries()
    await waitFor(() => expect(result.current.isResolved).toBe(false))

    resolveSecond('2026-01-01T12:00:00+00:00')
    await waitFor(() => expect(result.current.isResolved).toBe(true))
    expect(result.current.lastSetAt).toBe('2026-01-01T12:00:00.000Z')
  })

  it('deshabilitado no pregunta al servidor', () => {
    renderHook(() => useLastSetAt({ enabled: false }), { wrapper: wrapper() })
    expect(fetchLastSetPerformedAt).not.toHaveBeenCalled()
  })
})

// Issue #125: el resumen de fin de sesión etiqueta los PR con la unidad del ejercicio en el gym de
// la sesión, no con la preferencia global. Aquí se fija de dónde sale cada eslabón de esa cadena.
describe('useSessionWeightUnitByExercise', () => {
  const sessionExercises = [{ exercise_id: 1 }, { exercise_id: 2 }]

  beforeEach(() => {
    storesMock.useWorkoutStore._mockStore.gymId = 7
    preferencesMock._prefState.weightUnit = null
    exercisesMock._gymUnitsState.rows = []
  })

  it('sin override en el gym todos los ejercicios heredan la preferencia global', () => {
    preferencesMock._prefState.weightUnit = 'lb'
    const { result } = renderHook(() => useSessionWeightUnitByExercise(sessionExercises))
    expect(result.current).toEqual({ 1: 'lb', 2: 'lb' })
  })

  it('sin preferencia ni override cae a kg', () => {
    const { result } = renderHook(() => useSessionWeightUnitByExercise(sessionExercises))
    expect(result.current).toEqual({ 1: 'kg', 2: 'kg' })
  })

  it('el override del ejercicio en el gym de la sesión gana a la global, solo para ese ejercicio', () => {
    preferencesMock._prefState.weightUnit = 'kg'
    exercisesMock._gymUnitsState.rows = [{ exercise_id: 1, gym_id: 7, weight_unit: 'lb' }]
    const { result } = renderHook(() => useSessionWeightUnitByExercise(sessionExercises))
    expect(result.current).toEqual({ 1: 'lb', 2: 'kg' })
  })

  it('ignora los overrides de otros gyms (el peso nunca se mezcla entre gyms)', () => {
    preferencesMock._prefState.weightUnit = 'kg'
    exercisesMock._gymUnitsState.rows = [{ exercise_id: 1, gym_id: 99, weight_unit: 'lb' }]
    const { result } = renderHook(() => useSessionWeightUnitByExercise(sessionExercises))
    expect(result.current).toEqual({ 1: 'kg', 2: 'kg' })
  })

  it('compara el gym como texto: gym_id numérico en la fila y gymId en string en el store', () => {
    storesMock.useWorkoutStore._mockStore.gymId = '7'
    exercisesMock._gymUnitsState.rows = [{ exercise_id: 1, gym_id: 7, weight_unit: 'lb' }]
    const { result } = renderHook(() => useSessionWeightUnitByExercise(sessionExercises))
    expect(result.current[1]).toBe('lb')
  })

  it('sesión sin gym: solo cuenta la global, los overrides de gyms concretos no se cuelan', () => {
    storesMock.useWorkoutStore._mockStore.gymId = null
    preferencesMock._prefState.weightUnit = 'lb'
    exercisesMock._gymUnitsState.rows = [{ exercise_id: 1, gym_id: 7, weight_unit: 'kg' }]
    const { result } = renderHook(() => useSessionWeightUnitByExercise(sessionExercises))
    expect(result.current).toEqual({ 1: 'lb', 2: 'lb' })
  })

  it('sin ejercicios de sesión (aún no cargados) devuelve un mapa vacío', () => {
    expect(renderHook(() => useSessionWeightUnitByExercise(undefined)).result.current).toEqual({})
    expect(renderHook(() => useSessionWeightUnitByExercise([])).result.current).toEqual({})
  })

  it('mantiene la misma referencia mientras no cambian las entradas, y la renueva cuando cambia la global', () => {
    preferencesMock._prefState.weightUnit = 'kg'
    const { result, rerender } = renderHook(() => useSessionWeightUnitByExercise(sessionExercises))
    const first = result.current

    rerender()
    expect(result.current).toBe(first)

    preferencesMock._prefState.weightUnit = 'lb'
    rerender()
    expect(result.current).not.toBe(first)
    expect(result.current).toEqual({ 1: 'lb', 2: 'lb' })
  })
})
