---
phase: 04-store-factories
plan: 02
subsystem: stores
tags: [zustand, factory-instantiation, platform-stores, store-dedup]

requires:
  - phase: 04-store-factories
    plan: 01
    provides: createWorkoutStore, workoutStoreState, createAuthStore factories
provides:
  - Web stores replaced with thin factory instantiation files
  - RN stores replaced with factory instantiation + platform extensions
affects: [05-hooks-migration]

tech-stack:
  added: []
  patterns: [factory-instantiation, state-spread-extension, post-creation-setState]

key-files:
  created: []
  modified:
    - packages/shared/src/index.js
    - apps/web/src/stores/workoutStore.js
    - apps/web/src/stores/authStore.js
    - apps/gym-native/src/stores/workoutStore.js
    - apps/gym-native/src/stores/authStore.js

key-decisions:
  - "Web workoutStore reducido a 3 lineas -- createWorkoutStore() sin args usa localStorage default"
  - "RN workoutStore usa spread de workoutStoreState + overrides para workoutVisible en startSession/endSession/restoreSession"
  - "loginWithGoogle inyectado via setState post-creacion en ambas plataformas (web: OAuth redirect, RN: native SDK)"

patterns-established:
  - "Factory instantiation: app store = factory(deps) + setState for platform-only actions"
  - "State spread extension: workoutStoreState(set,get) spread + overrides for platform-specific fields"

requirements-completed: [STOR-03, STOR-04, STOR-05]

duration: 1min
completed: 2026-03-15
---

# Phase 4 Plan 2: Store Instantiation Summary

**Stores web y RN reemplazados por instanciacion de factories compartidas -- 726 lineas duplicadas eliminadas**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-15T19:58:00Z
- **Completed:** 2026-03-15T19:59:18Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Web workoutStore reducido de 270 a 4 lineas (createWorkoutStore sin args)
- Web authStore reemplazado con createAuthStore + callbacks de plataforma (hash parsing, localStorage cleanup, redirectTo)
- RN workoutStore usa workoutStoreState spread + workoutVisible extension con AsyncStorage y partialize
- RN authStore usa createAuthStore + Google Sign-In cleanup en onBeforeLogout
- loginWithGoogle inyectado localmente en cada plataforma via setState
- 508 web tests pasan, build exitoso
- Cero referencias a plataforma en packages/shared/src/stores/

## Task Commits

Each task was committed atomically:

1. **Task 1: Update barrel + replace web store files** - `e77762b` (feat)
2. **Task 2: Replace RN store files with factory instantiation** - `d1f1710` (feat)

## Files Created/Modified
- `packages/shared/src/index.js` - Agregados exports de store factories
- `apps/web/src/stores/workoutStore.js` - Reducido a 4 lineas con createWorkoutStore()
- `apps/web/src/stores/authStore.js` - Reemplazado con createAuthStore + web callbacks + loginWithGoogle
- `apps/gym-native/src/stores/workoutStore.js` - Reemplazado con workoutStoreState spread + workoutVisible + AsyncStorage
- `apps/gym-native/src/stores/authStore.js` - Reemplazado con createAuthStore + Google Sign-In native SDK

## Decisions Made
- Web workoutStore usa createWorkoutStore() sin argumentos (localStorage default de zustand persist)
- RN workoutStore usa workoutStoreState spread en vez de createWorkoutStore para poder override startSession/endSession/restoreSession con workoutVisible
- loginWithGoogle agregado via setState post-creacion en ambas plataformas -- mantiene el factory limpio de logica de plataforma

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- Toda logica de stores compartida vive en packages/shared
- Apps solo contienen instanciacion + extensiones de plataforma
- Listo para Phase 5: hooks migration

---
*Phase: 04-store-factories*
*Completed: 2026-03-15*
