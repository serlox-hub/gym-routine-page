# Deuda Técnica - Gym Tracker

Problemas técnicos que frenan la escalabilidad del proyecto. Resolver antes de implementar nuevas features del roadmap de producto.

---

## Sprint 1 — Seguridad y Base de Datos

Prioridad: **CRÍTICA**. Sin esto, la app no escala más allá de ~100 usuarios activos.

---

### 1.1 Fuga de datos en useExerciseStats

**Archivo**: `src/hooks/useExercises.js` (líneas ~47-78)

**Problema**: Las queries a `session_exercises` y `routine_exercises` no filtran por `user_id`. Cualquier usuario puede ver estadísticas de uso de ejercicios de TODOS los usuarios del sistema.

**Código actual**:
```js
const [sessionRes, routineRes] = await Promise.all([
  supabase.from('session_exercises').select('exercise_id'),      // SIN FILTRO
  supabase.from('routine_exercises').select('exercise_id, ...'), // SIN FILTRO
])
```

**Solución**: Añadir filtro por usuario a través de JOINs con tablas que tienen `user_id`:
```js
// Opción 1: JOIN con workout_sessions que sí tiene user_id
supabase.from('session_exercises')
  .select('exercise_id, workout_sessions!inner(user_id)')
  .eq('workout_sessions.user_id', userId)

// Opción 2: Usar RPC que haga la query en el servidor
```

**Verificación**: Crear dos usuarios de test, cada uno con ejercicios distintos. Confirmar que las estadísticas son independientes.

---

### 1.2 RLS con JOINs anidados (rendimiento)

**Archivos**: `supabase/migrations/001_initial_schema.sql`

**Problema**: Las políticas RLS de `routine_blocks`, `routine_exercises`, `session_exercises` y `completed_sets` usan JOINs encadenados para verificar ownership:

```sql
-- Cada acceso a routine_blocks hace este JOIN:
CREATE POLICY "..." ON routine_blocks FOR SELECT
USING (EXISTS (
    SELECT 1 FROM routine_days
    JOIN routines ON routines.id = routine_days.routine_id
    WHERE routine_days.id = routine_blocks.routine_day_id
    AND routines.user_id = auth.uid()
));
```

Esto se ejecuta **por cada fila** accedida. Con 10 rutinas × 20 días × 5 bloques = 1000 bloques, cada query hace 1000 JOINs de verificación.

**Solución**: Desnormalizar `user_id` en las tablas que no lo tienen:

```sql
-- 1. Añadir columna
ALTER TABLE routine_blocks ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE routine_exercises ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. Poblar datos existentes
UPDATE routine_blocks rb SET user_id = (
  SELECT r.user_id FROM routine_days rd
  JOIN routines r ON r.id = rd.routine_id
  WHERE rd.id = rb.routine_day_id
);

UPDATE routine_exercises re SET user_id = (
  SELECT r.user_id FROM routine_blocks rb
  JOIN routine_days rd ON rd.id = rb.routine_day_id
  JOIN routines r ON r.id = rd.routine_id
  WHERE rb.id = re.routine_block_id
);

-- 3. Crear índices
CREATE INDEX idx_routine_blocks_user ON routine_blocks(user_id);
CREATE INDEX idx_routine_exercises_user ON routine_exercises(user_id);

-- 4. Simplificar RLS
CREATE POLICY "..." ON routine_blocks FOR SELECT
USING (user_id = auth.uid());  -- Sin JOINs
```

**Archivos a modificar después**:
- Hooks de creación de bloques/ejercicios: pasar `user_id` al insertar
- `useRoutines.js`: `useAddExerciseToDay`, `useCreateRoutineDay`

**Verificación**: Medir tiempo de query antes/después con EXPLAIN ANALYZE en Supabase SQL Editor.

---

### 1.3 Índices compuestos faltantes

**Archivo**: Nueva migración SQL

**Problema**: Queries frecuentes no tienen índices optimizados:

```sql
-- Query: "últimas 50 sesiones del usuario X" → escanea índice de fecha, filtra por user
-- Actual: dos índices separados
CREATE INDEX idx_workout_sessions_user ON workout_sessions(user_id);
CREATE INDEX idx_sessions_date ON workout_sessions(started_at DESC);
```

**Solución**: Crear índices compuestos:

