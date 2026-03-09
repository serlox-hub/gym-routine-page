import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const useWorkoutStore = create(
  persist(
    (set, get) => ({
      // Current session
      sessionId: null,
      routineDayId: null,
      routineId: null,
      startedAt: null,

      // Completed sets during this session (optimistic UI cache)
      completedSets: {},
      cachedSetData: {},
      exerciseSetCounts: {},

      // Rest timer state
      restTimerActive: false,
      restTimerEndTime: null,
      restTimeInitial: 0,
      restTimerMinimized: false,

      startSession: (sessionId, routineDayId, routineId = null) => set({
        sessionId,
        routineDayId,
        routineId,
        startedAt: new Date().toISOString(),
        completedSets: {},
        cachedSetData: {},
        exerciseSetCounts: {},
      }),

      endSession: () => set({
        sessionId: null,
        routineDayId: null,
        routineId: null,
        startedAt: null,
        completedSets: {},
        cachedSetData: {},
        exerciseSetCounts: {},
      }),

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

      uncompleteSet: (sessionExerciseId, setNumber) => set(state => {
        const newCompletedSets = { ...state.completedSets }
        delete newCompletedSets[`${sessionExerciseId}-${setNumber}`]
        return { completedSets: newCompletedSets }
      }),

      getCachedSetData: (sessionExerciseId, setNumber) => {
        const state = get()
        return state.cachedSetData[`${sessionExerciseId}-${setNumber}`]
      },

      getSetsForExercise: (sessionExerciseId) => {
        const state = get()
        return Object.values(state.completedSets)
          .filter(set => set.sessionExerciseId === sessionExerciseId)
          .sort((a, b) => a.setNumber - b.setNumber)
      },

      isSetCompleted: (sessionExerciseId, setNumber) => {
        const state = get()
        return !!state.completedSets[`${sessionExerciseId}-${setNumber}`]
      },

      getSetData: (sessionExerciseId, setNumber) => {
        const state = get()
        return state.completedSets[`${sessionExerciseId}-${setNumber}`]
      },

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

      updateSetVideo: (sessionExerciseId, setNumber, videoUrl) => set(state => {
        const key = `${sessionExerciseId}-${setNumber}`
        const existing = state.completedSets[key]
        if (!existing) return state
        return {
          completedSets: {
            ...state.completedSets,
            [key]: { ...existing, videoUrl },
          },
          cachedSetData: {
            ...state.cachedSetData,
            [key]: { ...existing, videoUrl },
          },
        }
      }),

      updateSetDetails: (sessionExerciseId, setNumber, { rirActual, notes }) => set(state => {
        const key = `${sessionExerciseId}-${setNumber}`
        const existing = state.completedSets[key]
        if (!existing) return state
        const updated = { ...existing, rirActual, notes }
        return {
          completedSets: {
            ...state.completedSets,
            [key]: updated,
          },
          cachedSetData: {
            ...state.cachedSetData,
            [key]: updated,
          },
        }
      }),

      rollbackSet: (sessionExerciseId, setNumber) => set(state => {
        const key = `${sessionExerciseId}-${setNumber}`
        const { [key]: _removed, ...restCompleted } = state.completedSets
        const { [key]: _removedCached, ...restCached } = state.cachedSetData
        return {
          completedSets: restCompleted,
          cachedSetData: restCached,
        }
      }),

      hasActiveSession: () => {
        const state = get()
        return !!state.sessionId
      },

      startRestTimer: (seconds) => set({
        restTimerActive: true,
        restTimerEndTime: Date.now() + seconds * 1000,
        restTimeInitial: seconds,
      }),

      getTimeRemaining: () => {
        const state = get()
        if (!state.restTimerActive || !state.restTimerEndTime) return 0
        return Math.max(0, Math.ceil((state.restTimerEndTime - Date.now()) / 1000))
      },

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

      clearExercise: (sessionExerciseId) => set(state => {
        const newCompleted = {}
        for (const [key, val] of Object.entries(state.completedSets)) {
          if (val.sessionExerciseId !== sessionExerciseId) newCompleted[key] = val
        }
        const newCached = {}
        for (const [key, val] of Object.entries(state.cachedSetData)) {
          if (val.sessionExerciseId !== sessionExerciseId) newCached[key] = val
        }
        const { [sessionExerciseId]: _, ...newCounts } = state.exerciseSetCounts
        return { completedSets: newCompleted, cachedSetData: newCached, exerciseSetCounts: newCounts }
      }),
    }),
    {
      name: 'workout-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

export default useWorkoutStore
