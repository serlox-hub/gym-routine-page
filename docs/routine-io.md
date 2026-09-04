# Import/export de rutinas (JSON) — detalle

Referencia de consulta (no invariante). La invariante corta (dos archivos, versión 8, emparejar
por clave estable, retrocompatibilidad) + puntero viven en `CLAUDE.md` → "Archivos críticos:
import/export de rutinas (JSON)". Aquí el detalle completo, el rationale del emparejamiento y el
checklist de "cuando cambie el modelo de datos".

## Los dos archivos (no confundir)

- **`packages/shared/src/api/routineIOApi.js`** — `exportRoutine()` / `importRoutine()` / `duplicateRoutine()` (tocan BD). Define el **esquema** vía `ROUTINE_EXPORT_VERSION` (**actual: 8**) y mapea BD ↔ JSON.
- **`packages/shared/src/lib/routineIO.js`** — prompts de IA (`buildChatbotPrompt`, `buildAdaptRoutinePrompt`) y el doc del formato (`ROUTINE_JSON_FORMAT`/`ROUTINE_JSON_RULES`). Puro, sin BD.

⚠️ **Tercer consumidor del shape del export:** `packages/shared/src/lib/routineTextFormat.js` (compartir rutina como texto) empareja `blocks[].exercises[].exercise_name` con `exercises[].name_es` para leer sus `tracked_fields`, que deciden la escala de esfuerzo. Si se recortan columnas del catálogo del export, **degrada en silencio** a la escala RIR (un RPE se pintaría `@4` en vez de "Muy duro"). Hay test de shape en `routineApi.test.js`.

## Emparejamiento por CLAVE ESTABLE (no por `name_es`)

`importRoutine` resuelve cada ejercicio contra el catálogo/custom por `name_en` → `name_es`
(normalizado tolerante: minúsculas + sin acentos + espacios) vía `lib/exerciseMatch.js`
(`buildExerciseIndex`/`resolveExerciseId`, puro y testeado). `name_en` es único y 100% poblado en
ejercicios de sistema; los custom (sin `name_en`) casan por `name_es`. Solo crea un ejercicio
custom si no hay match. El export incluye `name_en` por ejercicio (v6) para que el re-import sea
independiente del idioma. Ver `docs/DECISIONS.md`.

## Qué mide cada ejercicio: `tracked_fields` (v7) vs `measurement_type` (v6 y anteriores)

Desde v7 el catálogo del export lleva `tracked_fields` (array de 1 a 3 campos: `weight`, `reps`,
`time`, `distance`, `calories`, `level`, `pace`). Hasta v6 llevaba `measurement_type`, uno de 12
tipos cerrados. `importRoutine` acepta las dos formas vía `importedTrackedFields()`
(`routineIOApi.js`), que traduce el tipo antiguo con `trackedFieldsFromLegacyType()`
(`lib/measurementFields.js`).

⚠️ Ese mapa legacy es el **único** sitio de la app que conoce los 12 nombres antiguos, y no se
borra al retirar el último dato v6: un usuario puede importar un JSON exportado hace meses.
`legacyParity.test.js` congela la salida de los 12 tipos.

## De qué habla el objetivo: `target_field` (v8) y el nivel prescrito

Desde v8 cada ejercicio de un día lleva `target_field` (`reps` | `time` | `distance` | `calories`,
de qué campo habla el valor de `reps`) y `level` (nivel de máquina prescrito). Hasta v7 el objetivo
era texto libre sin campo: `importRoutine` lo deriva con `importedTargetField()` (`routineIOApi.js`)
a partir de los `tracked_fields` que declare el JSON, con la misma prioridad que aplicó el backfill
de la migración 056 (`resolveTargetField` → `getDefaultTargetField`).

⚠️ Si el JSON **no declara** lo que mide el ejercicio (caso de `routineTemplates.js`, que solo trae
`name_es` y hereda los campos del catálogo al casar), `target_field` se inserta como NULL a
propósito: derivarlo del default `weight,reps` guardaría un objetivo de reps en una plancha. La app
lo resuelve al leer con `resolveTargetField()`.

## Cuando se modifique el modelo de datos

(tablas `routines`, `routine_days`, `routine_exercises`, `exercises`)

1. Tras crear/aplicar la migración, regenerar el snapshot: `npm run db:schema` (en `apps/web`, requiere Docker) y commitear `apps/web/supabase/schema.sql` junto con la migración. Mantiene el snapshot == migraciones. ⚠️ Ese script hace `db reset`; no lo sustituyas por un dump a secas (perdería la garantía) y ojo si tu `.env` apunta a la Supabase local: ver `CLAUDE.md` § Database Schema.
2. Actualizar `exportRoutine()` para incluir los nuevos campos en el JSON.
3. Actualizar `importRoutine()` para leer los nuevos campos del JSON.
4. Actualizar `buildChatbotPrompt()` / `ROUTINE_JSON_FORMAT` si afecta al prompt de IA.
5. Incrementar `ROUTINE_EXPORT_VERSION` si hay cambios breaking (importRoutine debe seguir aceptando versiones antiguas).
6. Actualizar los tests (`routineIO.test.js`, `routineApi.test.js`, `exerciseMatch.test.js`).
7. Si el campo va en `routine_exercises`: actualizar también la lista de columnas de la función `duplicate_routine_day` (migración `apps/web/supabase/migrations/059_duplicate_routine_day.sql`, INSERT hacia `routine_exercises`) — es una cuarta copia manual del shape de la fila, aparte de export/import/prompt IA. Un campo olvidado ahí desaparece en silencio solo al duplicar un día (no al exportar/importar).
8. Si el campo va en `exercises` (catálogo): añadirlo a **todas** las proyecciones anidadas que lo necesiten (`grep -rn "exercise:exercises" packages/shared/src/api`: rutina, sesión, historial, export) y al builder de caché `buildSessionExercisesCache` (`lib/workoutTransforms.js`), que replica ese shape a mano. Son listas fijas: la que se olvide devuelve `undefined` sin error, y solo en su pantalla. Precedentes reales: `gif_key`, `level`/`calories_burned`.