```sql
-- Sesiones por usuario ordenadas por fecha (query más frecuente)
CREATE INDEX idx_workout_sessions_user_date
  ON workout_sessions(user_id, started_at DESC);

-- Ejercicios de sesión por exercise_id (para historial de ejercicio)
CREATE INDEX idx_session_exercises_exercise
  ON session_exercises(exercise_id);

-- Ejercicios de rutina por exercise_id (para stats y eliminación)
CREATE INDEX idx_routine_exercises_exercise
  ON routine_exercises(exercise_id);

-- Sesiones por status (para buscar sesiones activas)
CREATE INDEX idx_workout_sessions_status
  ON workout_sessions(status, started_at DESC);
```

**Verificación**: Antes de crear, ejecutar queries con `EXPLAIN ANALYZE` para confirmar que Seq Scan cambia a Index Scan.

---

### 1.4 Sin paginación en historial

**Archivo**: `src/hooks/useWorkout.js` (líneas ~602-657)

**Problema**: `useWorkoutHistory` carga TODAS las sesiones completadas con datos anidados (exercises, muscle_groups). Un usuario activo con 500 sesiones genera un payload de varios MB.

**Código actual**:
```js
const { data } = await supabase
  .from('workout_sessions')
  .select(`id, started_at, ...,
    routine_day:routine_days (id, name, routine:routines (id, name)),
    session_exercises (id, exercise:exercises (id, muscle_group:muscle_groups (...)))
  `)
  .eq('status', 'completed')
  .order('started_at', { ascending: false })
  // ← SIN LIMIT
```

**Solución**: Paginación con cursor o offset:

```js
// En el hook, aceptar parámetro de página
export function useWorkoutHistory(page = 0) {
  const PAGE_SIZE = 30

  return useQuery({
    queryKey: [QUERY_KEYS.WORKOUT_HISTORY, page],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select(`...`)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      return data
    },
  })
}
```

**Componente afectado**: `MonthlyCalendar.jsx` y `HistoryList.jsx` — implementar "cargar más" o scroll infinito.

**También aplicar a**:
- `useExerciseHistory` — ya tiene `.limit(50)` pero sin offset para cargar más
- `useLatestBodyMeasurements` — carga TODOS los registros para quedarse con el último por tipo. Usar `DISTINCT ON` en SQL

---

### 1.5 Soft delete inconsistente

**Problema**: Solo `exercises` tiene `deleted_at`. Las demás tablas (`routines`, `routine_days`, etc.) eliminan con DELETE real.

**Decisión necesaria**: Elegir una estrategia:
- **Opción A**: Añadir `deleted_at` a `routines`, `routine_days`, `routine_blocks`. Más seguro, permite "papelera". Requiere filtrar en todas las queries.
- **Opción B**: Crear views que filtren automáticamente: `CREATE VIEW exercises_active AS SELECT * FROM exercises WHERE deleted_at IS NULL`. Transparente para el código.
- **Opción C**: Mantener como está y documentar que solo exercises usa soft delete. Aceptable si no se necesita papelera.

**Recomendación**: Opción B si se quiere consistencia sin cambiar hooks.

---

## Sprint 2 — Arquitectura de Código

Prioridad: **ALTA**. Bloquea la capacidad de añadir features sin romper cosas.

---

### 2.1 Partir useWorkout.js (1090 líneas)

**Archivo**: `src/hooks/useWorkout.js`

**Problema**: Un único archivo con 20+ exports mezclando: lifecycle de sesión, mutaciones de sets, ejercicios de sesión, historial, timer global, y restauración de sesión.

**Plan de división**:

| Archivo nuevo | Responsabilidad | Exports a mover |
|---------------|-----------------|------------------|
| `useSession.js` | Iniciar, finalizar, cancelar, restaurar sesión | `useStartSession`, `useEndSession`, `useCancelSession`, `useRestoreSession`, `useActiveSession` |
| `useCompletedSets.js` | CRUD de sets completados | `useCompleteSet`, `useUpdateSet`, `useUncompleteSet`, `useDeleteSet` |
| `useSessionExercises.js` | Ejercicios dentro de sesión activa | `useAddSessionExercise`, `useRemoveSessionExercise`, `useReorderSessionExercises`, `useReplaceSessionExercise` |
| `useWorkoutHistory.js` | Queries de historial | `useWorkoutHistory`, `useExerciseHistory`, `useExerciseProgress`, `useDurationHistory` |
| `useRestTimer.js` | Timer de descanso | `useRestTimer`, lógica de beep/vibración |

