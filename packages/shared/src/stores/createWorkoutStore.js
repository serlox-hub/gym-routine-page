import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Workout store state builder.
 * Exported for platforms that need to extend the state (e.g. RN adds workoutVisible).
 */
export function workoutStoreState(set, get) {
  return {
    // Current session
    sessionId: null,
    routineDayId: null,
    routineId: null,
    gymId: null,
    startedAt: null,

    // Completed sets during this session (optimistic UI cache)
    // Key: `${sessionExerciseId}-${setNumber}` -> setData
    completedSets: {},
    // Cached set data (for re-checking after uncomplete)
    cachedSetData: {},
    // Current set count per exercise (for tracking added/removed sets)
    // Key: sessionExerciseId -> number of sets
    exerciseSetCounts: {},
    // Sets pending sync (failed to save to server)
    // Key: `${sessionExerciseId}-${setNumber}` -> mutation payload
    pendingSets: {},

    // Rest timer state
    restTimerActive: false,
    restTimerEndTime: null,  // Timestamp cuando termina el timer
    restTimeInitial: 0,
    restTimerMinimized: false,
    restTimerContext: {},  // { setNumber, totalSets, exerciseName }

    // Start a new workout session
    // routineId and routineDayId can be null for free sessions
    startSession: (sessionId, routineDayId, routineId = null, gymId = null) => set({
      sessionId,
      routineDayId,
      routineId,
      gymId,
      startedAt: new Date().toISOString(),
      completedSets: {},
      cachedSetData: {},
      exerciseSetCounts: {},
      pendingSets: {},
      restTimerActive: false,
      restTimerEndTime: null,
      restTimeInitial: 0,
      restTimerMinimized: false,
    }),

    // Restore session from backend
    restoreSession: ({ sessionId, routineDayId, routineId, gymId = null, startedAt, completedSets, cachedSetData }) => set({
      sessionId,
      routineDayId,
      routineId,
      gymId,
      startedAt,
      completedSets,
      cachedSetData,
      restTimerActive: false,
      restTimerEndTime: null,
      restTimeInitial: 0,
      restTimerMinimized: false,
    }),

    // Change the gym of the active session (quick change from the session header)
    setSessionGym: (gymId) => set({ gymId }),

    // End current session
    endSession: () => set({
      sessionId: null,
      routineDayId: null,
      routineId: null,
      gymId: null,
      startedAt: null,
      completedSets: {},
      cachedSetData: {},
      exerciseSetCounts: {},
      pendingSets: {},
      restTimerActive: false,
      restTimerEndTime: null,
      restTimeInitial: 0,
      restTimerMinimized: false,
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

    // Cache edited values of a NOT-completed set so they survive collapse/navigation
    // and out-of-order completion. Merges measurement values into the cache entry.
    setCachedSetData: (sessionExerciseId, setNumber, values) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      return {
        cachedSetData: {
          ...state.cachedSetData,
          [key]: { sessionExerciseId, setNumber, ...state.cachedSetData[key], ...values },
        },
      }
    }),

    // Edit the measurement values of an already-completed set in place, without
    // uncompleting it. Preserves dbId/rir/notes/videoUrl/setType/completedAt.
    updateCompletedSetValues: (sessionExerciseId, setNumber, values) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      const existing = state.completedSets[key]
      if (!existing) return state
      // Ignorar claves undefined (campos que el tipo de medición no usa) para no
      // sobrescribir valores presentes con undefined.
      const clean = {}
      for (const [k, v] of Object.entries(values)) {
        if (v !== undefined) clean[k] = v
      }
      const updated = { ...existing, ...clean }
      return {
        completedSets: { ...state.completedSets, [key]: updated },
        cachedSetData: { ...state.cachedSetData, [key]: updated },
      }
    }),

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

    // Update videoUrl for a set (used for background uploads)
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

    // Update RIR/notes (and optionally setType/videoUrl) of a completed set without
    // uncompleting. setType/videoUrl solo se aplican si llegan definidos (no pisar con
    // undefined cuando la mutación solo actualiza el esfuerzo). Nota: hoy ningún caller pasa
    // videoUrl por aquí (el vídeo va por updateSetVideo); la guarda se mantiene para que el
    // store quede consistente con la API si en el futuro se reusa esta mutación con vídeo.
    updateSetDetails: (sessionExerciseId, setNumber, { rirActual, notes, videoUrl, setType }) => set(state => {
      const key = `${sessionExerciseId}-${setNumber}`
      const existing = state.completedSets[key]
      if (!existing) return state
      const updated = { ...existing, rirActual, notes }
      if (videoUrl !== undefined) updated.videoUrl = videoUrl
      if (setType !== undefined) updated.setType = setType
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

    // Add a set to the pending sync queue
    addPendingSet: (sessionExerciseId, setNumber, payload) => set(state => ({
      pendingSets: {
        ...state.pendingSets,
        [`${sessionExerciseId}-${setNumber}`]: payload,
      },
    })),

    // Remove a set from the pending sync queue
    removePendingSet: (sessionExerciseId, setNumber) => set(state => {
      const { [`${sessionExerciseId}-${setNumber}`]: _, ...rest } = state.pendingSets
      return { pendingSets: rest }
    }),

    // Check if session is active
    hasActiveSession: () => {
      const state = get()
      return !!state.sessionId
    },

    // Rest timer actions
    startRestTimer: (seconds, context = {}) => set({
      restTimerActive: true,
      restTimerEndTime: Date.now() + seconds * 1000,
      restTimeInitial: seconds,
      restTimerContext: context,
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
        set({ restTimerActive: false, restTimerEndTime: null, restTimerContext: {} })
      }
    },

    skipRest: () => set({
      restTimerActive: false,
      restTimerEndTime: null,
      restTimerContext: {},
    }),

    adjustRestTime: (delta) => set(state => ({
      restTimerEndTime: state.restTimerEndTime ? state.restTimerEndTime + delta * 1000 : null,
      restTimeInitial: Math.max(1, state.restTimeInitial + delta),
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
  }
}

/**
 * Factory that creates a workout Zustand store with persist middleware.
 * @param {object} [storage] - Optional Zustand storage adapter. Omit for default. Pass custom adapter for other environments.
 * @returns {object} Zustand store instance
 */
export function createWorkoutStore(storage) {
  const persistOptions = {
    name: 'workout-session',
    partialize: (state) => {
      const {
        restTimerActive: _rta, restTimerEndTime: _rte,
        restTimeInitial: _rti, restTimerMinimized: _rtm,
        ...rest
      } = state
      return rest
    },
  }
  if (storage) {
    persistOptions.storage = storage
  }
  return create(persist(workoutStoreState, persistOptions))
}
