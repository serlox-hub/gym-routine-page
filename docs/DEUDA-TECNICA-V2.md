# Deuda Técnica v2 - Gym Tracker

Plan de reducción incremental de deuda técnica. Cada tarea es independiente, pequeña y mergeable por separado.

**Última revisión**: 2026-03-16
**Contexto**: Post-migración monorepo (Sprints 1-4 completados)

---

## Resumen ejecutivo

| Área | Severidad | Esfuerzo | Items |
|------|-----------|----------|-------|
| Bugs en producción | 🔴 Crítica | ~1h | 2 |
| Duplicación restante | 🟠 Alta | ~4h | 3 |
| Cobertura de tests | 🟡 Media | ~6h | 3 |
| Archivos grandes | 🟡 Media | ~3h | 4 |
| DX y mantenimiento | 🟢 Baja | ~2h | 3 |

**Total estimado**: ~16h de trabajo, abordable en 5-8 sesiones.

---

## 🔴 Prioridad 1 — Bugs (arreglar ya)

Afectan al usuario o violan reglas de React. No requieren discusión, solo arreglar.

### BUG-01: Hooks condicionales en WorkoutExerciseCard (RN)

**Esfuerzo**: ~20min | **Riesgo**: Crash en warm-up exercises

`apps/gym-native/src/components/Workout/WorkoutExerciseCard.jsx:117-125`

`useRef` y `useEffect` se llaman después de un `return` condicional. Viola reglas de React Hooks.

```jsx
// ❌ Actual
if (isWarmup) return <WarmupExerciseCard ... />
const prevCompletedRef = useRef(isCompleted)  // hook tras return
useEffect(() => { ... }, [isCompleted])       // hook tras return

// ✅ Fix: extraer a componente separado
function WorkoutExerciseCard({ isWarmup, ...props }) {
  if (isWarmup) return <WarmupExerciseCard {...props} />
  return <RegularExerciseCard {...props} />
}
```

**Verificación**: `npm run lint -w apps/gym-native` sin `eslint-disable` en ese archivo.

---

### BUG-02: FileReader inexistente en React Native

**Esfuerzo**: ~15min | **Riesgo**: Crash al importar rutina en RN

`apps/gym-native/src/lib/routineIO.js:333` — usa `FileReader` (API de browser) con `eslint-disable no-undef`.

**Acción**: Verificar si el code path se ejecuta. Si sí, reemplazar con `expo-file-system`. Si es dead code, eliminar.

**Verificación**: Eliminar el `eslint-disable` y que lint pase, o reemplazar con API de Expo.

---

## 🟠 Prioridad 2 — Duplicación restante (~1,400 líneas)

Cada tarea es independiente. Seguir el mismo patrón de las fases 3-5: mover lógica a shared, dejar thin wrappers en apps.

### DUP-01: Compartir useCompletedSets + useSession

**Esfuerzo**: ~1.5h | **Líneas eliminadas**: ~700

Ambos hooks difieren solo en cómo detectan visibilidad:
- Web: `document.addEventListener('visibilitychange', ...)`
- RN: `AppState.addEventListener('change', ...)`

**Patrón**: Extraer lógica core a shared, aceptar `onVisibilityChange(callback)` como parámetro inyectable. Mismo patrón que `useTimerEngine` con callbacks.

**Archivos**:
- Crear `packages/shared/src/hooks/useCompletedSets.js`
- Crear `packages/shared/src/hooks/useSession.js`
- Reducir `apps/web/src/hooks/useCompletedSets.js` a wrapper
- Reducir `apps/web/src/hooks/useSession.js` a wrapper
- Reducir `apps/gym-native/src/hooks/useCompletedSets.js` a wrapper
- Reducir `apps/gym-native/src/hooks/useSession.js` a wrapper

---

### DUP-02: Compartir useWorkoutHistory

**Esfuerzo**: ~1h | **Líneas eliminadas**: ~250

Web usa `useInfiniteQuery`, RN usa `useQuery`. Dos opciones:

