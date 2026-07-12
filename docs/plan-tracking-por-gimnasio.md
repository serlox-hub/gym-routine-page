# Plan: Tracking de progreso por gimnasio

## Context

**Problema de usuario:** cuando entrenas siempre en el mismo gym, comparar pesos entre sesiones tiene sentido. Pero al cambiar de gym, aunque la máquina sea "la misma", el peso se siente distinto (perfil de resistencia, engrase, palanca...). Hoy la app compara **pesos nominales contra todo tu histórico global**, así que cambiar de gym:

1. Genera **falsos bajones** en las gráficas (`transformSessionsToChartData` dibuja una única línea temporal).
2. Genera **falsos PRs y rompe rachas** (los flags `is_pr_*` en `exercise_session_stats` se calculan contra tu mejor marca global vía `detectNewPersonalRecords` / `recalculate_exercise_prs`).

No existe ningún concepto de gimnasio en el modelo actual.

**Decisiones de producto ya tomadas con el usuario:**
- **PRs por gimnasio**: cada gym es su propio contexto de récords. Un peso en el gym B solo compite con tu histórico en el gym B.
- **Asignación sticky con cambio rápido**: la app recuerda el último gym y lo aplica por defecto; se puede cambiar sin fricción.
- **Gráficas filtradas por gym con overlay opcional** para comparar gyms.

**Resultado esperado:** el usuario puede tener varios gimnasios, cada sesión queda asociada a uno, y todo el progreso (PRs, rachas, gráficas, stats all-time) se calcula dentro del contexto de cada gym. Para un usuario con un solo gym, la feature es invisible (cero fricción).

---

## Estrategia general

Introducir una entidad `gyms` por usuario y **desnormalizar `gym_id`** tanto en `workout_sessions` como en `exercise_session_stats` (igual que ya se hace con `user_id`). Todo el pipeline de PRs y stats ya gira en torno a `exercise_session_stats` + `fetchExerciseBests`, así que "por gym" se reduce a **añadir `gym_id` como dimensión de filtrado** en cada punto donde hoy se filtra por `exercise_id`/`user_id`.

Para no romper el histórico existente: la migración crea un **gym por defecto** para cada usuario con sesiones y hace backfill de `gym_id` en sus sesiones y stats. Así todo el historial previo queda bajo "tu primer gym" y los PRs existentes se mantienen coherentes.

---

## 1. Base de datos (nueva migración `044_add_gyms.sql`)

Próximo número confirmado: **044** (la última es `043_backfill_missing_best_per_reps.sql`).

