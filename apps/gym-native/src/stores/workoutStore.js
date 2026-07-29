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
      // Los overrides RN deben resetear los MISMOS campos que la factory compartida
      // (createWorkoutStore), incluidos weightConversionNonce y pendingGymChange: si no,
      // un cambio de gym pendiente de sincronizar fugaría a la siguiente sesión y le
      // reasignaría el gym anterior. Mantener en sync con createWorkoutStore.js.
      startSession: (sessionId, routineDayId, routineId = null, gymId = null) => set({
        sessionId, routineDayId, routineId, gymId,
        startedAt: new Date().toISOString(),
        completedSets: {}, cachedSetData: {},
        exerciseSetCounts: {}, pendingSets: {},
        weightConversionNonce: 0, pendingGymChange: null,
        restTimerActive: false, restTimerEndTime: null,
        restTimeInitial: 0, restTimerMinimized: false,
        workoutVisible: true,
      }),
      endSession: () => set({
        sessionId: null, routineDayId: null, routineId: null, gymId: null,
        startedAt: null, completedSets: {}, cachedSetData: {},
        exerciseSetCounts: {}, pendingSets: {},
        weightConversionNonce: 0, pendingGymChange: null,
        restTimerActive: false, restTimerEndTime: null,
        restTimeInitial: 0, restTimerMinimized: false,
        workoutVisible: false,
      }),
      restoreSession: ({ sessionId, routineDayId, routineId, gymId = null, startedAt, completedSets, cachedSetData }) => set({
        sessionId, routineDayId, routineId, gymId, startedAt, completedSets, cachedSetData,
        weightConversionNonce: 0, pendingGymChange: null,
        restTimerActive: false, restTimerEndTime: null,
        restTimeInitial: 0, restTimerMinimized: false,
        workoutVisible: false,
      }),
    }),
    {
      name: 'workout-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        const {
          workoutVisible: _wv, showWorkout: _sw, hideWorkout: _hw,
          restTimerActive: _rta, restTimerEndTime: _rte,
          restTimeInitial: _rti, restTimerMinimized: _rtm,
          ...rest
        } = state
        return rest
      },
    }
  )
)

export default useWorkoutStore
