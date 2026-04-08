import { getClient } from './_client.js'
import { BLOCK_NAMES } from '../lib/constants.js'
import { MeasurementType } from '../lib/measurementTypes.js'
import { t } from '../i18n/index.js'

// ============================================
// IMPORT / EXPORT / DUPLICATE
// ============================================

/**
 * Exporta una rutina completa a JSON (version 4)
 * N+1 fix: la query de días incluye id, evitando una query extra por día
 * @param {string|number} routineId
 * @returns {Promise<object>} exportData con shape {version, exportedAt, exercises, routine}
 */
export async function exportRoutine(routineId) {
  // Obtener rutina base
  const { data: routine, error: routineError } = await getClient()
    .from('routines')
    .select('name, description, goal, cycle_days')
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
      measurement_type,
      weight_unit,
      instructions,
      muscle_group:muscle_groups!muscle_group_id(name:name_es)
    `)
    .in('id', Array.from(exerciseIds))

  if (exercisesError) throw exercisesError

  return {
    version: 5,
    exportedAt: new Date().toISOString(),
    exercises: exercises.map(ex => ({
      name_es: ex.name,
      measurement_type: ex.measurement_type,
      weight_unit: ex.weight_unit,
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
 * Importa una rutina desde JSON (version 4)
 * @param {object|string} jsonData
 * @param {string} userId
 * @param {object} options
 * @param {boolean} options.updateExercises - Si true, actualiza ejercicios existentes
 * @returns {Promise<object>} La nueva rutina creada
 */
export async function importRoutine(jsonData, userId, options = {}) {
  const { updateExercises = false } = options
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData

  if (!data.routine) {
    throw new Error(t('validation:invalidFileFormat'))
  }

  const { routine, exercises: exportedExercises } = data

  // Mapa nombre ejercicio -> id
  const exerciseMap = new Map()

  // Crear o actualizar ejercicios (solo si el export incluye definiciones)
  if (exportedExercises && exportedExercises.length > 0) {
    // Batch: obtener todos los muscle groups de una vez
    const muscleGroupNames = [...new Set(
      exportedExercises.map(ex => ex.muscle_group_name).filter(Boolean)
    )]
    const muscleGroupMap = new Map()
    if (muscleGroupNames.length > 0) {
      const { data: mgRows } = await getClient()
        .from('muscle_groups')
        .select('id, name:name_es')
        .in('name_es', muscleGroupNames)
      for (const mg of mgRows || []) {
        muscleGroupMap.set(mg.name, mg.id)
      }
    }

    // Batch: obtener ejercicios existentes (custom del usuario + sistema)
    const exerciseNames = exportedExercises.map(ex => ex.name_es || ex.name)
    const existingExercisesMap = new Map()
    if (exerciseNames.length > 0) {
      // Buscar en custom del usuario
      const { data: userRows } = await getClient()
        .from('exercises')
        .select('id, name:name_es')
        .eq('user_id', userId)
        .in('name_es', exerciseNames)
      for (const row of userRows || []) {
        existingExercisesMap.set(row.name, row.id)
      }
      // Buscar en ejercicios del sistema
      const { data: systemRows } = await getClient()
        .from('exercises')
        .select('id, name:name_es')
        .eq('is_system', true)
        .in('name_es', exerciseNames)
      for (const row of systemRows || []) {
        if (!existingExercisesMap.has(row.name)) {
          existingExercisesMap.set(row.name, row.id)
        }
      }
    }

    for (const ex of exportedExercises) {
      const exName = ex.name_es || ex.name
      const muscleGroupId = ex.muscle_group_name
        ? muscleGroupMap.get(ex.muscle_group_name) || null
        : null

      const existingId = existingExercisesMap.get(exName)

      if (existingId) {
        exerciseMap.set(exName, existingId)

        if (updateExercises) {
          await getClient()
            .from('exercises')
            .update({
              measurement_type: ex.measurement_type || MeasurementType.WEIGHT_REPS,
              weight_unit: ex.weight_unit || null,
              instructions: ex.instructions,
              muscle_group_id: muscleGroupId,
            })
            .eq('id', existingId)
        }
      } else {
        const { data: newExercise, error: exError } = await getClient()
          .from('exercises')
          .insert({
            name_es: exName,
            measurement_type: ex.measurement_type || MeasurementType.WEIGHT_REPS,
            weight_unit: ex.weight_unit || null,
            instructions: ex.instructions,
            muscle_group_id: muscleGroupId,
            user_id: userId,
          })
          .select()
          .single()

        if (exError) throw exError
        exerciseMap.set(exName, newExercise.id)
      }
    }
  }

  // Crear la rutina
  const { data: newRoutine, error: routineError } = await getClient()
    .from('routines')
    .insert({
      name: routine.name,
      description: routine.description,
      goal: routine.goal,
      cycle_days: routine.cycle_days || 7,
      user_id: userId,
    })
    .select()
    .single()

  if (routineError) throw routineError

  // Crear días, bloques y ejercicios
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

    // Crear ejercicios directamente (sin routine_blocks)
    let sortOrder = 1
    for (const block of day.blocks || []) {
      const isWarmup = block.name === BLOCK_NAMES.WARMUP

      for (const ex of block.exercises || []) {
        // Buscar ejercicio: primero en el mapa, luego en BD (custom + sistema)
        let exerciseId = exerciseMap.get(ex.exercise_name)

        if (!exerciseId) {
          const { data: exercise } = await getClient()
            .from('exercises')
            .select('id')
            .eq('name_es', ex.exercise_name)
            .eq('user_id', userId)
            .maybeSingle()
          exerciseId = exercise?.id
        }

        if (!exerciseId) {
          const { data: sysExercise } = await getClient()
            .from('exercises')
            .select('id')
            .eq('name_es', ex.exercise_name)
            .eq('is_system', true)
            .maybeSingle()
          exerciseId = sysExercise?.id
        }

        if (exerciseId) {
          await getClient()
            .from('routine_exercises')
            .insert({
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
