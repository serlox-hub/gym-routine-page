import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Store mutable: mutar sus campos + rerender() simula la reactividad de zustand.
const mockStore = {
  sessionId: 'session-1',
  gymId: 'gym-1',
  completedSets: {},
}

vi.mock('./_stores.js', () => ({
  useWorkoutStore: vi.fn((selector) => (selector ? selector(mockStore) : mockStore)),
}))

const fetchExerciseBests = vi.fn()
vi.mock('../api/exerciseStatsApi.js', () => ({
  fetchExerciseBests: (...args) => fetchExerciseBests(...args),
}))

vi.mock('../api/exerciseApi.js', () => ({
  fetchUserExerciseOverride: vi.fn().mockResolvedValue(null),
}))

// Catálogo de la sesión (un ejercicio weight_reps).
const mockSessionExercises = {
  data: [{ id: 'se1', exercise_id: 101, exercise: { measurement_type: 'weight_reps', name: 'Press Banca' } }],
}
vi.mock('./useSessionExercises.js', () => ({
  useSessionExercises: () => mockSessionExercises,
}))

vi.mock('./useAuth.js', () => ({ useUserId: () => 'user-1' }))

const onPRDetected = vi.fn()
vi.mock('../haptics.js', () => ({ getHaptics: () => ({ onPRDetected }) }))

import { useSessionPRDetection } from './usePersonalRecords.js'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

function completed(setNumber, weight, reps) {
  return { sessionExerciseId: 'se1', setNumber, weight, repsCompleted: reps }
}

