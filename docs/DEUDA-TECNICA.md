# Deuda Técnica - Gym Tracker

Problemas técnicos que frenan la escalabilidad del proyecto. Resolver antes de implementar nuevas features del roadmap de producto.

**Última revisión**: 2026-03-16 (post-migración monorepo)

---

## Sprint 5 — Bugs y Calidad de Código

Prioridad: **CRÍTICA**. Bugs reales que afectan al usuario o violan reglas de React.

---

### 5.1 Hooks condicionales en WorkoutExerciseCard (RN)

**Archivo**: `apps/gym-native/src/components/Workout/WorkoutExerciseCard.jsx:117-125`

**Problema**: `useRef` y `useEffect` se llaman después de un `return` condicional (`if (isWarmup) return <WarmupExerciseCard />`). Esto viola las reglas de React Hooks — los hooks deben ejecutarse siempre en el mismo orden.

```jsx
if (isWarmup) {
  return <WarmupExerciseCard ... />  // return temprano
}

const prevCompletedRef = useRef(isCompleted)  // ❌ hook condicional
useEffect(() => { ... }, [isCompleted])       // ❌ hook condicional
```

**Consecuencia**: Puede causar state mismatches impredecibles si un ejercicio cambia de warmup a normal mid-sesión. React lo detecta en StrictMode y falla.

**Solución**: Extraer la lógica post-warmup a un componente hijo separado:
```jsx
function WorkoutExerciseCard({ isWarmup, ...props }) {
  if (isWarmup) return <WarmupExerciseCard {...props} />
  return <RegularExerciseCard {...props} />
}

function RegularExerciseCard(props) {
  const prevCompletedRef = useRef(...)  // ✅ siempre se ejecuta
  useEffect(() => { ... })              // ✅ siempre se ejecuta
}
```

**Verificación**: ESLint debería reportar `react-hooks/rules-of-hooks` sin el `eslint-disable`.

---

### 5.2 eslint-disable en producción (3 archivos RN)

**Archivos**:
- `apps/gym-native/src/components/Workout/WorkoutExerciseCard.jsx:122,125` — `rules-of-hooks` (bug real, ver 5.1)
- `apps/gym-native/src/hooks/useStableHandlers.js:21` — `exhaustive-deps` (intencional pero mejorable)
- `apps/gym-native/src/lib/routineIO.js:333` — `no-undef` para `FileReader`

**Problema del FileReader**: `FileReader` es una API de browser que no existe en React Native. El código con `eslint-disable no-undef` sugiere un dead code path o una implementación incorrecta.

**Solución**: Verificar si ese código se ejecuta en RN. Si es dead code, eliminarlo. Si se necesita, usar `expo-file-system` en su lugar.

---

## Sprint 6 — Duplicación Restante Post-Monorepo

Prioridad: **ALTA**. ~1,400 líneas de lógica duplicada entre apps después de la migración.

---

### 6.1 Hooks aún duplicados entre apps

**Problema**: 4 hooks existen como implementaciones completas en ambas apps en vez de re-exports de `@gym/shared`:

| Hook | Web (líneas) | RN (líneas) | Diferencia real |
|------|-------------|-------------|-----------------|
| `useCompletedSets.js` | 192 | 193 | `document.visibilitychange` (web) vs `AppState` (RN) |
| `useSession.js` | 161 | 156 | Mismo pattern que useCompletedSets |
| `useWorkoutHistory.js` | 167 | 141 | `useInfiniteQuery` (web) vs `useQuery` (RN) |
| `useRestTimer.js` | 103 | 58 | Ya usa shared `useTimerEngine`, solo difiere en callbacks |

**Total duplicado**: ~1,010 líneas

**Solución por hook**:
- **useCompletedSets / useSession**: Extraer lógica core a shared, inyectar `onVisibilityChange` callback (web pasa `document.addEventListener('visibilitychange')`, RN pasa `AppState.addEventListener`)
- **useWorkoutHistory**: Evaluar si RN puede usar `useInfiniteQuery` también, o exportar funciones individuales compartidas y dejar el wrapper de query por app
- **useRestTimer**: Ya casi compartido — solo quedan los callbacks de plataforma

---

### 6.2 routineIO.js duplicado parcialmente