### Tabla `gyms`
```sql
CREATE TABLE gyms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,                       -- nullable: el gym por defecto usa label i18n
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
- RLS: 4 políticas (select/insert/update/delete) con `user_id = auth.uid()`, replicando el patrón de `exercise_session_stats` (migración 018:55-67) y `user_preferences` (005).
- Índice `idx_gyms_user ON gyms(user_id)`.

### Columnas `gym_id`
```sql
ALTER TABLE workout_sessions       ADD COLUMN gym_id BIGINT REFERENCES gyms(id) ON DELETE SET NULL;
ALTER TABLE exercise_session_stats ADD COLUMN gym_id BIGINT REFERENCES gyms(id) ON DELETE SET NULL;
CREATE INDEX idx_ws_gym ON workout_sessions(gym_id);
CREATE INDEX idx_ess_gym_exercise_date ON exercise_session_stats(gym_id, exercise_id, session_date DESC);
```
`ON DELETE SET NULL` como salvaguarda; a nivel de app un gym con sesiones no se borra (solo se renombra) — ver §6.

### Backfill
```sql
-- 1 gym por defecto por cada usuario que tenga sesiones
INSERT INTO gyms (user_id, is_default) SELECT DISTINCT user_id, TRUE FROM workout_sessions;
-- asignar todo el histórico a ese gym
UPDATE workout_sessions ws SET gym_id = g.id FROM gyms g WHERE g.user_id = ws.user_id AND g.is_default;
UPDATE exercise_session_stats ess SET gym_id = g.id FROM gyms g WHERE g.user_id = ess.user_id AND g.is_default;
```

### RPC `start_workout_session` (actualizar)
Definición actual en `031_remove_routine_blocks.sql:124-157`. Añadir parámetro `p_gym_id BIGINT DEFAULT NULL` e incluirlo en el `INSERT INTO workout_sessions (...)`. Recrear la función con `CREATE OR REPLACE`.

### RPC `recalculate_exercise_prs` (actualizar — **clave**)
Definición actual en `042_rep_pr_dominance.sql:18-177`. Hoy recalcula flags para un `(exercise_id, after_date)` sobre **todas** las sesiones del ejercicio. Cambios:
- Añadir parámetro `p_gym_id BIGINT`.
- Añadir `AND gym_id = p_gym_id` en el reset de flags y en **todas** las CTEs/subqueries que recorren el histórico (weight, reps, 1rm, volume, time, distance, pace y el bloque de `pr_rep_counts`).

Con esto, cada gym tiene su propia secuencia cronológica de récords.

---

## 2. Capa compartida (`packages/shared`)

### Nueva API `api/gymsApi.js`
CRUD sencillo replicando `preferencesApi.js` (líneas 1-24):
- `fetchGyms()` → lista de gyms del usuario ordenados (default primero).
- `createGym(name)`, `renameGym(id, name)`, `deleteGym(id)`.
- `ensureDefaultGym()` → si el usuario no tiene ninguno, crea uno `is_default = true` (para usuarios nuevos sin histórico). Devuelve el gym por defecto.

### Nuevo hook `hooks/useGyms.js`
Replicando `usePreferences.js` (30-77) con TanStack Query:
- `useGyms()` (query), `useCreateGym()`, `useRenameGym()`, `useDeleteGym()` (mutations que invalidan `QUERY_KEYS.gyms`).
- `useSelectedGym()` — resuelve el gym activo: lee `last_gym_id` de `user_preferences` (patrón `usePreference('last_gym_id')`); si no hay, cae al gym `is_default`; si no hay gyms, dispara `ensureDefaultGym`.
- `useSetSelectedGym()` — persiste `last_gym_id` vía `upsertPreference` (sticky).

Añadir `QUERY_KEYS.gyms` (+ `QUERY_KEYS.selectedGym` si se cachea) en `packages/shared/src/lib/constants.js:60`.

### Propagar `gym_id` en el pipeline de stats/PRs
`gym_id` del gym activo debe fluir por todo el camino:

| Punto | Archivo | Cambio |
|---|---|---|
| Crear sesión | `api/workoutSessionApi.js:34` `startWorkoutSession` | añadir `gymId` al payload → `p_gym_id` |
| Hook de inicio | `hooks/useSession.js:98-123` `useStartSession` | aceptar `gymId` (del selected gym) y pasarlo |
| Bests previos (fin de sesión) | `api/exerciseStatsApi.js:48-108` `fetchExerciseBests` | añadir opción `{ gymId }` → `.eq('gym_id', gymId)` |
| Bests previos (tiempo real) | `hooks/usePersonalRecords.js:59` | pasar `gymId` de la sesión activa |
| Bests previos (resumen) | `lib/workoutSummary.js` | pasar `gymId` de la sesión |
| Escritura de stats | `api/exerciseStatsApi.js:8-42` `upsertExerciseSessionStats` | añadir `gym_id: s.gymId` en el map de filas |
| Cálculo fin de sesión | `hooks/useSession.js:248-280` `computeSessionStats` | leer `gym_id` de la sesión y usarlo en `fetchExerciseBests({ gymId })` + poner `gymId` en cada fila del upsert |
| **Recalc tras editar/borrar sets** | `api/exerciseStatsApi.js:184-271` `recalculateSessionStats` | **⚠️ actualmente construye las filas (239-245) SIN `gym_id` y llama al recalc sin gym.** Cambiar: hacer `SELECT ... , gym_id` de la sesión (189-193), añadir `gymId` a cada fila de `statsRows`, y pasar `gymId` al recalc |
| RPC recalc (wrapper) | `api/exerciseStatsApi.js:273-281` `recalculateExercisePRs(exerciseId, afterDate)` | añadir 3er arg `gymId` → `p_gym_id` |
| Datos de gráfica | `api/exerciseStatsApi.js:114-146` `fetchExerciseChartData({ exerciseId, routineDayId })` | añadir `gymId` al arg-objeto; para overlay, devolver puntos con su `gym_id` (quitar/relajar el filtro y agrupar en cliente) |
| Stats all-time | `api/exerciseStatsApi.js:152-173` `fetchExerciseAllTimeStats(exerciseId)` | ⚠️ firma **posicional**: convertir a `({ exerciseId, gymId })` (y actualizar sus llamadas) o añadir 2º arg `gymId` |
| Badges de PR en historial | `api/exerciseStatsApi.js:287-333` `fetchSessionPRs`/`fetchSessionsWithPRs` | filtran por `session_id`, así que **no requieren cambio** (el gym ya está implícito en la sesión). Verificar solo que siguen correctos |
| Contador PRs semana | `api/exerciseStatsApi.js:305-315` `fetchWeeklyPRCount` | **no cambia**: los flags `is_pr_*` ya serán per-gym-correctos, así que el conteo semanal global sigue siendo válido |
| Detalle/historial de sesión | `api/workoutSessionApi.js:128-235` `fetchWorkoutHistory`/`fetchSessionDetail` | incluir `gym:gyms(id,name,is_default)` en el select |

**Nota sobre PR en tiempo real vs fin de sesión:** la detección en vivo (`usePersonalRecords`) usa los bests del gym elegido al iniciar. La fuente de verdad es el fin de sesión (`computeSessionStats`), que reconsulta bests del gym final y escribe los flags correctos. Aceptable: si se cambia de gym a mitad de sesión, las notificaciones en vivo pueden usar los bests del gym anterior, pero los flags persistidos serán correctos.

La lógica pura de `sessionStatsCalculation.js` **no cambia** — solo cambia qué conjunto de `previousBests` se le pasa (ya filtrado por gym).

### i18n
Añadir en **ambos** `es/` y `en/` (namespace `common.json`, sección `gym`): `title`, `defaultName` (ej. "Mi gimnasio" / "My gym"), `select`, `add`, `rename`, `delete`, `deleteConfirm`, `name`, `namePlaceholder`, `manage`, `current`, `changeForSession`, `allGyms`, `cannotDeleteWithSessions`. El gym con `is_default = true` y `name` NULL se muestra con `t('common:gym.defaultName')`.

### Barrel
Exportar `useGyms` y compañía, `gymsApi`, y `QUERY_KEYS.gyms` desde `packages/shared/src/index.js`.

---

## 3. Asignación sticky del gym (inicio de sesión)

Objetivo: **cero fricción** para el caso normal (un solo gym o mismo gym de siempre).

- Al iniciar sesión (`useStartSession` desde `DayCard.jsx` / `TodaysWorkout.jsx`, web y native), resolver el gym con `useSelectedGym()` y pasarlo automáticamente. Sin pasos extra.
- **Cambio rápido**: chip de gym en el header de la sesión activa (`WorkoutSessionLayout.jsx`, web y native). Al tocarlo, se abre un selector (lista de gyms + "añadir gym"). Cambiarlo actualiza `workout_sessions.gym_id` de la sesión en curso y persiste `last_gym_id` (sticky para la próxima).
- **Feature invisible con un solo gym**: el chip solo se muestra si el usuario tiene ≥2 gyms. Con un único gym no aparece nada nuevo.

Archivos: `apps/web/src/components/Workout/WorkoutSessionLayout.jsx:31-77` y su análogo native. Nuevo componente `GymSelector`/`GymPickerModal` (web + native) reutilizable también en §6.

---

## 4. Gráficas e historial (filtro por gym + overlay)

- **Detalle de sesión** (`components/History/SessionInlineDetail.jsx`, web ~533-590 y native): mostrar un badge con el nombre del gym junto a `day_name`/`routine_name`. Editable (permite reasignar el gym de una sesión pasada — ver §6). Al reasignar, disparar recalc de PRs de los ejercicios afectados en el gym antiguo **y** el nuevo.
- **`ExerciseProgressChart.jsx` / `ExerciseHistoryModal.jsx`** (web + native `Charts/ExerciseProgressChart.jsx`):
  - Por defecto muestran el gym activo/seleccionado.
  - Control de filtro para elegir gym; opción "overlay" que dibuja cada gym como una **serie separada** (líneas distintas). Requiere que `fetchExerciseChartData` devuelva los puntos agrupados por `gym_id`.
  - El modal ya tiene un toggle de scope DAY/GLOBAL (`ExerciseHistoryModal.jsx:44-62`); añadir el filtro de gym en la misma zona.
- Como el filtro por defecto es por gym, desaparecen los falsos bajones sin necesidad de marcadores de transición.

---

## 5. Gestión de gimnasios (CRUD)

Página/pantalla dedicada, enlazada desde Preferencias (patrón `Preferences.jsx` + `usePreferences.js`):
- **Web**: `apps/web/src/pages/Gyms.jsx` + ruta en `apps/web/src/App.jsx` + enlace desde `Preferences.jsx`.
- **Native**: `apps/gym-native/src/screens/GymsScreen.jsx` + registrar en `apps/gym-native/src/navigation/AppStack.jsx` + enlace desde la pantalla de preferencias.
- Funcionalidad: listar gyms, añadir, renombrar, borrar. Marcar cuál es el activo.

---

## 6. Borrado / edición de gyms (edge cases)

- **Borrar gym sin sesiones**: permitido directamente.
- **Borrar gym con sesiones**: en v1 **no se permite** borrar (solo renombrar); mostrar `t('common:gym.cannotDeleteWithSessions')`. (Merge/reasignar histórico a otro gym queda como mejora futura.)
- **Reasignar el gym de una sesión pasada** (desde el detalle): actualizar `workout_sessions.gym_id` + `exercise_session_stats.gym_id` de esa sesión y llamar `recalculate_exercise_prs` por cada ejercicio afectado en **ambos** gyms (origen y destino) desde `after_date = session_date`.

---

## Archivos nuevos
- `apps/web/supabase/migrations/044_add_gyms.sql`
- `packages/shared/src/api/gymsApi.js` (+ test)
- `packages/shared/src/hooks/useGyms.js` (+ test)
- `apps/web/src/pages/Gyms.jsx`
- `apps/web/src/components/Workout/GymSelector.jsx` (o `GymPickerModal`)
- `apps/gym-native/src/screens/GymsScreen.jsx`
- `apps/gym-native/src/components/Workout/GymSelector.jsx`

## Archivos principales a modificar
- SQL RPCs: `recalculate_exercise_prs` y `start_workout_session` (recrear en la nueva migración).
- `packages/shared/src/api/{workoutSessionApi,exerciseStatsApi}.js` (incluye `recalculateSessionStats` — ver ⚠️ en la tabla §2)
- `packages/shared/src/hooks/{useSession,usePersonalRecords}.js`
- `packages/shared/src/lib/workoutSummary.js`
- `packages/shared/src/index.js` (barrel) + `packages/shared/src/lib/constants.js` (QUERY_KEYS)
- `packages/shared/src/i18n/locales/{es,en}/common.json`
- Web: `WorkoutSessionLayout.jsx`, `SessionInlineDetail.jsx`, `ExerciseProgressChart.jsx`, `ExerciseHistoryModal.jsx`, `Preferences.jsx`, `DayCard.jsx`, `TodaysWorkout.jsx`, router.
- Native: análogos de todos los anteriores (paridad web/native obligatoria por CLAUDE.md).

## Reutilización (no reinventar)
- Patrón CRUD + TanStack Query: `usePreferences.js` / `preferencesApi.js`.
- Sticky: tabla `user_preferences` (005) con key `last_gym_id` vía `upsertPreference`.
- Toda la matemática de PRs (`sessionStatsCalculation.js`) se reutiliza tal cual; solo cambia el conjunto de bests que recibe.
- RLS: patrón de `exercise_session_stats` (018:55-67).

---

## Pendiente de explorar al implementar (no bloqueante)

El plan está verificado en el backend y la capa shared (rutas y líneas comprobadas leyendo los archivos). Lo que una sesión en frío debe **localizar por sí misma** antes de tocarlo, porque no se fijaron rutas exactas:

- **Nombres exactos de los componentes native** análogos a los web para: preferencias (pantalla que enlaza a Gyms), `SessionInlineDetail` native, y el gráfico native (`apps/gym-native/src/components/Charts/ExerciseProgressChart.jsx` fue reportado pero conviene confirmarlo).
- **`usePersonalRecords.js`**: confirmar dónde exactamente se llama `fetchExerciseBests` (reportado ~línea 59) para inyectar `gymId` de la sesión activa.
- **`workoutSummary.js`**: confirmar la llamada a `fetchExerciseBests({ beforeDate })` para añadir `gymId`.
- **Forma de datos para el overlay de gráficas**: es la pieza más abierta. Decidir si `fetchExerciseChartData` devuelve filas con `gym_id` y se agrupan en cliente, o varias queries. Diseñar la estructura de series antes de tocar los componentes de chart (web + native).
- **Trigger de signup**: comprobar si existe un trigger que crea datos por usuario al registrarse; si lo hay, valorar crear ahí el gym por defecto en vez de `ensureDefaultGym` lazy.

## Verificación

1. **Migración**: aplicar `044` en local (Supabase) y comprobar: se crea la tabla `gyms`, cada usuario con sesiones tiene un gym `is_default`, y `workout_sessions.gym_id` / `exercise_session_stats.gym_id` quedan backfilleados (0 NULL entre sesiones existentes).
2. **Tests shared**: `npm run test:shared` — añadir/ajustar tests de `gymsApi`, `useGyms`, y verificar que los tests de `sessionStatsCalculation` siguen verdes (la lógica pura no cambia).
3. **PRs por gym (manual)**:
   - Gym A: registrar press 100 kg → PR. Cambiar a Gym B, registrar 80 kg → **no** debe salir como bajón ni romper racha en A; en B debe ser el primer registro (baseline, sin PR).
   - Subir a 85 kg en B → PR en B. Volver a A, 90 kg → no es PR (100 sigue siendo el récord de A).
4. **Sticky**: iniciar sesión sin tocar nada usa el último gym. Cambiar el gym en el header persiste para la siguiente sesión.
5. **Gráficas**: el chart por defecto muestra solo el gym seleccionado (sin falsos bajones); el overlay dibuja una serie por gym.
6. **Edición histórica**: reasignar el gym de una sesión pasada recalcula PRs correctamente en ambos gyms.
7. **Feature invisible**: con un solo gym, no aparece selector ni cambios visibles.
8. `npm run check` (lint + tests + build web + build native) en verde.
