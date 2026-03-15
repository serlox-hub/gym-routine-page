---
phase: 05-hooks-migration
plan: 02
subsystem: hooks
tags: [tanstack-query, hooks, re-exports, store-injection, timer-engine, wake-lock]

# Dependency graph
requires:
  - phase: 05-hooks-migration/01
    provides: Shared hook files in packages/shared/src/hooks/ with store injection and notification service
provides:
  - Both apps wired to shared hooks via initStores/initNotifications at startup
  - 7 web hook files as 1-line re-exports from @gym/shared
  - 6 RN hook files as 1-line re-exports from @gym/shared
  - useRestTimer thin wrappers with platform-specific callbacks in both apps
  - useWorkout barrel re-exports in both apps
affects: [06-app-rewiring]

# Tech tracking
tech-stack:
  added: []
  patterns: [thin-re-export-from-shared, platform-timer-wrapper, initStores-at-module-scope]

key-files:
  modified:
    - apps/web/src/main.jsx
    - apps/gym-native/App.js
    - apps/web/src/hooks/useAdmin.js
    - apps/web/src/hooks/useAuth.js
    - apps/web/src/hooks/useBodyMeasurements.js
    - apps/web/src/hooks/useBodyWeight.js
    - apps/web/src/hooks/useExercises.js
    - apps/web/src/hooks/usePreferences.js
    - apps/web/src/hooks/useRoutines.js
    - apps/web/src/hooks/useSessionExercises.js
    - apps/web/src/hooks/useRestTimer.js
    - apps/web/src/hooks/useWorkout.js
    - apps/web/src/hooks/useWorkout.test.js
    - apps/gym-native/src/hooks/useAdmin.js
    - apps/gym-native/src/hooks/useAuth.js
    - apps/gym-native/src/hooks/useBodyMeasurements.js
    - apps/gym-native/src/hooks/useBodyWeight.js
    - apps/gym-native/src/hooks/useExercises.js
    - apps/gym-native/src/hooks/usePreferences.js
    - apps/gym-native/src/hooks/useRoutines.js
    - apps/gym-native/src/hooks/useRestTimer.js
    - apps/gym-native/src/hooks/useWorkout.js

key-decisions:
  - "RN useSessionExercises.js kept local -- uses addSessionExercise (RN-specific API) and optimistic reorder, differs from shared version"
  - "useDuplicateRoutine stays per-app in both useRoutines.js wrappers"
  - "initStores test setup added to useWorkout.test.js for shared hook compatibility"

patterns-established:
  - "Hook re-export pattern: `export * from '@gym/shared'` for hooks that map 1:1 to shared"
  - "Timer wrapper pattern: thin useTimerEngine() calling sharedTimerEngine with platform callbacks"
  - "Module-level init: initStores() and initNotifications() called at top of entry files, after initApi()"

requirements-completed: [HOOK-02, HOOK-03, HOOK-04]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 5 Plan 02: App Hook Rewiring Summary

**Both apps wired to shared hooks via initStores + 13 hook files replaced with thin re-exports/wrappers from @gym/shared**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T20:44:24Z
- **Completed:** 2026-03-15T20:48:43Z
- **Tasks:** 3
- **Files modified:** 22

## Accomplishments
- Web and RN apps call initStores at module level; RN also calls initNotifications with Toast adapter
- 7 web hooks and 6 RN hooks are 1-line re-exports from @gym/shared
- useRestTimer in both apps is a thin wrapper calling shared useTimerEngine with platform callbacks (web: AudioContext/WakeLock, RN: Haptics/Vibration/KeepAwake)
- useRoutines.js in both apps re-exports shared + keeps useDuplicateRoutine locally
- All 508 web tests pass, web build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire initStores and initNotifications in both apps** - `a68e54f` (feat)
2. **Task 2: Replace web app hook files with thin re-exports** - `1e1ac43` (feat)
3. **Task 3: Replace RN app hook files with thin re-exports** - `c018677` (feat)

