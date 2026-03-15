---
phase: 02-utils-migration
plan: 01
subsystem: shared-utils
tags: [monorepo, npm-workspaces, git-mv, vitest, barrel-exports]

# Dependency graph
requires:
  - phase: 01-monorepo-scaffold
    provides: packages/shared package structure with npm workspace linking
provides:
  - 18 shared utility source files in packages/shared/src/lib/
  - 16 co-located test files in packages/shared/src/lib/
  - Barrel index.js re-exporting all shared modules
  - Vitest config discovering shared tests
  - Platform-specific stubs for constants.js and routineIO.js
affects: [02-utils-migration plan 02, 03-api-migration, 04-stores-migration]

# Tech tracking
tech-stack:
  added: []
  patterns: [barrel re-export via export *, platform-specific stub pattern, pure/impure split for routineIO]

key-files:
  created:
    - packages/shared/src/lib/routineIO.js (pure parts only)
    - packages/shared/src/lib/routineIO.test.js
    - apps/web/src/lib/constants.js (stub with getMuscleGroupBorderStyle)
    - apps/gym-native/src/lib/constants.js (stub with getMuscleGroupBorderStyle RN)
  modified:
    - packages/shared/src/index.js (full barrel re-exports)
    - apps/web/vite.config.js (vitest include glob)
    - apps/web/src/lib/routineIO.js (supabase-dependent + DOM functions only)
    - apps/gym-native/src/lib/routineIO.js (supabase-dependent functions only)

key-decisions:
  - "routineIO.js: only pure parts (constants + prompt builders) to shared; supabase-dependent functions stay in each app until Phase 3"
  - "constants.js: getMuscleGroupBorderStyle extracted to platform stubs (CSS string vs RN number); all data constants shared"
  - "RIR_OPTIONS uses web's 'Controlado' text (more descriptive than RN's 'Control')"
  - "queryClient.js deferred to Phase 6 per DX-02"

patterns-established:
  - "Platform stub pattern: app-specific functions import shared data and add platform logic"
  - "Pure/impure split: shared package contains only pure functions; supabase-dependent code stays in apps"

requirements-completed: [UTIL-01, UTIL-02, UTIL-03, UTIL-04]

# Metrics
duration: 7min
completed: 2026-03-15
---

# Phase 2 Plan 1: Utils Migration to Shared Package Summary

**18 pure utility files moved to packages/shared via git mv with barrel re-exports, platform-specific splits for constants.js and routineIO.js, and vitest config covering shared tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-15T17:35:28Z
- **Completed:** 2026-03-15T17:42:28Z
- **Tasks:** 2
- **Files modified:** 54

## Accomplishments
- Moved 18 source files and 16 test files to packages/shared/src/lib/ (git mv preserves blame)
- Split constants.js cleanly: pure data constants shared, getMuscleGroupBorderStyle in platform stubs
- Split routineIO.js: pure constants + prompt builders shared, supabase/DOM functions in each app
- Barrel index.js with 18 export * from statements covering all shared modules
- Vitest discovers and runs all 16 shared test files (473 tests passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Move files, handle borderline files, delete RN duplicates** - `0876224` (feat)
2. **Task 2: Update barrel index.js and vitest config** - `5ddc4b6` (feat)

## Files Created/Modified
- `packages/shared/src/lib/*.js` - 18 source files (15 identical via git mv + constants + routineIO pure + workoutTransforms)
- `packages/shared/src/lib/*.test.js` - 16 test files moved via git mv + routineIO.test.js rewritten for pure functions
- `packages/shared/src/index.js` - Barrel with 18 export * from statements
- `apps/web/vite.config.js` - Added include glob for shared tests
- `apps/web/src/lib/constants.js` - Stub: only getMuscleGroupBorderStyle (CSS string)
- `apps/web/src/lib/routineIO.js` - Retains supabase-dependent + DOM functions, re-exports pure parts from @gym/shared
- `apps/gym-native/src/lib/constants.js` - Stub: only getMuscleGroupBorderStyle (RN numeric)
- `apps/gym-native/src/lib/routineIO.js` - Retains supabase-dependent functions, re-exports pure parts from @gym/shared

## Decisions Made
- **routineIO.js split**: Only pure parts moved to shared (constants + prompt builders). Supabase-dependent functions (exportRoutine, importRoutine, duplicateRoutine) stay in each app. This avoids premature supabase injection refactoring (that's Phase 3 API work).
- **constants.js reconciliation**: Used web's 'Controlado' text for RIR_OPTIONS. getMuscleGroupBorderStyle extracted to platform stubs since web returns CSS strings and RN returns numeric values.
- **queryClient.js deferred**: Identical in both apps but deferred to Phase 6 per DX-02 requirement.
- **Re-export pattern**: App routineIO.js files re-export pure parts from @gym/shared for backward compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getMuscleGroupBorderStyle not removed from committed constants.js**
- **Found during:** Task 2 verification
- **Issue:** Edit to remove getMuscleGroupBorderStyle happened before git mv but the staged file retained the old content
- **Fix:** Staged the corrected constants.js (without getMuscleGroupBorderStyle) in Task 2 commit
- **Files modified:** packages/shared/src/lib/constants.js
- **Verification:** Confirmed function absent from committed file
- **Committed in:** 5ddc4b6 (Task 2 commit)

---

**Plan expected 18 test files but only 16 exist.** routineTemplates.js and constants.js never had test files in the original web codebase. This is a plan count error, not a deviation.

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor staging issue fixed in same task. No scope creep.

## Issues Encountered
- 1 web test file (useSession.test.js) fails because it imports from moved utils via old relative paths. This is expected per the plan: "This plan does NOT update import statements in consumer files. That is Plan 02."

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All shared utils in place with barrel re-exports
- Plan 02-02 can now update all consumer import paths from relative to @gym/shared
- Web build will break until Plan 02-02 updates imports (expected)

## Self-Check: PASSED

All key files verified present. Both task commits verified in git log.

---
*Phase: 02-utils-migration*
*Completed: 2026-03-15*
