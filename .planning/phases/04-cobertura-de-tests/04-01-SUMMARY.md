---
phase: 04-cobertura-de-tests
plan: "01"
subsystem: api-tests
tags: [testing, vitest, supabase-mock, workoutSessionApi, completedSetsApi]
dependency_graph:
  requires: []
  provides: [_testUtils.js shared mock helpers, workoutSessionApi tests, completedSetsApi tests]
  affects: [04-02, 04-03]
tech_stack:
  added: []
  patterns: [thenable-mock-chain, makeQueryMock, makeClientMock]
key_files:
  created:
    - packages/shared/src/api/_testUtils.js
    - packages/shared/src/api/workoutSessionApi.test.js
    - packages/shared/src/api/completedSetsApi.test.js
  modified: []
decisions:
  - "makeQueryMock usa patrón thenable (then/catch/finally) en lugar de mockResolvedValue en métodos individuales — permite múltiples .eq() en cadena sin romper el chain, ya que mockResolvedValue sobreescribe mockReturnThis"
  - "completedSetsApi usa el mismo from() mock (no makeClientMock) porque todos los tests son de tabla única — simplicidad sobre uniformidad"
metrics:
  duration: "3 minutos"
  completed_date: "2026-03-16"
  tasks: 2
  files_created: 3
  tests_added: 51
---

# Phase 04 Plan 01: Test Utilities y Tests de API (workoutSessionApi + completedSetsApi) Summary

Shared Supabase test mock helpers (makeQueryMock/makeClientMock) con patrón thenable para soportar chains arbitrarios, más 51 tests cubriendo los 16 métodos de workoutSessionApi y completedSetsApi.

## What Was Built

### _testUtils.js — Shared mock helpers

`packages/shared/src/api/_testUtils.js` exporta dos funciones reutilizables para todos los test files de API:

- **`makeQueryMock(resolveWith)`**: Crea un chain de Supabase con todos los métodos encadenables (`select`, `eq`, `neq`, `order`, `in`, `not`, `is`, `gte`, `lte`, `limit`, `range`, `update`, `insert`, `delete`, `upsert`) que retornan `this`. Los métodos terminales explícitos (`single`, `maybeSingle`) resuelven con `resolveWith`. El objeto chain también es thenable (`then`/`catch`/`finally`), por lo que hacer `await chain` directamente también resuelve con `resolveWith`.

- **`makeClientMock(tableResponses)`**: Envuelve `makeQueryMock` con discriminación por tabla vía `from(table)`. Incluye mock de `rpc` que resuelve a `{ data: null, error: null }` por defecto.

### workoutSessionApi.test.js — 36 tests

Cubre los 12 métodos del módulo:

| Función | Terminador real | Tests |
|---------|----------------|-------|
| fetchActiveSession | .maybeSingle() | 3 (session, null, error) |
| fetchCompletedSetsForSession | thenable (no .single) | 3 |
| startWorkoutSession | .rpc() | 2 |
| fetchExerciseIdsWithSets | thenable | 3 |
| deleteSessionExercisesWithoutSets | thenable (.not) | 3 |
| completeWorkoutSession | .single() | 3 |
| deleteWorkoutSession | thenable (.eq) | 2 |
| fetchWorkoutHistory | thenable (.order) | 3 |
| fetchSessionDetail | .single() | 3 |
| fetchExerciseHistorySummary | thenable (.order, cond.) | 3 |
| fetchExerciseHistory | thenable (.range, cond.) | 3 |
| fetchPreviousWorkout | thenable (.limit) | 3 |

### completedSetsApi.test.js — 15 tests

Cubre los 4 métodos:

| Función | Tests |
|---------|-------|
| upsertCompletedSet | 4 (success, error, time-based, distance-based) |
| updateSetVideo | 3 (success, null URL, error) |
| updateSetDetails | 4 (success, error, con videoUrl, sin videoUrl) |
| deleteCompletedSet | 3 (success, error, set arbitrario) |

## Verification

```
Test Files  26 passed (26)
     Tests  615 passed (615)
```

Todos los test existentes (routineApi.test.js, useWorkoutHistory.test.js, useCompletedSets.test.js, createWorkoutStore.test.js) siguen en verde.

## Decisions Made

1. **Patrón thenable en makeQueryMock**: El problema con `mockResolvedValue` en métodos como `.eq()` es que sobreescribe `mockReturnThis()`, rompiendo el chain cuando se llama `.eq().eq()`. La solución fue hacer el objeto chain thenable — tiene `then/catch/finally` ligados a una Promise resuelta con el valor esperado. Así, hacer `await chain` funciona independientemente de en qué método termina el chain, sin romper métodos intermedios.

2. **from() inline vs makeClientMock**: Los tests de completedSetsApi usan `{ from: () => mock }` directamente porque cada test tiene solo una tabla. makeClientMock se usa cuando hay discriminación de tabla necesaria.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] mockResolvedValue en eq/order sobreescribía la cadena**
- **Found during:** Task 1, primeros tests de fetchPreviousWorkout y fetchExerciseHistory
- **Issue:** makeQueryMock usaba `chain.eq.mockResolvedValue(resolveWith)` después de `mockReturnThis()`. Vitest: la última llamada a `.mock*` gana, por lo que `.eq()` resolvía como Promise en lugar de retornar `chain`. Segundo `.eq()` en el chain fallaba con "eq is not a function".
- **Fix:** Rediseño de makeQueryMock para hacer el objeto `chain` thenable en lugar de sobrescribir métodos individuales. Todos los métodos de chain retornan `this` sin excepción; el objeto en sí resuelve cuando se hace await directo.
- **Files modified:** packages/shared/src/api/_testUtils.js
- **Commit:** abb5dfc (incluido en el commit de Task 1)

## Self-Check: PASSED

- FOUND: packages/shared/src/api/_testUtils.js
- FOUND: packages/shared/src/api/workoutSessionApi.test.js
- FOUND: packages/shared/src/api/completedSetsApi.test.js
- FOUND: .planning/phases/04-cobertura-de-tests/04-01-SUMMARY.md
- FOUND commit: abb5dfc (Task 1)
- FOUND commit: 5488adc (Task 2)
