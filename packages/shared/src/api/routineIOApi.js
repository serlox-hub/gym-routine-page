import { getClient } from './_client.js'
import { BLOCK_NAMES } from '../lib/constants.js'
import { MAX_PRESCRIBED_LEVEL, isTargetField, normalizeTrackedFields, resolveTargetField, trackedFieldsFromLegacyType } from '../lib/measurementFields.js'
import { t } from '../i18n/index.js'
import { normalizeExerciseName, buildExerciseIndex, resolveExerciseId } from '../lib/exerciseMatch.js'

/** Versión del esquema de export/import JSON. v8 añade `target_field` (de qué campo habla el objetivo) y `level` (nivel prescrito) por ejercicio del día; v7 sustituyó `measurement_type` por `tracked_fields`. */
export const ROUTINE_EXPORT_VERSION = 8

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
 * Exporta una rutina completa a JSON (esquema ROUTINE_EXPORT_VERSION).
 * Incluye `name_en` por ejercicio como clave estable para el re-import (independiente del idioma).
 * N+1 fix: la query de días incluye id, evitando una query extra por día
 * @param {string|number} routineId
 * @returns {Promise<object>} exportData con shape {version, exportedAt, exercises, routine}
 */
export async function exportRoutine(routineId) {
  // Obtener rutina base
  const { data: routine, error: routineError } = await getClient()
    .from('routines')
    .select('name, description')
    .eq('id', routineId)
    .single()

  if (routineError) throw routineError

  // Obtener días — incluye id para evitar query extra por día (N+1 fix)
  const { data: days, error: daysError } = await getClient()
    .from('routine_days')
    .select('id, name, estimated_duration_min, sort_order')
    .eq('routine_id', routineId)
    .order('sort_order')

  if (daysError) throw daysError

  // Set para recopilar ejercicios únicos
  const exerciseIds = new Set()

  // Obtener ejercicios para cada día directamente desde routine_exercises
  const daysWithExercises = await Promise.all(
    days.map(async (day) => {
      const { data: exercises, error: exError } = await getClient()
        .from('routine_exercises')
        .select(`
          series,
          target_field,
          reps,
          level,
          rir,
          rest_seconds,
          notes,
          sort_order,
          is_warmup,
          exercise:exercises (
            id,
            name:name_es,
            tracked_fields,
            instructions,
            muscle_group:muscle_groups!muscle_group_id(name:name_es)
          )
        `)
        .eq('routine_day_id', day.id)
        .order('sort_order')

      if (exError) throw exError

      // Agrupar por is_warmup para producir bloques en el formato de export
      const warmup = (exercises || []).filter(re => re.is_warmup)
      const main = (exercises || []).filter(re => !re.is_warmup)

      const blocks = []
      if (warmup.length > 0) {
        blocks.push({
          name: BLOCK_NAMES.WARMUP,
          sort_order: 0,
          duration_min: null,
          exercises: warmup
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(re => {
              exerciseIds.add(re.exercise.id)
              return {
                exercise_name: re.exercise.name,
                series: re.series,
                target_field: re.target_field,
                reps: re.reps,
                level: re.level,
                rir: re.rir,
                rest_seconds: re.rest_seconds,
                notes: re.notes,
              }
            })
        })
      }
      if (main.length > 0) {
        blocks.push({
          name: BLOCK_NAMES.MAIN,
          sort_order: 1,
          duration_min: null,
          exercises: main
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(re => {
              exerciseIds.add(re.exercise.id)
              return {
                exercise_name: re.exercise.name,
                series: re.series,
                target_field: re.target_field,
                reps: re.reps,
                level: re.level,
                rir: re.rir,
                rest_seconds: re.rest_seconds,
                notes: re.notes,
              }
            })
        })
      }

      return {
        name: day.name,
        estimated_duration_min: day.estimated_duration_min,
        sort_order: day.sort_order,
        blocks,
      }
    })
  )

  // Obtener definiciones completas de los ejercicios usados
  const { data: exercises, error: exercisesError } = await getClient()
    .from('exercises')
    .select(`
      name:name_es,
      name_en,
      tracked_fields,
      instructions,
      muscle_group:muscle_groups!muscle_group_id(name:name_es)
    `)
    .in('id', Array.from(exerciseIds))

  if (exercisesError) throw exercisesError

  return {
    version: ROUTINE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    exercises: exercises.map(ex => ({
      name_es: ex.name,
      name_en: ex.name_en,
      tracked_fields: ex.tracked_fields,
      instructions: ex.instructions,
      muscle_group_name: ex.muscle_group?.name,
    })),
    routine: {
      ...routine,
      days: daysWithExercises
    }
  }
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
 * Campo del que habla el objetivo de un ejercicio de un día del JSON importado.
 *
 * v8 en adelante lo trae explícito. En v7 y anteriores el objetivo era texto libre sin campo, así
 * que se deriva de lo que mide el ejercicio con la misma prioridad que la app venía asumiendo
 * (`resolveTargetField` → `getDefaultTargetField`), que es lo que hizo el backfill de la migración.
 * Si el día referencia un ejercicio sin definición en el JSON no se sabe qué mide: se valida que
 * al menos sea un campo objetivo real y si no se deja null, que lo resuelve la app al leer. El JSON
 * es entrada NO confiable (lo genera una IA o se edita a mano) y el CHECK de la columna convertiría
 * un `"target_field": "weight"` en un 23514 que aborta el import entero, no en un campo ignorado.
 * @param {{target_field?: string|null}} exportedRoutineExercise
 * @param {string[]|undefined} trackedFields
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
  const level = Number(exportedRoutineExercise.level)
  return Number.isInteger(level) && level >= 0 && level <= MAX_PRESCRIBED_LEVEL ? level : null
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
  const [{ data: systemRows }, { data: customRows }] = await Promise.all([
    getClient().from('exercises').select('id, name_es, name_en').eq('is_system', true).is('deleted_at', null),
    getClient().from('exercises').select('id, name_es, name_en').eq('user_id', userId).is('deleted_at', null),
  ])
  const exerciseIndex = buildExerciseIndex({ systemRows: systemRows || [], customRows: customRows || [] })
  const customIds = new Set((customRows || []).map(r => r.id))

  // nombre-normalizado del export -> exercise_id (para resolver las refs de los días)
  const exerciseMap = new Map()
  // nombre-normalizado del export -> campos que mide (para derivar el objetivo de un JSON < v8)
  const trackedFieldsMap = new Map()

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
      // Solo si el JSON DECLARA lo que mide. Las plantillas (routineTemplates) traen solo el
      // nombre y heredan los campos del catálogo al casar: ahí no se puede derivar el objetivo,
      // y `importedTrackedFields` devolvería el default (peso × reps), que en una plancha
      // guardaría un objetivo de reps.
      if (ex.tracked_fields || ex.measurement_type) {
        trackedFieldsMap.set(normalizeExerciseName(exName), importedTrackedFields(ex))
      }

      if (matchedId) {
        exerciseMap.set(normalizeExerciseName(exName), matchedId)
        // Actualizar SOLO ejercicios propios del usuario (nunca los de sistema, compartidos)
        if (updateExercises && customIds.has(matchedId)) {
          await getClient()
            .from('exercises')
            .update({
              tracked_fields: importedTrackedFields(ex),
              instructions: ex.instructions,
              muscle_group_id: resolveMuscleGroupId(ex.muscle_group_name, await getMuscleGroupIndex()),
            })
            .eq('id', matchedId)
        }
      } else {
        const { data: newExercise, error: exError } = await getClient()
          .from('exercises')
          .insert({
            name_es: exName,
            tracked_fields: importedTrackedFields(ex),
            instructions: ex.instructions,
            muscle_group_id: resolveMuscleGroupId(ex.muscle_group_name, await getMuscleGroupIndex()),
            user_id: userId,
          })
          .select()
          .single()

        if (exError) throw exError
        exerciseMap.set(normalizeExerciseName(exName), newExercise.id)
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
            target_field: importedTargetField(ex, trackedFieldsMap.get(normalizedName)),
            reps: ex.reps,
            level: importedLevel(ex),
            rir: ex.rir,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
            sort_order: sortOrder++,
            is_warmup: isWarmup,
          })
        }
      }
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
