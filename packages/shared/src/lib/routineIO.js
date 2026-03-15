/**
 * Formato JSON para importar/exportar rutinas
 * Usado tanto para crear rutinas con IA como para adaptar rutinas existentes
 */
export const ROUTINE_JSON_FORMAT = `\`\`\`json
{
  "version": 4,
  "exercises": [
    {
      "name": "Nombre del ejercicio",
      "measurement_type": "weight_reps",
      "muscle_group_name": "Pecho",
      "weight_unit": "kg",
      "time_unit": "s",
      "distance_unit": "m",
      "instructions": "Instrucciones de ejecución del ejercicio (opcional)"
    }
  ],
  "routine": {
    "name": "Nombre de la rutina",
    "description": "Descripción breve",
    "goal": "Objetivo",
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
                "notes": "Notas de ejecución específicas (opcional)"
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\``

export const ROUTINE_JSON_RULES = `REGLAS IMPORTANTES:
1. Cada ejercicio en "exercises" debe usarse en "routine.days[].blocks[].exercises"
2. El "exercise_name" debe coincidir EXACTAMENTE con el "name" del ejercicio
3. Cada día debe tener exactamente 2 bloques: "Calentamiento" (sort_order: 0) y "Principal" (sort_order: 1)
4. Los días deben tener sort_order secuencial empezando en 0

CAMPOS DE EJERCICIOS (en "exercises"):
- name: nombre del ejercicio (OBLIGATORIO)
- measurement_type (OBLIGATORIO, uno de estos):
  - "weight_reps": peso × repeticiones (ej: press banca)
  - "reps_only": solo repeticiones sin peso (ej: dominadas)
  - "time": tiempo (ej: plancha)
  - "distance": distancia (ej: farmer walk)
  - "level_time": nivel × tiempo (ej: bici estática)
  - "level_distance": nivel × distancia (ej: elíptica)
  - "level_calories": nivel × calorías (ej: remo estático)
  - "distance_time": distancia × tiempo (ej: cinta de correr)
  - "distance_pace": distancia × ritmo (ej: running con pace min/km)
- muscle_group_name (OBLIGATORIO, uno de estos):
  - "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps"
  - "Cuádriceps", "Isquiotibiales", "Glúteos", "Pantorrillas"
  - "Abdominales", "Antebrazo"
- weight_unit: "kg" o "lb" (opcional, por defecto "kg")
- time_unit: "s" o "min" (opcional, por defecto "s")
- distance_unit: "m" o "km" (opcional, por defecto "m")
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
- notes: notas específicas de ejecución para esta rutina (opcional, ej: "Agarre cerrado", "Pausa en el pecho")`

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

${ROUTINE_JSON_FORMAT}

${ROUTINE_JSON_RULES}

Responde SOLO con el JSON, sin texto adicional.`
}

/**
 * Genera un prompt para adaptar una rutina existente al formato JSON
 */
export function buildAdaptRoutinePrompt() {
  return `Convierte esta rutina de entrenamiento al siguiente formato JSON. Mantén todos los ejercicios, series, repeticiones y configuraciones lo más fiel posible al original.

FORMATO REQUERIDO:
${ROUTINE_JSON_FORMAT}

${ROUTINE_JSON_RULES}

Responde SOLO con el JSON, sin texto adicional.

MI RUTINA A CONVERTIR:
`
}