**Opción A** (recomendada): Mover a shared las funciones query individuales (`useWorkoutHistory`, `useExerciseHistory`, `useExerciseProgress`, `useDurationHistory`) que sean idénticas. Dejar en per-app solo las que usen `useInfiniteQuery` vs `useQuery`.

**Opción B**: Migrar RN a `useInfiniteQuery` también. Más trabajo upfront pero elimina la divergencia completamente.

---

### DUP-03: Mover funciones de routineIO a shared API

**Esfuerzo**: ~1h | **Líneas eliminadas**: ~500

`exportRoutine()`, `importRoutine()`, `duplicateRoutine()` están en ambas apps con lógica idéntica. Ya usan Supabase via `getClient()`.

**Acción**: Mover las 3 funciones a `packages/shared/src/api/routineApi.js`. Dejar en per-app solo:
- Web: `downloadRoutineAsJson()` (usa DOM Blob/URL)
- Web: `readJsonFile()` (usa FileReader)
- RN: versiones equivalentes con expo-file-system (o eliminar si no se usan)

---

## 🟡 Prioridad 3 — Tests

Abordar incrementalmente. Empezar por los módulos más grandes y con más riesgo de regresión.

### TEST-01: Tests para capa API (0% → ~60%)

**Esfuerzo**: ~3h | **Archivos**: 7

Crear tests con mock de `getClient()`. Priorizar por tamaño:

| Orden | Archivo | Líneas | Funciones |
|-------|---------|--------|-----------|
| 1 | `workoutApi.js` | 598 | ~25 |
| 2 | `routineApi.js` | 427 | ~20 |
| 3 | `exerciseApi.js` | ~150 | ~10 |
| 4-7 | bodyWeight, bodyMeasurements, preferences, admin | ~250 total | ~16 |

**Patrón de test**:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initApi } from '../_client.js'

const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  // ... chain
}

