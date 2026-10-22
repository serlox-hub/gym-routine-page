// Barrel re-export — sub-modules contain the implementations
// See: workoutSessionApi.js, completedSetsApi.js, sessionExercisesApi.js

export {
  fetchActiveSession,
  fetchCompletedSetsForSession,
  fetchLastSetPerformedAt,
  startWorkoutSession,
  fetchExerciseIdsWithSets,
  deleteSessionExercisesWithoutSets,
  completeWorkoutSession,
  updateSessionMetadata,
  rescheduleSession,
  deleteWorkoutSession,
  fetchWorkoutHistory,
  fetchSessionDetail,
  fetchExerciseHistorySummary,
  fetchPreviousWorkout,
  fetchCompletedSessionCount,
} from './workoutSessionApi.js'

export {
  upsertCompletedSet,
  deleteCompletedSet,
} from './completedSetsApi.js'

export {
  fetchSessionExercises,
  replaceSessionExercise,
  correctSessionExercise,
  addSessionExercise,
  updateSessionExerciseFields,
  deleteSessionExercise,
  reorderSessionExercises,
} from './sessionExercisesApi.js'
