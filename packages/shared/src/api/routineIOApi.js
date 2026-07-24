import { getClient } from './_client.js'
import { BLOCK_NAMES } from '../lib/constants.js'
import { MeasurementType } from '../lib/measurementTypes.js'
import { t } from '../i18n/index.js'
import { normalizeExerciseName, buildExerciseIndex, resolveExerciseId } from '../lib/exerciseMatch.js'

/** Versión actual del esquema de export/import JSON. v6 añade `name_en` por ejercicio. */
export const ROUTINE_EXPORT_VERSION = 6

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
          reps,
          rir,
          rest_seconds,
          notes,
          sort_order,
          is_warmup,
          exercise:exercises (
            id,
            name:name_es,
            measurement_type,
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
                reps: re.reps,
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
                reps: re.reps,
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
      measurement_type,
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
      measurement_type: ex.measurement_type,
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
 * Importa una rutina desde JSON a la cuenta del usuario.
 *
 * Empareja cada ejercicio con el catálogo/custom por CLAVE ESTABLE (name_en → name_es,
 * normalizado y tolerante a acentos/mayúsculas/espacios) vía `exerciseMatch`. Solo crea un
 * ejercicio custom si no hay match. Retrocompatible con exports v4/v5 (sin name_en → casan
 * por name_es).
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
          await getClient()
            .from('exercises')
            .update({
              measurement_type: ex.measurement_type || MeasurementType.WEIGHT_REPS,
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
            measurement_type: ex.measurement_type || MeasurementType.WEIGHT_REPS,
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
        const exerciseId = exerciseMap.get(normalizeExerciseName(ex.exercise_name))
          ?? resolveExerciseId({ name: ex.exercise_name }, exerciseIndex)

        if (exerciseId) {
          routineExerciseRows.push({
            routine_day_id: newDay.id,
            exercise_id: exerciseId,
            series: ex.series,
            reps: ex.reps,
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
