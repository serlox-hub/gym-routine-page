import { supabase } from './supabase.js'

/**
 * Exporta una rutina completa a JSON
 * Incluye definición completa de ejercicios para poder importar en otra cuenta
 */
export async function exportRoutine(routineId) {
  // Obtener rutina base
  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .select('nombre, descripcion, objetivo')
    .eq('id', routineId)
    .single()

  if (routineError) throw routineError

  // Obtener días
  const { data: days, error: daysError } = await supabase
    .from('routine_days')
    .select('nombre, duracion_estimada_min, orden')
    .eq('routine_id', routineId)
    .order('orden')

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
        .eq('orden', day.orden)
        .single()

      const { data: blocks, error: blocksError } = await supabase
        .from('routine_blocks')
        .select(`
          nombre,
          orden,
          duracion_min,
          routine_exercises (
            series,
            reps,
            rir,
            descanso_seg,
            tempo,
            tempo_razon,
            notas,
            orden,
            exercise:exercises (
              id,
              nombre,
              measurement_type,
              instrucciones,
              muscle_group:muscle_groups(nombre)
            )
          )
        `)
        .eq('routine_day_id', dayData.id)
        .order('orden')

      if (blocksError) throw blocksError

      return {
        ...day,
        blocks: blocks.map(block => ({
          nombre: block.nombre,
          orden: block.orden,
          duracion_min: block.duracion_min,
          exercises: block.routine_exercises
            .sort((a, b) => a.orden - b.orden)
            .map(re => {
              // Recopilar IDs de ejercicios
              exerciseIds.add(re.exercise.id)
              return {
                ejercicio_nombre: re.exercise.nombre,
                series: re.series,
                reps: re.reps,
                rir: re.rir,
                descanso_seg: re.descanso_seg,
                tempo: re.tempo,
                tempo_razon: re.tempo_razon,
                notas: re.notas,
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
      nombre,
      measurement_type,
      instrucciones,
      muscle_group:muscle_groups(nombre)
    `)
    .in('id', Array.from(exerciseIds))

  if (exercisesError) throw exercisesError

  const exportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    exercises: exercises.map(ex => ({
      nombre: ex.nombre,
      measurement_type: ex.measurement_type,
      instrucciones: ex.instrucciones,
      muscle_group_nombre: ex.muscle_group?.nombre,
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

  // Mapa de nombre de ejercicio -> id
  const exerciseMap = new Map()

  // Crear ejercicios que no existan (solo si el export incluye definiciones)
  if (exportedExercises && exportedExercises.length > 0) {
    for (const ex of exportedExercises) {
      // Buscar si ya existe
      const { data: existing } = await supabase
        .from('exercises')
        .select('id')
        .eq('nombre', ex.nombre)
        .single()

      if (existing) {
        exerciseMap.set(ex.nombre, existing.id)
      } else {
        // Buscar muscle_group_id por nombre
        let muscleGroupId = null
        if (ex.muscle_group_nombre) {
          const { data: mg } = await supabase
            .from('muscle_groups')
            .select('id')
            .eq('nombre', ex.muscle_group_nombre)
            .single()
          muscleGroupId = mg?.id
        }

        // Crear el ejercicio
        const { data: newExercise, error: exError } = await supabase
          .from('exercises')
          .insert({
            nombre: ex.nombre,
            measurement_type: ex.measurement_type || 'weight_reps',
            instrucciones: ex.instrucciones,
            muscle_group_id: muscleGroupId,
            user_id: userId,
          })
          .select()
          .single()

        if (exError) throw exError
        exerciseMap.set(ex.nombre, newExercise.id)
      }
    }
  }

  // Crear la rutina
  const { data: newRoutine, error: routineError } = await supabase
    .from('routines')
    .insert({
      nombre: routine.nombre + ' (importada)',
      descripcion: routine.descripcion,
      objetivo: routine.objetivo,
      user_id: userId,
    })
    .select()
    .single()

  if (routineError) throw routineError

  // Crear días, bloques y ejercicios
  for (const day of routine.days) {
    // Crear día
    const { data: newDay, error: dayError } = await supabase
      .from('routine_days')
      .insert({
        routine_id: newRoutine.id,
        nombre: day.nombre,
        duracion_estimada_min: day.duracion_estimada_min,
        orden: day.orden,
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
          nombre: block.nombre,
          orden: block.orden,
          duracion_min: block.duracion_min,
        })
        .select()
        .single()

      if (blockError) throw blockError

      // Crear ejercicios del bloque
      for (let i = 0; i < (block.exercises || []).length; i++) {
        const ex = block.exercises[i]

        // Buscar ejercicio: primero en el mapa, luego en BD
        let exerciseId = exerciseMap.get(ex.ejercicio_nombre)

        if (!exerciseId) {
          const { data: exercise } = await supabase
            .from('exercises')
            .select('id')
            .eq('nombre', ex.ejercicio_nombre)
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
              descanso_seg: ex.descanso_seg,
              tempo: ex.tempo,
              tempo_razon: ex.tempo_razon,
              notas: ex.notas,
              orden: i + 1,
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