## Files Created/Modified
- `apps/web/src/main.jsx` - Added initStores call at module level
- `apps/gym-native/App.js` - Added initStores + initNotifications calls at module level
- `apps/web/src/hooks/useAdmin.js` - 1-line re-export from @gym/shared
- `apps/web/src/hooks/useAuth.js` - 1-line re-export from @gym/shared
- `apps/web/src/hooks/useBodyMeasurements.js` - 1-line re-export from @gym/shared
- `apps/web/src/hooks/useBodyWeight.js` - 1-line re-export from @gym/shared
- `apps/web/src/hooks/useExercises.js` - 1-line re-export from @gym/shared
- `apps/web/src/hooks/usePreferences.js` - 1-line re-export from @gym/shared
- `apps/web/src/hooks/useSessionExercises.js` - 1-line re-export from @gym/shared
- `apps/web/src/hooks/useRoutines.js` - Re-export shared + local useDuplicateRoutine
- `apps/web/src/hooks/useRestTimer.js` - Thin wrapper with AudioContext/navigator.vibrate/WakeLock
- `apps/web/src/hooks/useWorkout.js` - Barrel re-exporting shared + app-local hooks
- `apps/web/src/hooks/useWorkout.test.js` - Added initStores setup for shared hook compatibility
- `apps/gym-native/src/hooks/useAdmin.js` - 1-line re-export from @gym/shared
- `apps/gym-native/src/hooks/useAuth.js` - 1-line re-export from @gym/shared
- `apps/gym-native/src/hooks/useBodyMeasurements.js` - 1-line re-export from @gym/shared
- `apps/gym-native/src/hooks/useBodyWeight.js` - 1-line re-export from @gym/shared
- `apps/gym-native/src/hooks/useExercises.js` - 1-line re-export from @gym/shared
- `apps/gym-native/src/hooks/usePreferences.js` - 1-line re-export from @gym/shared
- `apps/gym-native/src/hooks/useRoutines.js` - Re-export shared + local useDuplicateRoutine
- `apps/gym-native/src/hooks/useRestTimer.js` - Thin wrapper with Haptics/Vibration/KeepAwake
- `apps/gym-native/src/hooks/useWorkout.js` - Barrel re-exporting shared + app-local hooks

## Decisions Made
- **RN useSessionExercises.js kept local**: The RN version uses `addSessionExercise` (higher-level RN-specific API that computes sort order server-side) and has optimistic reorder, while shared version uses `insertSessionExercise` (web pattern with inline sort order). Replacing it would break RN behavior.
- **useDuplicateRoutine per-app**: Confirmed from Plan 01 -- duplicateRoutine uses supabase directly, not in shared API.
- **initStores in test**: Added `initStores({ authStore, workoutStore })` to useWorkout.test.js since shared hooks now access stores via `_stores.js` injection rather than direct import.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RN useSessionExercises.js kept as full implementation instead of re-export**
- **Found during:** Task 3 (RN hook replacement)
- **Issue:** Plan specified replacing RN useSessionExercises.js with `export * from '@gym/shared'`, but the RN version uses `addSessionExercise` (RN-specific API) and has optimistic reorder in useReorderSessionExercises, which differ from the shared version
- **Fix:** Kept RN useSessionExercises.js as-is to preserve correct behavior
- **Files modified:** None (file intentionally not changed)
- **Verification:** RN useSessionExercises.js still uses addSessionExercise API
- **Committed in:** c018677 (Task 3 commit)

**2. [Rule 3 - Blocking] Added initStores to useWorkout.test.js**
- **Found during:** Task 2 (web hook replacement)
- **Issue:** After replacing hooks with shared re-exports, useRestTimer from shared calls useWorkoutStore via _stores.js which requires initStores() to be called first. Tests failed with "initStores() must be called"
- **Fix:** Added initStores({ authStore, workoutStore }) call at module level in test file
- **Files modified:** apps/web/src/hooks/useWorkout.test.js
- **Verification:** All 508 tests pass
- **Committed in:** 1e1ac43 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug prevention, 1 blocking)
**Impact on plan:** Both deviations necessary for correctness. RN gets 6 re-exports instead of 7 (useSessionExercises stays local). No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All shared hooks consumed by both apps via re-exports
- Components keep their existing import paths unchanged (from '../hooks/useXxx.js')
- Phase 6 (app rewiring) can proceed with remaining cleanup

---
*Phase: 05-hooks-migration*
*Completed: 2026-03-15*
