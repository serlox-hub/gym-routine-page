import { getClient } from './_client.js'
import { BLOCK_NAMES } from '../lib/constants.js'
import { MAX_PRESCRIBED_LEVEL, isTargetField, normalizeTrackedFields, resolveTargetField, trackedFieldsFromLegacyType } from '../lib/measurementFields.js'
import { isValidEffortValue } from '../lib/effortScale.js'
import { sanitizeImportedSupersetGroups } from '../lib/supersetUtils.js'
import { t } from '../i18n/index.js'
import { normalizeExerciseName, buildExerciseIndex, resolveExerciseId } from '../lib/exerciseMatch.js'

/** Versión del esquema de export/import JSON. v10 añade `superset_group` por ejercicio del día (antes duplicar o reimportar perdía las superseries); v9 añadió `distance_unit` por ejercicio (en qué unidad se lee y se teclea su distancia); v8 añadió `target_field` (de qué campo habla el objetivo) y `level` (nivel prescrito) por ejercicio del día; v7 sustituyó `measurement_type` por `tracked_fields`. */
export const ROUTINE_EXPORT_VERSION = 10

// Índice grupo-muscular por nombre normalizado (name_en + name_es) → id.
// Solo se usa al CREAR ejercicios custom (cuando el ejercicio no está en el catálogo).
async function buildMuscleGroupIndex() {
  const { data } = await getClient()
    .from('muscle_groups')
    .select('id, name_es, name_en')
  const index = new Map()
  const put = (name, id) => {
    const key = normalizeExerciseName(name)
    if (key && !index.has(key)) index.set(key, id)
  }
  for (const mg of data || []) { put(mg.name_en, mg.id); put(mg.name_es, mg.id) }
  return index
}

function resolveMuscleGroupId(name, index) {
  const key = normalizeExerciseName(name)
  return (key && index.get(key)) || null
}

// ============================================
// IMPORT / EXPORT / DUPLICATE
// ============================================

/**
 * Turns the rows of `routine_export_rows` (migration 068) into the export JSON (schema
 * ROUTINE_EXPORT_VERSION). Pure, and the ONLY place that knows the JSON shape: the normal export and
 * the shared link (`get_shared_routine`, same rows) both go through it, as the SQL function is the
 * only list of export columns. A routine column new to the export is added in both, never in a
 * query of its own.
 * Includes `name_en` per exercise as the stable key for the re-import (independent of the language).
 * @param {{ routine: object, days: object[], routine_exercises: object[], exercises: object[] }} rows
 * @returns {object} exportData with shape {version, exportedAt, exercises, routine}
 */
