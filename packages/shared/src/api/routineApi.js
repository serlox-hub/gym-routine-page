import { getClient } from './_client.js'
import { MeasurementType } from '../lib/measurementTypes.js'

// ============================================
// QUERIES
// ============================================

export async function fetchRoutines() {
  const { data, error } = await getClient()
    .from('routines')
    .select('*')
    .order('id')

  if (error) throw error
  return data
}

export async function fetchRoutine(routineId) {
  const { data, error } = await getClient()
    .from('routines')
    .select('*')
    .eq('id', routineId)
    .single()

  if (error) throw error
  return data
}

export async function fetchRoutineDays(routineId) {
  const { data, error } = await getClient()
    .from('routine_days')
    .select('*')
    .eq('routine_id', routineId)
    .order('sort_order')

  if (error) throw error
  return data
}

export async function fetchRoutineDay(dayId) {
  const { data, error } = await getClient()
    .from('routine_days')
    .select(`
      *,
      routine:routines(name)
    `)
    .eq('id', dayId)
    .single()

  if (error) throw error
  return data
}

export async function fetchRoutineBlocks(dayId) {
  const { data, error } = await getClient()
    .from('routine_blocks')
    .select(`
      *,
      routine_exercises (
        *,
        exercise:exercises (
          id,
          name,
          measurement_type,
          weight_unit,
          instructions,
          muscle_group:muscle_groups (
            id,
            name
          )
        )
      )
    `)
    .eq('routine_day_id', dayId)
    .order('sort_order')

  if (error) throw error

  // Ordenar bloques: Calentamiento siempre primero, luego por sort_order
  const sortedBlocks = data.sort((a, b) => {
    if (a.name === 'Calentamiento') return -1
    if (b.name === 'Calentamiento') return 1
    return a.sort_order - b.sort_order
  })

  return sortedBlocks.map(block => ({
    ...block,
    routine_exercises: block.routine_exercises.sort((a, b) => a.sort_order - b.sort_order)
  }))
}

export async function fetchRoutineAllExercises(routineId) {
  const { data, error } = await getClient()
    .from('routine_exercises')
    .select(`
      *,
      routine_block:routine_blocks!inner (
        routine_day:routine_days!inner (
          routine_id
        )
      )
    `)
    .eq('routine_block.routine_day.routine_id', routineId)

  if (error) throw error
  return data
}

// ============================================
// MUTATIONS
// ============================================