**Pasos**:
1. Crear los 5 archivos nuevos
2. Mover exports manteniendo imports internos
3. Actualizar `index.js` del directorio hooks para re-exportar todo
4. Buscar y reemplazar imports en componentes: `import { ... } from '../hooks/useWorkout'` → sin cambios si usamos re-exports desde un index

**Archivos afectados por imports**: Buscar con `grep -r "useWorkout" src/components/ src/pages/`

**Aplicar mismo patrón a**: `useRoutines.js` (610 líneas) → dividir en `useRoutineQueries.js` y `useRoutineMutations.js`

**También en React Native**: `gym-native/src/hooks/useWorkout.js` — misma división

---

### 2.2 Timer global con side effects a nivel de módulo

**Archivo**: `src/hooks/useWorkout.js` (líneas ~874-986)

**Problema**: Estado mutable y suscripciones al store se ejecutan al importar el módulo, no dentro de un hook:

```js
// Se ejecuta al hacer import, no en useEffect
let globalTimerInterval = null
let lastBeepSecond = -1
let prevRestTimerActive = useWorkoutStore.getState().restTimerActive

// Suscripción que nunca se limpia
useWorkoutStore.subscribe((state) => {
  if (state.restTimerActive && !prevRestTimerActive) {
    startGlobalTimer()
  }
  // ...
})
```

**Problemas que causa**:
- No se puede testear sin importar todo el módulo
- Suscripción persiste para siempre (memory leak)
- SSR fallaría (no hay store en servidor)
- Imposible tener múltiples instancias

**Solución**: Encapsular en un hook con cleanup:

```js
// useRestTimer.js
export function useRestTimer() {
  const intervalRef = useRef(null)

  useEffect(() => {
    const unsubscribe = useWorkoutStore.subscribe((state, prevState) => {
      if (state.restTimerActive && !prevState.restTimerActive) {
        startTimer(intervalRef)
      }
      if (!state.restTimerActive && prevState.restTimerActive) {
        stopTimer(intervalRef)
      }
    })

    return () => {
      unsubscribe()
      clearInterval(intervalRef.current)
    }
  }, [])
}
```

**Donde montarlo**: En `WorkoutSessionLayout.jsx` o en el layout raíz, una sola vez.

---

### 2.3 Sin Error Boundary

**Problema**: No existe ningún `ErrorBoundary` en la app. Un error en cualquier componente crashea toda la aplicación (pantalla blanca).

**Solución**:

```jsx
// src/components/ErrorBoundary.jsx
import { Component } from 'react'

class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <h2 className="text-lg font-semibold mb-2">Algo salió mal</h2>
          <p className="text-secondary text-sm mb-4">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Montar en**: `main.jsx` envolviendo `<App />`

**Opcional**: ErrorBoundary por sección (workout, history, routines) para que un error en historial no tire la sesión activa.

---

### 2.4 Sin code splitting (bundle 1.2MB)

**Archivo**: `src/main.jsx` o `src/App.jsx` (donde se definen las rutas)

**Problema**: Las 17 páginas se importan eagerly. El bundle compilado es un solo archivo de 1.2MB.

**Solución**: Lazy loading por ruta:

```jsx
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from './components/ui'

const Home = lazy(() => import('./pages/Home'))
const RoutineDetail = lazy(() => import('./pages/RoutineDetail'))
const WorkoutSession = lazy(() => import('./pages/WorkoutSession'))
const History = lazy(() => import('./pages/History'))
const Landing = lazy(() => import('./pages/Landing'))
// ... resto de páginas

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* ... */}
      </Routes>
    </Suspense>
  )
}
```

**Configuración Vite** (opcional, para vendor chunks):
```js
// vite.config.js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        query: ['@tanstack/react-query'],
        supabase: ['@supabase/supabase-js'],
      }
    }
  }
}
```

**Resultado esperado**: Bundle inicial < 300KB, resto se carga bajo demanda.

**Verificación**: `npm run build` y comparar tamaños en `dist/assets/`.

---

### 2.5 Supabase directo en hooks (sin capa API)

**Problema**: 23 hooks importan `supabase` directamente y construyen queries inline. Cambiar un nombre de columna en la BD obliga a buscar y modificar en múltiples archivos.

**Solución**: Crear capa de abstracción en `src/lib/api/`:

```
src/lib/api/
├── routineApi.js      # getRoutines, createRoutine, updateRoutine, etc.
├── workoutApi.js       # startSession, endSession, completeSet, etc.
├── exerciseApi.js      # getExercises, createExercise, getStats, etc.
├── bodyMetricsApi.js   # getWeightHistory, addWeight, etc.
└── index.js            # Re-exports
```

**Ejemplo**:
```js
// src/lib/api/workoutApi.js
import { supabase } from '../supabase'

