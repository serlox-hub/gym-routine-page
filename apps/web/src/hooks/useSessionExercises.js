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
  useSignOut,
  // Exercises
  useExercises,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
  useMuscleGroups,
  // Routines
  useRoutines,
  useRoutineDetail,
  useCreateRoutine,
  useUpdateRoutine,
  useDeleteRoutine,
  useCreateRoutineDay,
  useUpdateRoutineDay,
  useDeleteRoutineDay,
  useCreateBlock,
  useUpdateBlock,
  useDeleteBlock,
  useCreateRoutineExercise,
  useUpdateRoutineExercise,
  useDeleteRoutineExercise,
  useReorderRoutineExercises,
  // Preferences
  usePreferences,
  useUpdatePreferences,
  // Body weight & measurements
  useBodyWeight,
  useCreateBodyWeight,
  useUpdateBodyWeight,
  useDeleteBodyWeight,
  useBodyMeasurements,
  useCreateBodyMeasurement,
  useUpdateBodyMeasurement,
  useDeleteBodyMeasurement,
  // Admin
  useAdmin,
} from '@gym/shared'