describe('useSessionPRDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.sessionId = 'session-1'
    mockStore.gymId = 'gym-1'
    mockStore.completedSets = {}
    mockSessionExercises.data = [
      { id: 'se1', exercise_id: 101, exercise: { measurement_type: 'weight_reps', name: 'Press Banca' } },
    ]
  })

  it('sesión restaurada con un PR: muestra trofeo pero NO celebra (baseline silencioso)', async () => {
    mockStore.completedSets = { 'se1-1': completed(1, 110, 5) }
    fetchExerciseBests.mockResolvedValue({ 101: { bestWeight: 100, best1rm: 120 } })

    const { result } = renderHook(() => useSessionPRDetection(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.prSets.has('se1-1')).toBe(true))
    expect(result.current.prNotification).toBeNull()
    expect(onPRDetected).not.toHaveBeenCalled()
  })

  it('editar una serie hasta batir el récord enciende trofeo Y dispara el toast', async () => {
    mockStore.completedSets = { 'se1-1': completed(1, 90, 5) } // 90 < 100 → no es PR
    fetchExerciseBests.mockResolvedValue({ 101: { bestWeight: 100, best1rm: 120 } })

    const { result, rerender } = renderHook(() => useSessionPRDetection(), { wrapper: createWrapper() })

    await waitFor(() => expect(fetchExerciseBests).toHaveBeenCalled())
    expect(result.current.prSets.size).toBe(0)
    expect(result.current.prNotification).toBeNull()

    // Edición hacia arriba: 115 > 100 → ahora es PR
    mockStore.completedSets = { 'se1-1': completed(1, 115, 5) }
    rerender()

    await waitFor(() => expect(result.current.prNotification).not.toBeNull())
    expect(result.current.prSets.has('se1-1')).toBe(true)
    expect(result.current.prNotification.exerciseName).toBe('Press Banca')
    expect(onPRDetected).toHaveBeenCalled()
  })

  it('un fallo de red NO se cachea: reintenta en el siguiente recálculo', async () => {
    fetchExerciseBests
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ 101: { bestWeight: 100, best1rm: 120 } })
    mockStore.completedSets = { 'se1-1': completed(1, 110, 5) }

    const { result, rerender } = renderHook(() => useSessionPRDetection(), { wrapper: createWrapper() })

    // Primer pase falla → sin trofeo (tratado como 'none'), pero el fallo no queda cacheado
    await waitFor(() => expect(fetchExerciseBests).toHaveBeenCalledTimes(1))
    expect(result.current.prSets.size).toBe(0)

    // Nuevo recálculo → reintenta el fetch (no sirve un 'none' cacheado) → ahora sí detecta
    mockStore.completedSets = { 'se1-1': completed(1, 110, 5), 'se1-2': completed(2, 112, 5) }
    rerender()

    await waitFor(() => expect(result.current.prSets.size).toBeGreaterThan(0))
    expect(fetchExerciseBests.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('restaurar sesión con varios ejercicios: un único fetch en lote (no N en serie)', async () => {
    mockSessionExercises.data = [
      { id: 'se1', exercise_id: 101, exercise: { measurement_type: 'weight_reps', name: 'Press Banca' } },
      { id: 'se2', exercise_id: 102, exercise: { measurement_type: 'weight_reps', name: 'Sentadilla' } },
    ]
    mockStore.completedSets = {
      'se1-1': completed(1, 110, 5),
      'se2-1': { sessionExerciseId: 'se2', setNumber: 1, weight: 130, repsCompleted: 5 },
    }
    fetchExerciseBests.mockResolvedValue({
      101: { bestWeight: 100, best1rm: 120 },
      102: { bestWeight: 120, best1rm: 140 },
    })

    const { result } = renderHook(() => useSessionPRDetection(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.prSets.has('se1-1')).toBe(true))
    expect(result.current.prSets.has('se2-1')).toBe(true)
    // Una sola petición para ambos ejercicios (no una por ejercicio en serie).
    expect(fetchExerciseBests).toHaveBeenCalledTimes(1)
    expect(fetchExerciseBests.mock.calls[0][0].sort()).toEqual([101, 102])
    expect(fetchExerciseBests.mock.calls[0][1]).toEqual({ gymId: 'gym-1' })
  })

  it('cache parcial: al añadir un ejercicio en vivo solo pide el faltante (no re-pide el cacheado)', async () => {
    mockSessionExercises.data = [
      { id: 'se1', exercise_id: 101, exercise: { measurement_type: 'weight_reps', name: 'Press Banca' } },
      { id: 'se2', exercise_id: 102, exercise: { measurement_type: 'weight_reps', name: 'Sentadilla' } },
    ]
    mockStore.completedSets = { 'se1-1': completed(1, 110, 5) }
    fetchExerciseBests.mockResolvedValue({
      101: { bestWeight: 100, best1rm: 120 },
      102: { bestWeight: 120, best1rm: 140 },
    })

    const { result, rerender } = renderHook(() => useSessionPRDetection(), { wrapper: createWrapper() })

    // Primer pase: solo se1 tiene serie → lote con [101]
    await waitFor(() => expect(result.current.prSets.has('se1-1')).toBe(true))
    expect(fetchExerciseBests).toHaveBeenCalledTimes(1)
    expect(fetchExerciseBests.mock.calls[0][0]).toEqual([101])

    // En vivo se completa una serie de se2: prewarm debe pedir SOLO [102] (101 ya cacheado)
    mockStore.completedSets = {
      'se1-1': completed(1, 110, 5),
      'se2-1': { sessionExerciseId: 'se2', setNumber: 1, weight: 130, repsCompleted: 5 },
    }
    rerender()

    await waitFor(() => expect(result.current.prSets.has('se2-1')).toBe(true))
    expect(fetchExerciseBests).toHaveBeenCalledTimes(2)
    expect(fetchExerciseBests.mock.calls[1][0]).toEqual([102])
  })

  it('cambiar de gimnasio invalida el cache (refetch) y no dispara toast', async () => {
    mockStore.completedSets = { 'se1-1': completed(1, 110, 5) }
    fetchExerciseBests.mockResolvedValue({ 101: { bestWeight: 100, best1rm: 120 } })

    const { result, rerender } = renderHook(() => useSessionPRDetection(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.prSets.has('se1-1')).toBe(true))
    const callsBeforeGymChange = fetchExerciseBests.mock.calls.length

    mockStore.gymId = 'gym-2'
    rerender()

    // Se refetchean los bests contra el nuevo gym (cache limpiado por el reset)
    await waitFor(() => expect(fetchExerciseBests.mock.calls.length).toBeGreaterThan(callsBeforeGymChange))
    expect(fetchExerciseBests.mock.calls.at(-1)[1]).toEqual({ gymId: 'gym-2' })
    // Re-siembra baseline en silencio: sin celebración por series ya hechas
    expect(result.current.prNotification).toBeNull()
    expect(onPRDetected).not.toHaveBeenCalled()
  })
})