export async function getWorkoutHistory({ page = 0, pageSize = 30 }) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(`id, started_at, ended_at, status, notes, sensation, ...`)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error
  return data
}
```

```js
// src/hooks/useWorkoutHistory.js
import { getWorkoutHistory } from '../lib/api/workoutApi'

export function useWorkoutHistory(page = 0) {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKOUT_HISTORY, page],
    queryFn: () => getWorkoutHistory({ page }),
  })
}
```

**Beneficios**:
- Un solo lugar donde cambiar nombres de columnas/tablas
- Testeable sin React (funciones puras async)
- Compartible entre web y React Native
- Centraliza manejo de errores de Supabase

**Prioridad**: MEDIA. Hacerlo incrementalmente, empezando por los hooks que se van a tocar en Sprint 1.

---

### 2.6 Páginas que exceden 150 líneas

| Archivo | Líneas | Problema principal |
|---------|--------|--------------------|
| `Landing.jsx` | 718 | Página marketing completa en un archivo |
| `Home.jsx` | 419 | 8+ modales, lógica de sesión, import, templates |
| `RoutineDetail.jsx` | 320 | 6+ modales, modo edición, reordenamiento |
| `Preferences.jsx` | 276 | Formulario largo de preferencias |
| `BodyMetrics.jsx` | 210 | Tabs + gráficos + formularios |

**Plan**: Extraer secciones en componentes con su propio estado local:
- `Home.jsx` → `QuickAccessCard`, `RoutinesList`, `ImportSection`, `TemplatesSection`
- `RoutineDetail.jsx` → `DaysList`, `RoutineEditToolbar`, `ExerciseModals`
- `Landing.jsx` → `HeroSection`, `FeaturesSection`, `PricingSection`, `Footer`

**Criterio**: Si una sección tiene su propio estado (`useState`) y no lo comparte con el resto, es candidata a extraer.

---

## Sprint 3 — Sistema de Diseño

Prioridad: **MEDIA**. No bloquea funcionalidad pero ralentiza el desarrollo de nuevas features.

---

### 3.1 Duplicación de tokens de color

**Archivos**: `src/lib/styles.js` + `tailwind.config.js`

**Problema**: Los colores están definidos en dos sitios con nombres diferentes:

```js
// styles.js → usado en style={{ color: colors.accent }}
accent: '#58a6ff',
bgPrimary: '#0d1117',
textPrimary: '#e6edf3',

// tailwind.config.js → usado en className="bg-surface text-primary"
surface: '#0d1117',
primary: '#e6edf3',
accent: '#58a6ff',
```

**Solución**: Una sola fuente de verdad. Dos opciones:

**Opción A** (recomendada): Tailwind como fuente, styles.js importa de ahí:
```js
// src/lib/styles.js
// Solo exporta lo que Tailwind no cubre (style objects para inline styles)
// Los colores se usan vía className="bg-surface text-primary"
```

**Opción B**: styles.js como fuente, tailwind.config.js importa:
```js
// tailwind.config.js
const { colors } = require('./src/lib/styles')
module.exports = {
  theme: { extend: { colors } }
}
```

**Trabajo posterior**: Buscar y reemplazar colores hex hardcodeados en componentes. Hay 44+ instancias:
- `RestTimer.jsx`: `#238636`, `#f85149`, `#d29922` → usar `colors.success`, `colors.danger`, `colors.warning`
- `SetRow.jsx`: múltiples hex para estados de set
- `ActiveSessionBanner.jsx`: `#161b22`, `#58a6ff`, `rgba(35, 134, 54, 0.95)`
- `NotesBadge.jsx`: `#a371f7`, `#f85149`

**Comando útil**: `grep -rn '#[0-9a-fA-F]\{6\}' src/components/` para encontrar todos.

