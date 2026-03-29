import { t, getCurrentLocale } from '../i18n/index.js'

export const ROUTINE_JSON_FORMAT = `\`\`\`json
{
  "version": 4,
  "exercises": [
    {
      "name": "Exercise name",
      "measurement_type": "weight_reps",
      "muscle_group_name": "Pecho",
      "weight_unit": "kg",
      "time_unit": "s",
      "distance_unit": "m",
      "instructions": "Exercise instructions (optional)"
    }
  ],
  "routine": {
    "name": "Routine name",
    "description": "Short description",
    "goal": "Goal",
    "days": [
      {
        "name": "Day 1 - Descriptive name",
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
                "exercise_name": "Exercise name",
                "series": 4,
                "reps": "8-12",
                "rir": 2,
                "rest_seconds": 90,
                "tempo": "3-1-1-0",
                "tempo_razon": "Reason for tempo (optional)",
                "notes": "Specific execution notes (optional)"
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\``

export const ROUTINE_JSON_RULES = `IMPORTANT RULES:
1. Each exercise in "exercises" must be used in "routine.days[].blocks[].exercises"
2. The "exercise_name" must EXACTLY match the "name" of the exercise
3. Each day must have exactly 2 blocks: "Calentamiento" (sort_order: 0) and "Principal" (sort_order: 1)
4. Days must have sequential sort_order starting at 0

EXERCISE FIELDS (in "exercises"):
- name: exercise name (REQUIRED)
- measurement_type (REQUIRED, one of):
  - "weight_reps": weight × repetitions (e.g.: bench press)
  - "reps_only": reps only without weight (e.g.: pull-ups)
  - "time": time (e.g.: plank)
  - "distance": distance (e.g.: farmer walk)
  - "level_time": level × time (e.g.: stationary bike)
  - "level_distance": level × distance (e.g.: elliptical)
  - "level_calories": level × calories (e.g.: rowing machine)
  - "distance_time": distance × time (e.g.: treadmill)
  - "distance_pace": distance × pace (e.g.: running with pace min/km)
- muscle_group_name (REQUIRED, one of):
  - "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps"
  - "Cuádriceps", "Isquiotibiales", "Glúteos", "Pantorrillas"
  - "Abdominales", "Antebrazo"
- weight_unit: "kg" or "lb" (optional, default "kg")
- time_unit: "s" or "min" (optional, default "s")
- distance_unit: "m" or "km" (optional, default "m")
- instructions: general exercise instructions (optional)

BLOCK FIELDS (in "days[].blocks"):
- name: "Calentamiento" or "Principal" (REQUIRED — always use these exact Spanish names)
- sort_order: 0 for Calentamiento, 1 for Principal (REQUIRED)
- duration_min: estimated block duration in minutes (optional)
- exercises: array of block exercises (REQUIRED)

ROUTINE EXERCISE FIELDS (in "blocks[].exercises"):
- exercise_name: must match "name" from exercises (REQUIRED)
- series: number of sets (REQUIRED)
- reps: string with reps, time or distance (REQUIRED, e.g.: "8-12", "30s", "40m")
- rir: 0-5, reps in reserve (optional)
- rest_seconds: rest between sets in seconds (optional)
- tempo: movement cadence in "eccentric-pause bottom-concentric-pause top" format (optional, e.g.: "3-1-1-0")
- tempo_razon: explanation of why that tempo is used (optional)
- notes: specific execution notes for this routine (optional, e.g.: "Close grip", "Pause at chest")`

export function buildChatbotPrompt({ objetivo, diasPorSemana, nivelExperiencia, duracionSesion, equipamiento, notas }) {
  const lang = getCurrentLocale()
  const isEn = lang === 'en'

  const labels = {
    goal: isEn ? 'Goal' : 'Objetivo',
    daysPerWeek: isEn ? 'Days per week' : 'Días por semana',
    experience: isEn ? 'Experience level' : 'Nivel de experiencia',
    duration: isEn ? 'Session duration' : 'Duración por sesión',
    equipment: isEn ? 'Available equipment' : 'Equipamiento disponible',
    additionalNotes: isEn ? 'Additional notes' : 'Notas adicionales',
    minutes: isEn ? 'minutes' : 'minutos',
  }

  const userRequest = [
    objetivo && `- ${labels.goal}: ${objetivo}`,
    diasPorSemana && `- ${labels.daysPerWeek}: ${diasPorSemana}`,
    nivelExperiencia && `- ${labels.experience}: ${nivelExperiencia}`,
    duracionSesion && `- ${labels.duration}: ${duracionSesion} ${labels.minutes}`,
    equipamiento && `- ${labels.equipment}: ${equipamiento}`,
    notas && `- ${labels.additionalNotes}: ${notas}`,
  ].filter(Boolean).join('\n')

  const intro = isEn
    ? `Act as a certified personal trainer with over 10 years of experience. Design effective, safe, and evidence-based routines adapted to each person.

Create a personalized training routine with these client requirements:`
    : `Actúa como un entrenador personal certificado con más de 10 años de experiencia. Diseña rutinas efectivas, seguras y basadas en evidencia científica, adaptadas a cada persona.

Crea una rutina de entrenamiento personalizada con estos requisitos del cliente:`

  const criteria = isEn
    ? `DESIGN CRITERIA:
- Adapt exercise selection, volume and intensity to the stated goal and level
- Ensure balanced work distribution across available days
- Include rest times consistent with the type of training`
    : `CRITERIOS DE DISEÑO:
- Adapta la selección de ejercicios, volumen e intensidad al objetivo y nivel indicados
- Asegura una distribución equilibrada del trabajo según los días disponibles
- Incluye tiempos de descanso coherentes con el tipo de entrenamiento`

  const outputInstruction = isEn
    ? 'Generate the result in JSON format following EXACTLY this structure:'
    : 'Genera el resultado en formato JSON siguiendo EXACTAMENTE esta estructura:'

  const jsonOnly = isEn
    ? 'Respond ONLY with the JSON, no additional text.'
    : 'Responde SOLO con el JSON, sin texto adicional.'

  return `${intro}

${userRequest}

${criteria}

${outputInstruction}

${ROUTINE_JSON_FORMAT}

${ROUTINE_JSON_RULES}

${jsonOnly}`
}

export function buildAdaptRoutinePrompt() {
  const lang = getCurrentLocale()
  const isEn = lang === 'en'

  const intro = isEn
    ? 'Convert this training routine to the following JSON format. Keep all exercises, sets, reps and configurations as close to the original as possible.'
    : 'Convierte esta rutina de entrenamiento al siguiente formato JSON. Mantén todos los ejercicios, series, repeticiones y configuraciones lo más fiel posible al original.'

  const requiredFormat = isEn ? 'REQUIRED FORMAT:' : 'FORMATO REQUERIDO:'
  const jsonOnly = isEn
    ? 'Respond ONLY with the JSON, no additional text.'
    : 'Responde SOLO con el JSON, sin texto adicional.'
  const myRoutine = isEn ? 'MY ROUTINE TO CONVERT:' : 'MI RUTINA A CONVERTIR:'

  return `${intro}

${requiredFormat}
${ROUTINE_JSON_FORMAT}

${ROUTINE_JSON_RULES}

${jsonOnly}

${myRoutine}
`
}
