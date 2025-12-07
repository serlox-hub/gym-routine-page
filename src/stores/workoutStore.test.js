import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

// Importamos el store directamente - Zustand funciona sin React
import useWorkoutStore from './workoutStore.js'

describe('workoutStore', () => {
  beforeEach(() => {
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
  })

  describe('Rest Timer', () => {
    it('starts rest timer', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(90)
      })

      const state = useWorkoutStore.getState()
      expect(state.restTimerActive).toBe(true)
      expect(state.restTimeRemaining).toBe(90)
      expect(state.restTimeInitial).toBe(90)
    })

    it('ticks timer', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(90)
        useWorkoutStore.getState().tickTimer()
      })

      expect(useWorkoutStore.getState().restTimeRemaining).toBe(89)
    })

    it('stops timer when reaching 0', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(1)
        useWorkoutStore.getState().tickTimer()
      })

      const state = useWorkoutStore.getState()
      expect(state.restTimeRemaining).toBe(0)
      expect(state.restTimerActive).toBe(false)
    })

    it('skips rest', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(90)
        useWorkoutStore.getState().skipRest()
      })

      const state = useWorkoutStore.getState()
      expect(state.restTimerActive).toBe(false)
      expect(state.restTimeRemaining).toBe(0)
    })

    it('adjusts rest time positively', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
        useWorkoutStore.getState().adjustRestTime(30)
      })

      expect(useWorkoutStore.getState().restTimeRemaining).toBe(90)
    })

    it('adjusts rest time negatively without going below 0', () => {
      act(() => {
        useWorkoutStore.getState().startRestTimer(20)
        useWorkoutStore.getState().adjustRestTime(-30)
      })

      expect(useWorkoutStore.getState().restTimeRemaining).toBe(0)
    })
  })

  describe('State Persistence', () => {
    it('store has persist middleware configured', () => {
      // Verify the store name for persistence
      expect(useWorkoutStore.persist).toBeDefined()
      expect(useWorkoutStore.persist.getOptions().name).toBe('workout-session')
    })
  })
})