beforeEach(() => {
  initApi(mockSupabase)
  vi.clearAllMocks()
})
```

---

### TEST-02: Tests para createAuthStore

**Esfuerzo**: ~1h | **Archivos**: 1

`createWorkoutStore` tiene 21 tests. `createAuthStore` tiene 0. Cubrir:
- `initialize()` — llama `supabase.auth.getSession()` y `onAuthStateChange`
- `login()` — llama `signInWithPassword`, actualiza state
- `logout()` — llama `signOut`, limpia state, ejecuta `onBeforeLogout`
- `signup()` — llama `signUp`
- Callbacks de plataforma (`onBeforeInitialize`, `onBeforeLogout`)

---

### TEST-03: Tests para hooks críticos

**Esfuerzo**: ~2h | **Archivos**: 3

Priorizar hooks con más lógica:
1. `useRoutines.js` (251 líneas) — CRUD completo de rutinas
2. `useExercises.js` — queries y mutaciones
3. `useSessionExercises.js` — lógica de sesión activa

**Patrón**: Usar `@testing-library/react` con `QueryClientProvider` wrapper.

---

## 🟡 Prioridad 4 — Archivos grandes

Refactors de extracción. Cada uno es independiente.

### SIZE-01: Dividir workoutApi.js (598 líneas)

**Esfuerzo**: ~45min

Dividir `packages/shared/src/api/workoutApi.js` en:
- `workoutSessionApi.js` — start, end, cancel, restore session
- `completedSetsApi.js` — complete, update, uncomplete, delete set
- `sessionExercisesApi.js` — add, remove, reorder, replace exercises

Re-exportar todo desde un `workoutApi.js` barrel para no romper imports.

---

### SIZE-02: Dividir routineApi.js (427 líneas)

**Esfuerzo**: ~30min

Dividir en:
- `routineQueryApi.js` — fetch routines, routine detail, routine structure
- `routineMutationApi.js` — create, update, delete, reorder

---

### SIZE-03: Refactor WorkoutExerciseCard (web + RN)

**Esfuerzo**: ~45min

Depende de BUG-01 (hooks condicionales). Después del fix, extraer:
- `ExerciseCardHeader` — nombre, grupo muscular, badge
- `SetsList` — lista de sets con inputs
- `ExerciseCardActions` — botones de acción

Aplicar en ambas apps.

---

### SIZE-04: Reducir ExerciseHistoryModal (web, 330 líneas)

**Esfuerzo**: ~30min

Extraer secciones a sub-componentes:
- `HistoryChart` — gráfico de progreso
- `HistoryTable` — tabla de sets históricos
- `HistoryFilters` — filtros de fecha/tipo

---

## 🟢 Prioridad 5 — DX y mantenimiento

Tareas de housekeeping que mejoran la experiencia de desarrollo.

### DX-01: Sincronizar versiones de dependencias

**Esfuerzo**: ~30min

Actualizar `apps/web/package.json`:
```
@supabase/supabase-js: ^2.49.1 → ^2.98.0
@tanstack/react-query: ^5.62.0 → ^5.90.21
zustand: ^5.0.2 → ^5.0.11
```

Verificar: `npm install && npm run test:run -w apps/web && npm run build -w apps/web`.

---

### DX-02: Actualizar CLAUDE.md

**Esfuerzo**: ~30min

Reescribir secciones afectadas por el monorepo:
- **Project Structure**: Reflejar `apps/web/`, `apps/gym-native/`, `packages/shared/`, `packages/eslint-config/`
- **Imports**: Documentar `@gym/shared` barrel, qué va en shared vs per-app
- **State Management**: Añadir `initApi`, `initStores`, `initNotifications`
- **Hooks Organization**: Actualizar con el patrón shared + thin wrapper

---

### DX-03: Completar root scripts

**Esfuerzo**: ~10min

Añadir al root `package.json`:
```json
{
  "check": "npm run lint && npm run test",
  "test:shared": "vitest run --config packages/shared/vitest.config.js"
}
```

---

## Orden recomendado de ejecución

Para ir abordando poco a poco, sesión por sesión:

| Sesión | Tareas | Tiempo | Impacto |
|--------|--------|--------|---------|
| 1 | BUG-01, BUG-02, DX-03 | ~45min | Elimina bugs críticos |
| 2 | DUP-03 (routineIO) | ~1h | -500 líneas duplicadas |
| 3 | DUP-01 (useCompletedSets + useSession) | ~1.5h | -700 líneas duplicadas |
| 4 | DUP-02 (useWorkoutHistory) | ~1h | -250 líneas duplicadas |
| 5 | TEST-01 (API tests, parcial) | ~1.5h | workoutApi + routineApi |
| 6 | TEST-01 (resto) + TEST-02 | ~1.5h | 5 APIs + authStore |
| 7 | SIZE-01, SIZE-02 | ~1.5h | APIs más mantenibles |
| 8 | DX-01, DX-02 | ~1h | Deps sync + docs |

Las sesiones son independientes — puedes hacer cualquiera sin depender de las anteriores (excepto SIZE-03 que depende de BUG-01).

---

## Métricas de seguimiento

| Métrica | Hoy | Objetivo |
|---------|-----|----------|
| Líneas duplicadas entre apps | ~1,400 | < 200 (solo platform-specific) |
| Archivos >300 líneas | 12 | < 5 |
| Tests en shared (archivos) | 17/42 | 30/42 |
| eslint-disable en código | 3 | 0 |
| Versiones desalineadas | 3 deps | 0 |

---

## Progreso

- [ ] **BUG-01**: Hooks condicionales WorkoutExerciseCard
- [ ] **BUG-02**: FileReader en RN
- [ ] **DUP-01**: Compartir useCompletedSets + useSession
- [ ] **DUP-02**: Compartir useWorkoutHistory
- [ ] **DUP-03**: routineIO a shared API
- [ ] **TEST-01**: Tests capa API
- [ ] **TEST-02**: Tests createAuthStore
- [ ] **TEST-03**: Tests hooks críticos
- [ ] **SIZE-01**: Dividir workoutApi.js
- [ ] **SIZE-02**: Dividir routineApi.js
- [ ] **SIZE-03**: Refactor WorkoutExerciseCard
- [ ] **SIZE-04**: Reducir ExerciseHistoryModal
- [ ] **DX-01**: Sincronizar versiones
- [ ] **DX-02**: Actualizar CLAUDE.md
- [ ] **DX-03**: Root scripts
