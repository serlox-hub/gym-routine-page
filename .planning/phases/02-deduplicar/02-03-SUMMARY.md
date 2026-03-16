---
phase: 02-deduplicar
plan: 03
subsystem: hooks
tags: [react-query, useInfiniteQuery, pagination, shared-hooks, react-native]

requires:
  - phase: 02-deduplicar
    provides: "02-01 y 02-02: shared API layer, useCompletedSets y useSession en shared"

provides:
  - "useWorkoutHistory.js con 6 hooks en packages/shared usando useInfiniteQuery para useExerciseHistory"
  - "Tests que verifican shape { pages: [...] } y paginación de useExerciseHistory"
  - "RN consumers actualizados para consumir data.pages.flat()"
  - "ExerciseHistoryModal con botón 'Cargar más' para infinite scroll"

affects:
  - 03-tests
  - 04-cleanup

tech-stack:
  added: []
  patterns:
    - "useInfiniteQuery unificado en web y RN para useExerciseHistory (pageParam offset-based)"
    - "RN consumers usan useMemo para data.pages.flat() evitando re-renders"
    - "Per-app hooks files son re-exports nombrados desde @gym/shared"

key-files:
  created:
    - packages/shared/src/hooks/useWorkoutHistory.js
    - packages/shared/src/hooks/useWorkoutHistory.test.js
  modified:
    - apps/web/src/hooks/useWorkoutHistory.js
    - apps/gym-native/src/hooks/useWorkoutHistory.js
    - apps/gym-native/src/components/Workout/ExerciseHistoryModal.jsx
    - apps/gym-native/src/screens/ExerciseProgressScreen.jsx
    - packages/shared/src/index.js

key-decisions:
  - "useExerciseHistory migrado a useInfiniteQuery en shared (offset-based con PAGE_SIZE=30) — estrategia web adoptada como canónica"
  - "ExerciseHistoryModal usa botón 'Cargar más' en lugar de onEndReached (ScrollView, no FlatList)"
  - "sessions = useMemo(() => data?.pages.flat() ?? [], [data]) — evita referencia nueva en cada render"

patterns-established:
  - "Hook de infinite pagination en shared: initialPageParam:0, getNextPageParam basado en length < PAGE_SIZE"
  - "RN consumer pattern: const sessions = useMemo(() => data?.pages.flat() ?? [], [data])"

requirements-completed: [DUP-02]

duration: 6min
completed: 2026-03-16
---

# Phase 02 Plan 03: useWorkoutHistory compartido con useInfiniteQuery — SUMMARY

**6 hooks de historial unificados en packages/shared con useInfiniteQuery para useExerciseHistory, eliminando divergencia useQuery/useInfiniteQuery entre web y RN**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-16T14:04:29Z
- **Completed:** 2026-03-16T14:10:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Todos los 6 hooks (useWorkoutHistory, useSessionDetail, useExerciseHistorySummary, useExerciseHistory, usePreviousWorkout, useDeleteSession) viven en packages/shared
- useExerciseHistory usa useInfiniteQuery con initialPageParam:0 y getNextPageParam offset-based (PAGE_SIZE=30)
- Tests verifican shape `{ pages: [...] }`, paginación (hasNextPage), página vacía, y fetchNextPage
- Ambos consumers RN usan `data.pages.flat()` para acceso plano
- ExerciseHistoryModal tiene infinite scroll con botón "Cargar más" y ActivityIndicator
- npm run check: lint limpio, 525 tests pasando, build exitoso

## Task Commits

Cada tarea fue commiteada atómicamente:

1. **Task 1: Crear shared useWorkoutHistory.js con tests y reemplazar per-app files** - `eb22334` (feat) — nota: completado como parte de plan 02-02 en ejecución anterior
2. **Task 2: Adaptar consumidores RN para shape de useInfiniteQuery** - `7666550` (feat)

## Files Created/Modified

- `packages/shared/src/hooks/useWorkoutHistory.js` — 6 hooks con useInfiniteQuery para useExerciseHistory
- `packages/shared/src/hooks/useWorkoutHistory.test.js` — 7 tests para shape pages y paginación
- `packages/shared/src/index.js` — export * from './hooks/useWorkoutHistory.js' añadido
- `apps/web/src/hooks/useWorkoutHistory.js` — reemplazado por re-exports nombrados desde @gym/shared
- `apps/gym-native/src/hooks/useWorkoutHistory.js` — reemplazado por re-exports nombrados desde @gym/shared
- `apps/gym-native/src/components/Workout/ExerciseHistoryModal.jsx` — data.pages.flat() + botón Cargar más
- `apps/gym-native/src/screens/ExerciseProgressScreen.jsx` — data.pages.flat() adapter

## Decisions Made

- useExerciseHistory adopta estrategia de paginación de web (useInfiniteQuery offset-based) como canónica — la versión RN (useQuery con from:0, to:49) era una simplificación temporal que limitaba el historial a 50 entradas
- ExerciseHistoryModal usa botón "Cargar más" explícito (no onEndReached) porque el contenido está en un ScrollView con maxHeight:400, donde onEndReached no es confiable
- `sessions = useMemo(() => data?.pages.flat() ?? [], [data])` — react-hooks/exhaustive-deps requiere este patrón para que la referencia sea estable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] useMemo para sessions en ExerciseHistoryModal**
- **Found during:** Task 2 (lint check post-implementación)
- **Issue:** `const sessions = data?.pages.flat() ?? []` sin useMemo genera nueva referencia en cada render, violando exhaustive-deps y potencialmente recalculando stats innecesariamente
- **Fix:** Envuelto en `useMemo(() => data?.pages.flat() ?? [], [data])`
- **Files modified:** apps/gym-native/src/components/Workout/ExerciseHistoryModal.jsx
- **Verification:** npm run lint pasa sin warnings
- **Committed in:** 7666550 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — correctness)
**Impact on plan:** Fix esencial para rendimiento correcto. Sin scope creep.

## Issues Encountered

- Task 1 fue completado como parte del plan 02-02 (commit `eb22334`). Al ejecutar este plan, el archivo `packages/shared/src/hooks/useWorkoutHistory.js` ya existía con el contenido correcto. No hubo trabajo duplicado — solo se verificó el estado y se continuó con Task 2.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Toda la deduplicación de hooks de historial completada
- useExerciseHistory unificado con paginación infinite en ambas plataformas
- RN consumers adaptados y listos para usar historial paginado completo
- Fase 02-deduplicar completa — ready for fase 03 (tests de integración)

---
*Phase: 02-deduplicar*
*Completed: 2026-03-16*
