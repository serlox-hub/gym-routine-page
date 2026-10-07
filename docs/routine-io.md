# Import/export de rutinas (JSON) — detalle

Referencia de consulta (no invariante). La invariante corta (dos archivos, versión 10, emparejar
por clave estable, retrocompatibilidad) + puntero viven en `CLAUDE.md` → "Archivos críticos:
import/export de rutinas (JSON)". Aquí el detalle completo, el rationale del emparejamiento y el
checklist de "cuando cambie el modelo de datos".

## Los dos archivos (no confundir)

- **`packages/shared/src/api/routineIOApi.js`** — `exportRoutine()` / `importRoutine()` / `duplicateRoutine()` (tocan BD) y `buildRoutineExport()` (puro: filas de `routine_export_rows` → JSON). Define el **esquema** vía `ROUTINE_EXPORT_VERSION` (**actual: 10**) y mapea BD ↔ JSON.
- **`packages/shared/src/lib/routineIO.js`** — prompts de IA (`buildChatbotPrompt`, `buildAdaptRoutinePrompt`) y el doc del formato (`ROUTINE_JSON_FORMAT`/`ROUTINE_JSON_RULES`). Puro, sin BD.

⚠️ **Tercer consumidor del shape del export:** `packages/shared/src/lib/routineTextFormat.js` (compartir rutina como texto) empareja `blocks[].exercises[].exercise_name` con `exercises[].name_es` para leer sus `tracked_fields`, que deciden la escala de esfuerzo. Si se recortan columnas del catálogo del export, **degrada en silencio** a la escala RIR (un RPE se pintaría `@4` en vez de "Muy duro"). Hay test de shape en `routineApi.test.js`.

## Emparejamiento por CLAVE ESTABLE (no por `name_es`)

`importRoutine` resuelve cada ejercicio contra el catálogo/custom por `name_en` → `name_es`
(normalizado tolerante: minúsculas + sin acentos + espacios) vía `lib/exerciseMatch.js`
(`buildExerciseIndex`/`resolveExerciseId`, puro y testeado). `name_en` es único y 100% poblado en
ejercicios de sistema; los custom (sin `name_en`) casan por `name_es`. Solo crea un ejercicio
custom si no hay match. El export incluye `name_en` por ejercicio (v6) para que el re-import sea
independiente del idioma. Ver `docs/DECISIONS.md`.

The AI prompts carry the system catalog by `name_en` right after the rules (`formatExerciseCatalog`)
and tell the AI to copy those names verbatim (#159): without it the AI invented names that matched
nothing. `name_en` because it is the importer's first key, and because the cached list
(`useExercisesWithMuscleGroup`) overwrites `name` with the localized name.

## Qué mide cada ejercicio: `tracked_fields` (v7) vs `measurement_type` (v6 y anteriores)

Desde v7 el catálogo del export lleva `tracked_fields` (array de 1 a 3 campos: `weight`, `reps`,
`time`, `distance`, `calories`, `level`, `pace`). Hasta v6 llevaba `measurement_type`, uno de 12
tipos cerrados. `importRoutine` acepta las dos formas vía `importedTrackedFields()`
(`routineIOApi.js`), que traduce el tipo antiguo con `trackedFieldsFromLegacyType()`
(`lib/measurementFields.js`).

⚠️ Ese mapa legacy es el **único** sitio de la app que conoce los 12 nombres antiguos, y no se
borra al retirar el último dato v6: un usuario puede importar un JSON exportado hace meses.
`legacyParity.test.js` congela la salida de los 12 tipos.

## En qué unidad va la distancia: `distance_unit` (v9)

Desde v9 el catálogo del export lleva `distance_unit` (`'m'` | `'km'`) por ejercicio: en qué unidad
se muestra y se teclea su distancia (el almacenamiento sigue siendo en metros). Un JSON anterior no
la trae y el ejercicio se crea en metros (`importedDistanceUnit()`), que es lo que hacía la app
antes de cablearla. ⚠️ Al **actualizar** un ejercicio propio (`updateExercises`), la unidad solo se
escribe si el JSON la declara: el default `'m'` pisaría el `'km'` que el usuario ya tuviera puesto.

## De qué habla el objetivo: `target_field` (v8) y el nivel prescrito

Desde v8 cada ejercicio de un día lleva `target_field` (`reps` | `time` | `distance` | `calories`,
de qué campo habla el valor de `reps`) y `level` (nivel de máquina prescrito). Hasta v7 el objetivo
era texto libre sin campo: `importRoutine` lo deriva con `importedTargetField()` (`routineIOApi.js`)
con la misma prioridad que aplicó el backfill de la migración 056 (`resolveTargetField` →
`getDefaultTargetField`).

The fields it resolves against are always the exercise's **in the DB** (`trackedFieldsById`, the
same map the effort uses), never the ones the JSON declares (#159): an AI that names a catalog
exercise right but declares the wrong fields would otherwise save a target the exercise does not
track. The column is NOT NULL, so every resolved exercise has them; the no-fields branch of
`importedTargetField` only guards a row read without the column.

## Effort (`rir`): validated against the fields in the DB

`importRoutine` keeps a `rir` only if it is on the exercise's scale (`importedEffort()` →
`isValidEffortValue`) and otherwise stores null, without a warning: the column has no CHECK. The
scale comes from what the exercise tracks **in the DB** once the import has written it (catalog or
custom row, or what it just created or rewrote with `updateExercises`), never from the JSON: a
template only carries the name, and on an existing exercise the database decides.

