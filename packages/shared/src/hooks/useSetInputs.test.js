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
const PARAMS = { sessionExerciseId: 'ex-1', setNumber: 1, exerciseId: 10, trackedFields: ['weight', 'reps'] }

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

  it('serie NO completada: setSetType cachea el grupo preservando rir/notes, no llama a la API', () => {
    store.cachedSetData = { [KEY]: { rirActual: 2, notes: 'nota' } }
    const { result } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })

    act(() => { result.current.setSetType('dropset') })

    expect(result.current.setType).toBe('dropset')
    const calls = detailCacheCalls()
    // El grupo entero se cachea junto (preservación cruzada: rir/notes acompañan al setType)
    expect(calls[calls.length - 1]).toEqual(['ex-1', 1, expect.objectContaining({ setType: 'dropset', rirActual: 2, notes: 'nota' })])
    expect(workoutApi.updateSetDetails).not.toHaveBeenCalled()
  })

  it('serie COMPLETADA: setSetType persiste vía API preservando rir/notes, sin cachear', async () => {
    store.completedSets = { [KEY]: { rirActual: 2, notes: 'nota', setType: 'normal' } }
    const { result } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })

    act(() => { result.current.setSetType('dropset') })

    await waitFor(() => expect(workoutApi.updateSetDetails).toHaveBeenCalled())
    expect(workoutApi.updateSetDetails).toHaveBeenCalledWith(
      expect.objectContaining({ sessionExerciseId: 'ex-1', setNumber: 1, rirActual: 2, notes: 'nota', setType: 'dropset' })
    )
    expect(detailCacheCalls()).toHaveLength(0)
  })
})

describe('useSetInputs — re-siembra por conversión de unidad (cambio de gym)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.completedSets = {}
    store.cachedSetData = {}
    store.weightConversionNonce = 0
  })

  it('re-siembra el peso local cuando el store convierte y bumpea el nonce', async () => {
    store.completedSets = { [KEY]: { sessionExerciseId: 'ex-1', setNumber: 1, weight: 190 } }
    const { result, rerender } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })
    expect(result.current.weight).toBe(190)

    // Simula applyWeightConversions: el store cambia el peso y sube el nonce
    store.completedSets = { [KEY]: { sessionExerciseId: 'ex-1', setNumber: 1, weight: 86.18 } }
    store.weightConversionNonce = 1
    rerender()

    await waitFor(() => expect(result.current.weight).toBe(86.18))
  })

  it('no re-siembra en el montaje inicial (el nonce no ha cambiado)', () => {
    store.completedSets = { [KEY]: { sessionExerciseId: 'ex-1', setNumber: 1, weight: 190 } }
    store.weightConversionNonce = 5 // ya venía >0 (p. ej. conversión previa en la sesión)
    const { result } = renderHook(() => useSetInputs(PARAMS), { wrapper: wrapper() })
    expect(result.current.weight).toBe(190)
  })
})

describe('useSetInputs — prefill de la sesión anterior (sugerencia)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.completedSets = {}
    store.cachedSetData = {}
  })

  it('rellena el input vacío al montar desde previousSet', async () => {
    const { result } = renderHook(() => useSetInputs({ ...PARAMS, previousSet: { weight: 100 } }), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.weight).toBe(100))
  })

  it('re-prellena la serie no tocada cuando previousSet cambia, PASANDO por la fase de carga (undefined)', async () => {
    const { result, rerender } = renderHook((props) => useSetInputs(props), {
      wrapper: wrapper(),
      initialProps: { ...PARAMS, previousSet: { weight: 100 } },
    })
    await waitFor(() => expect(result.current.weight).toBe(100))

    // Cambio de gym real: el "Anterior" recarga (undefined) antes de llegar el del gym nuevo.
    // Sin conservar el último previousSet real a través del undefined, la detección fallaría.
    rerender({ ...PARAMS, previousSet: undefined })
    rerender({ ...PARAMS, previousSet: { weight: 45.36 } })
    await waitFor(() => expect(result.current.weight).toBe(45.36))
  })

  it('NO pisa lo que el usuario ya guardó (cachedData) aunque cambie previousSet', async () => {
    store.cachedSetData = { [KEY]: { weight: 80 } }
    const { result, rerender } = renderHook((props) => useSetInputs(props), {
      wrapper: wrapper(),
      initialProps: { ...PARAMS, previousSet: { weight: 100 } },
    })
    expect(result.current.weight).toBe(80)

    rerender({ ...PARAMS, previousSet: { weight: 45.36 } })
    // sigue siendo lo tecleado por el usuario, no la sugerencia del gym nuevo
    expect(result.current.weight).toBe(80)
  })
})

// Lo que el hook persiste lo decide `trackedFields`, no una lista fija: es el único punto donde
// eso se traduce a columnas, así que hace falta al menos un caso con campos distintos del default.
describe('useSetInputs — los campos del ejercicio deciden qué se valida y qué se guarda', () => {
  const BIKE = { ...PARAMS, trackedFields: ['level', 'distance', 'time'] }

  beforeEach(() => {
    vi.clearAllMocks()
    store.completedSets = {}
    store.cachedSetData = {}
  })

  it('isValid exige los tres campos de la bici, no peso y reps', () => {
    const { result } = renderHook(() => useSetInputs(BIKE), { wrapper: wrapper() })

    act(() => { result.current.setWeight('80'); result.current.setReps('10') })
    expect(result.current.isValid()).toBe(false)

    act(() => { result.current.setLevel('12'); result.current.setDistance('5000'); result.current.setTime('1200') })
    expect(result.current.isValid()).toBe(true)
  })

  it('cachea nivel, distancia y tiempo, y NO manda peso ni reps', async () => {
    const { result } = renderHook(() => useSetInputs(BIKE), { wrapper: wrapper() })

    act(() => { result.current.setLevel('12'); result.current.setDistance('5000'); result.current.setTime('1200') })
    await waitFor(() => expect(store.setCachedSetData).toHaveBeenCalled())

    const cached = store.setCachedSetData.mock.calls.at(-1)[2]
    expect(cached).toMatchObject({ level: 12, distanceMeters: 5000, timeSeconds: 1200 })
    // Las columnas ausentes del payload no se tocan en el upsert: un peso viejo seguiría intacto
    expect(cached).not.toHaveProperty('weight')
    expect(cached).not.toHaveProperty('repsCompleted')
  })

  it('lee del store solo los campos del ejercicio', () => {
    store.completedSets = { [KEY]: { level: 8, distanceMeters: 4000, timeSeconds: 900, weight: 999 } }
    const { result } = renderHook(() => useSetInputs(BIKE), { wrapper: wrapper() })
    expect(result.current.level).toBe(8)
    expect(result.current.distance).toBe(4000)
    expect(result.current.time).toBe(900)
  })
})
