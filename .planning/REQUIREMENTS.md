# Requirements: Gym Tracker — Deuda Técnica v2

**Defined:** 2026-03-16
**Core Value:** Poder modificar cualquier parte del código con confianza — sin miedo a romper la otra plataforma, con tests que lo respalden y sin duplicación que mantener en paralelo.

## v1 Requirements

Requirements for tech debt elimination. Each maps to roadmap phases.

### Bug Fixes

- [x] **BUG-01**: Hooks condicionales en WorkoutExerciseCard (RN) corregidos — extraer a componente separado para que useRef/useEffect no se llamen después de un return condicional
- [x] **BUG-02**: FileReader inexistente en React Native resuelto — verificar si el code path se ejecuta, reemplazar con expo-file-system o eliminar dead code

### Deduplicación

- [x] **DUP-01**: useCompletedSets y useSession compartidos en packages/shared con callback injection para visibilidad (onVisibilityChange), apps reducidos a thin wrappers (~700 líneas eliminadas)
- [x] **DUP-02**: useWorkoutHistory compartido entre apps — mover funciones query idénticas a shared (~250 líneas eliminadas)
- [x] **DUP-03**: exportRoutine, importRoutine, duplicateRoutine movidas a packages/shared/src/api/routineApi.js — dejar en per-app solo funciones con APIs de plataforma (DOM Blob, expo-file-system) (~500 líneas eliminadas)

### Tests

- [x] **TEST-01**: Tests para capa API shared con mock de getClient() — workoutApi, routineApi, exerciseApi, bodyWeightApi, bodyMeasurementsApi, preferencesApi, adminApi (0% → ~60%)
- [x] **TEST-02**: Tests para createAuthStore — initialize, login, logout, signup, callbacks de plataforma
- [x] **TEST-03**: Tests para hooks críticos — useRoutines, useExercises, useSessionExercises con @testing-library/react y QueryClientProvider wrapper

### Archivos Grandes

- [x] **SIZE-01**: workoutApi.js (598 líneas) dividido en workoutSessionApi.js, completedSetsApi.js, sessionExercisesApi.js con barrel re-export
- [x] **SIZE-02**: routineApi.js (427 líneas) dividido en routineQueryApi.js y routineMutationApi.js con barrel re-export
- [ ] **SIZE-03**: WorkoutExerciseCard refactorizado en web y RN — extraer ExerciseCardHeader, SetsList, ExerciseCardActions como sub-componentes
- [ ] **SIZE-04**: ExerciseHistoryModal (330 líneas) reducido — extraer HistoryChart, HistoryTable, HistoryFilters

### DX y Mantenimiento

- [ ] **DX-01**: Versiones de dependencias sincronizadas entre apps (supabase-js, tanstack-query, zustand)
- [ ] **DX-02**: CLAUDE.md actualizado para reflejar estructura monorepo, imports de @gym/shared, patrón shared + thin wrappers
- [x] **DX-03**: Root scripts completados — añadir check y test:shared al root package.json

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Testing Avanzado

- **TEST-04**: Coverage report integrado en CI
- **TEST-05**: E2E tests con Playwright (web) y Detox (RN)

### Optimización

- **OPT-01**: Bundle analysis y tree-shaking audit de @gym/shared
- **OPT-02**: Lazy loading de rutas en web app

## Out of Scope

| Feature | Reason |
|---------|--------|
| Features nuevas | Este proyecto es solo limpieza y consolidación |
| Migración a TypeScript | Decisión de proyecto: JavaScript |
| UI compartida entre apps | Cada app mantiene sus propios componentes |
| OAuth/Google login en RN | Milestone futuro separado |
| Refactor de base de datos | Schema funciona bien, no hay deuda ahí |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 1 | Complete |
| BUG-02 | Phase 1 | Complete |
| DX-03 | Phase 1 | Complete |
| DUP-01 | Phase 2 | Complete |
| DUP-02 | Phase 2 | Complete |
| DUP-03 | Phase 2 | Complete |
| SIZE-01 | Phase 3 | Complete |
| SIZE-02 | Phase 3 | Complete |
| TEST-01 | Phase 4 | Complete |
| TEST-02 | Phase 4 | Complete |
| TEST-03 | Phase 4 | Complete |
| SIZE-03 | Phase 5 | Pending |
| SIZE-04 | Phase 5 | Pending |
| DX-01 | Phase 5 | Pending |
| DX-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
