// Barrel re-export — sub-modules contain the implementations
// See: workoutSessionApi.js, completedSetsApi.js, sessionExercisesApi.js

export {
  fetchActiveSession,
  fetchCompletedSetsForSession,
  startWorkoutSession,
  fetchExerciseIdsWithSets,
  deleteSessionExercisesWithoutSets,
  completeWorkoutSession,
  deleteWorkoutSession,
  fetchWorkoutHistory,
  fetchSessionDetail,
  fetchExerciseHistorySummary,
  fetchExerciseHistory,
  fetchPreviousWorkout,
  fetchCompletedSessionCount,
} from './workoutSessionApi.js'

export {
  upsertCompletedSet,
  updateSetVideo,
  updateSetDetails,
  deleteCompletedSet,
} from './completedSetsApi.js'

export {
  fetchSessionExercises,
  fetchSessionExercisesSortOrder,
  fetchSessionExerciseBlockName,
  updateSessionExerciseSortOrder,
  insertSessionExercise,
  deleteCompletedSetsByExercise,
  updateSessionExerciseExerciseId,
  addSessionExercise,
  deleteSessionExercise,
  reorderSessionExercises,
} from './sessionExercisesApi.js'
