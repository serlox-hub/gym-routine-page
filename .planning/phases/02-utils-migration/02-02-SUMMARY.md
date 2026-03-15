---
phase: 02-utils-migration
plan: 02
subsystem: shared-utils
tags: [monorepo, npm-workspaces, barrel-imports, import-migration]

# Dependency graph
requires:
  - phase: 02-utils-migration plan 01
    provides: 18 shared utility files in packages/shared with barrel re-exports
provides:
  - All consumer files in both apps import shared utils from @gym/shared
  - Platform-specific imports (supabase, styles, videoStorage, getMuscleGroupBorderStyle, routineIO supabase functions) remain as relative
affects: [03-api-migration, 04-stores-migration]

# Tech tracking
tech-stack:
  added: []
  patterns: [consolidated @gym/shared barrel imports replacing relative ../lib/ paths, split imports for partial modules]

key-files:
  created: []
  modified:
    - apps/web/src/components/**/*.jsx (53 web component files)
    - apps/web/src/hooks/*.js (10 web hook files)
    - apps/web/src/pages/*.jsx (9 web page files)
    - apps/web/src/lib/api/exerciseApi.js (api subdirectory import)
    - apps/gym-native/src/components/**/*.jsx (34 RN component files)
    - apps/gym-native/src/hooks/*.js (11 RN hook files)
    - apps/gym-native/src/screens/*.jsx (10 RN screen files)

key-decisions:
  - "Files using both shared and platform-specific exports from constants.js get two import lines: one from @gym/shared, one from relative path"
  - "routineIO shared exports (buildChatbotPrompt, buildAdaptRoutinePrompt) imported from @gym/shared; supabase-dependent functions from relative stub"

patterns-established:
  - "All shared util consumption uses import { ... } from '@gym/shared' — no more relative ../lib/ paths"
  - "Multi-import consolidation: multiple shared util imports merged into single @gym/shared import line"

requirements-completed: [UTIL-01, UTIL-03]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 2 Plan 2: Bulk Import Migration to @gym/shared Summary

**112 consumer files across web and gym-native apps migrated from relative ../lib/ imports to consolidated @gym/shared barrel imports, with partial splits for platform-specific constants and routineIO**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T17:43:31Z
- **Completed:** 2026-03-15T17:48:03Z
- **Tasks:** 2
- **Files modified:** 112

## Accomplishments
- 109 files bulk-migrated via automated script replacing relative imports with @gym/shared
- 3 additional files fixed manually (alias @/lib/ pattern and lib/api/ subdirectory)
- 115 import lines now point to @gym/shared across both apps
- 507 tests passing, web build succeeds
- Platform-specific imports (getMuscleGroupBorderStyle, exportRoutine, importRoutine, etc.) correctly preserved as relative

## Task Commits

Each task was committed atomically:

1. **Task 1: Bulk-replace shared util imports** - `e69a897` (refactor)
2. **Task 2: Fix missed imports and verify builds** - `f836724` (fix)

## Files Created/Modified
- `apps/web/src/components/**/*.jsx` - 35 web components updated
- `apps/web/src/hooks/*.js` - 10 web hooks updated
- `apps/web/src/pages/*.jsx` - 8 web pages updated
- `apps/web/src/lib/api/exerciseApi.js` - API layer import updated
- `apps/gym-native/src/components/**/*.jsx` - 34 RN components updated
- `apps/gym-native/src/hooks/*.js` - 11 RN hooks updated
- `apps/gym-native/src/screens/*.jsx` - 10 RN screens updated

## Decisions Made
- Files importing both shared constants (QUERY_KEYS, SENSATION_LABELS, etc.) and platform-specific getMuscleGroupBorderStyle get two separate import lines.
- buildChatbotPrompt and buildAdaptRoutinePrompt imported directly from @gym/shared (not through routineIO stub re-export).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed @/lib/ alias imports not caught by migration script**
- **Found during:** Task 2 (build verification)
- **Issue:** Two files (useAuth.js, ResetPassword.jsx) used Vite `@/lib/` alias instead of relative `../lib/` paths, bypassing the migration regex
- **Fix:** Manually updated QUERY_KEYS and validateResetPasswordForm imports to @gym/shared
- **Files modified:** apps/web/src/hooks/useAuth.js, apps/web/src/pages/ResetPassword.jsx
- **Verification:** Build passes after fix
- **Committed in:** f836724

**2. [Rule 3 - Blocking] Fixed lib/api/ subdirectory import not caught by migration**
- **Found during:** Task 2 (build verification)
- **Issue:** exerciseApi.js in lib/api/ used `../measurementTypes.js` (sibling-relative to parent lib/), not matching the expected import patterns
- **Fix:** Updated MeasurementType import to @gym/shared
- **Files modified:** apps/web/src/lib/api/exerciseApi.js
- **Verification:** Build passes after fix
- **Committed in:** f836724

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were edge-case import patterns not covered by the bulk migration. Fixed immediately during build verification. No scope creep.

## Issues Encountered
None beyond the deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 02 (Utils Migration) is now complete
- All shared utils live in packages/shared and are consumed via @gym/shared barrel
- Ready for Phase 03 (API Migration)

---
*Phase: 02-utils-migration*
*Completed: 2026-03-15*