---

### 3.2 Primitivos UI faltantes

**Problema**: No existen componentes wrapper para elementos de formulario. Cada formulario usa `<input>`, `<select>`, `<textarea>` con estilos inline repetidos.

**Componentes a crear en `src/components/ui/`**:

| Componente | Prioridad | Dónde se usa actualmente |
|------------|-----------|--------------------------|
| `Input.jsx` | Alta | SetInputs, DayEditForm, ExerciseForm, SignUp, Login |
| `Select.jsx` | Alta | ExerciseForm (muscle group, measurement type) |
| `Textarea.jsx` | Media | SessionNotes, ExerciseForm (instructions) |
| `Checkbox.jsx` | Media | ImportOptionsModal, Preferences |
| `Label.jsx` | Baja | Todos los formularios |
| `FormField.jsx` | Baja | Wrapper label + input + error |
| `Toast.jsx` | Media | Notificaciones de éxito/error (actualmente usa alert()) |
| `Tabs.jsx` | Media | BodyMetrics (peso/medidas), ExerciseProgress |

**Ejemplo de Input**:
```jsx
// src/components/ui/Input.jsx
import { colors } from '../../lib/styles'

function Input({ label, error, ...props }) {
  return (
    <div>
      {label && <label className="text-sm text-secondary mb-1 block">{label}</label>}
      <input
        className="w-full px-3 py-2 rounded-lg text-sm bg-surface-alt text-primary border border-border
                   focus:border-accent focus:outline-none transition-colors"
        {...props}
      />
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  )
}

export default Input
```

**Migración**: Ir reemplazando `<input style={styles.input} ... />` por `<Input ... />` conforme se toquen archivos.

---

### 3.3 Responsive para desktop

**Problema**: Fuera de Landing.jsx, la app usa `max-w-2xl` (672px) fijo. En pantallas grandes hay mucho espacio desperdiciado.

**Solución por fases**:
1. **Corto plazo**: Subir a `max-w-4xl` en desktop para páginas con tablas/historial
2. **Medio plazo**: Layout de 2 columnas en desktop para RoutineDetail (días a la izquierda, detalle a la derecha)
3. **Largo plazo**: Sidebar de navegación en desktop, bottom nav solo en mobile

**No es bloqueante** para el roadmap de producto, pero mejora mucho la experiencia web.

---

## Sprint 4 — Código Compartido Web / React Native

Prioridad: **MEDIA-BAJA**. Solo si se mantiene activamente la app React Native.

---

### 4.1 Utilidades duplicadas

**Problema**: ~16 archivos en `src/lib/` están copiados manualmente en `gym-native/src/lib/`. Un bugfix hay que aplicarlo dos veces.

**Archivos duplicados**:
- `arrayUtils.js`, `calendarUtils.js`, `dateUtils.js`, `timeUtils.js`
- `setUtils.js`, `workoutCalculations.js`, `workoutTransforms.js`
- `measurementTypes.js`, `validation.js`, `supersetUtils.js`
- `constants.js`, `styles.js`

**Soluciones**:
- **Opción A (simple)**: Symlinks desde `gym-native/src/lib/` a `src/lib/` para archivos idénticos
- **Opción B (monorepo)**: Extraer a `packages/shared/` con workspace de npm
- **Opción C (pragmática)**: Script que copie archivos y verifique que no hayan divergido

**Recomendación**: Opción A para empezar. Si el proyecto crece, migrar a Opción B.

---

### 4.2 Hooks duplicados

**Problema**: Web tiene 2835 líneas de hooks, RN tiene 2489. La lógica de Supabase es casi idéntica, las diferencias son:
- Navegación: `useNavigate()` (web) vs `navigation.navigate()` (RN)
- Notificaciones: sin implementar (web) vs Toast (RN)
- Store: mismo Zustand pero con adapters distintos

**Solución**: Si se crea la capa API (Sprint 2.5), los archivos `src/lib/api/` serían 100% compartibles. Los hooks serían wrappers finos específicos de plataforma.

---

## Progreso

