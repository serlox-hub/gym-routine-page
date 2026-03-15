export * from './lib/arrayUtils.js'
export * from './lib/bodyMeasurementCalculations.js'
export * from './lib/bodyWeightCalculations.js'
export * from './lib/calendarUtils.js'
export * from './lib/constants.js'
export * from './lib/dateUtils.js'
export * from './lib/measurementConstants.js'
export * from './lib/measurementTypes.js'
export * from './lib/routineExerciseForm.js'
export * from './lib/routineIO.js'
export * from './lib/routineTemplates.js'
export * from './lib/setUtils.js'
export * from './lib/supersetUtils.js'
export * from './lib/textUtils.js'
export * from './lib/timeUtils.js'
export * from './lib/validation.js'
export * from './lib/workoutCalculations.js'
export * from './lib/workoutTransforms.js'

// API layer
export * from './api/exerciseApi.js'
export * from './api/routineApi.js'
export * from './api/workoutApi.js'
export * from './api/bodyWeightApi.js'
export * from './api/bodyMeasurementsApi.js'
export * from './api/preferencesApi.js'
export * from './api/adminApi.js'
export { initApi } from './api/_client.js'

// Store factories
export { createWorkoutStore, workoutStoreState } from './stores/createWorkoutStore.js'
export { createAuthStore } from './stores/createAuthStore.js'

// Notifications
export { initNotifications } from './notifications.js'

// Hooks
export * from './hooks/useAdmin.js'
export * from './hooks/useAuth.js'
export * from './hooks/useBodyMeasurements.js'
export * from './hooks/useBodyWeight.js'
export * from './hooks/useExercises.js'
export * from './hooks/usePreferences.js'
export * from './hooks/useRoutines.js'
export * from './hooks/useSessionExercises.js'
export { useTimerEngine, useRestTimer } from './hooks/useRestTimer.js'

// Store injection for hooks
export { initStores } from './hooks/_stores.js'
