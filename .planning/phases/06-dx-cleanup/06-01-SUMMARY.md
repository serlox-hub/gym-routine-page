---
phase: 06-dx-cleanup
plan: 01
subsystem: infra
tags: [queryClient, tanstack-query, monorepo, dx]

requires:
  - phase: 05-hooks-migration
    provides: shared hooks and store factories in packages/shared
provides:
  - queryClient singleton exported from @gym/shared
  - muscleGroupStyles.js renamed platform stubs in both apps
affects: [06-dx-cleanup]

tech-stack:
  added: []
  patterns:
    - "QueryClient singleton in shared package, imported by both apps"

key-files:
  created:
    - packages/shared/src/lib/queryClient.js
  modified:
    - packages/shared/src/index.js
    - apps/web/src/main.jsx
    - apps/web/src/stores/authStore.js
    - apps/gym-native/App.js
    - apps/gym-native/src/stores/authStore.js
    - apps/web/src/lib/muscleGroupStyles.js
    - apps/gym-native/src/lib/muscleGroupStyles.js

key-decisions:
  - "queryClient identical in both apps, moved to shared as-is"

patterns-established:
  - "QueryClient singleton: single instance in packages/shared, both apps import from @gym/shared"

requirements-completed: [DX-01, DX-02]

duration: 1min
completed: 2026-03-15
---

# Phase 6 Plan 1: Share queryClient and Rename Constants Stubs Summary

**QueryClient singleton moved to packages/shared; constants.js stubs renamed to muscleGroupStyles.js in both apps**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-15T22:14:44Z
- **Completed:** 2026-03-15T22:16:13Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments
- Eliminated duplicated queryClient between web and RN apps by moving to packages/shared
- Renamed ambiguous constants.js platform stubs to muscleGroupStyles.js for clarity
- Updated all 15 import sites (4 queryClient + 11 getMuscleGroupBorderStyle)

## Task Commits

Each task was committed atomically:

1. **Task 1: Move queryClient to packages/shared** - `eb367e6` (refactor)
2. **Task 2: Rename constants.js to muscleGroupStyles.js** - `94a2efe` (refactor)

## Files Created/Modified
- `packages/shared/src/lib/queryClient.js` - Shared QueryClient singleton
- `packages/shared/src/index.js` - Added queryClient export
- `apps/web/src/main.jsx` - Import queryClient from @gym/shared
- `apps/web/src/stores/authStore.js` - Import queryClient from @gym/shared
- `apps/gym-native/App.js` - Import queryClient from @gym/shared
- `apps/gym-native/src/stores/authStore.js` - Import queryClient from @gym/shared
- `apps/web/src/lib/muscleGroupStyles.js` - Renamed from constants.js
- `apps/gym-native/src/lib/muscleGroupStyles.js` - Renamed from constants.js
- 6 web components/pages - Updated getMuscleGroupBorderStyle imports
- 5 RN components/screens - Updated getMuscleGroupBorderStyle imports

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- queryClient consolidated in shared, ready for any future query config changes
- File naming audit (DX-04) will pass cleanly without constants.js special-casing

---
*Phase: 06-dx-cleanup*
*Completed: 2026-03-15*