### Sprint 1 — Seguridad y Base de Datos
- [x] **1.1 Fuga de datos en useExerciseStats** — Resuelto: se eliminaron políticas RLS permisivas `"Allow all for anon" USING (true)` en producción que anulaban las políticas restrictivas. Migración `014_remove_permissive_anon_policies.sql`. Verificado con curl: 0 filas accesibles sin auth.
- [x] **1.2 RLS con JOINs anidados (rendimiento)** — Desnormalizado `user_id` en `routine_blocks` y `routine_exercises`. Migración `017_denormalize_user_id_rls.sql`. Triggers BEFORE INSERT/UPDATE propagan user_id automáticamente. RLS simplificado a `user_id = auth.uid()` sin JOINs. EXPLAIN ANALYZE: Index Scan 0.060ms/0.099ms.
- [x] **1.3 Índices compuestos** — Migración `015_add_composite_indexes.sql`. Añadidos `(user_id, started_at DESC)` y `(user_id, status)` en `workout_sessions`. EXPLAIN ANALYZE: 0.129ms con Index Scan.
- [x] **1.4 Paginación en historial** — `useWorkoutHistory` ahora filtra por mes visible (`.gte`/`.lte` por fecha), con cache por mes en TanStack Query. `useLatestBodyMeasurements` limitado a 100 registros. `useExerciseHistory` ya tenía `.limit(50)`. Aplicado en web y RN.
- [x] **1.5 Soft delete inconsistente** — Decisión: Opción C. Solo `exercises` necesita soft delete (referenciados en sesiones pasadas). Rutinas/días/bloques se eliminan con CASCADE sin impacto en historial. Documentado en CLAUDE.md.

### Sprint 2 — Arquitectura de Código
- [x] **2.1 Partir useWorkout.js** — Dividido en 5 archivos por dominio: useSession, useCompletedSets, useSessionExercises, useWorkoutHistory, useRestTimer. Barrel re-export en useWorkout.js. Fix APIs web en RN useRestTimer (expo-haptics + Vibration). Web y RN.
- [x] **2.2 Timer global con side effects** — Encapsulado en `useTimerEngine` hook con refs y cleanup. Sin variables globales mutables ni suscripciones al importar. Web y RN.
- [x] **2.3 Error Boundary** — Creado en web y RN. Montado envolviendo `<App />`. Muestra pantalla de fallback con reintentar.
- [x] **2.4 Code splitting** — Lazy loading de 18 páginas + vendor chunks (react, query, supabase). Bundle inicial ~260KB (antes 1,217KB).
- [ ] 2.5 Supabase directo en hooks (sin capa API)
- [x] **2.6 Páginas grandes** — Landing.jsx (718→21), Home.jsx (419→89), HomeScreen RN (401→98). Extraídas secciones con estado propio a components/Landing/ y components/Home/.

### Sprint 3 — Sistema de Diseño
- [ ] 3.1 Duplicación de tokens de color
- [ ] 3.2 Primitivos UI faltantes
- [ ] 3.3 Responsive para desktop

### Sprint 4 — Código Compartido Web / React Native
- [ ] 4.1 Utilidades duplicadas
- [ ] 4.2 Hooks duplicados

---

## Checklist de Verificación por Sprint

### Sprint 1
- [x] Políticas RLS permisivas eliminadas — verificado con curl (anon y autenticado devuelven 0 filas)
- [x] App funciona con normalidad tras el fix — verificado manualmente
- [x] RLS simplificado — `EXPLAIN ANALYZE` muestra Index Scan (0.060ms routine_blocks, 0.099ms routine_exercises)
- [x] Índices compuestos creados — verificado con EXPLAIN ANALYZE (0.129ms, Index Scan)
- [x] Historial paginado por mes — query filtrada por rango de fechas, cache por mes

### Sprint 2
- [ ] useWorkout.js dividido — cada archivo < 250 líneas
- [ ] Timer no tiene side effects al importar — verificar en tests
- [ ] ErrorBoundary montado — provocar error y ver pantalla de fallback
- [ ] Code splitting — `npm run build` muestra múltiples chunks < 300KB
- [ ] Capa API creada (al menos para los hooks tocados)

### Sprint 3
- [ ] `grep -rn '#[0-9a-fA-F]' src/components/` devuelve 0 resultados
- [ ] Componente `Input` usado en al menos 3 formularios
- [ ] `styles.js` no duplica colores de `tailwind.config.js`

### Sprint 4
- [ ] Archivos compartidos linkeados o en monorepo
- [ ] Cambiar una utilidad en un sitio se refleja en ambas plataformas
