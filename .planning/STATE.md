---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-04-PLAN.md
last_updated: "2026-03-16T18:01:27.061Z"
last_activity: "2026-03-16 — Plan 02-01 completado: exportRoutine/importRoutine/duplicateRoutine movidas a shared con fix N+1"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 12
  completed_plans: 12
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Poder modificar cualquier parte del código con confianza — sin miedo a romper la otra plataforma, con tests que lo respalden y sin duplicación que mantener en paralelo.
**Current focus:** Phase 1 — Estabilizar

## Current Position

Phase: 2 of 5 (Deduplicar)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-03-16 — Plan 02-01 completado: exportRoutine/importRoutine/duplicateRoutine movidas a shared con fix N+1

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 02-deduplicar P01 | ~25min | 2 tasks | 9 files |
| Phase 01-estabilizar P02 | 1 | 1 tasks | 1 files |
| Phase 01-estabilizar P01 | 2 | 2 tasks | 2 files |
| Phase 02-deduplicar P02 | 6 | 2 tasks | 9 files |
| Phase 02-deduplicar P03 | 6min | 2 tasks | 6 files |
| Phase 03-dividir-archivos-api P02 | 5min | 2 tasks | 4 files |
| Phase 03-dividir-archivos-api P01 | 2min | 2 tasks | 4 files |
| Phase 04-cobertura-de-tests P03 | 3min | 2 tasks | 3 files |
| Phase 04-cobertura-de-tests P01 | 3min | 2 tasks | 3 files |
| Phase 04-cobertura-de-tests P05 | 8min | 2 tasks | 6 files |
| Phase 04-cobertura-de-tests P04 | 3min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Orden de fases derivado del grafo de dependencias: BUG-01 bloquea SIZE-03, DUP tasks deben preceder TEST-03, SIZE-01/02 deben preceder TEST-01
- [Init]: Granularidad coarse → 5 fases (límite superior permitido)
- [Phase 01-estabilizar]: test:shared usa runner vitest de apps/web con filtro glob packages/shared/src en lugar de configurar vitest en packages/shared directamente
- [Phase 01-estabilizar]: RegularExerciseCard extraído a scope de módulo (no dentro de WorkoutExerciseCard) para identidad de componente estable en React
- [Phase 01-estabilizar]: WorkoutExerciseCard mantiene solo lógica de delegación: warmup check + pass-through de props
- [Phase 02-deduplicar P01]: N+1 fix en exportRoutine: añadir id al select de routine_days elimina query extra por día
- [Phase 02-deduplicar P01]: Re-exports de seguridad mantenidos en routineIO.js de ambas apps aunque consumidores ya importan de @gym/shared directamente
- [Phase 02-deduplicar]: useSessionExercises.js (web) cambiado de wildcard a named exports para evitar conflictos de namespace con thin wrappers
- [Phase 02-deduplicar]: Callback injection para eventos de plataforma: onVisibilityChange/onConnectivityChange en useCompletedSets, onVisibilityChange/onStartError en useSession
- [Phase 02-deduplicar]: useExerciseHistory migrado a useInfiniteQuery en shared (offset-based con PAGE_SIZE=30) — estrategia web adoptada como canónica
- [Phase 02-deduplicar]: ExerciseHistoryModal usa botón Cargar más en lugar de onEndReached (ScrollView, no FlatList)
- [Phase 02-deduplicar]: RN consumer pattern: sessions = useMemo(() => data?.pages.flat() ?? [], [data])
- [Phase 03-dividir-archivos-api]: workoutApi.js (598 líneas) dividido en 3 sub-módulos con barrel re-export explícito (export {} from) — callers sin cambios
- [Phase 03-dividir-archivos-api]: routineApi.js convertido a barrel con re-exports nombrados explícitos para preservar tree-shaking y legibilidad
- [Phase 04-cobertura-de-tests]: makeSupabaseMock incluye todos los métodos auth con defaults sensatos; onAuthStateChange capturada via mockImplementation para tests de callback
- [Phase 04-03]: useRoutines/useExercises usan useUserId de useAuth.js (no _stores.js) — mock de ./useAuth.js en vez de _stores.js
- [Phase 04-03]: TanStack Query pasa segundo argumento (meta context) a mutationFn directa — assertions deben usar expect.anything() como segundo parámetro
- [Phase 04-cobertura-de-tests]: makeQueryMock usa patrón thenable para soportar chains con múltiples .eq() sin romper el chain
- [Phase 04-05]: duplicateRoutine testado mockeando _client.js directamente (no vi.mock del módulo) para validar integración exportRoutine+importRoutine
- [Phase 04-05]: adminApi.fetchAllUsers requiere mock con .rpc() y .from() en el mismo objeto de cliente (makeClientMock solo tiene .from())
- [Phase 04-04]: callCount pattern con mockImplementation para operaciones compuestas que llaman getClient múltiples veces con diferentes tablas
- [Phase 04-04]: PGRST116 simulado como { code: 'PGRST116' } para probar path de bloque no encontrado en addExerciseToDay/moveRoutineExerciseToDay

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: DUP-02 tiene divergencia useQuery/useInfiniteQuery — confirmar qué funciones son byte-for-byte idénticas antes de ejecutar
- [Phase 4]: TEST-01 requiere catalogar la profundidad del chain de Supabase por función antes de escribir mocks
- [Phase 5]: DX-01 (upgrade tanstack-query 5.62→5.90) — revisar changelog de comportamiento antes de ejecutar; hacer solo después de tener TEST-01 y TEST-03

## Session Continuity

Last session: 2026-03-16T18:01:27.060Z
Stopped at: Completed 04-04-PLAN.md
Resume file: None
