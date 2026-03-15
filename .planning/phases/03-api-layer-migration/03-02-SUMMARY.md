---
phase: 03-api-layer-migration
plan: 02
subsystem: api
tags: [monorepo, shared-package, imports, hooks]

requires:
  - phase: 03-api-layer-migration
    provides: 7 API modules in packages/shared with initApi/getClient injection
provides:
  - Web hooks consuming API functions from @gym/shared instead of local api/ directory
  - Clean single-source imports (QUERY_KEYS + API functions merged in one @gym/shared import)
affects: [04-stores-migration, 05-hooks-migration]

tech-stack:
  added: []
  patterns: [merged-shared-imports-in-hooks]

key-files:
  created: []
  modified:
    - apps/web/src/hooks/useAdmin.js
    - apps/web/src/hooks/useBodyMeasurements.js
    - apps/web/src/hooks/useBodyWeight.js
    - apps/web/src/hooks/useCompletedSets.js
    - apps/web/src/hooks/useExercises.js
    - apps/web/src/hooks/usePreferences.js
    - apps/web/src/hooks/useRoutines.js
    - apps/web/src/hooks/useSession.js
    - apps/web/src/hooks/useSessionExercises.js
    - apps/web/src/hooks/useWorkoutHistory.js

key-decisions:
  - "useAuth.js inline Supabase query for user_settings left as-is -- no fetchUserSettings API function exists yet, deferred"

patterns-established:
  - "Web hooks import all shared functions (constants + API) from single @gym/shared statement"

requirements-completed: [API-03]

duration: 1min
completed: 2026-03-15
---

# Phase 3 Plan 02: Web Hook Import Migration Summary

**10 web hooks rewired to import API functions from @gym/shared, eliminating local api/ directory dependency**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-15T19:01:12Z
- **Completed:** 2026-03-15T19:02:46Z
- **Tasks:** 1
- **Files modified:** 10

## Accomplishments
- Updated all 10 web hook files to import API functions from @gym/shared instead of ../lib/api/
- Merged existing @gym/shared imports (QUERY_KEYS, buildSessionExercisesCache, etc.) with new API function imports into single import statements
- Verified web build passes cleanly after migration
- Confirmed apps/web/src/lib/api/ directory already removed from git tracking (was moved in plan 03-01)
- All 507 web tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Update all web hook imports and delete old api directory** - `62b59ff` (refactor)

## Files Created/Modified
- `apps/web/src/hooks/useAdmin.js` - Merged QUERY_KEYS + admin API imports from @gym/shared
- `apps/web/src/hooks/useBodyMeasurements.js` - Merged QUERY_KEYS + body measurements API imports
- `apps/web/src/hooks/useBodyWeight.js` - Merged QUERY_KEYS + body weight API imports
- `apps/web/src/hooks/useCompletedSets.js` - Merged QUERY_KEYS + completed sets API imports
- `apps/web/src/hooks/useExercises.js` - Merged QUERY_KEYS + exercise API imports
- `apps/web/src/hooks/usePreferences.js` - Merged QUERY_KEYS + preferences API imports
- `apps/web/src/hooks/useRoutines.js` - Merged QUERY_KEYS + routine API imports (kept routineIO.js separate)
- `apps/web/src/hooks/useSession.js` - Merged QUERY_KEYS + utils + session API imports
- `apps/web/src/hooks/useSessionExercises.js` - Merged QUERY_KEYS + session exercises API imports
- `apps/web/src/hooks/useWorkoutHistory.js` - Merged QUERY_KEYS + workout history API imports

## Decisions Made
- useAuth.js has an inline Supabase query for user_settings (useUserSettings hook). No fetchUserSettings function exists in the shared API layer yet. Left as-is and deferred to a future plan.

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (API layer migration) is now fully complete
- All web hooks consume shared API functions via @gym/shared
- Ready for Phase 4 (stores migration)

---
*Phase: 03-api-layer-migration*
*Completed: 2026-03-15*
