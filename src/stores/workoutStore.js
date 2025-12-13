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
      // Current set count per exercise (for tracking added/removed sets)
      // Key: sessionExerciseId -> number of sets
      exerciseSetCounts: {},

      // Rest timer state
      restTimerActive: false,
      restTimerEndTime: null,  // Timestamp cuando termina el timer
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
        exerciseSetCounts: {},
      }),

      // End current session
      endSession: () => set({
        sessionId: null,
        routineDayId: null,
        routineId: null,
        startedAt: null,
        completedSets: {},
        cachedSetData: {},
        exerciseSetCounts: {},
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

      // Update dbId after server confirms (for optimistic updates)
      updateSetDbId: (sessionExerciseId, setNumber, dbId) => set(state => {
        const key = `${sessionExerciseId}-${setNumber}`
        const existing = state.completedSets[key]
        if (!existing) return state
        return {
          completedSets: {
            ...state.completedSets,
            [key]: { ...existing, dbId },
          },
          cachedSetData: {
            ...state.cachedSetData,
            [key]: { ...existing, dbId },
          },
        }
      }),

      // Rollback a set (remove from completedSets, for error handling)
      rollbackSet: (sessionExerciseId, setNumber) => set(state => {
        const key = `${sessionExerciseId}-${setNumber}`
        const { [key]: _removed, ...restCompleted } = state.completedSets
        const { [key]: _removedCached, ...restCached } = state.cachedSetData
        return {
          completedSets: restCompleted,
          cachedSetData: restCached,
        }
      }),

      // Check if session is active
      hasActiveSession: () => {
        const state = get()
        return !!state.sessionId
      },

      // Rest timer actions
      startRestTimer: (seconds) => set({
        restTimerActive: true,
        restTimerEndTime: Date.now() + seconds * 1000,
        restTimeInitial: seconds,
      }),

      // Calcula tiempo restante basado en timestamp real
      getTimeRemaining: () => {
        const state = get()
        if (!state.restTimerActive || !state.restTimerEndTime) return 0
        return Math.max(0, Math.ceil((state.restTimerEndTime - Date.now()) / 1000))
      },

      // Tick solo verifica si el timer debe parar
      tickTimer: () => {
        const state = get()
        if (!state.restTimerActive) return
        const remaining = Math.ceil((state.restTimerEndTime - Date.now()) / 1000)
        if (remaining <= 0) {
          set({ restTimerActive: false, restTimerEndTime: null })
        }
      },

      skipRest: () => set({
        restTimerActive: false,
        restTimerEndTime: null,
      }),

      adjustRestTime: (delta) => set(state => ({
        restTimerEndTime: state.restTimerEndTime ? state.restTimerEndTime + delta * 1000 : null,
      })),

      setRestTimerMinimized: (minimized) => set({ restTimerMinimized: minimized }),

      // Exercise set count actions
      setExerciseSetCount: (sessionExerciseId, count) => set(state => ({
        exerciseSetCounts: {
          ...state.exerciseSetCounts,
          [sessionExerciseId]: count,
        },
      })),

      getExerciseSetCount: (sessionExerciseId, defaultCount) => {
        const state = get()
        return state.exerciseSetCounts[sessionExerciseId] ?? defaultCount
      },
    }),
    {
      name: 'workout-session',
    }
  )
)

export default useWorkoutStore
