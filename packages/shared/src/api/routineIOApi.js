import { getClient } from './_client.js'
import { MeasurementType } from '../lib/measurementTypes.js'

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
    .select('name, description, goal')
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

  // Obtener bloques y ejercicios para cada día usando day.id directamente
  const daysWithExercises = await Promise.all(
    days.map(async (day) => {
      const { data: blocks, error: blocksError } = await getClient()
        .from('routine_blocks')
        .select(`
          name,
          sort_order,
          duration_min,
          routine_exercises (
            series,
            reps,
            rir,
            rest_seconds,
            tempo,
            tempo_razon,
            notes,
            sort_order,
            exercise:exercises (
              id,
              name,
              measurement_type,
              instructions,
              muscle_group:muscle_groups(name)
            )
          )
        `)
        .eq('routine_day_id', day.id)
        .order('sort_order')

      if (blocksError) throw blocksError

      return {
        name: day.name,
        estimated_duration_min: day.estimated_duration_min,
        sort_order: day.sort_order,
        blocks: blocks.map(block => ({
          name: block.name,
          sort_order: block.sort_order,
          duration_min: block.duration_min,
          exercises: block.routine_exercises
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(re => {
              exerciseIds.add(re.exercise.id)
              return {
                exercise_name: re.exercise.name,
                series: re.series,
                reps: re.reps,
                rir: re.rir,
                rest_seconds: re.rest_seconds,
                tempo: re.tempo,
                tempo_razon: re.tempo_razon,
                notes: re.notes,
              }
            })
        }))
      }
    })
  )

  // Obtener definiciones completas de los ejercicios usados
  const { data: exercises, error: exercisesError } = await getClient()
    .from('exercises')
    .select(`
      name,
      measurement_type,
      weight_unit,
      time_unit,
      distance_unit,
      instructions,
      muscle_group:muscle_groups(name)
    `)
    .in('id', Array.from(exerciseIds))

  if (exercisesError) throw exercisesError

  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    exercises: exercises.map(ex => ({
      name: ex.name,
      measurement_type: ex.measurement_type,
      weight_unit: ex.weight_unit,
      time_unit: ex.time_unit,
      distance_unit: ex.distance_unit,
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
    throw new Error('Formato de archivo inválido')
  }

  const { routine, exercises: exportedExercises } = data

  // Mapa nombre ejercicio -> id
  const exerciseMap = new Map()

  // Crear o actualizar ejercicios (solo si el export incluye definiciones)
  if (exportedExercises && exportedExercises.length > 0) {
    for (const ex of exportedExercises) {
      // Buscar muscle_group_id por nombre
      let muscleGroupId = null
      if (ex.muscle_group_name) {
        const { data: mg } = await getClient()
          .from('muscle_groups')
          .select('id')
          .eq('name', ex.muscle_group_name)
          .maybeSingle()
        muscleGroupId = mg?.id
      }

      // Buscar ejercicio existente del usuario
      const { data: existing } = await getClient()
        .from('exercises')
        .select('id')
        .eq('name', ex.name)
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        exerciseMap.set(ex.name, existing.id)

        // Actualizar ejercicio si la opción está habilitada
        if (updateExercises) {
          await getClient()
            .from('exercises')
            .update({
              measurement_type: ex.measurement_type || MeasurementType.WEIGHT_REPS,
              weight_unit: ex.weight_unit || 'kg',
              time_unit: ex.time_unit || 's',
              distance_unit: ex.distance_unit || 'm',
              instructions: ex.instructions,
              muscle_group_id: muscleGroupId,
            })
            .eq('id', existing.id)
        }
      } else {
        // Crear el ejercicio
        const { data: newExercise, error: exError } = await getClient()
          .from('exercises')
          .insert({
            name: ex.name,
            measurement_type: ex.measurement_type || MeasurementType.WEIGHT_REPS,
            weight_unit: ex.weight_unit || 'kg',
            time_unit: ex.time_unit || 's',
            distance_unit: ex.distance_unit || 'm',
            instructions: ex.instructions,
            muscle_group_id: muscleGroupId,
            user_id: userId,
          })
          .select()
          .single()

        if (exError) throw exError
        exerciseMap.set(ex.name, newExercise.id)
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

    // Crear bloques y ejercicios
    for (const block of day.blocks || []) {
      const { data: newBlock, error: blockError } = await getClient()
        .from('routine_blocks')
        .insert({
          routine_day_id: newDay.id,
          name: block.name,
          sort_order: block.sort_order,
          duration_min: block.duration_min,
        })
        .select()
        .single()

      if (blockError) throw blockError

      // Crear ejercicios del bloque
      for (let i = 0; i < (block.exercises || []).length; i++) {
        const ex = block.exercises[i]

        // Buscar ejercicio: primero en el mapa, luego en BD
        let exerciseId = exerciseMap.get(ex.exercise_name)

        if (!exerciseId) {
          const { data: exercise } = await getClient()
            .from('exercises')
            .select('id')
            .eq('name', ex.exercise_name)
            .eq('user_id', userId)
            .maybeSingle()
          exerciseId = exercise?.id
        }

        if (exerciseId) {
          await getClient()
            .from('routine_exercises')
            .insert({
              routine_block_id: newBlock.id,
              exercise_id: exerciseId,
              series: ex.series,
              reps: ex.reps,
              rir: ex.rir,
              rest_seconds: ex.rest_seconds,
              tempo: ex.tempo,
              tempo_razon: ex.tempo_razon,
              notes: ex.notes,
              sort_order: i + 1,
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
  exportData.routine.name = newName || `${exportData.routine.name} (copia)`

  // Importar como nueva rutina (sin actualizar ejercicios existentes)
  return importRoutine(exportData, userId, { updateExercises: false })
}
