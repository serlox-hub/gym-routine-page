import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useWorkoutStore = create(
  persist(
    (set, get) => ({
      // Current session
      sessionId: null,
      routineDayId: null,
      startedAt: null,

      // Completed sets during this session (before saving to DB)
      completedSets: {},

      // Start a new workout session
      startSession: (sessionId, routineDayId) => set({
        sessionId,
        routineDayId,
        startedAt: new Date().toISOString(),
        completedSets: {},
      }),

      // End current session
      endSession: () => set({
        sessionId: null,
        routineDayId: null,
        startedAt: null,
        completedSets: {},
      }),

      // Mark a set as completed
      completeSet: (routineExerciseId, setNumber, data) => set(state => ({
        completedSets: {
          ...state.completedSets,
          [`${routineExerciseId}-${setNumber}`]: {
            routineExerciseId,
            setNumber,
            ...data,
            completedAt: new Date().toISOString(),
          }
        }
      })),

      // Uncheck a completed set
      uncompleteSet: (routineExerciseId, setNumber) => set(state => {
        const newCompletedSets = { ...state.completedSets }
        delete newCompletedSets[`${routineExerciseId}-${setNumber}`]
        return { completedSets: newCompletedSets }
      }),

      // Get completed sets for an exercise
      getSetsForExercise: (routineExerciseId) => {
        const state = get()
        return Object.values(state.completedSets)
          .filter(set => set.routineExerciseId === routineExerciseId)
          .sort((a, b) => a.setNumber - b.setNumber)
      },

      // Check if a specific set is completed
      isSetCompleted: (routineExerciseId, setNumber) => {
        const state = get()
        return !!state.completedSets[`${routineExerciseId}-${setNumber}`]
      },

      // Get data for a specific set
      getSetData: (routineExerciseId, setNumber) => {
        const state = get()
        return state.completedSets[`${routineExerciseId}-${setNumber}`]
      },

      // Check if session is active
      hasActiveSession: () => {
        const state = get()
        return !!state.sessionId
      },
    }),
    {
      name: 'workout-session',
    }
  )
)

export default useWorkoutStore
