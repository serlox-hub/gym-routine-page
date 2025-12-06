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
        exerciseOrder: [],
        extraExercises: [],
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

    it('completes a set', () => {
      act(() => {
        useWorkoutStore.getState().completeSet(1, 1, {
          weight: 100,
          repsCompleted: 10,
        })
      })

      const state = useWorkoutStore.getState()
      expect(state.completedSets['1-1']).toBeTruthy()
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

  describe('Exercise Order', () => {
    it('initializes exercise order from blocks', () => {
      const blocks = [
        {
          id: 1,
          routine_exercises: [{ id: 101 }, { id: 102 }],
        },
        {
          id: 2,
          routine_exercises: [{ id: 201 }],
        },
      ]

      act(() => {
        useWorkoutStore.getState().initializeExerciseOrder(blocks)
      })

      const order = useWorkoutStore.getState().exerciseOrder
      expect(order).toHaveLength(3)
      expect(order[0]).toEqual({ id: 101, type: 'routine', blockId: 1 })
      expect(order[2]).toEqual({ id: 201, type: 'routine', blockId: 2 })
    })

    it('does not reinitialize if already set', () => {
      act(() => {
        useWorkoutStore.setState({ exerciseOrder: [{ id: 1, type: 'routine' }] })
        useWorkoutStore.getState().initializeExerciseOrder([
          { id: 2, routine_exercises: [{ id: 999 }] },
        ])
      })

      const order = useWorkoutStore.getState().exerciseOrder
      expect(order).toHaveLength(1)
      expect(order[0].id).toBe(1)
    })

    it('moves exercise up', () => {
      act(() => {
        useWorkoutStore.setState({
          exerciseOrder: [
            { id: 1, type: 'routine' },
            { id: 2, type: 'routine' },
            { id: 3, type: 'routine' },
          ],
        })
        useWorkoutStore.getState().moveExercise(1, 'up')
      })

      const order = useWorkoutStore.getState().exerciseOrder
      expect(order[0].id).toBe(2)
      expect(order[1].id).toBe(1)
    })

    it('moves exercise down', () => {
      act(() => {
        useWorkoutStore.setState({
          exerciseOrder: [
            { id: 1, type: 'routine' },
            { id: 2, type: 'routine' },
            { id: 3, type: 'routine' },
          ],
        })
        useWorkoutStore.getState().moveExercise(1, 'down')
      })

      const order = useWorkoutStore.getState().exerciseOrder
      expect(order[1].id).toBe(3)
      expect(order[2].id).toBe(2)
    })

    it('does not move beyond boundaries', () => {
      act(() => {
        useWorkoutStore.setState({
          exerciseOrder: [
            { id: 1, type: 'routine' },
            { id: 2, type: 'routine' },
          ],
        })
        useWorkoutStore.getState().moveExercise(0, 'up')
      })

      const order = useWorkoutStore.getState().exerciseOrder
      expect(order[0].id).toBe(1) // Unchanged
    })

    it('reorders exercises', () => {
      const newOrder = [
        { id: 3, type: 'routine' },
        { id: 1, type: 'routine' },
        { id: 2, type: 'routine' },
      ]

      act(() => {
        useWorkoutStore.getState().reorderExercises(newOrder)
      })

      expect(useWorkoutStore.getState().exerciseOrder).toEqual(newOrder)
    })
  })

  describe('Extra Exercises', () => {
    it('adds extra exercise', () => {
      const exercise = { id: 1, name: 'Curl', measurement_type: 'weight_reps' }
      const config = { series: 4, reps: '12', rir: 1, rest_seconds: 60 }

      act(() => {
        useWorkoutStore.getState().addExtraExercise(exercise, config)
      })

      const state = useWorkoutStore.getState()
      expect(state.extraExercises).toHaveLength(1)
      expect(state.extraExercises[0].exercise).toEqual(exercise)
      expect(state.extraExercises[0].series).toBe(4)
      expect(state.extraExercises[0].id).toMatch(/^extra-/)

      expect(state.exerciseOrder).toHaveLength(1)
      expect(state.exerciseOrder[0].type).toBe('extra')
    })

    it('uses default config values', () => {
      const exercise = { id: 1, name: 'Curl' }

      act(() => {
        useWorkoutStore.getState().addExtraExercise(exercise, {})
      })

      const extra = useWorkoutStore.getState().extraExercises[0]
      expect(extra.series).toBe(3)
      expect(extra.reps).toBe('10')
      expect(extra.rir).toBe(2)
      expect(extra.rest_seconds).toBe(90)
    })

    it('removes extra exercise', () => {
      act(() => {
        useWorkoutStore.getState().addExtraExercise({ id: 1, name: 'Curl' }, {})
      })

      const extraId = useWorkoutStore.getState().extraExercises[0].id

      act(() => {
        useWorkoutStore.getState().removeExtraExercise(extraId)
      })

      const state = useWorkoutStore.getState()
      expect(state.extraExercises).toHaveLength(0)
      expect(state.exerciseOrder).toHaveLength(0)
    })

    it('getExtraExercise returns exercise by id', () => {
      act(() => {
        useWorkoutStore.getState().addExtraExercise({ id: 1, name: 'Curl' }, {})
      })

      const extraId = useWorkoutStore.getState().extraExercises[0].id
      const extra = useWorkoutStore.getState().getExtraExercise(extraId)

      expect(extra).toBeTruthy()
      expect(extra.exercise.name).toBe('Curl')
    })

    it('removeExerciseFromSession removes both routine and extra', () => {
      act(() => {
        useWorkoutStore.setState({
          exerciseOrder: [
            { id: 1, type: 'routine' },
            { id: 'extra-123', type: 'extra' },
          ],
          extraExercises: [{ id: 'extra-123', exercise: { name: 'Curl' } }],
        })
        useWorkoutStore.getState().removeExerciseFromSession(1)
      })

      expect(useWorkoutStore.getState().exerciseOrder).toHaveLength(1)
      expect(useWorkoutStore.getState().exerciseOrder[0].id).toBe('extra-123')
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
