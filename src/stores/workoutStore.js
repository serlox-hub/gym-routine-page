import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useWorkoutStore = create(
  persist(
    (set, get) => ({
      // Current session
      sessionId: null,
      routineDayId: null,
      routineId: null,
      startedAt: null,

      // Completed sets during this session (optimistic UI cache)
      // Key: `${sessionExerciseId}-${setNumber}` -> setData
      completedSets: {},
      // Cached set data (for re-checking after uncomplete)
      cachedSetData: {},

      // Rest timer state
      restTimerActive: false,
      restTimeRemaining: 0,
      restTimeInitial: 0,
      restTimerMinimized: false,

      // Start a new workout session
      // routineId and routineDayId can be null for free sessions
      startSession: (sessionId, routineDayId, routineId = null) => set({
        sessionId,
        routineDayId,
        routineId,
        startedAt: new Date().toISOString(),
        completedSets: {},
        cachedSetData: {},
      }),

      // End current session
      endSession: () => set({
        sessionId: null,
        routineDayId: null,
        routineId: null,
        startedAt: null,
        completedSets: {},
        cachedSetData: {},
      }),

      // Mark a set as completed (optimistic update)
      completeSet: (sessionExerciseId, setNumber, data) => set(state => {
        const key = `${sessionExerciseId}-${setNumber}`
        const setData = {
          sessionExerciseId,
          setNumber,
          ...data,
          completedAt: new Date().toISOString(),
        }
        return {
          completedSets: {
            ...state.completedSets,
            [key]: setData,
          },
          cachedSetData: {
            ...state.cachedSetData,
            [key]: setData,
          },
        }
      }),

      // Uncheck a completed set (keeps data in cache for re-checking)
      uncompleteSet: (sessionExerciseId, setNumber) => set(state => {
        const newCompletedSets = { ...state.completedSets }
        delete newCompletedSets[`${sessionExerciseId}-${setNumber}`]
        return { completedSets: newCompletedSets }
      }),

      // Get cached data for a set (even if uncompleted)
      getCachedSetData: (sessionExerciseId, setNumber) => {
        const state = get()
        return state.cachedSetData[`${sessionExerciseId}-${setNumber}`]
      },

      // Get completed sets for an exercise
      getSetsForExercise: (sessionExerciseId) => {
        const state = get()
        return Object.values(state.completedSets)
          .filter(set => set.sessionExerciseId === sessionExerciseId)
          .sort((a, b) => a.setNumber - b.setNumber)
      },

      // Check if a specific set is completed
      isSetCompleted: (sessionExerciseId, setNumber) => {
        const state = get()
        return !!state.completedSets[`${sessionExerciseId}-${setNumber}`]
      },

      // Get data for a specific set
      getSetData: (sessionExerciseId, setNumber) => {
        const state = get()
        return state.completedSets[`${sessionExerciseId}-${setNumber}`]
      },

      // Check if session is active
      hasActiveSession: () => {
        const state = get()
        return !!state.sessionId
      },

      // Rest timer actions
      startRestTimer: (seconds) => set({
        restTimerActive: true,
        restTimeRemaining: seconds,
        restTimeInitial: seconds,
      }),

      tickTimer: () => set(state => {
        if (state.restTimeRemaining <= 1) {
          return { restTimeRemaining: 0, restTimerActive: false }
        }
        return { restTimeRemaining: state.restTimeRemaining - 1 }
      }),

      skipRest: () => set({
        restTimerActive: false,
        restTimeRemaining: 0,
      }),

      adjustRestTime: (delta) => set(state => ({
        restTimeRemaining: Math.max(0, state.restTimeRemaining + delta),
      })),

      setRestTimerMinimized: (minimized) => set({ restTimerMinimized: minimized }),
    }),
    {
      name: 'workout-session',
    }
  )
)

export default useWorkoutStore
