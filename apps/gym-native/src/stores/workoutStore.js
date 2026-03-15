import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { workoutStoreState } from '@gym/shared'

const useWorkoutStore = create(
  persist(
    (set, get) => ({
      ...workoutStoreState(set, get),
      // RN-only: workout screen visibility
      workoutVisible: false,
      showWorkout: () => set({ workoutVisible: true }),
      hideWorkout: () => set({ workoutVisible: false }),
      // Override session actions to manage workoutVisible
      startSession: (sessionId, routineDayId, routineId = null) => set({
        sessionId, routineDayId, routineId,
        startedAt: new Date().toISOString(),
        completedSets: {}, cachedSetData: {},
        exerciseSetCounts: {}, pendingSets: {},
        workoutVisible: true,
      }),
      endSession: () => set({
        sessionId: null, routineDayId: null, routineId: null,
        startedAt: null, completedSets: {}, cachedSetData: {},
        exerciseSetCounts: {}, pendingSets: {},
        workoutVisible: false,
      }),
      restoreSession: ({ sessionId, routineDayId, routineId, startedAt, completedSets, cachedSetData }) => set({
        sessionId, routineDayId, routineId, startedAt, completedSets, cachedSetData,
        workoutVisible: false,
      }),
    }),
    {
      name: 'workout-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        const { workoutVisible, showWorkout, hideWorkout, ...rest } = state
        return rest
      },
    }
  )
)

export default useWorkoutStore
