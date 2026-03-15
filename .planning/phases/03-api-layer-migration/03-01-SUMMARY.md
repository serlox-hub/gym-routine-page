---
phase: 03-api-layer-migration
plan: 01
subsystem: api
tags: [supabase, dependency-injection, monorepo, shared-package]

requires:
  - phase: 02-utils-migration
    provides: shared package barrel with lib exports
provides:
  - 7 API modules in packages/shared/src/api/ using getClient() injection
  - _client.js initApi/getClient dependency injection mechanism
  - initApi() wired in both web and native entry points
affects: [03-02, 04-stores-migration, 05-hooks-migration]

tech-stack:
  added: []
  patterns: [supabase-client-injection-via-initApi-getClient]

key-files:
  created:
    - packages/shared/src/api/_client.js
  modified:
    - packages/shared/src/api/exerciseApi.js
    - packages/shared/src/api/routineApi.js
    - packages/shared/src/api/workoutApi.js
    - packages/shared/src/api/bodyWeightApi.js
    - packages/shared/src/api/bodyMeasurementsApi.js
    - packages/shared/src/api/preferencesApi.js
    - packages/shared/src/api/adminApi.js
    - packages/shared/src/index.js
    - apps/web/src/main.jsx
    - apps/gym-native/App.js

key-decisions:
  - "initApi/getClient pattern for supabase injection -- keeps API files platform-agnostic"
  - "exerciseApi uses relative import for MeasurementType to avoid circular @gym/shared self-import"

patterns-established:
  - "API injection: initApi(supabase) called once at app startup, getClient() used in every API function"
  - "API files use relative imports within packages/shared, never @gym/shared self-reference"

requirements-completed: [API-01, API-02]

duration: 2min
completed: 2026-03-15
---

# Phase 3 Plan 01: API Layer Migration Summary

**7 API files moved to packages/shared with supabase client injection via initApi/getClient pattern**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T18:30:02Z
- **Completed:** 2026-03-15T18:31:53Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Created _client.js with initApi/getClient dependency injection for platform-agnostic supabase usage
- Moved all 7 API files (exercise, routine, workout, bodyWeight, bodyMeasurements, preferences, admin) to shared package
- Replaced all direct supabase imports with getClient() calls across all API files
- Wired initApi(supabase) in both web main.jsx and native App.js entry points
- Updated barrel index.js to export all API functions and initApi

## Task Commits

Each task was committed atomically:

1. **Task 1: Create _client.js and move 7 API files with refactored imports** - `fe54999` (feat)
2. **Task 2: Update barrel exports and wire initApi in both entry points** - `0de997c` (feat)

## Files Created/Modified
- `packages/shared/src/api/_client.js` - initApi/getClient injection module
- `packages/shared/src/api/exerciseApi.js` - Exercise CRUD (moved + refactored)
- `packages/shared/src/api/routineApi.js` - Routine CRUD (moved + refactored)
- `packages/shared/src/api/workoutApi.js` - Workout sessions, sets, history (moved + refactored)
- `packages/shared/src/api/bodyWeightApi.js` - Body weight tracking (moved + refactored)
- `packages/shared/src/api/bodyMeasurementsApi.js` - Body measurements (moved + refactored)
- `packages/shared/src/api/preferencesApi.js` - User preferences (moved + refactored)
- `packages/shared/src/api/adminApi.js` - Admin user management (moved + refactored)
- `packages/shared/src/index.js` - Added API layer exports
- `apps/web/src/main.jsx` - Added initApi(supabase) call
- `apps/gym-native/App.js` - Added initApi(supabase) call

## Decisions Made
- Used initApi/getClient pattern for supabase injection -- keeps API files platform-agnostic without requiring each consumer to pass client
- Changed exerciseApi's `@gym/shared` import to relative `../lib/measurementTypes.js` to avoid circular self-import within the package

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 7 API files available from `@gym/shared` for both apps
- Plan 03-02 should follow immediately to re-wire web hook imports (web build currently broken due to moved files)
- Native app ready to consume shared API functions

---
*Phase: 03-api-layer-migration*
*Completed: 2026-03-15*