⚠️ Old JSON still imports but loses off-scale values: until 2026-08 the AI prompt asked for `rir`
0-5 (JSON v6 and earlier), so such a JSON with `rir: 4` or `5` on weight × reps, or `0` on an
exercise without reps, arrives with no effort. Owner's decision (2026-10-03, issue #21).

## Supersets: `superset_group` (v10)

Since v10 each exercise of a day carries `superset_group`. Before it, duplicating a routine (export + import) and re-importing a JSON lost every superset. The number is only unique within a day (`getNextSupersetId` over the day's exercises), so it is copied as is, never renumbered. The JSON is untrusted: `sanitizeImportedSupersetGroups` (`lib/supersetUtils.js`) undoes, without an error, a group with one member or with its members split by other rows, because a superset is a run of consecutive rows (#87). It checks the warmup rows and the main rows apart (what renders as one list, not each JSON block), and only the rows that resolved to an exercise. The AI prompt (`ROUTINE_JSON_RULES`) documents the field, so adapting a routine with the AI can keep its supersets.

## Cuando se modifique el modelo de datos

(tablas `routines`, `routine_days`, `routine_exercises`, `exercises`)

1. Tras crear/aplicar la migración, regenerar el snapshot: `npm run db:schema` (en `apps/web`, requiere Docker) y commitear `apps/web/supabase/schema.sql` junto con la migración. Mantiene el snapshot == migraciones. ⚠️ Ejecútalo desde `apps/web` y no lo sustituyas por un dump a secas: perdería la garantía de que el snapshot == migraciones. Ver `CLAUDE.md` § Database Schema.
2. Add the new column to `routine_export_rows` (a new migration that recreates it: since 068 it is the ONLY list of export columns, read by `exportRoutine` and by the shared link `get_shared_routine`) and map it to the JSON in `buildRoutineExport()` (`routineIOApi.js`). A column added anywhere else reaches one of the two paths and silently misses the other. ⚠️ It must stay SECURITY INVOKER (the default, so `schema.sql` does not print it; `get_shared_routine` right next to it is DEFINER): as DEFINER any logged-in user could read any routine by id. Recreate it with `CREATE OR REPLACE` so its grants survive; a change of return type needs DROP + CREATE and its grants again.
3. Actualizar `importRoutine()` para leer los nuevos campos del JSON.
4. Actualizar `buildChatbotPrompt()` / `ROUTINE_JSON_FORMAT` si afecta al prompt de IA.
5. Incrementar `ROUTINE_EXPORT_VERSION` si hay cambios breaking (importRoutine debe seguir aceptando versiones antiguas).
6. Actualizar los tests (`routineIO.test.js`, `routineApi.test.js`, `exerciseMatch.test.js`).
7. Si el campo va en `routine_exercises`: actualizar también la lista de columnas de la función `duplicate_routine_day` (migración `apps/web/supabase/migrations/059_duplicate_routine_day.sql`, INSERT hacia `routine_exercises`) — es una cuarta copia manual del shape de la fila, aparte de export/import/prompt IA. Un campo olvidado ahí desaparece en silencio solo al duplicar un día (no al exportar/importar).
   Si además se edita desde la sesión (`EditSessionExerciseModal`), añadirlo a la lista blanca y a los dos `UPDATE` de `update_session_exercise_with_routine` (migración 063). Ahí no se pierde en silencio: la RPC rechaza la clave con `unknown_field` y la edición falla entera.
   Two more copies of the row go from session to routine, so the field must also exist in `session_exercises`:
   - `add_session_exercise` (migration 065): its `p_fields` whitelist and both INSERTs (session and routine).
   - "Convert to routine day" (History): `fetchSessionDetail`'s select (`api/workoutSessionApi.js`), `transformSessionDetailData` (`lib/workoutTransforms.js`), `buildRoutineDayFromSession` (`lib/sessionToRoutineDay.js`), and the key whitelist plus the INSERT column list of `create_routine_day_with_exercises` (migration 067). A key missing from the RPC's whitelist fails the whole conversion with `unknown_field`; a field missing anywhere before it is dropped silently.
8. Si el campo va en `exercises` (catálogo): añadirlo a **todas** las proyecciones anidadas que lo necesiten (`grep -rn "exercise:exercises" packages/shared/src/api`: rutina, sesión, historial, export) y al builder de caché `buildSessionExercisesCache` (`lib/workoutTransforms.js`), que replica ese shape a mano. Son listas fijas: la que se olvide devuelve `undefined` sin error, y solo en su pantalla. Precedentes reales: `gif_key`, `level`/`calories_burned`.