export function buildRoutineExport(rows) {
  const exercisesById = new Map((rows.exercises || []).map(exercise => [exercise.id, exercise]))
  const usedExerciseIds = new Set()

  const toExportedExercise = (routineExercise) => {
    usedExerciseIds.add(routineExercise.exercise_id)
    return {
      exercise_name: exercisesById.get(routineExercise.exercise_id)?.name_es,
      series: routineExercise.series,
      target_field: routineExercise.target_field,
      reps: routineExercise.reps,
      level: routineExercise.level,
      rir: routineExercise.rir,
      rest_seconds: routineExercise.rest_seconds,
      notes: routineExercise.notes,
      superset_group: routineExercise.superset_group,
    }
  }

  const days = [...(rows.days || [])]
    // A day without sort_order goes last, as Postgres orders ASC (NULLS LAST)
    .sort((a, b) => (a.sort_order == null) - (b.sort_order == null) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(day => {
      const dayExercises = (rows.routine_exercises || [])
        .filter(re => re.routine_day_id === day.id && exercisesById.has(re.exercise_id))
        .sort((a, b) => a.sort_order - b.sort_order)
      const warmup = dayExercises.filter(re => re.is_warmup)
      const main = dayExercises.filter(re => !re.is_warmup)

      // Bloques del formato de export, agrupados por is_warmup
      const blocks = []
      if (warmup.length > 0) {
        blocks.push({ name: BLOCK_NAMES.WARMUP, sort_order: 0, duration_min: null, exercises: warmup.map(toExportedExercise) })
      }
      if (main.length > 0) {
        blocks.push({ name: BLOCK_NAMES.MAIN, sort_order: 1, duration_min: null, exercises: main.map(toExportedExercise) })
      }

      return {
        name: day.name,
        estimated_duration_min: day.estimated_duration_min,
        sort_order: day.sort_order,
        blocks,
      }
    })

  return {
    version: ROUTINE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    exercises: [...usedExerciseIds].map(id => {
      const exercise = exercisesById.get(id)
      return {
        name_es: exercise.name_es,
        name_en: exercise.name_en,
        tracked_fields: exercise.tracked_fields,
        distance_unit: exercise.distance_unit,
        instructions: exercise.instructions,
        muscle_group_name: exercise.muscle_group_name_es,
      }
    }),
    routine: {
      name: rows.routine.name,
      description: rows.routine.description,
      days,
    },
  }
}

/**
 * Exports one of the caller's routines to JSON (schema ROUTINE_EXPORT_VERSION). One round trip:
 * `routine_export_rows` reads every row, RLS limits it to the caller's own routines.
 * @param {string|number} routineId
 * @returns {Promise<object>} exportData with shape {version, exportedAt, exercises, routine}
 */
export async function exportRoutine(routineId) {
  const { data, error } = await getClient().rpc('routine_export_rows', { p_routine_id: Number(routineId) })

  if (error) throw error
  if (!data) throw new Error(`Routine ${routineId} not found`)

  return buildRoutineExport(data)
}

/**
 * Campos que mide un ejercicio del JSON importado.
 *
 * v7 en adelante trae `tracked_fields`. Los exports v6 y anteriores traen `measurement_type`, uno
 * de los 12 tipos cerrados que existían antes: se traduce a campos. Un JSON antiguo tiene que
 * seguir importándose sin tocarlo, así que este es el ÚNICO punto de la app que conoce esos
 * nombres. Sin ninguno de los dos, el default (peso × reps), igual que hacía el import viejo.
 * @param {{tracked_fields?: string[], measurement_type?: string}} exportedExercise
 * @returns {string[]}
 */
function importedTrackedFields(exportedExercise) {
  return exportedExercise.tracked_fields
    ? normalizeTrackedFields(exportedExercise.tracked_fields)
    : trackedFieldsFromLegacyType(exportedExercise.measurement_type)
}

/**
 * Unidad en la que se lee y se teclea la distancia de un ejercicio del JSON importado (v9+).
 * Los JSON anteriores no la traen: metros, que es lo que la app hacía antes de cablearla.
 * @param {{distance_unit?: string}} exportedExercise
 * @returns {'m'|'km'}
 */
function importedDistanceUnit(exportedExercise) {
  return exportedExercise.distance_unit === 'km' ? 'km' : 'm'
}

/**
 * Field the target of a day's exercise in the imported JSON talks about.
 *
 * v8 onwards carries it explicitly. Up to v7 the target was free text with no field, so it is
 * derived from what the exercise tracks with the priority the app already assumed
 * (`resolveTargetField` → `getDefaultTargetField`), which is what the migration's backfill did.
 * What the exercise tracks comes from the DB, not the JSON: an AI that declares the wrong fields
 * for a catalog exercise would save a target the exercise does not track (#159). With no fields
 * (only a row read without the column, since it is NOT NULL) it is unknown, so the declared field
 * is only checked to be a real target field and otherwise stays null, which the app resolves on
 * read. The JSON is UNTRUSTED input (an AI
 * writes it, or a person edits it) and the column's CHECK would turn a `"target_field": "weight"`
 * into a 23514 that aborts the whole import, not into an ignored field.
 * @param {{target_field?: string|null}} exportedRoutineExercise
 * @param {string[]|undefined} trackedFields - what the exercise tracks in the DB
 * @returns {string|null}
 */
function importedTargetField(exportedRoutineExercise, trackedFields) {
  const declared = exportedRoutineExercise.target_field
  if (!trackedFields) return isTargetField(declared) ? declared : null
  return resolveTargetField(declared, trackedFields)
}

/**
 * Nivel prescrito de un ejercicio del JSON importado. Misma razón que arriba: `level` es `smallint`
 * con CHECK `>= 0`, así que un decimal, un negativo o un texto abortarían el import completo.
 * @param {{level?: unknown}} exportedRoutineExercise
 * @returns {number|null}
 */
function importedLevel(exportedRoutineExercise) {
  const raw = exportedRoutineExercise.level
  // `Number()` turns null, '', false and [] into 0, a valid level: without this, every exercise
  // exported without a level (`level: null`) came back as "Nv0" after duplicating the routine.
  if ((typeof raw !== 'number' && typeof raw !== 'string') || raw.toString().trim() === '') return null
  const level = Number(raw)
  return Number.isInteger(level) && level >= 0 && level <= MAX_PRESCRIBED_LEVEL ? level : null
}

/**
 * Prescribed effort of an exercise from the imported JSON, or null when it is off the exercise's
 * scale (RIR -1..3 with reps, RPE 1..5 without). The column has no CHECK, so an off-scale value
 * would be saved without error: it would render like a valid one, the edit picker could not show
 * it, and progression would never be suggested again (`metEffortTarget` could never be met).
 * @param {{rir?: unknown}} exportedRoutineExercise
 * @param {string[]|undefined} trackedFields - what the exercise tracks in the DB, not what the JSON
 *   declares: on an existing exercise the database decides the scale
 * @returns {number|null}
 */
function importedEffort(exportedRoutineExercise, trackedFields) {
  const effort = exportedRoutineExercise.rir
  return isValidEffortValue(effort, trackedFields) ? effort : null
}

/**
 * Importa una rutina desde JSON a la cuenta del usuario.
 *
 * Empareja cada ejercicio con el catálogo/custom por CLAVE ESTABLE (name_en → name_es,
 * normalizado y tolerante a acentos/mayúsculas/espacios) vía `exerciseMatch`. Solo crea un
 * ejercicio custom si no hay match. Retrocompatible con exports v4/v5 (sin name_en → casan
 * por name_es), con el `measurement_type` de v6 y anteriores (ver importedTrackedFields) y con el
 * objetivo sin campo de v7 y anteriores (ver importedTargetField).
 * @param {object|string} jsonData
 * @param {string} userId
 * @param {object} options
 * @param {boolean} options.updateExercises - Si true, actualiza la definición de los ejercicios
 *   PROPIOS del usuario que casen (nunca los de sistema, que son compartidos)
 * @returns {Promise<object>} La nueva rutina creada
 */
export async function importRoutine(jsonData, userId, options = {}) {
  const { updateExercises = false } = options
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData

  if (!data.routine) {
    throw new Error(t('validation:invalidFileFormat'))
  }

  const { routine, exercises: exportedExercises } = data

  // Índice del catálogo (sistema) + customs del usuario para resolver por clave estable.
  // Se cargan completos (una query cada uno) en vez de filtrar por nombre: evita el frágil
  // filtrado .in() con nombres que llevan acentos/paréntesis y habilita el match tolerante.
  const [{ data: systemRows, error: systemError }, { data: customRows, error: customError }] = await Promise.all([
    getClient().from('exercises').select('id, name_es, name_en, tracked_fields').eq('is_system', true).is('deleted_at', null),
    getClient().from('exercises').select('id, name_es, name_en, tracked_fields').eq('user_id', userId).is('deleted_at', null),
  ])
  // A failed read is not an empty catalog: every exercise would be created as a custom duplicate.
  if (systemError) throw systemError
  if (customError) throw customError
  const exerciseIndex = buildExerciseIndex({ systemRows: systemRows || [], customRows: customRows || [] })
  const customIds = new Set((customRows || []).map(r => r.id))
  // exercise_id -> what it tracks in the DB once the import has written it. It decides the effort
  // scale and what the target talks about: templates only carry the name, and on an existing
  // exercise the database decides, not the fields the JSON declares (an AI can get them wrong).
  const trackedFieldsById = new Map(
    [...(systemRows || []), ...(customRows || [])].map(r => [r.id, r.tracked_fields])
  )

  // nombre-normalizado del export -> exercise_id (para resolver las refs de los días)
  const exerciseMap = new Map()

  // Crear o actualizar ejercicios (solo si el export incluye definiciones)
  if (exportedExercises && exportedExercises.length > 0) {
    // El índice de grupos musculares solo se necesita al CREAR/actualizar un custom; se carga
    // perezosamente para no gastar una query cuando todo casa con el catálogo (plantillas/onboarding).
    let muscleGroupIndex = null
    const getMuscleGroupIndex = async () => {
      if (!muscleGroupIndex) muscleGroupIndex = await buildMuscleGroupIndex()
      return muscleGroupIndex
    }

    for (const ex of exportedExercises) {
      const exName = ex.name_es || ex.name
      const matchedId = resolveExerciseId(ex, exerciseIndex)

      if (matchedId) {
        exerciseMap.set(normalizeExerciseName(exName), matchedId)
        // Actualizar SOLO ejercicios propios del usuario (nunca los de sistema, compartidos)
        if (updateExercises && customIds.has(matchedId)) {
          const trackedFields = importedTrackedFields(ex)
          const { error: updateError } = await getClient()
            .from('exercises')
            .update({
              tracked_fields: trackedFields,
              // Solo si el JSON la DECLARA (v9+): un export antiguo no dice nada de la unidad, y
              // el default 'm' pisaría el 'km' que el usuario ya tuviera puesto.
              ...(ex.distance_unit ? { distance_unit: importedDistanceUnit(ex) } : {}),
              instructions: ex.instructions,
              muscle_group_id: resolveMuscleGroupId(ex.muscle_group_name, await getMuscleGroupIndex()),
            })
            .eq('id', matchedId)
          if (updateError) throw updateError
          trackedFieldsById.set(matchedId, trackedFields)
        }
      } else {
        const trackedFields = importedTrackedFields(ex)
        const { data: newExercise, error: exError } = await getClient()
          .from('exercises')
          .insert({
            name_es: exName,
            tracked_fields: trackedFields,
            distance_unit: importedDistanceUnit(ex),
            instructions: ex.instructions,
            muscle_group_id: resolveMuscleGroupId(ex.muscle_group_name, await getMuscleGroupIndex()),
            user_id: userId,
          })
          .select()
          .single()

        if (exError) throw exError
        exerciseMap.set(normalizeExerciseName(exName), newExercise.id)
        trackedFieldsById.set(newExercise.id, trackedFields)
      }
    }
  }

  // Crear la rutina
  const { data: newRoutine, error: routineError } = await getClient()
    .from('routines')
    .insert({
      name: routine.name,
      description: routine.description,
      user_id: userId,
    })
    .select()
    .single()

  if (routineError) throw routineError

  // Crear días y sus ejercicios (sin routine_blocks)
  for (const day of routine.days) {
    const { data: newDay, error: dayError } = await getClient()
      .from('routine_days')
      .insert({
        routine_id: newRoutine.id,
        name: day.name,
        estimated_duration_min: day.estimated_duration_min,
        sort_order: day.sort_order,
      })
      .select()
      .single()

    if (dayError) throw dayError

    // Agrupar los ejercicios del día en un solo insert (evita N round-trips en la ruta de
    // activación del onboarding; en redes lentas el coste dominante es la red, no la BD).
    const routineExerciseRows = []
    let sortOrder = 1
    for (const block of day.blocks || []) {
      const isWarmup = block.name === BLOCK_NAMES.WARMUP

      for (const ex of block.exercises || []) {
        // Primero el mapa del export; si el día referencia un ejercicio sin definición
        // en `exercises`, resolver directamente contra el índice (catálogo + custom).
        const normalizedName = normalizeExerciseName(ex.exercise_name)
        const exerciseId = exerciseMap.get(normalizedName)
          ?? resolveExerciseId({ name: ex.exercise_name }, exerciseIndex)

        if (exerciseId) {
          routineExerciseRows.push({
            routine_day_id: newDay.id,
            exercise_id: exerciseId,
            series: ex.series,
            target_field: importedTargetField(ex, trackedFieldsById.get(exerciseId)),
            reps: ex.reps,
            level: importedLevel(ex),
            rir: importedEffort(ex, trackedFieldsById.get(exerciseId)),
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
            sort_order: sortOrder++,
            is_warmup: isWarmup,
            superset_group: ex.superset_group,
          })
        }
      }
    }

    // Checked per `is_warmup` half, which is what renders as one list, not per JSON block: a JSON
    // with two non-warmup blocks would otherwise pass a group split across them. And on the rows
    // that resolved, since a dropped exercise can leave its superset with one member.
    for (const isWarmup of [true, false]) {
      const half = routineExerciseRows.filter(row => row.is_warmup === isWarmup)
      const supersetGroups = sanitizeImportedSupersetGroups(half.map(row => row.superset_group))
      half.forEach((row, index) => { row.superset_group = supersetGroups[index] })
    }

    if (routineExerciseRows.length > 0) {
      const { error: reError } = await getClient()
        .from('routine_exercises')
        .insert(routineExerciseRows)
      if (reError) throw reError
    }
  }

  return newRoutine
}

/**
 * Duplica una rutina completa con todos sus días, bloques y ejercicios
 * @param {string|number} routineId
 * @param {string} userId
 * @param {string} newName - Nombre para la rutina duplicada (opcional)
 * @returns {Promise<object>} La nueva rutina creada
 */
export async function duplicateRoutine(routineId, userId, newName) {
  const exportData = await exportRoutine(routineId)

  // Modificar el nombre de la rutina
  exportData.routine.name = newName || `${exportData.routine.name} ${t('routine:duplicateSuffix')}`

  // Importar como nueva rutina (sin actualizar ejercicios existentes)
  return importRoutine(exportData, userId, { updateExercises: false })
}
