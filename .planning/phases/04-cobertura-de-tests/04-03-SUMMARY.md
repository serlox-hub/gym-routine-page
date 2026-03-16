---
phase: 04-cobertura-de-tests
plan: 03
subsystem: testing
tags: [vitest, react-testing-library, tanstack-query, renderHook, hooks, useRoutines, useExercises, useSessionExercises]

# Dependency graph
requires:
  - phase: 04-cobertura-de-tests
    provides: test infrastructure patterns from useWorkoutHistory.test.js and useCompletedSets.test.js

provides:
  - Tests for useRoutines (6 query hooks + 4 mutations)
  - Tests for useExercisesWithMuscleGroup, useMuscleGroups, useCreateExercise, useUpdateExercise, useDeleteExercise
  - Tests for useSessionExercises, useAddSessionExercise, useRemoveSessionExercise, useReorderSessionExercises
affects: [future hook changes, API layer changes in routineApi, exerciseApi, workoutApi]

# Tech tracking
tech-stack:
  added: []
  patterns: [renderHook + QueryClientProvider wrapper, vi.mock('./useAuth.js') to avoid _stores.js initStores, vi.mock('./_stores.js') for workoutStore]

key-files:
  created:
    - packages/shared/src/hooks/useRoutines.test.js
    - packages/shared/src/hooks/useExercises.test.js
    - packages/shared/src/hooks/useSessionExercises.test.js
  modified: []

key-decisions:
  - "useRoutines y useExercises usan useUserId de useAuth.js (no de _stores.js directamente) — mock de ./useAuth.js en lugar de _stores.js"
  - "TanStack Query pasa segundo argumento (meta context) a mutationFn cuando se asigna directamente — usar expect.anything() en assertions de updateExercise y deleteExercise"

patterns-established:
  - "Hooks que usan useUserId: mockear './useAuth.js' con useUserId devolviendo 'user-123'"
  - "Hooks que usan useWorkoutStore: mockear './_stores.js' con mockStore y selector fn"
  - "Mutations directas (mutationFn: apiFunction): usar toHaveBeenCalledWith(args, expect.anything()) para ignorar el contexto TanStack Query"

requirements-completed: [TEST-03]

# Metrics
duration: 12min
completed: 2026-03-16
---

# Phase 4 Plan 3: Tests de hooks useRoutines, useExercises y useSessionExercises

**Tests de renderHook + QueryClientProvider para los tres hooks críticos del shared layer, cubriendo 6 queries + 7 mutations con mocks aislados de API y stores**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-16T18:52:00Z
- **Completed:** 2026-03-16T18:54:46Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- useRoutines.test.js: cubre los 6 query hooks con `enabled: !!id` guard tests y 4 mutations representativas
- useExercises.test.js: cubre useExercisesWithMuscleGroup, useMuscleGroups y 3 mutations (create, update, delete)
- useSessionExercises.test.js: cubre useSessionExercises query y 3 mutations incluyendo lógica de sort_order en useAddSessionExercise
- Todos los tests pasan (601 total, 25 test files)

## Task Commits

1. **Task 1: Test useRoutines hooks** - `4a932ac` (test)
2. **Task 2: Test useExercises y useSessionExercises hooks** - `f721ac4` (test)

## Files Created/Modified
- `packages/shared/src/hooks/useRoutines.test.js` - 16 tests para queries y mutations de rutinas
- `packages/shared/src/hooks/useExercises.test.js` - 7 tests para queries y mutations de ejercicios
- `packages/shared/src/hooks/useSessionExercises.test.js` - 7 tests para session exercises

## Decisions Made
- `useRoutines.js` y `useExercises.js` importan `useUserId` de `useAuth.js`, no de `_stores.js`. Se mockea `./useAuth.js` directamente en lugar de `_stores.js`.
- TanStack Query pasa un segundo argumento de contexto a la `mutationFn` cuando se asigna directamente (e.g., `mutationFn: updateExercise`). Assertions usan `expect.anything()` para el segundo parámetro.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrección de assertions en useUpdateExercise y useDeleteExercise**
- **Found during:** Task 2 (useExercises.test.js)
- **Issue:** TanStack Query pasa segundo argumento (meta context) a mutationFns asignadas directamente. `toHaveBeenCalledWith(args)` fallaba porque recibía `[args, { client, meta, mutationKey }]`
- **Fix:** Cambiar a `toHaveBeenCalledWith(args, expect.anything())`
- **Files modified:** packages/shared/src/hooks/useExercises.test.js
- **Verification:** Todos los tests pasan
- **Committed in:** f721ac4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug en assertion)
**Impact on plan:** Fix necesario para tests correctos. Sin scope creep.

## Issues Encountered
- El plan mencionaba `useSessionExerciseBlockName` como hook en useSessionExercises.js pero dicho hook no existe en el archivo real — el archivo exporta `useSessionExercises`, `useAddSessionExercise`, `useReplaceSessionExercise`, `useRemoveSessionExercise`, `useReorderSessionExercises`. Tests escritos con los hooks que existen realmente.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Todos los hooks críticos del shared layer están cubiertos con tests
- La suite de tests shared alcanza 601 tests en 25 archivos
- Listo para el plan 04-04 si existe, o cierre de fase 04

## Self-Check: PASSED

- FOUND: packages/shared/src/hooks/useRoutines.test.js
- FOUND: packages/shared/src/hooks/useExercises.test.js
- FOUND: packages/shared/src/hooks/useSessionExercises.test.js
- FOUND: .planning/phases/04-cobertura-de-tests/04-03-SUMMARY.md
- FOUND: commit 4a932ac (Task 1)
- FOUND: commit f721ac4 (Task 2)

---
*Phase: 04-cobertura-de-tests*
*Completed: 2026-03-16*
