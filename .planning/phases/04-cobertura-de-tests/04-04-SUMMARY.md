---
phase: 04-cobertura-de-tests
plan: 04
subsystem: testing
tags: [vitest, supabase, api, mocks, session-exercises, routine-mutations]

# Dependency graph
requires:
  - phase: 04-cobertura-de-tests plan 01
    provides: _testUtils.js con makeQueryMock y makeClientMock
provides:
  - Tests para sessionExercisesApi (10 funciones)
  - Tests para routineQueryApi (6 funciones)
  - Tests para routineMutationApi (15 funciones)
affects: [05-dx-improvements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getClient.mockImplementation con callCount para operaciones compuestas multi-step"
    - "makeClientMock con per-table responses para discriminar tablas en composed mutations"
    - "Tests rpc directos con clientMock.rpc vi.fn() separado del from()"

key-files:
  created:
    - packages/shared/src/api/sessionExercisesApi.test.js
    - packages/shared/src/api/routineQueryApi.test.js
    - packages/shared/src/api/routineMutationApi.test.js
  modified: []

key-decisions:
  - "callCount pattern con mockImplementation para operaciones compuestas que llaman getClient múltiples veces con diferentes tablas"
  - "setFavoriteRoutine verifica callCount (2 si isFavorite=true, 1 si false) para validar el branching"
  - "PGRST116 error code simulado como { code: 'PGRST116' } para probar el path de bloque no encontrado"

patterns-established:
  - "Composed ops pattern: getClient.mockImplementation(() => { callCount++; if (callCount === N) return makeClientMock({table: response}) })"
  - "rpc tests: { rpc: vi.fn().mockResolvedValue(...) } mock directo sin from()"

requirements-completed: [TEST-01]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 04 Plan 04: Session Exercises y Routine Mutation API Tests Summary

**71 tests nuevos cubriendo 31 funciones API: sessionExercisesApi, routineQueryApi, routineMutationApi con happy path, errors y operaciones compuestas multi-step**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T17:57:30Z
- **Completed:** 2026-03-16T18:00:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- sessionExercisesApi.test.js: 10 funciones cubiertas incluyendo addSessionExercise (composed) y reorderSessionExercises (rpc)
- routineQueryApi.test.js: 6 funciones cubiertas incluyendo test del sort JS post-query en fetchRoutineBlocks (Calentamiento primero)
- routineMutationApi.test.js: 15 funciones cubiertas, 4 operaciones compuestas (addExerciseToDay, duplicateRoutineExercise, moveRoutineExerciseToDay, setFavoriteRoutine) con paths de bloque existente vs creacion nueva

## Task Commits

1. **Task 1: Test sessionExercisesApi y routineQueryApi** - `1902419` (test)
2. **Task 2: Test routineMutationApi** - `e440cf2` (test)

**Plan metadata:** pendiente (docs: complete plan)

## Files Created/Modified
- `packages/shared/src/api/sessionExercisesApi.test.js` - 10 funciones: queries, mutations, composed addSessionExercise, rpc reorderSessionExercises
- `packages/shared/src/api/routineQueryApi.test.js` - 6 funciones: fetchRoutines, fetchRoutine, fetchRoutineDays, fetchRoutineDay, fetchRoutineBlocks (con JS sort), fetchRoutineAllExercises
- `packages/shared/src/api/routineMutationApi.test.js` - 15 funciones: CRUD simple, rpc reorderRoutineDays/reorderRoutineExercises, 4 operaciones compuestas

## Decisions Made
- `callCount` pattern con `mockImplementation` para operaciones compuestas que llaman `getClient` múltiples veces — cada llamada recibe un mock diferente
- `PGRST116` simulado como objeto `{ code: 'PGRST116' }` en lugar de `Error` — coincide con la condición `blockFetchError.code !== 'PGRST116'` del código fuente
- `setFavoriteRoutine` verifica `callCount` para confirmar el branching correcto (2 calls si `isFavorite=true`, 1 si `false`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cobertura de los 3 modulos API mas complejos completada
- Suite completa de 749 tests en packages/shared, todos en verde
- Fase 05 (DX improvements) puede proceder con confianza de regresion

---
*Phase: 04-cobertura-de-tests*
*Completed: 2026-03-16*

## Self-Check: PASSED

- sessionExercisesApi.test.js: FOUND
- routineQueryApi.test.js: FOUND
- routineMutationApi.test.js: FOUND
- 04-04-SUMMARY.md: FOUND
- Commit 1902419 (Task 1): FOUND
- Commit e440cf2 (Task 2): FOUND