**Archivos**: `apps/web/src/lib/routineIO.js` (353 líneas) y `apps/gym-native/src/lib/routineIO.js` (345 líneas)

**Problema**: En Phase 2 se movieron las funciones puras a shared, pero `exportRoutine()`, `importRoutine()` y `duplicateRoutine()` usan Supabase y quedaron en cada app. La lógica de negocio es idéntica — solo difiere `downloadRoutineAsJson` (DOM API vs no-op en RN).

**Solución**: Mover `exportRoutine`, `importRoutine`, `duplicateRoutine` a `packages/shared/src/api/routineApi.js` (ya usan `getClient()`). Dejar solo `downloadRoutineAsJson` y `readJsonFile` como funciones per-app.

---

### 6.3 muscleGroupStyles.js idéntico en ambas apps

**Archivos**: `apps/web/src/lib/muscleGroupStyles.js` y `apps/gym-native/src/lib/muscleGroupStyles.js` (5 líneas cada uno)

**Problema**: Ambos exportan solo `getMuscleGroupBorderStyle()`. La única diferencia es `borderLeftWidth: '3px'` (web) vs `borderLeftWidth: 3` (RN). Se crearon como stubs en Phase 2 pero no se intentó unificar.

**Solución**: Mover a shared con plataforma como parámetro, o simplemente aceptar las 5 líneas de duplicación (esfuerzo > beneficio).

---

## Sprint 7 — Cobertura de Tests

Prioridad: **MEDIA**. No bloquea funcionalidad pero dificulta refactors seguros.

---

### 7.1 Capa API sin tests (0% cobertura)

**Archivos**: 7 archivos en `packages/shared/src/api/` sin ningún `.test.js`

| Archivo | Líneas | Funciones exportadas |
|---------|--------|---------------------|
| `workoutApi.js` | 598 | ~25 funciones |
| `routineApi.js` | 427 | ~20 funciones |
| `exerciseApi.js` | ~150 | ~10 funciones |
| `bodyWeightApi.js` | ~80 | ~5 funciones |
| `bodyMeasurementsApi.js` | ~80 | ~5 funciones |
| `preferencesApi.js` | ~50 | ~3 funciones |
| `adminApi.js` | ~40 | ~3 funciones |

**Solución**: Tests unitarios con mock de Supabase client. Verificar que las funciones:
- Llaman a las tablas/columnas correctas
- Manejan errores (`throw` cuando Supabase devuelve error)
- Transforman datos correctamente

---

### 7.2 Hooks sin tests (10% cobertura)

**Archivos**: 9 hooks en `packages/shared/src/hooks/` sin tests. Solo `useRestTimer` tiene test indirecto vía `useWorkout.test.js`.

**Prioridad de testing**:
1. `useRoutines.js` (251 líneas) — más complejo, más riesgo
2. `useExercises.js` — queries y mutaciones de ejercicios
3. `useSessionExercises.js` — lógica de sesión activa

---

### 7.3 createAuthStore sin tests

**Archivo**: `packages/shared/src/stores/createAuthStore.js` (118 líneas)

**Problema**: `createWorkoutStore` tiene 21 tests. `createAuthStore` tiene 0. La lógica de auth (initialize, login, logout, signup, callbacks de plataforma) no está cubierta.

---

## Sprint 8 — Archivos Grandes y Complejidad

Prioridad: **MEDIA**. CLAUDE.md dice max 150 líneas para componentes.

---

### 8.1 Archivos que exceden 300 líneas

**Shared (packages/shared/src/)**:
| Archivo | Líneas | Acción sugerida |
|---------|--------|-----------------|
| `api/workoutApi.js` | 598 | Dividir en workoutSessionApi + completedSetsApi |
| `lib/routineTemplates.js` | 461 | Aceptable (data, no lógica) |
| `api/routineApi.js` | 427 | Dividir en routineQueryApi + routineMutationApi |
| `lib/workoutTransforms.js` | 324 | Evaluar si se puede dividir por dominio |

**Web (apps/web/src/)**:
| Archivo | Líneas | Acción sugerida |
|---------|--------|-----------------|
| `pages/RoutineDetail.jsx` | 321 | Extraer modales a componentes |
| `components/Workout/ExerciseHistoryModal.jsx` | 330 | Extraer secciones a sub-componentes |
| `components/Workout/WorkoutExerciseCard.jsx` | 324 | Ya necesita refactor (ver 5.1) |
| `components/Workout/SetDetailsModal.jsx` | 320 | Evaluar extracción |

