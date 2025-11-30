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

      // Custom exercise order and added exercises
      exerciseOrder: [], // Array of { id, type: 'routine' | 'extra' }
      extraExercises: [], // Exercises added during session

      // Rest timer state
      restTimerActive: false,
      restTimeRemaining: 0,
      restTimeInitial: 0,

      // Start a new workout session
      startSession: (sessionId, routineDayId) => set({
        sessionId,
        routineDayId,
        startedAt: new Date().toISOString(),
        completedSets: {},
        exerciseOrder: [],
        extraExercises: [],
      }),

      // End current session
      endSession: () => set({
        sessionId: null,
        routineDayId: null,
        startedAt: null,
        completedSets: {},
        exerciseOrder: [],
        extraExercises: [],
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

      // Initialize exercise order from routine blocks
      initializeExerciseOrder: (blocks) => {
        const state = get()
        if (state.exerciseOrder.length > 0) return // Already initialized

        const order = []
        blocks.forEach(block => {
          block.routine_exercises.forEach(re => {
            order.push({ id: re.id, type: 'routine', blockId: block.id })
          })
        })
        set({ exerciseOrder: order })
      },

      // Reorder exercises
      reorderExercises: (newOrder) => set({ exerciseOrder: newOrder }),

      // Move exercise up/down
      moveExercise: (index, direction) => set(state => {
        const newOrder = [...state.exerciseOrder]
        const newIndex = direction === 'up' ? index - 1 : index + 1

        if (newIndex < 0 || newIndex >= newOrder.length) return state

        const temp = newOrder[index]
        newOrder[index] = newOrder[newIndex]
        newOrder[newIndex] = temp

        return { exerciseOrder: newOrder }
      }),

      // Add extra exercise to session
      addExtraExercise: (exercise, config) => set(state => {
        const extraId = `extra-${Date.now()}`
        const extraExercise = {
          id: extraId,
          exercise,
          series: config.series || 3,
          reps: config.reps || '10',
          rir: config.rir ?? 2,
          descanso_seg: config.descanso_seg || 90,
          measurement_type: exercise.measurement_type || 'weight_reps',
        }

        return {
          extraExercises: [...state.extraExercises, extraExercise],
          exerciseOrder: [...state.exerciseOrder, { id: extraId, type: 'extra' }],
        }
      }),

      // Remove extra exercise
      removeExtraExercise: (extraId) => set(state => ({
        extraExercises: state.extraExercises.filter(e => e.id !== extraId),
        exerciseOrder: state.exerciseOrder.filter(o => o.id !== extraId),
      })),

      // Get extra exercise by id
      getExtraExercise: (extraId) => {
        const state = get()
        return state.extraExercises.find(e => e.id === extraId)
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
    }),
    {
      name: 'workout-session',
    }
  )
)

export default useWorkoutStore
