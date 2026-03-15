---
phase: 05-hooks-migration
plan: 01
subsystem: hooks
tags: [tanstack-query, zustand, hooks, store-injection, notifications]

# Dependency graph
requires:
  - phase: 04-stores-migration
    provides: createWorkoutStore and createAuthStore factories in packages/shared
  - phase: 03-api-layer-migration
    provides: API functions in packages/shared/src/api/
provides:
  - 9 shared hook files in packages/shared/src/hooks/
  - Store injection via _stores.js (initStores/useAuthStore/useWorkoutStore/getWorkoutStore)
  - Notification service via notifications.js (initNotifications/getNotifier)
  - useRestTimer with callback injection for platform-specific sound/haptics/keepawake
  - Barrel exports for all hooks via index.js
affects: [05-hooks-migration, 06-app-rewiring]

# Tech tracking
tech-stack:
  added: []
  patterns: [store-injection-via-initStores, notification-service-via-initNotifications, callback-injection-for-useTimerEngine]

key-files:
  created:
    - packages/shared/src/hooks/_stores.js
    - packages/shared/src/notifications.js
    - packages/shared/src/hooks/useAdmin.js
    - packages/shared/src/hooks/useAuth.js
    - packages/shared/src/hooks/useBodyMeasurements.js
    - packages/shared/src/hooks/useBodyWeight.js
    - packages/shared/src/hooks/useExercises.js
    - packages/shared/src/hooks/usePreferences.js
    - packages/shared/src/hooks/useRoutines.js
    - packages/shared/src/hooks/useSessionExercises.js
    - packages/shared/src/hooks/useRestTimer.js
    - packages/shared/src/hooks/useWorkout.js
  modified:
    - packages/shared/src/index.js

key-decisions:
  - "duplicateRoutine stays per-app: exportRoutine/importRoutine use supabase directly and are not in shared"
  - "Store injection via _stores.js: thin wrappers that delegate to app-local Zustand stores"
  - "getNotifier not exported from barrel -- internal to shared hooks only"
  - "getWorkoutStore not exported from barrel -- internal to shared hooks only"
  - "useWakeLock excluded from shared -- platform-specific (web: navigator.wakeLock, RN: expo-keep-awake)"
  - "Notifications added only to key create/delete mutations, not updates or reorders"

patterns-established:
  - "Store injection: initStores({ authStore, workoutStore }) called once at app init"
  - "Notification service: initNotifications(showToast) with no-op default when not initialized"
  - "Callback injection: useTimerEngine({ playSound, vibrateDevice, onTimerStart, onTimerEnd, isSoundEnabled })"
  - "Shared hooks use relative imports within packages/shared (no @gym/shared self-import)"

requirements-completed: [HOOK-01, HOOK-04]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 5 Plan 01: Hooks Migration Summary

**9 shared TanStack Query hooks with store injection via _stores.js, notification service via getNotifier(), and useRestTimer with platform callback injection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T20:38:37Z
- **Completed:** 2026-03-15T20:42:06Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created store injection module (_stores.js) with initStores/useAuthStore/useWorkoutStore/getWorkoutStore
- Created notification service (notifications.js) with initNotifications/getNotifier pattern
- Moved 9 hook files to packages/shared/src/hooks/ with all imports rewritten to relative paths
- useRestTimer accepts { playSound, vibrateDevice, onTimerStart, onTimerEnd, isSoundEnabled } callbacks
- Key mutation hooks (useCreateRoutine, useDeleteRoutine, useDeleteExercise) call getNotifier()?.show()
- Barrel index.js exports all hooks + initStores + initNotifications
- All 508 existing web tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create store injection, notification service** - `cdb013e` (feat)
2. **Task 2: Move 9 hook files to shared** - `439b027` (feat)

## Files Created/Modified
- `packages/shared/src/hooks/_stores.js` - Store injection: initStores, useAuthStore, useWorkoutStore, getWorkoutStore
- `packages/shared/src/notifications.js` - Notification service: initNotifications, getNotifier
- `packages/shared/src/hooks/useAdmin.js` - Admin user queries and mutations
- `packages/shared/src/hooks/useAuth.js` - Auth hooks with store injection via _stores.js
- `packages/shared/src/hooks/useBodyMeasurements.js` - Body measurement CRUD hooks
- `packages/shared/src/hooks/useBodyWeight.js` - Body weight CRUD hooks
- `packages/shared/src/hooks/useExercises.js` - Exercise CRUD hooks with delete notification
- `packages/shared/src/hooks/usePreferences.js` - User preferences hooks
- `packages/shared/src/hooks/useRoutines.js` - Routine CRUD hooks with create/delete notifications
- `packages/shared/src/hooks/useSessionExercises.js` - Session exercise hooks with store injection
- `packages/shared/src/hooks/useRestTimer.js` - Timer engine with callback injection + rest timer state hook
- `packages/shared/src/hooks/useWorkout.js` - Barrel re-exporting useSessionExercises + useRestTimer
- `packages/shared/src/index.js` - Updated barrel with hook and notification exports

## Decisions Made
- **duplicateRoutine stays per-app**: exportRoutine and importRoutine use supabase directly and are not in packages/shared/src/lib/routineIO.js. useDuplicateRoutine is excluded from the shared useRoutines.js.
- **Notification scope**: Only added getNotifier()?.show() to key create/delete mutations (useCreateRoutine, useDeleteRoutine, useDeleteExercise), not to updates, reorders, or internal operations to avoid noise.
- **useWakeLock excluded**: Platform-specific hook (web uses navigator.wakeLock, RN uses expo-keep-awake). Stays in each app's local hooks.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All shared hooks ready for consumption by both apps
- Apps need to wire initStores() and initNotifications() at startup (Phase 6 rewiring)
- Apps need to replace local hook imports with @gym/shared imports (Phase 5 Plan 02)
- useDuplicateRoutine stays local in each app

---
*Phase: 05-hooks-migration*
*Completed: 2026-03-15*
