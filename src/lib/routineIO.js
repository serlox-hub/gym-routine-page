import { supabase } from './supabase.js'

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
      instructions,
      muscle_group:muscle_groups(name)
    `)
    .in('id', Array.from(exerciseIds))

  if (exercisesError) throw exercisesError

  const exportData = {
    version: 3,
    exportedAt: new Date().toISOString(),
    exercises: exercises.map(ex => ({
      name: ex.name,
      measurement_type: ex.measurement_type,
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
 * Descarga la rutina como archivo JSON
 */
export function downloadRoutineAsJson(data, filename) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Importa una rutina desde JSON
 * Crea ejercicios que no existan
 */
export async function importRoutine(jsonData, userId) {
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData

  if (!data.routine) {
    throw new Error('Formato de archivo inválido')
  }

  const { routine, exercises: exportedExercises } = data

  // Mapa nombre ejercicio -> id
  const exerciseMap = new Map()

  // Crear ejercicios que no existan (solo si el export incluye definiciones)
  if (exportedExercises && exportedExercises.length > 0) {
    for (const ex of exportedExercises) {
      const { data: existing } = await supabase
        .from('exercises')
        .select('id')
        .eq('name', ex.name)
        .single()

      if (existing) {
        exerciseMap.set(ex.name, existing.id)
      } else {
        // Buscar muscle_group_id por nombre
        let muscleGroupId = null
        if (ex.muscle_group_name) {
          const { data: mg } = await supabase
            .from('muscle_groups')
            .select('id')
            .eq('name', ex.muscle_group_name)
            .single()
          muscleGroupId = mg?.id
        }

        // Crear el ejercicio
        const { data: newExercise, error: exError } = await supabase
          .from('exercises')
          .insert({
            name: ex.name,
            measurement_type: ex.measurement_type || 'weight_reps',
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
      name: routine.name + ' (importada)',
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
            .single()
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
 * Lee un archivo JSON
 */
export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        resolve(data)
      } catch (err) {
        reject(new Error('Error al leer el archivo JSON'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}
