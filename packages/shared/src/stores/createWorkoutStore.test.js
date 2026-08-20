import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { createJSONStorage } from 'zustand/middleware'
import { createWorkoutStore } from './createWorkoutStore.js'

// Storage en memoria aislado por test (evita compartir el localStorage de jsdom bajo el
// mismo `name` entre instancias). `raw` expone el JSON serializado para asertar el round-trip.
function makeMemStorage() {
  const raw = new Map()
  const stringStore = {
    getItem: (k) => (raw.has(k) ? raw.get(k) : null),
    setItem: (k, v) => { raw.set(k, v) },
    removeItem: (k) => { raw.delete(k) },
  }
  return { storage: createJSONStorage(() => stringStore), raw }
}

let useWorkoutStore

describe('createWorkoutStore', () => {
  beforeEach(() => {
    useWorkoutStore = createWorkoutStore()
    // Reset store state before each test
    act(() => {
      useWorkoutStore.setState({
        sessionId: null,
        routineDayId: null,
        startedAt: null,
        completedSets: {},
        cachedSetData: {},
        restTimerActive: false,
        restTimeRemaining: 0,
        restTimeInitial: 0,
        restTimerMinimized: false,
      })
    })
  })

  describe('Session Management', () => {
    it('starts a new session', () => {
      act(() => {
        useWorkoutStore.getState().startSession(123, 456)
      })

      const state = useWorkoutStore.getState()
      expect(state.sessionId).toBe(123)
      expect(state.routineDayId).toBe(456)
      expect(state.startedAt).toBeTruthy()
      expect(state.completedSets).toEqual({})
    })

    it('ends session and clears state', () => {
      act(() => {
        useWorkoutStore.getState().startSession(123, 456)
        useWorkoutStore.getState().endSession()
      })

      const state = useWorkoutStore.getState()
      expect(state.sessionId).toBeNull()
      expect(state.routineDayId).toBeNull()
      expect(state.startedAt).toBeNull()
    })

    it('hasActiveSession returns correct value', () => {
      expect(useWorkoutStore.getState().hasActiveSession()).toBe(false)

      act(() => {
        useWorkoutStore.getState().startSession(123, 456)
      })

      expect(useWorkoutStore.getState().hasActiveSession()).toBe(true)
    })
  })

  describe('Set Completion', () => {
    beforeEach(() => {
      act(() => {
        useWorkoutStore.getState().startSession(123, 456)
      })
    })

    it('completes a set with sessionExerciseId', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, {
          weight: 100,
          repsCompleted: 10,
        })
      })

      const state = useWorkoutStore.getState()
      expect(state.completedSets['1-1']).toBeTruthy()
      expect(state.completedSets['1-1'].sessionExerciseId).toBe(1)
      expect(state.completedSets['1-1'].weight).toBe(100)
      expect(state.completedSets['1-1'].repsCompleted).toBe(10)
    })

    it('isSetCompleted returns correct value', () => {
      expect(useWorkoutStore.getState().isSetCompleted(1, 1)).toBe(false)

      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 100 })
      })

      expect(useWorkoutStore.getState().isSetCompleted(1, 1)).toBe(true)
      expect(useWorkoutStore.getState().isSetCompleted(1, 2)).toBe(false)
    })

    it('getSetData returns set data', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, {
          weight: 100,
          repsCompleted: 10,
        })
      })

      const setData = useWorkoutStore.getState().getSetData(1, 1)
      expect(setData.weight).toBe(100)
      expect(setData.repsCompleted).toBe(10)
    })

    it('uncompletes a set but keeps cache', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 100 })
        useWorkoutStore.getState().uncompleteSet(1, 1)
      })

      const state = useWorkoutStore.getState()
      expect(state.completedSets['1-1']).toBeUndefined()
      expect(state.cachedSetData['1-1']).toBeTruthy()
      expect(state.cachedSetData['1-1'].weight).toBe(100)
    })

    it('getCachedSetData returns cached data after uncomplete', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 100 })
        useWorkoutStore.getState().uncompleteSet(1, 1)
      })

      const cached = useWorkoutStore.getState().getCachedSetData(1, 1)
      expect(cached.weight).toBe(100)
    })

    it('getSetsForExercise returns sorted sets', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 3, { weight: 90 })
        useWorkoutStore.getState().completeSet(1, 1, { weight: 100 })
        useWorkoutStore.getState().completeSet(1, 2, { weight: 95 })
        useWorkoutStore.getState().completeSet(2, 1, { weight: 50 }) // Different exercise
      })

      const sets = useWorkoutStore.getState().getSetsForExercise(1)
      expect(sets).toHaveLength(3)
      expect(sets[0].setNumber).toBe(1)
      expect(sets[1].setNumber).toBe(2)
      expect(sets[2].setNumber).toBe(3)
    })

    it('updateSetDbId updates dbId after server confirms', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 100, dbId: null })
      })

      expect(useWorkoutStore.getState().getSetData(1, 1).dbId).toBeNull()

      act(() => {
        useWorkoutStore.getState().updateSetDbId(1, 1, 999)
      })

      const state = useWorkoutStore.getState()
      expect(state.completedSets['1-1'].dbId).toBe(999)
      expect(state.cachedSetData['1-1'].dbId).toBe(999)
    })

    it('updateSetDbId does nothing if set does not exist', () => {
      const stateBefore = useWorkoutStore.getState()

      act(() => {
        useWorkoutStore.getState().updateSetDbId(99, 99, 999)
      })

      const stateAfter = useWorkoutStore.getState()
      expect(stateAfter.completedSets).toEqual(stateBefore.completedSets)
    })

    it('setCachedSetData caches values for a not-completed set', () => {
      act(() => {
        useWorkoutStore.getState().setCachedSetData(1, 2, { weight: 60, repsCompleted: 8 })
      })

      const state = useWorkoutStore.getState()
      expect(state.completedSets['1-2']).toBeUndefined()
      expect(state.cachedSetData['1-2'].weight).toBe(60)
      expect(state.cachedSetData['1-2'].repsCompleted).toBe(8)
      expect(state.cachedSetData['1-2'].sessionExerciseId).toBe(1)
      expect(state.cachedSetData['1-2'].setNumber).toBe(2)
    })

    it('setCachedSetData merges into existing cache without dropping fields', () => {
      act(() => {
        useWorkoutStore.getState().setCachedSetData(1, 2, { weight: 60, repsCompleted: 8 })
        useWorkoutStore.getState().setCachedSetData(1, 2, { weight: 65 })
      })

      const cached = useWorkoutStore.getState().cachedSetData['1-2']
      expect(cached.weight).toBe(65)
      expect(cached.repsCompleted).toBe(8)
    })

    it('updateCompletedSetValues edits a completed set in place, preserving metadata', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 100, repsCompleted: 10, rirActual: 2, notes: 'nota', dbId: 999 })
        useWorkoutStore.getState().updateCompletedSetValues(1, 1, { weight: 105, repsCompleted: 9 })
      })

      const state = useWorkoutStore.getState()
      expect(state.isSetCompleted(1, 1)).toBe(true)
      expect(state.completedSets['1-1'].weight).toBe(105)
      expect(state.completedSets['1-1'].repsCompleted).toBe(9)
      expect(state.completedSets['1-1'].rirActual).toBe(2)
      expect(state.completedSets['1-1'].notes).toBe('nota')
      expect(state.completedSets['1-1'].dbId).toBe(999)
      expect(state.cachedSetData['1-1'].weight).toBe(105)
    })

    it('updateCompletedSetValues ignores undefined fields (keeps existing values)', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 100, repsCompleted: 10 })
        useWorkoutStore.getState().updateCompletedSetValues(1, 1, { weight: 110, repsCompleted: undefined })
      })

      const set = useWorkoutStore.getState().completedSets['1-1']
      expect(set.weight).toBe(110)
      expect(set.repsCompleted).toBe(10)
    })

    it('updateCompletedSetValues does nothing if the set is not completed', () => {
      act(() => {
        useWorkoutStore.getState().updateCompletedSetValues(1, 5, { weight: 50 })
      })

      const state = useWorkoutStore.getState()
      expect(state.completedSets['1-5']).toBeUndefined()
      expect(state.cachedSetData['1-5']).toBeUndefined()
    })

    it('rollbackSet removes set from completedSets and cachedSetData', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 100 })
        useWorkoutStore.getState().completeSet(1, 2, { weight: 105 })
      })

      expect(useWorkoutStore.getState().isSetCompleted(1, 1)).toBe(true)

      act(() => {
        useWorkoutStore.getState().rollbackSet(1, 1)
      })

      const state = useWorkoutStore.getState()
      expect(state.completedSets['1-1']).toBeUndefined()
      expect(state.cachedSetData['1-1']).toBeUndefined()
      // Other set should remain
      expect(state.completedSets['1-2']).toBeTruthy()
    })
  })

  describe('Rest Timer', () => {
    it('starts rest timer', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(90)
      })

      const state = useWorkoutStore.getState()
      expect(state.restTimerActive).toBe(true)
      expect(state.restTimerEndTime).toBeGreaterThan(Date.now())
      expect(state.restTimeInitial).toBe(90)
      expect(state.getTimeRemaining()).toBeGreaterThanOrEqual(89)
      expect(state.getTimeRemaining()).toBeLessThanOrEqual(90)
    })

    it('startRestTimer guarda el contexto opcional (set actual y total)', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(60, { setNumber: 2, totalSets: 4, exerciseName: 'Bench Press' })
      })

      expect(useWorkoutStore.getState().restTimerContext).toEqual({
        setNumber: 2,
        totalSets: 4,
        exerciseName: 'Bench Press',
      })
    })

    it('skipRest limpia el contexto del timer', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(60, { setNumber: 1, totalSets: 3 })
      })
      expect(useWorkoutStore.getState().restTimerContext).toEqual({ setNumber: 1, totalSets: 3 })

      act(() => {
        useWorkoutStore.getState().skipRest()
      })

      expect(useWorkoutStore.getState().restTimerContext).toEqual({})
    })

    it('getTimeRemaining returns correct value', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })

      const remaining = useWorkoutStore.getState().getTimeRemaining()
      expect(remaining).toBeGreaterThanOrEqual(59)
      expect(remaining).toBeLessThanOrEqual(60)
    })

    it('tickTimer stops timer when time expired', () => {
      act(() => {
        // Forzar un endTime en el pasado
        useWorkoutStore.setState({
          restTimerActive: true,
          restTimerEndTime: Date.now() - 1000,
          restTimeInitial: 10,
        })
        useWorkoutStore.getState().tickTimer()
      })

      const state = useWorkoutStore.getState()
      expect(state.restTimerActive).toBe(false)
    })

    it('skips rest', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(90)
        useWorkoutStore.getState().skipRest()
      })

      const state = useWorkoutStore.getState()
      expect(state.restTimerActive).toBe(false)
      expect(state.restTimerEndTime).toBe(null)
      expect(state.getTimeRemaining()).toBe(0)
    })

    it('adjusts rest time positively', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })
      const initialRemaining = useWorkoutStore.getState().getTimeRemaining()

      act(() => {
        useWorkoutStore.getState().adjustRestTime(30)
      })

      const newRemaining = useWorkoutStore.getState().getTimeRemaining()
      expect(newRemaining).toBeGreaterThanOrEqual(initialRemaining + 29)
      expect(useWorkoutStore.getState().restTimeInitial).toBe(90)
    })

    it('adjusts rest time negatively', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })
      const initialRemaining = useWorkoutStore.getState().getTimeRemaining()

      act(() => {
        useWorkoutStore.getState().adjustRestTime(-20)
      })

      const newRemaining = useWorkoutStore.getState().getTimeRemaining()
      expect(newRemaining).toBeLessThan(initialRemaining)
      expect(newRemaining).toBeGreaterThanOrEqual(initialRemaining - 21)
      expect(useWorkoutStore.getState().restTimeInitial).toBe(40)
    })

    it('clamps restTimeInitial to a positive value when adjusting below zero', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(10)
        useWorkoutStore.getState().adjustRestTime(-100)
      })

      expect(useWorkoutStore.getState().restTimeInitial).toBeGreaterThanOrEqual(1)
    })

    it('sets timer minimized state', () => {
      expect(useWorkoutStore.getState().restTimerMinimized).toBe(false)

      act(() => {
        useWorkoutStore.getState().setRestTimerMinimized(true)
      })

      expect(useWorkoutStore.getState().restTimerMinimized).toBe(true)

      act(() => {
        useWorkoutStore.getState().setRestTimerMinimized(false)
      })

      expect(useWorkoutStore.getState().restTimerMinimized).toBe(false)
    })
  })

  describe('applyWeightConversions', () => {
    it('convierte los pesos de las series indicadas y bumpea el nonce', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 190 })
        useWorkoutStore.getState().completeSet(1, 2, { weight: 100 })
      })
      const nonceBefore = useWorkoutStore.getState().weightConversionNonce

      act(() => {
        useWorkoutStore.getState().applyWeightConversions([
          { sessionExerciseId: 1, setNumber: 1, newWeight: 86.18 },
        ])
      })

      const state = useWorkoutStore.getState()
      expect(state.completedSets['1-1'].weight).toBe(86.18)
      expect(state.cachedSetData['1-1'].weight).toBe(86.18)
      expect(state.completedSets['1-2'].weight).toBe(100) // sin cambios
      expect(state.weightConversionNonce).toBe(nonceBefore + 1)
    })

    it('también convierte el peso de una serie encolada en pendingSets', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 190 })
        useWorkoutStore.getState().addPendingSet(1, 1, { sessionExerciseId: 1, setNumber: 1, weight: 190 })
      })

      act(() => {
        useWorkoutStore.getState().applyWeightConversions([
          { sessionExerciseId: 1, setNumber: 1, newWeight: 86.18 },
        ])
      })

      // Sin esto, al sincronizar la cola insertaría el peso viejo (190) en BD
      expect(useWorkoutStore.getState().pendingSets['1-1'].weight).toBe(86.18)
    })

    it('no toca el estado ni el nonce con una lista vacía', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, { weight: 190 })
      })
      const nonceBefore = useWorkoutStore.getState().weightConversionNonce

      act(() => {
        useWorkoutStore.getState().applyWeightConversions([])
      })

      const state = useWorkoutStore.getState()
      expect(state.completedSets['1-1'].weight).toBe(190)
      expect(state.weightConversionNonce).toBe(nonceBefore)
    })
  })

  describe('pendingGymChange', () => {
    it('fija y limpia el cambio de gym pendiente', () => {
      act(() => {
        useWorkoutStore.getState().setPendingGymChange({ gymId: 7, weights: [{ sessionExerciseId: 1, setNumber: 1, weight: 86.18 }] })
      })
      expect(useWorkoutStore.getState().pendingGymChange).toEqual({ gymId: 7, weights: [{ sessionExerciseId: 1, setNumber: 1, weight: 86.18 }] })

      act(() => { useWorkoutStore.getState().setPendingGymChange(null) })
      expect(useWorkoutStore.getState().pendingGymChange).toBeNull()
    })

    it('startSession y endSession reinician pendingGymChange y weightConversionNonce', () => {
      act(() => {
        useWorkoutStore.getState().setPendingGymChange({ gymId: 7, weights: [] })
        useWorkoutStore.getState().applyWeightConversions([{ sessionExerciseId: 1, setNumber: 1, newWeight: 1 }])
      })

      act(() => { useWorkoutStore.getState().startSession(1, 2) })
      expect(useWorkoutStore.getState().pendingGymChange).toBeNull()
      expect(useWorkoutStore.getState().weightConversionNonce).toBe(0)

      act(() => {
        useWorkoutStore.getState().setPendingGymChange({ gymId: 8, weights: [] })
        useWorkoutStore.getState().endSession()
      })
      expect(useWorkoutStore.getState().pendingGymChange).toBeNull()
      expect(useWorkoutStore.getState().weightConversionNonce).toBe(0)
    })
  })

  describe('expandedExerciseKey (card abierta del acordeón)', () => {
    // Store aislado con storage en memoria propio, para no depender del orden ni del
    // localStorage compartido de jsdom (rehidrataría un valor de un test previo).
    beforeEach(() => {
      useWorkoutStore = createWorkoutStore(makeMemStorage().storage)
    })

    it('arranca en undefined (sentinela "auto")', () => {
      expect(useWorkoutStore.getState().expandedExerciseKey).toBeUndefined()
    })

    it('setExpandedExerciseKey fija la key', () => {
      act(() => { useWorkoutStore.getState().setExpandedExerciseKey('se-42') })
      expect(useWorkoutStore.getState().expandedExerciseKey).toBe('se-42')
    })

    it('setExpandedExerciseKey(null) representa "todo colapsado"', () => {
      act(() => { useWorkoutStore.getState().setExpandedExerciseKey(null) })
      expect(useWorkoutStore.getState().expandedExerciseKey).toBeNull()
    })

    it('startSession resetea a undefined (nueva sesión abre el primero)', () => {
      act(() => {
        useWorkoutStore.getState().setExpandedExerciseKey('se-42')
        useWorkoutStore.getState().startSession(1, 2)
      })
      expect(useWorkoutStore.getState().expandedExerciseKey).toBeUndefined()
    })

    it('endSession resetea a undefined', () => {
      act(() => {
        useWorkoutStore.getState().setExpandedExerciseKey('se-42')
        useWorkoutStore.getState().endSession()
      })
      expect(useWorkoutStore.getState().expandedExerciseKey).toBeUndefined()
    })

    it('restoreSession PRESERVA la card abierta (no la resetea)', () => {
      act(() => {
        useWorkoutStore.getState().setExpandedExerciseKey('se-42')
        useWorkoutStore.getState().restoreSession({
          sessionId: 1, routineDayId: 2, routineId: 3,
          startedAt: '2024-01-01T00:00:00Z', completedSets: {}, cachedSetData: {},
        })
      })
      expect(useWorkoutStore.getState().expandedExerciseKey).toBe('se-42')
    })

    it('round-trip: string y null se persisten; undefined se omite del JSON', () => {
      const mem = makeMemStorage()
      const s1 = createWorkoutStore(mem.storage)

      // string → se serializa y rehidrata
      act(() => { s1.getState().setExpandedExerciseKey('se-9') })
      expect(mem.raw.get('workout-session')).toContain('"expandedExerciseKey":"se-9"')
      expect(createWorkoutStore(mem.storage).getState().expandedExerciseKey).toBe('se-9')

      // null (todo colapsado) → se preserva
      act(() => { s1.getState().setExpandedExerciseKey(null) })
      expect(createWorkoutStore(mem.storage).getState().expandedExerciseKey).toBeNull()

      // undefined (auto) → JSON.stringify lo omite y rehidrata como undefined (distinguible de null)
      act(() => { s1.getState().setExpandedExerciseKey(undefined) })
      expect(mem.raw.get('workout-session')).not.toContain('expandedExerciseKey')
      expect(createWorkoutStore(mem.storage).getState().expandedExerciseKey).toBeUndefined()
    })
  })

  // issue #30: si esta bandera se persistiera, en frío rehidrataría a `true` y la app daría
  // por sabido lo que todavía no ha preguntado al servidor. Es EL invariante del arreglo.
  describe('activeSessionSynced', () => {
    it('arranca en false', () => {
      expect(createWorkoutStore(makeMemStorage().storage).getState().activeSessionSynced).toBe(false)
    })

    it('NO se persiste: no entra en el JSON y en frío vuelve a false', () => {
      const mem = makeMemStorage()
      const s1 = createWorkoutStore(mem.storage)

      act(() => { s1.getState().setActiveSessionSynced(true) })
      expect(s1.getState().activeSessionSynced).toBe(true)

      expect(mem.raw.get('workout-session')).not.toContain('activeSessionSynced')
      expect(createWorkoutStore(mem.storage).getState().activeSessionSynced).toBe(false)
    })

    it('startSession y endSession no la tocan (no es estado de sesión, es de sincronización)', () => {
      const s1 = createWorkoutStore(makeMemStorage().storage)
      act(() => { s1.getState().setActiveSessionSynced(true) })

      act(() => { s1.getState().startSession('s-1', null, null, null) })
      expect(s1.getState().activeSessionSynced).toBe(true)

      act(() => { s1.getState().endSession() })
      expect(s1.getState().activeSessionSynced).toBe(true)
    })
  })

  describe('Factory', () => {
    it('creates independent store instances', () => {
      const store1 = createWorkoutStore()
      const store2 = createWorkoutStore()

      store1.getState().startSession(1, 2)
      expect(store1.getState().sessionId).toBe(1)
      expect(store2.getState().sessionId).toBeNull()
    })

    it('accepts optional storage parameter', () => {
      const mockStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      }
      const store = createWorkoutStore(mockStorage)
      expect(store.getState().sessionId).toBeNull()
      store.getState().startSession(1, 2)
      expect(store.getState().sessionId).toBe(1)
    })
  })
})
