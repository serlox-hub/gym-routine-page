# Roadmap: Gym Tracker — Deuda Técnica v2

## Overview

Reducción de deuda técnica en el monorepo Gym Tracker (web + React Native). Cinco fases ordenadas por dependencias estrictas: primero detener los crashes activos, luego mover el código duplicado a su ubicación final, luego dividir los archivos grandes, luego escribir los tests sobre código en su forma definitiva, y finalmente limpiar componentes y dependencias con la red de seguridad de los tests en su lugar.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Estabilizar** - Corregir crashes activos y habilitar verificación (completed 2026-03-16)
- [x] **Phase 2: Deduplicar** - Mover ~1,400 líneas duplicadas a packages/shared (completed 2026-03-16)
- [x] **Phase 3: Dividir Archivos API** - Partir monolitos en módulos con bounded scope (completed 2026-03-16)
- [x] **Phase 4: Cobertura de Tests** - Tests sobre código en su forma definitiva (completed 2026-03-16)
- [ ] **Phase 5: Housekeeping** - Componentes, dependencias y documentación

## Phase Details

### Phase 1: Estabilizar
**Goal**: El código no tiene crashes activos y existe una herramienta unificada de verificación para todas las tareas subsiguientes
**Depends on**: Nothing (first phase)
**Requirements**: BUG-01, BUG-02, DX-03
**Success Criteria** (what must be TRUE):
  1. La app RN puede renderizar WorkoutExerciseCard sin crashear por violación de reglas de hooks
  2. El código path de FileReader en gym-native no puede causar un crash en runtime
  3. `npm run check` desde la raíz del monorepo ejecuta lint y build en todas las apps y retorna código de salida correcto
  4. `npm run test:shared` desde la raíz ejecuta los tests de packages/shared en aislamiento
**Plans:** 2/2 plans complete

Plans:
- [ ] 01-01-PLAN.md — Fix hooks violation and dead code in RN (BUG-01, BUG-02)
- [ ] 01-02-PLAN.md — Add check and test:shared root scripts (DX-03)

### Phase 2: Deduplicar
**Goal**: Las ~1,400 líneas duplicadas entre apps/web y apps/gym-native están consolidadas en packages/shared, y cada app tiene solo thin wrappers
**Depends on**: Phase 1
**Requirements**: DUP-01, DUP-02, DUP-03
**Success Criteria** (what must be TRUE):
  1. `useCompletedSets` y `useSession` existen en packages/shared con inyección de callback para visibilidad; cada app tiene un wrapper de ≤10 líneas
  2. `useWorkoutHistory` (funciones idénticas) existe en packages/shared; la divergencia useQuery/useInfiniteQuery está documentada y permanece per-app
  3. `exportRoutine`, `importRoutine` y `duplicateRoutine` (lógica Supabase pura) viven en packages/shared/src/api/routineApi.js; las funciones con APIs de plataforma permanecen per-app
  4. `npm run check` pasa sin errores después de cada tarea de deduplicación (sin leaks de platform API en shared)
**Plans:** 3/3 plans complete

Plans:
- [ ] 02-01-PLAN.md — Move routineIO functions to shared with N+1 fix (DUP-03)
- [ ] 02-02-PLAN.md — Move useCompletedSets and useSession to shared with callback injection (DUP-01)
- [ ] 02-03-PLAN.md — Move useWorkoutHistory to shared, unify to useInfiniteQuery (DUP-02)

### Phase 3: Dividir Archivos API
**Goal**: Los dos archivos API más grandes están divididos en módulos con scope claro, manteniendo la interfaz pública intacta via barrel re-exports
**Depends on**: Phase 2
**Requirements**: SIZE-01, SIZE-02
**Success Criteria** (what must be TRUE):
  1. `workoutApi.js` está dividido en workoutSessionApi.js, completedSetsApi.js, sessionExercisesApi.js, cada uno <300 líneas
  2. `routineApi.js` está dividido en routineQueryApi.js y routineMutationApi.js, cada uno <300 líneas
  3. El barrel re-export de cada split exporta explícitamente todas las funciones que existían antes del split (cero omisiones silenciosas)
  4. `npm run build -w apps/web` pasa sin errores — ningún caller externo necesitó cambios
**Plans:** 2/2 plans complete

Plans:
- [ ] 03-01-PLAN.md — Split workoutApi.js into 3 sub-modules with barrel re-export (SIZE-01)
- [ ] 03-02-PLAN.md — Split routineApi.js into 3 sub-modules with barrel re-export (SIZE-02)

### Phase 4: Cobertura de Tests
**Goal**: La capa API, createAuthStore, y los hooks compartidos críticos tienen cobertura de tests sobre su implementación definitiva
**Depends on**: Phase 3
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. Los sub-módulos de workoutApi, routineApi, exerciseApi y demás APIs en shared tienen ~60% de cobertura con mocks de getClient() via el patrón initApi(mockSupabase)
  2. `createAuthStore` tiene tests que cubren initialize, login, logout, signup y callbacks de plataforma — a la par con createWorkoutStore (21 tests)
  3. useRoutines, useExercises y useSessionExercises tienen tests con @testing-library/react y QueryClientProvider wrapper, apuntando a las implementaciones en packages/shared
  4. `npm run test:shared` pasa con todos los tests en verde
**Plans:** 5/5 plans complete

Plans:
- [ ] 04-01-PLAN.md — Create _testUtils.js + test workoutSessionApi and completedSetsApi (TEST-01)
- [ ] 04-02-PLAN.md — Test createAuthStore (TEST-02)
- [ ] 04-03-PLAN.md — Test useRoutines, useExercises, useSessionExercises hooks (TEST-03)
- [ ] 04-04-PLAN.md — Test sessionExercisesApi, routineQueryApi, routineMutationApi (TEST-01)
- [ ] 04-05-PLAN.md — Test exerciseApi, smaller APIs, and duplicateRoutine (TEST-01)

### Phase 5: Housekeeping
**Goal**: Los componentes grandes están divididos en sub-componentes, las versiones de dependencias están sincronizadas, y CLAUDE.md refleja la arquitectura real del monorepo
**Depends on**: Phase 4
**Requirements**: SIZE-03, SIZE-04, DX-01, DX-02
**Success Criteria** (what must be TRUE):
  1. WorkoutExerciseCard (web y RN) está dividido en ExerciseCardHeader, SetsList y ExerciseCardActions; SetsList usa claves estables (sessionExerciseId + setNumber) en lugar de índices de array
  2. ExerciseHistoryModal está dividido en HistoryChart, HistoryTable y HistoryFilters, cada sub-componente <150 líneas
  3. supabase-js, tanstack-query y zustand tienen la misma versión en apps/web y apps/gym-native (verificado con syncpack)
  4. CLAUDE.md documenta la estructura monorepo real: @gym/shared imports, patrón shared + thin wrappers, y la capa de inyección (initApi, initStores, initNotifications)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Estabilizar | 2/2 | Complete    | 2026-03-16 |
| 2. Deduplicar | 3/3 | Complete    | 2026-03-16 |
| 3. Dividir Archivos API | 2/2 | Complete    | 2026-03-16 |
| 4. Cobertura de Tests | 5/5 | Complete   | 2026-03-16 |
| 5. Housekeeping | 0/TBD | Not started | - |
