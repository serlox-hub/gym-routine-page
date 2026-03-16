// Re-exporta hooks de @gym/shared que no tienen thin wrapper propio en esta app.
// Los hooks de sesión (useSession, useCompletedSets) se re-exportan desde sus
// propios archivos wrapper para poder inyectar callbacks de plataforma.
export {
  // Session exercises
  useSessionExercises,
  useAddSessionExercise,
  useReplaceSessionExercise,
  useRemoveSessionExercise,
  useReorderSessionExercises,
  // Auth
  useAuth,
  useUserId,
  // Exercises
  useExercisesWithMuscleGroup,
  useExercise,
  useExerciseStats,
  useExerciseUsageDetail,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
  useMuscleGroups,
  // Routines
  useRoutines,
  useRoutine,
  useRoutineDays,
  useRoutineDay,
  useRoutineBlocks,
  useRoutineAllExercises,
  useCreateRoutine,
  useCreateRoutineDay,
  useUpdateRoutine,
  useDeleteRoutine,
  useDeleteRoutines,
  useSetFavoriteRoutine,
  useUpdateRoutineDay,
  useDeleteRoutineDay,
  useReorderRoutineDays,
  useDeleteRoutineExercise,
  useUpdateRoutineExercise,
  useReorderRoutineExercises,
  useAddExerciseToDay,
  useDuplicateRoutineExercise,
  useMoveRoutineExerciseToDay,
  // Preferences
  usePreferences,
  useUpdatePreference,
  usePreference,
  // Body weight
  useBodyWeightHistory,
  useLatestBodyWeight,
  useRecordBodyWeight,
  useUpdateBodyWeight,
  useDeleteBodyWeight,
  // Body measurements
  useBodyMeasurementHistory,
  useRecordBodyMeasurement,
  useUpdateBodyMeasurement,
  useDeleteBodyMeasurement,
  // Admin
  useAllUsers,
  useUpdateUserSetting,
  // Workout history
  useWorkoutHistory,
  useExerciseHistory,
  useExerciseHistorySummary,
  usePreviousWorkout,
} from '@gym/shared'
