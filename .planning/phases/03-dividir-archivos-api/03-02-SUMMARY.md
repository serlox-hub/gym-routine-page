---
phase: 03-dividir-archivos-api
plan: "02"
subsystem: shared-api
tags: [refactor, file-split, barrel-export]
dependency_graph:
  requires: []
  provides: [routineQueryApi, routineMutationApi, routineIOApi, routineApi-barrel]
  affects: [packages/shared/src/api/routineApi.js]
tech_stack:
  added: []
  patterns: [barrel-re-export, explicit-named-exports]
key_files:
  created:
    - packages/shared/src/api/routineQueryApi.js
    - packages/shared/src/api/routineMutationApi.js
    - packages/shared/src/api/routineIOApi.js
  modified:
    - packages/shared/src/api/routineApi.js
decisions:
  - routineApi.js convertido a barrel con re-exports nombrados explícitos (no `export *`) para preservar tree-shaking y legibilidad
  - moveRoutineExerciseToDay agrupado en routineMutationApi aunque en el original estaba al final del archivo, después de la sección IO
metrics:
  duration: ~5min
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 03 Plan 02: Dividir routineApi.js en sub-módulos Summary

routineApi.js (739 líneas, 24 funciones) dividido en 3 sub-módulos por dominio con barrel re-export transparente.

## What Was Built

`routineApi.js` pasó de ser un monolito de 739 líneas a un barrel de 35 líneas que re-exporta desde 3 sub-módulos:

- **routineQueryApi.js** (106 líneas) — 6 funciones de lectura: `fetchRoutines`, `fetchRoutine`, `fetchRoutineDays`, `fetchRoutineDay`, `fetchRoutineBlocks`, `fetchRoutineAllExercises`
- **routineMutationApi.js** (322 líneas) — 15 funciones de escritura/mutación incluyendo `moveRoutineExerciseToDay`
- **routineIOApi.js** (313 líneas) — 3 funciones de IO: `exportRoutine`, `importRoutine`, `duplicateRoutine` (con JSDoc completo)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extraer 3 sub-módulos | 0fc04a1 | routineQueryApi.js, routineMutationApi.js, routineIOApi.js (creados) |
| 2 | Convertir barrel + verificar tests | e9b4931 | routineApi.js (739→35 líneas) |

## Verification Results

- `npm run check` — PASSED (lint + 525 tests + build)
- `npm run test:shared` — PASSED (511 tests, 20 test files)
- `npm run build -w apps/web` — PASSED (3004 módulos, sin errores)
- Conteo de exports en barrel: 24 funciones nombradas (6 + 15 + 3)
- Líneas sub-módulos: 106, 322, 313 (todas dentro del límite con tolerancia JSDoc)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] routineQueryApi.js exists (106 lines)
- [x] routineMutationApi.js exists (322 lines)
- [x] routineIOApi.js exists (313 lines)
- [x] routineApi.js is barrel (35 lines)
- [x] Commit 0fc04a1 exists
- [x] Commit e9b4931 exists
- [x] npm run check passes
- [x] npm run test:shared passes (511 tests)

## Self-Check: PASSED
