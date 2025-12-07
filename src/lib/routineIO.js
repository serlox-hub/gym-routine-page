import { supabase } from './supabase.js'

/**
 * Genera un prompt personalizado para chatbots basado en las preferencias del usuario
 */
export function buildChatbotPrompt({ objetivo, diasPorSemana, nivelExperiencia, duracionSesion, equipamiento, notas }) {
  const userRequest = [
    objetivo && `- Objetivo: ${objetivo}`,
    diasPorSemana && `- Días por semana: ${diasPorSemana}`,
    nivelExperiencia && `- Nivel de experiencia: ${nivelExperiencia}`,
    duracionSesion && `- Duración por sesión: ${duracionSesion} minutos`,
    equipamiento && `- Equipamiento disponible: ${equipamiento}`,
    notas && `- Notas adicionales: ${notas}`,
  ].filter(Boolean).join('\n')

  return `Actúa como un entrenador personal certificado con más de 10 años de experiencia. Diseña rutinas efectivas, seguras y basadas en evidencia científica, adaptadas a cada persona.

Crea una rutina de entrenamiento personalizada con estos requisitos del cliente:

${userRequest}

CRITERIOS DE DISEÑO:
- Adapta la selección de ejercicios, volumen e intensidad al objetivo y nivel indicados
- Asegura una distribución equilibrada del trabajo según los días disponibles
- Incluye tiempos de descanso coherentes con el tipo de entrenamiento

Genera el resultado en formato JSON siguiendo EXACTAMENTE esta estructura:

\`\`\`json
{
  "version": 4,
  "exercises": [
    {
      "name": "Nombre del ejercicio",
      "measurement_type": "weight_reps",
      "muscle_group_name": "Pecho",
      "weight_unit": "kg",
      "instructions": "Instrucciones de ejecución del ejercicio (opcional)"
    }
  ],
  "routine": {
    "name": "Nombre de la rutina",
    "description": "Descripción breve",
    "goal": "${objetivo || 'General'}",
    "days": [
      {
        "name": "Día 1 - Nombre descriptivo",
        "sort_order": 0,
        "estimated_duration_min": 60,
        "blocks": [
          {
            "name": "Calentamiento",
            "sort_order": 0,
            "duration_min": 10,
            "exercises": []
          },
          {
            "name": "Principal",
            "sort_order": 1,
            "duration_min": 50,
            "exercises": [
              {
                "exercise_name": "Nombre del ejercicio",
                "series": 4,
                "reps": "8-12",
                "rir": 2,
                "rest_seconds": 90,
                "tempo": "3-1-1-0",
                "tempo_razon": "Razón del tempo elegido (opcional)",
                "notes": "Notas de ejecución específicas para esta rutina (opcional)"
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\`

REGLAS IMPORTANTES:
1. Cada ejercicio en "exercises" debe usarse en "routine.days[].blocks[].exercises"
2. El "exercise_name" debe coincidir EXACTAMENTE con el "name" del ejercicio
3. Cada día debe tener exactamente 2 bloques: "Calentamiento" (sort_order: 0) y "Principal" (sort_order: 1)
4. Los días deben tener sort_order secuencial empezando en 0

CAMPOS DE EJERCICIOS (en "exercises"):
- name: nombre del ejercicio (OBLIGATORIO)
- measurement_type (OBLIGATORIO, uno de estos):
  - "weight_reps": peso × repeticiones (ej: press banca)
  - "reps_only": solo repeticiones sin peso (ej: dominadas)
  - "reps_per_side": repeticiones por lado (ej: zancadas)
  - "time": tiempo (ej: plancha)
  - "time_per_side": tiempo por lado (ej: plancha lateral)
  - "distance": distancia (ej: farmer walk)
- muscle_group_name (OBLIGATORIO, uno de estos):
  - "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps"
  - "Cuádriceps", "Isquiotibiales", "Glúteos", "Pantorrillas"
  - "Abdominales", "Antebrazo"
- weight_unit: "kg" o "lb" (opcional, por defecto "kg")
- instructions: instrucciones generales de ejecución del ejercicio (opcional)

CAMPOS DE BLOQUES (en "days[].blocks"):
- name: "Calentamiento" o "Principal" (OBLIGATORIO)
- sort_order: 0 para Calentamiento, 1 para Principal (OBLIGATORIO)
- duration_min: duración estimada del bloque en minutos (opcional)
- exercises: array de ejercicios del bloque (OBLIGATORIO)

CAMPOS DE EJERCICIOS EN RUTINA (en "blocks[].exercises"):
- exercise_name: debe coincidir con "name" del ejercicio (OBLIGATORIO)
- series: número de series (OBLIGATORIO)
- reps: string con repeticiones, tiempo o distancia (OBLIGATORIO, ej: "8-12", "30s", "40m")
- rir: 0-5, repeticiones en reserva (opcional)
- rest_seconds: segundos de descanso entre series (opcional)
- tempo: cadencia del movimiento en formato "excéntrico-pausa abajo-concéntrico-pausa arriba" (opcional, ej: "3-1-1-0")
- tempo_razon: explicación de por qué se usa ese tempo (opcional)
- notes: notas específicas de ejecución para esta rutina (opcional, ej: "Agarre cerrado", "Pausa en el pecho")

Responde SOLO con el JSON, sin texto adicional.`
}

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
            weight_unit: ex.weight_unit || 'kg',
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
      } catch {
        reject(new Error('Error al leer el archivo JSON'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}
