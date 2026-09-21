import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  workoutStoreState,
  workoutPartialize,
  buildSessionTransitionReset,
  buildSessionSetDataReset,
} from '@gym/shared'

const useWorkoutStore = create(
  persist(
    (set, get) => ({
      ...workoutStoreState(set, get),
      // RN-only: workout screen visibility
      workoutVisible: false,
      showWorkout: () => set({ workoutVisible: true }),
      hideWorkout: () => set({ workoutVisible: false }),
      // Overrides of the session actions: same reset shape as the shared factory (built by its
      // exported factories, never re-listed — the copy drifted twice), plus workoutVisible.
      // Identity fields stay written here: they are each action's arguments, and sessionId +
      // gymId must land in the SAME set() (sessionId present implies gymId is real, see
      // docs/DECISIONS.md).
      startSession: (sessionId, routineDayId, routineId = null, gymId = null) => set({
        sessionId, routineDayId, routineId, gymId,
        startedAt: new Date().toISOString(),
        ...buildSessionSetDataReset(),
        ...buildSessionTransitionReset(),
        workoutVisible: true,
      }),
      endSession: () => set({
        sessionId: null, routineDayId: null, routineId: null, gymId: null,
        startedAt: null,
        ...buildSessionSetDataReset(),
        ...buildSessionTransitionReset(),
        workoutVisible: false,
      }),
      // expandedExerciseKey is deliberately NOT reset here (same as the shared factory):
      // restore runs on foreground/revisit/cold start and must PRESERVE the open card.
      restoreSession: ({ sessionId, routineDayId, routineId, gymId = null, startedAt, completedSets, cachedSetData }) => set({
        sessionId, routineDayId, routineId, gymId, startedAt, completedSets, cachedSetData,
        ...buildSessionTransitionReset(),
        workoutVisible: false,
      }),
    }),
    {
      name: 'workout-session',
      storage: createJSONStorage(() => AsyncStorage),
      // Drop the RN-only field here and delegate the shared exclusions to workoutPartialize,
      // so the persisted shape can't drift from web's.
      partialize: ({ workoutVisible: _wv, showWorkout: _sw, hideWorkout: _hw, ...rest }) =>
        workoutPartialize(rest),
    }
  )
)

export default useWorkoutStore
