---
phase: 04-store-factories
plan: 01
subsystem: stores
tags: [zustand, persist, factory-pattern, shared-stores]

requires:
  - phase: 01-monorepo-scaffold
    provides: packages/shared workspace structure
provides:
  - createWorkoutStore factory with workoutStoreState export
  - createAuthStore factory with platform hook injection
affects: [04-02, 05-hooks-migration]

tech-stack:
  added: []
  patterns: [store-factory-with-hooks, platform-agnostic-state]

key-files:
  created:
    - packages/shared/src/stores/createWorkoutStore.js
    - packages/shared/src/stores/createAuthStore.js
    - packages/shared/src/stores/createWorkoutStore.test.js
  modified: []

key-decisions:
  - "Persist test reemplazado por factory isolation tests (zustand v5 removio persist API publica)"
  - "onBeforeLogout es async para soportar GoogleSignin.signOut en RN"
  - "loginWithGoogle excluido del factory -- cada plataforma implementa localmente"

patterns-established:
  - "Store factory pattern: createXStore(deps, hooks?) retorna Zustand store instance"
  - "workoutStoreState export permite a RN extender con campos extra (workoutVisible)"

requirements-completed: [STOR-01, STOR-02]

duration: 10min
completed: 2026-03-15
---

# Phase 4 Plan 1: Store Factories Summary

**Factories createWorkoutStore y createAuthStore en packages/shared con inyeccion de dependencias y hooks por plataforma**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-15T19:45:46Z
- **Completed:** 2026-03-15T19:55:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- createWorkoutStore factory con workoutStoreState export para extension por plataforma (RN workoutVisible)
- createAuthStore factory con hooks inyectables (onBeforeInitialize, onBeforeLogout, onResetPasswordOptions)
- 21 tests pasan contra store creado por factory
- Cero referencias a window, localStorage, AsyncStorage, GoogleSignin o Platform en shared stores

## Task Commits

Each task was committed atomically:

1. **Task 1: Create createWorkoutStore factory + migrate test** - `c27d3fb` (feat)
2. **Task 2: Create createAuthStore factory** - `22399ad` (feat)
3. **JSDoc cleanup** - `906b21d` (fix)

## Files Created/Modified
- `packages/shared/src/stores/createWorkoutStore.js` - Workout store factory + state builder export
- `packages/shared/src/stores/createWorkoutStore.test.js` - 21 tests migrados y adaptados para factory
- `packages/shared/src/stores/createAuthStore.js` - Auth store factory con hooks de plataforma

## Decisions Made
- Persist test reemplazado por factory isolation tests: zustand v5 elimino la API publica `store.persist`; se verifican independencia de instancias y aceptacion de storage adapter
- onBeforeLogout es async para soportar GoogleSignin.signOut() asincronico en RN
- loginWithGoogle excluido del factory: implementaciones completamente distintas entre web (OAuth redirect) y RN (native SDK + idToken)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Persist test incompatible con zustand v5**
- **Found during:** Task 1
- **Issue:** `store.persist.getOptions()` ya no existe en zustand v5 (test pre-existente ya fallaba)
- **Fix:** Reemplazado por tests de factory: independencia de instancias + custom storage adapter
- **Files modified:** packages/shared/src/stores/createWorkoutStore.test.js
- **Committed in:** c27d3fb

**2. [Rule 1 - Bug] JSDoc con referencias a plataforma disparan verificacion**
- **Found during:** Task 2 verification
- **Issue:** Comentarios JSDoc mencionaban localStorage, AsyncStorage, GoogleSignin
- **Fix:** Reescribir JSDoc con terminos genericos
- **Files modified:** createWorkoutStore.js, createAuthStore.js
- **Committed in:** 906b21d

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Fixes necesarios para correctness y verificacion. Sin scope creep.

## Issues Encountered
None beyond the documented deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Store factories listas para instanciacion en Plan 02
- Web y RN pueden crear stores pasando sus adapters y hooks especificos
- workoutStoreState export permite a RN extender con workoutVisible

---
*Phase: 04-store-factories*
*Completed: 2026-03-15*
