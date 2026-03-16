import { supabase } from './supabase.js'
import { MeasurementType } from '@gym/shared'

// Re-export pure parts from shared for backward compatibility
export { ROUTINE_JSON_FORMAT, ROUTINE_JSON_RULES, buildChatbotPrompt, buildAdaptRoutinePrompt } from '@gym/shared'

/**
 * Exporta una rutina completa a JSON
 * Incluye definición completa de ejercicios para poder importar en otra cuenta
 */
export async function exportRoutine(routineId) {
  // Obtener rutina base
  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .select('name, description, goal')
    .eq('id', routineId)
    .single()

  if (routineError) throw routineError

  // Obtener días
  const { data: days, error: daysError } = await supabase
    .from('routine_days')
    .select('name, estimated_duration_min, sort_order')
    .eq('routine_id', routineId)
    .order('sort_order')

  if (daysError) throw daysError

  // Set para recopilar ejercicios únicos
  const exerciseIds = new Set()

  // Obtener bloques y ejercicios para cada día
  const daysWithExercises = await Promise.all(
    days.map(async (day) => {
      const { data: dayData } = await supabase
        .from('routine_days')
        .select('id')
        .eq('routine_id', routineId)
        .eq('sort_order', day.sort_order)
        .single()

      const { data: blocks, error: blocksError } = await supabase
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
        .eq('routine_day_id', dayData.id)
        .order('sort_order')

      if (blocksError) throw blocksError

      return {
        ...day,
        blocks: blocks.map(block => ({
          name: block.name,
          sort_order: block.sort_order,
          duration_min: block.duration_min,
          exercises: block.routine_exercises
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(re => {
              // Recopilar IDs de ejercicios
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
  const { data: exercises, error: exercisesError } = await supabase
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

  const exportData = {
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

  return exportData
}

/**
 * Importa una rutina desde JSON
 * @param {object|string} jsonData - Datos JSON de la rutina
 * @param {string} userId - ID del usuario
 * @param {object} options - Opciones de importación
 * @param {boolean} options.updateExercises - Si true, actualiza ejercicios existentes con los datos del JSON
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
        const { data: mg } = await supabase
          .from('muscle_groups')
          .select('id')
          .eq('name', ex.muscle_group_name)
          .maybeSingle()
        muscleGroupId = mg?.id
      }

      // Buscar ejercicio existente del usuario
      const { data: existing } = await supabase
        .from('exercises')
        .select('id')
        .eq('name', ex.name)
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        exerciseMap.set(ex.name, existing.id)

        // Actualizar ejercicio si la opción está habilitada
        if (updateExercises) {
          await supabase
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
        const { data: newExercise, error: exError } = await supabase
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
  const { data: newRoutine, error: routineError } = await supabase
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
    const { data: newDay, error: dayError } = await supabase
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
      const { data: newBlock, error: blockError } = await supabase
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
          const { data: exercise } = await supabase
            .from('exercises')
            .select('id')
            .eq('name', ex.exercise_name)
            .eq('user_id', userId)
            .maybeSingle()
          exerciseId = exercise?.id
        }

        if (exerciseId) {
          await supabase
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
 * @param {string} routineId - ID de la rutina a duplicar
 * @param {string} userId - ID del usuario
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

