---
phase: 03-api-layer-migration
plan: 03
subsystem: api
tags: [react-native, hooks, shared-api, monorepo]

requires:
  - phase: 03-api-layer-migration
    provides: 7 API modules in packages/shared/src/api/ using getClient() injection
provides:
  - 8 RN hook files refactored to use shared API functions instead of inline Supabase queries
  - fetchUserSettings added to shared adminApi for both platforms
affects: [04-stores-migration, 05-hooks-migration]

tech-stack:
  added: []
  patterns: [rn-hooks-consume-shared-api-with-view-layer-transforms]

key-files:
  created: []
  modified:
    - apps/gym-native/src/hooks/useRoutines.js
    - apps/gym-native/src/hooks/useExercises.js
    - apps/gym-native/src/hooks/useBodyWeight.js
    - apps/gym-native/src/hooks/useBodyMeasurements.js
    - apps/gym-native/src/hooks/usePreferences.js
    - apps/gym-native/src/hooks/useAdmin.js
    - apps/gym-native/src/hooks/useWorkoutHistory.js
    - apps/gym-native/src/hooks/useAuth.js
    - apps/web/src/hooks/useAuth.js
    - packages/shared/src/api/adminApi.js

key-decisions:
  - "fetchUserSettings added to shared adminApi -- eliminates last inline supabase query in useAuth for both platforms"
  - "View-layer transforms (muscleGroups extraction, session detail mapping) kept in hook queryFn, not in shared API"

patterns-established:
  - "RN hooks call shared API functions, keep view-layer data transforms in queryFn"
  - "Hooks that need userId get it from useUserId() and pass to shared API as parameter"

requirements-completed: [API-04]

duration: 3min
completed: 2026-03-15
---

# Phase 3 Plan 03: RN Direct-Map Hooks Migration Summary

**8 RN hook files refactored from inline Supabase queries to shared API calls, plus fetchUserSettings added to shared adminApi**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T19:05:17Z
- **Completed:** 2026-03-15T19:08:37Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Refactored all 8 RN hook files to import and call shared API functions from @gym/shared
- Zero `import { supabase }` lines remain in these 8 files
- Added `fetchUserSettings` to shared adminApi and updated both web and RN useAuth.js to use it
- All 507 web tests pass after migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor useRoutines, useExercises, useBodyWeight, useBodyMeasurements** - `d2b81f5` (refactor)
2. **Task 2: Refactor usePreferences, useAdmin, useWorkoutHistory, useAuth** - `7a3e0ad` (refactor)

## Files Created/Modified
- `apps/gym-native/src/hooks/useRoutines.js` - 22 hooks now using shared routineApi functions
- `apps/gym-native/src/hooks/useExercises.js` - 9 hooks now using shared exerciseApi functions
- `apps/gym-native/src/hooks/useBodyWeight.js` - 5 hooks now using shared bodyWeightApi functions
- `apps/gym-native/src/hooks/useBodyMeasurements.js` - 4 hooks now using shared bodyMeasurementsApi functions
- `apps/gym-native/src/hooks/usePreferences.js` - 3 hooks now using shared preferencesApi functions
- `apps/gym-native/src/hooks/useAdmin.js` - 2 hooks now using shared adminApi functions
- `apps/gym-native/src/hooks/useWorkoutHistory.js` - 5 hooks now using shared workoutApi functions
- `apps/gym-native/src/hooks/useAuth.js` - useUserSettings now using shared fetchUserSettings
- `apps/web/src/hooks/useAuth.js` - useUserSettings migrated to shared fetchUserSettings
- `packages/shared/src/api/adminApi.js` - Added fetchUserSettings function

## Decisions Made
- Added `fetchUserSettings` to shared adminApi since it was missing (plan 03-02 had deferred it). Both web and RN now use it.
- View-layer transforms (muscleGroups extraction in useWorkoutHistory, session detail mapping in useSessionDetail, preferences default merging) kept in hook queryFn since they are UI-specific concerns, not API concerns.
- Parameter shape adapters used as thin wrappers in mutationFn where RN hook destructuring differed from shared API signatures (e.g., `{ dayId }` destructured then passed as positional arg to `deleteRoutineDay(dayId)`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added fetchUserSettings to shared adminApi and updated web useAuth.js**
- **Found during:** Task 2 (useAuth.js refactoring)
- **Issue:** No fetchUserSettings existed in shared API; plan noted it might need to be added
- **Fix:** Added fetchUserSettings to adminApi.js with reduce transform, updated web useAuth.js to also use it
- **Files modified:** packages/shared/src/api/adminApi.js, apps/web/src/hooks/useAuth.js
- **Verification:** grep confirms no supabase imports in web useAuth.js, 507 tests pass
- **Committed in:** 7a3e0ad (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for eliminating inline Supabase query. Web also benefits from the shared function.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 8 direct-map RN hooks now consume shared API
- Phase 03 API layer migration complete across all plans
- Ready for Phase 04 (stores migration)

---
*Phase: 03-api-layer-migration*
*Completed: 2026-03-15*
