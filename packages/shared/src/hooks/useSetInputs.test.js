import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Store mockeado y mutable: cada test fija completedSets/cachedSetData antes de renderizar.
vi.mock('./_stores.js', () => {
  const mockStore = {
    sessionId: 'session-123',
    completedSets: {},
    cachedSetData: {},
    setCachedSetData: vi.fn(),
    updateCompletedSetValues: vi.fn(),
    updateSetDetails: vi.fn(),
    updateSetDbId: vi.fn(),
    addPendingSet: vi.fn(),
    removePendingSet: vi.fn(),
  }
  const useWorkoutStore = vi.fn((selector) => (selector ? selector(mockStore) : mockStore))
  useWorkoutStore._mockStore = mockStore
  const getWorkoutStore = vi.fn(() => ({ getState: () => mockStore }))
  return { useWorkoutStore, getWorkoutStore }
})

vi.mock('../api/workoutApi.js', () => ({
  upsertCompletedSet: vi.fn().mockResolvedValue({ id: 'db-1' }),
  updateSetVideo: vi.fn().mockResolvedValue({}),
  updateSetDetails: vi.fn().mockResolvedValue({}),
  deleteCompletedSet: vi.fn().mockResolvedValue({}),
}))

import { useSetInputs } from './useSetInputs.js'
import { useWorkoutStore } from './_stores.js'
import * as workoutApi from '../api/workoutApi.js'

const store = useWorkoutStore._mockStore
const KEY = 'ex-1-1'
const PARAMS = { sessionExerciseId: 'ex-1', setNumber: 1, exerciseId: 10, measurementType: 'weight_reps' }

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Solo las llamadas a setCachedSetData que tocan detalles (llevan rirActual), no las de medición.
function detailCacheCalls() {
  return store.setCachedSetData.mock.calls.filter(c => c[2] && Object.prototype.hasOwnProperty.call(c[2], 'rirActual'))
}

describe('useSetInputs — grupo de detalles (rir/notes/setType)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.completedSets = {}
    store.cachedSetData = {}
  })

  it('inicializa rir con `??` (0 y -1 no se pisan como si fueran vacíos)', () => {
    store.cachedSetData = { [KEY]: { rirActual: 0 } }
    const { result } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })
    expect(result.current.rir).toBe(0)

    store.completedSets = { [KEY]: { rirActual: -1 } }
    store.cachedSetData = {}
    const { result: r2 } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })
    expect(r2.current.rir).toBe(-1)
  })

  it('inicializa notes/setType desde la caché o los datos completados', () => {
    store.completedSets = { [KEY]: { notes: 'buena técnica', setType: 'dropset' } }
    const { result } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })
    expect(result.current.notes).toBe('buena técnica')
    expect(result.current.setType).toBe('dropset')
  })

  it('serie NO completada: setRir cachea el grupo (merge en el store), no llama a la API', () => {
    const { result } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })
    act(() => { result.current.setRir(2) })

    expect(result.current.rir).toBe(2)
    const calls = detailCacheCalls()
    expect(calls.length).toBeGreaterThanOrEqual(1)
    // El grupo entero se cachea junto (preservación cruzada: notes/setType acompañan al rir)
    expect(calls[calls.length - 1]).toEqual(['ex-1', 1, expect.objectContaining({ rirActual: 2, notes: null, setType: 'normal' })])
    expect(workoutApi.updateSetDetails).not.toHaveBeenCalled()
  })

  it('serie COMPLETADA: setRir persiste vía API preservando notes/setType, sin cachear', async () => {
    store.completedSets = { [KEY]: { rirActual: null, notes: 'nota', setType: 'dropset' } }
    const { result } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })

    act(() => { result.current.setRir(3) })

    await waitFor(() => expect(workoutApi.updateSetDetails).toHaveBeenCalled())
    expect(workoutApi.updateSetDetails).toHaveBeenCalledWith(
      expect.objectContaining({ sessionExerciseId: 'ex-1', setNumber: 1, rirActual: 3, notes: 'nota', setType: 'dropset' })
    )
    expect(detailCacheCalls()).toHaveLength(0)
  })

  it('saveDetails preserva el RIR ya fijado al guardar notas/tipo', () => {
    store.cachedSetData = { [KEY]: { rirActual: 2 } }
    const { result } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })

    act(() => { result.current.saveDetails({ notes: 'hola', setType: 'dropset' }) })

    const calls = detailCacheCalls()
    expect(calls[calls.length - 1]).toEqual(
      ['ex-1', 1, expect.objectContaining({ rirActual: 2, notes: 'hola', setType: 'dropset' })]
    )
  })
})