export async function createRoutine({ userId, routine }) {
  const { data, error } = await getClient()
    .from('routines')
    .insert({
      name: routine.name,
      description: routine.description || null,
      goal: routine.goal || null,
      user_id: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createRoutineDay({ routineId, day }) {
  const { data, error } = await getClient()
    .from('routine_days')
    .insert({
      routine_id: routineId,
      name: day.name,
      estimated_duration_min: day.estimated_duration_min || null,
      sort_order: day.sort_order,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRoutine({ routineId, data }) {
  const { data: updated, error } = await getClient()
    .from('routines')
    .update(data)
    .eq('id', routineId)
    .select()
    .single()

  if (error) throw error
  return updated
}

export async function deleteRoutine(routineId) {
  const { error } = await getClient()
    .from('routines')
    .delete()
    .eq('id', routineId)

  if (error) throw error
}

export async function deleteRoutines(routineIds) {
  const { error } = await getClient()
    .from('routines')
    .delete()
    .in('id', routineIds)

  if (error) throw error
}

export async function setFavoriteRoutine({ routineId, isFavorite }) {
  if (isFavorite) {
    const { error: clearError } = await getClient()
      .from('routines')
      .update({ is_favorite: false })
      .neq('id', routineId)

    if (clearError) throw clearError
  }

  const { error } = await getClient()
    .from('routines')
    .update({ is_favorite: isFavorite })
    .eq('id', routineId)

  if (error) throw error
}

export async function updateRoutineDay({ dayId, data }) {
  const { error } = await getClient()
    .from('routine_days')
    .update(data)
    .eq('id', dayId)

  if (error) throw error
}

export async function deleteRoutineDay(dayId) {
  const { error } = await getClient()
    .from('routine_days')
    .delete()
    .eq('id', dayId)

  if (error) throw error
}

export async function reorderRoutineDays(days) {
  const dayOrders = days.map((day, index) => ({
    id: day.id,
    sort_order: index + 1
  }))

  const { error } = await getClient().rpc('reorder_routine_days', {
    day_orders: dayOrders
  })

  if (error) throw error
}

export async function deleteRoutineExercise(exerciseId) {
  const { error } = await getClient()
    .from('routine_exercises')
    .delete()
    .eq('id', exerciseId)

  if (error) throw error
}

export async function updateRoutineExercise({ exerciseId, data }) {
  const { error } = await getClient()
    .from('routine_exercises')
    .update(data)
    .eq('id', exerciseId)

  if (error) throw error
}

export async function reorderRoutineExercises(exercises) {
  const exerciseOrders = exercises.map((exercise, index) => ({
    id: exercise.id,
    sort_order: index + 1
  }))

  const { error } = await getClient().rpc('reorder_routine_exercises', {
    exercise_orders: exerciseOrders
  })

  if (error) throw error
}

export async function addExerciseToDay({ dayId, exerciseId, series, reps, rir, rest_seconds, notes, tempo, tempo_razon, esCalentamiento = false, superset_group }) {
  const blockName = esCalentamiento ? 'Calentamiento' : 'Principal'

  // Buscar o crear el bloque correspondiente
  const { data: existingBlock, error: blockFetchError } = await getClient()
    .from('routine_blocks')
    .select('id, sort_order')
    .eq('routine_day_id', dayId)
    .eq('name', blockName)
    .single()

  if (blockFetchError && blockFetchError.code !== 'PGRST116') {
    throw blockFetchError
  }

  let blockId
  if (!existingBlock) {
    let nextOrder = 1
    if (!esCalentamiento) {
      const { data: maxOrderBlocks } = await getClient()
        .from('routine_blocks')
        .select('sort_order')
        .eq('routine_day_id', dayId)
        .order('sort_order', { ascending: false })
        .limit(1)
      nextOrder = (maxOrderBlocks?.[0]?.sort_order || 0) + 1
    }

    const { data: newBlock, error: blockCreateError } = await getClient()
      .from('routine_blocks')
      .insert({
        routine_day_id: dayId,
        name: blockName,
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (blockCreateError) throw blockCreateError
    blockId = newBlock.id
  } else {
    blockId = existingBlock.id
  }

  // Obtener el maximo orden de ejercicios en el bloque
  const { data: maxOrderExercises } = await getClient()
    .from('routine_exercises')
    .select('sort_order')
    .eq('routine_block_id', blockId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextExerciseOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

  const { data: newExercise, error: exerciseError } = await getClient()
    .from('routine_exercises')
    .insert({
      routine_block_id: blockId,
      exercise_id: exerciseId,
      series: series || 3,
      reps: reps || '8-12',
      rir: rir ?? null,
      rest_seconds: rest_seconds || null,
      sort_order: nextExerciseOrder,
      notes: notes || null,
      tempo: tempo || null,
      tempo_razon: tempo_razon || null,
      superset_group: superset_group ?? null,
    })
    .select()
    .single()

  if (exerciseError) throw exerciseError
  return newExercise
}

export async function duplicateRoutineExercise({ routineExercise }) {
  const blockId = routineExercise.routine_block_id

  const { data: maxOrderExercises } = await getClient()
    .from('routine_exercises')
    .select('sort_order')
    .eq('routine_block_id', blockId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

  const { data, error } = await getClient()
    .from('routine_exercises')
    .insert({
      routine_block_id: blockId,
      exercise_id: routineExercise.exercise_id,
      series: routineExercise.series,
      reps: routineExercise.reps,
      rir: routineExercise.rir,
      rest_seconds: routineExercise.rest_seconds,
      tempo: routineExercise.tempo,
      tempo_razon: routineExercise.tempo_razon,
      notes: routineExercise.notes,
      superset_group: null,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

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

export async function moveRoutineExerciseToDay({ routineExercise, targetDayId, esCalentamiento = false }) {
  const blockName = esCalentamiento ? 'Calentamiento' : 'Principal'

  const { data: existingBlock, error: blockFetchError } = await getClient()
    .from('routine_blocks')
    .select('id')
    .eq('routine_day_id', targetDayId)
    .eq('name', blockName)
    .single()

  if (blockFetchError && blockFetchError.code !== 'PGRST116') {
    throw blockFetchError
  }

  let targetBlockId
  if (!existingBlock) {
    const { data: maxOrderBlocks } = await getClient()
      .from('routine_blocks')
      .select('sort_order')
      .eq('routine_day_id', targetDayId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextBlockOrder = (maxOrderBlocks?.[0]?.sort_order || 0) + 1

    const { data: newBlock, error: blockCreateError } = await getClient()
      .from('routine_blocks')
      .insert({
        routine_day_id: targetDayId,
        name: blockName,
        sort_order: nextBlockOrder,
      })
      .select()
      .single()

    if (blockCreateError) throw blockCreateError
    targetBlockId = newBlock.id
  } else {
    targetBlockId = existingBlock.id
  }

  const { data: maxOrderExercises } = await getClient()
    .from('routine_exercises')
    .select('sort_order')
    .eq('routine_block_id', targetBlockId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (maxOrderExercises?.[0]?.sort_order || 0) + 1

  const { data, error } = await getClient()
    .from('routine_exercises')
    .update({
      routine_block_id: targetBlockId,
      sort_order: nextOrder,
      superset_group: null,
    })
    .eq('id', routineExercise.id)
    .select()
    .single()

  if (error) throw error
  return data
}
