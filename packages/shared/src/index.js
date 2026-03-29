export * from './lib/arrayUtils.js'
export * from './lib/bodyMeasurementCalculations.js'
export * from './lib/bodyWeightCalculations.js'
export * from './lib/calendarUtils.js'
export * from './lib/constants.js'
export * from './lib/dateUtils.js'
export * from './lib/measurementConstants.js'
export * from './lib/measurementTypes.js'
export * from './lib/numberUtils.js'
export * from './lib/routineExerciseForm.js'
export * from './lib/routineIO.js'
export * from './lib/routineTemplates.js'
export * from './lib/setUtils.js'
export * from './lib/supersetUtils.js'
export * from './lib/sessionExerciseUtils.js'
export * from './lib/textUtils.js'
export * from './lib/timeUtils.js'
export * from './lib/validation.js'
export * from './lib/sessionStatsCalculation.js'
export * from './lib/workoutCalculations.js'
export * from './lib/workoutTransforms.js'
export * from './lib/streakUtils.js'
export * from './lib/volumeConstants.js'
export * from './lib/routineVolumeUtils.js'
export * from './lib/weightConversion.js'
export * from './lib/workoutSummary.js'

// API layer
export * from './api/exerciseApi.js'
export * from './api/exerciseStatsApi.js'
export * from './api/routineApi.js'
export * from './api/workoutApi.js'
export * from './api/bodyWeightApi.js'
export * from './api/bodyMeasurementsApi.js'
export * from './api/preferencesApi.js'
export * from './api/adminApi.js'
export * from './api/trainingGoalsApi.js'
export { initApi } from './api/_client.js'

// QueryClient
export { queryClient } from './lib/queryClient.js'

// Store factories
export { createWorkoutStore, workoutStoreState } from './stores/createWorkoutStore.js'
export { createAuthStore } from './stores/createAuthStore.js'

// Notifications
export { initNotifications, getNotifier } from './notifications.js'

// Haptics
export { initHaptics, getHaptics } from './haptics.js'

// i18n
export { initI18n, i18n, t, getCurrentLocale } from './i18n/index.js'

// Hooks
export * from './hooks/useWorkoutHistory.js'
export * from './hooks/useAdmin.js'
export * from './hooks/useAuth.js'
export * from './hooks/useBodyMeasurements.js'
export * from './hooks/useBodyWeight.js'
export * from './hooks/useCompletedSets.js'
export * from './hooks/useExercises.js'
export * from './hooks/usePreferences.js'
export * from './hooks/useRoutines.js'
export * from './hooks/usePersonalRecords.js'
export * from './hooks/useSession.js'
export * from './hooks/useSessionExercises.js'
export { useTimerEngine, useRestTimer } from './hooks/useRestTimer.js'
export * from './hooks/useTrainingGoals.js'

// Store injection for hooks
export { initStores } from './hooks/_stores.js'
