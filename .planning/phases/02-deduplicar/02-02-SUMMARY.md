---
phase: 02-deduplicar
plan: "02"
subsystem: hooks
tags: [react, tanstack-query, zustand, callback-injection, platform-abstraction]

# Dependency graph
requires:
  - phase: 02-deduplicar
    provides: "useTimerEngine callback injection pattern en packages/shared"
provides:
  - "useCompletedSets (5 hooks) accesibles desde @gym/shared con callback injection"
  - "useSession (4 hooks) accesibles desde @gym/shared con callback injection"
  - "Thin wrappers web: onVisibilityChange via document, onConnectivityChange via window"
  - "Thin wrappers RN: onVisibilityChange via AppState, onConnectivityChange via NetInfo"
affects: [02-deduplicar, 03-testing, 04-dx-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Callback injection para eventos de plataforma (visibilitychange, online, AppState, NetInfo)"
    - "Thin wrapper pattern: per-app files de ≤30 líneas que delegan a shared inyectando callbacks"

key-files:
  created:
    - packages/shared/src/hooks/useCompletedSets.js
    - packages/shared/src/hooks/useSession.js
    - packages/shared/src/hooks/useCompletedSets.test.js
  modified:
    - packages/shared/src/index.js
    - apps/web/src/hooks/useCompletedSets.js
    - apps/web/src/hooks/useSession.js
    - apps/web/src/hooks/useSessionExercises.js
    - apps/gym-native/src/hooks/useCompletedSets.js
    - apps/gym-native/src/hooks/useSession.js

key-decisions:
  - "useSessionExercises.js (web) cambiado de wildcard export * from @gym/shared a named exports explícitos para evitar conflictos de namespace con thin wrappers"
  - "onVisibilityChange/onConnectivityChange siguen la convención de retornar función cleanup, igual que useTimerEngine"
  - "useStartSession acepta onStartError opcional — RN pasa hideWorkout(), web no pasa nada"

patterns-established:
  - "Platform callback injection: useSyncPendingSets({ onVisibilityChange, onConnectivityChange }) y useRestoreActiveSession({ onVisibilityChange })"
  - "Thin wrapper: importar hook compartido como _hookName, wrappear con platform setup, re-exportar idénticos con mismo nombre público"

requirements-completed: [DUP-01]

# Metrics
duration: 6min
completed: 2026-03-16
---

# Phase 02 Plan 02: Deduplicar useCompletedSets y useSession Summary

**useCompletedSets (5 hooks) y useSession (4 hooks) movidos a packages/shared con callback injection para eventos de plataforma; thin wrappers por-app de <30 líneas**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-16T14:04:14Z
- **Completed:** 2026-03-16T14:10:14Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Shared `useCompletedSets.js` con `useSyncPendingSets({ onVisibilityChange, onConnectivityChange })` — sin código de plataforma
- Shared `useSession.js` con `useRestoreActiveSession({ onVisibilityChange })` y `useStartSession({ onStartError })` — sin código de plataforma
- Tests en `useCompletedSets.test.js` verificando invocación de callbacks y cleanup al desmontar
- Thin wrappers web (document/window) y RN (AppState/NetInfo) de ≤30 líneas cada uno
- `npm run check` verde: 525 tests passing, lint 0 errores, build exitoso

## Task Commits

1. **Task 1: Crear useCompletedSets y useSession compartidos con callback injection y tests** - `eb22334` (feat)
2. **Task 2: Reemplazar hooks por-app con thin wrappers** - `9412975` (feat)

## Files Created/Modified

- `packages/shared/src/hooks/useCompletedSets.js` - Hook compartido con callback injection para visibilidad/conectividad
- `packages/shared/src/hooks/useSession.js` - Hook compartido con callback injection para visibilidad y onStartError
- `packages/shared/src/hooks/useCompletedSets.test.js` - Tests para verificar invocación de callbacks
- `packages/shared/src/index.js` - Barrel export actualizado con useCompletedSets y useSession
- `apps/web/src/hooks/useCompletedSets.js` - Thin wrapper: document.visibilitychange + window.online
- `apps/web/src/hooks/useSession.js` - Thin wrapper: document.visibilitychange
- `apps/web/src/hooks/useSessionExercises.js` - Cambiado de wildcard a named exports para evitar conflictos
- `apps/gym-native/src/hooks/useCompletedSets.js` - Thin wrapper: AppState + NetInfo
- `apps/gym-native/src/hooks/useSession.js` - Thin wrapper: AppState + onStartError para hideWorkout

## Decisions Made

- **useSessionExercises.js cambio de wildcard a named exports**: El archivo web usaba `export * from '@gym/shared'` como barrel de todos los hooks compartidos. Al agregar useSession/useCompletedSets a shared, Rollup detectó namespaces conflictivos con los thin wrappers en `useWorkout.js`. Solución: cambiar a named exports explícitos solo para los hooks que `useSessionExercises.js` debe proveer (session exercises, auth, exercises, routines, etc.).
- **onVisibilityChange retorna cleanup**: Sigue la convención establecida por useTimerEngine — las callbacks de setup retornan una función de limpieza, que el hook compartido invoca en el `return` del useEffect.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Conflicto de namespace en Rollup al hacer export wildcard desde useSessionExercises.js**
- **Found during:** Task 2 (thin wrappers)
- **Issue:** `apps/web/src/hooks/useSessionExercises.js` exportaba `export * from '@gym/shared'`, incluyendo los nuevos `useRestoreActiveSession` etc. El `useWorkout.js` también hacía `export * from './useSession.js'` con los mismos nombres. Rollup lo detectó como conflicto y el build fallaba.
- **Fix:** Cambiar `useSessionExercises.js` de wildcard a named exports explícitos solo de los hooks que no tienen thin wrapper propio.
- **Files modified:** `apps/web/src/hooks/useSessionExercises.js`
- **Verification:** `npm run build` pasa sin warnings de namespace
- **Committed in:** 9412975 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking build issue)
**Impact on plan:** Fix necesario para el build. Cambia el contrato interno de useSessionExercises.js pero no el comportamiento observable desde componentes.

## Issues Encountered

El wildcard re-export de @gym/shared en `useSessionExercises.js` era un antipatrón latente que funcionaba porque shared no exportaba hooks de sesión. Al agregar useSession/useCompletedSets al barrel de shared, el conflicto se materializó. La solución con named exports explícitos es más explícita y mantenible.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-03 puede proceder: useWorkoutHistory es el siguiente candidato a deduplicar
- El patrón callback injection está establecido y probado en 3 hooks (useTimerEngine, useCompletedSets, useSession)
- No hay blockers

---
*Phase: 02-deduplicar*
*Completed: 2026-03-16*

## Self-Check: PASSED

- packages/shared/src/hooks/useCompletedSets.js: FOUND
- packages/shared/src/hooks/useSession.js: FOUND
- packages/shared/src/hooks/useCompletedSets.test.js: FOUND
- Commit eb22334: FOUND
- Commit 9412975: FOUND