**RN (apps/gym-native/src/)**:
| Archivo | Líneas | Acción sugerida |
|---------|--------|-----------------|
| `components/Workout/WorkoutExerciseCard.jsx` | 311 | Mismo refactor que 5.1 |
| `components/BodyWeight/MeasurementSection.jsx` | 301 | Extraer formularios |

---

## Sprint 9 — Dependencias y DX

Prioridad: **BAJA**. Mantenimiento preventivo.

---

### 9.1 Versiones desalineadas entre apps

| Dependencia | Web | RN | Diferencia |
|-------------|-----|-----|------------|
| `@supabase/supabase-js` | `^2.49.1` | `^2.98.0` | ~49 patches |
| `@tanstack/react-query` | `^5.62.0` | `^5.90.21` | ~28 patches |
| `zustand` | `^5.0.2` | `^5.0.11` | ~9 patches |

**Solución**: Actualizar web a las versiones de RN (más recientes). Considerar `overrides` en root `package.json` para forzar versiones únicas.

---

### 9.2 CLAUDE.md desactualizado

**Problema**: La documentación del proyecto aún describe la estructura pre-monorepo (`src/`, paths directos). No refleja:
- Estructura monorepo (`apps/web/`, `apps/gym-native/`, `packages/shared/`)
- Pattern de `@gym/shared` imports
- `initApi`, `initStores`, `initNotifications` initialization
- Qué va en shared vs qué queda per-app

**Solución**: Reescribir las secciones de Project Structure, Imports, y State Management.

---

### 9.3 Root scripts incompletos

**Problema**: `npm test` solo ejecuta tests de web. No hay script para testear `packages/shared` de forma aislada ni para ejecutar lint + test en un solo comando.

**Solución**:
```json
{
  "test": "npm run test:run -w apps/web",
  "test:shared": "npm run test:run -w packages/shared",
  "check": "npm run lint && npm run test"
}
```

---

## Progreso

### Sprint 1 — Seguridad y Base de Datos ✅
- [x] 1.1 Fuga de datos en useExerciseStats
- [x] 1.2 RLS con JOINs anidados
- [x] 1.3 Índices compuestos
- [x] 1.4 Paginación en historial
- [x] 1.5 Soft delete (decisión documentada)

### Sprint 2 — Arquitectura de Código ✅
- [x] 2.1 Partir useWorkout.js
- [x] 2.2 Timer global con side effects
- [x] 2.3 Error Boundary
- [x] 2.4 Code splitting
- [x] 2.5 Capa API
- [x] 2.6 Páginas grandes

### Sprint 3 — Sistema de Diseño ✅
- [x] 3.1 Tokens de color unificados
- [x] 3.2 Primitivos UI
- [x] 3.3 Responsive desktop

### Sprint 4 — Código Compartido Web / React Native ✅
- [x] 4.1 Utilidades compartidas (monorepo npm workspaces)
- [x] 4.2 Hooks compartidos (9 hooks + store factories + API layer)

### Sprint 5 — Bugs y Calidad de Código
- [ ] 5.1 Hooks condicionales en WorkoutExerciseCard
- [ ] 5.2 eslint-disable en producción (3 archivos)

### Sprint 6 — Duplicación Restante Post-Monorepo
- [ ] 6.1 Hooks aún duplicados (~1,010 líneas)
- [ ] 6.2 routineIO.js duplicado parcialmente
- [ ] 6.3 muscleGroupStyles.js idéntico

### Sprint 7 — Cobertura de Tests
- [ ] 7.1 Capa API sin tests
- [ ] 7.2 Hooks sin tests
- [ ] 7.3 createAuthStore sin tests

### Sprint 8 — Archivos Grandes
- [ ] 8.1 Archivos que exceden 300 líneas (12 archivos)

### Sprint 9 — Dependencias y DX
- [ ] 9.1 Versiones desalineadas
- [ ] 9.2 CLAUDE.md desactualizado
- [ ] 9.3 Root scripts incompletos
