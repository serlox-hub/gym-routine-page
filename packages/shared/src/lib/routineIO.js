import { t, getCurrentLocale } from '../i18n/index.js'

export const ROUTINE_JSON_FORMAT = `\`\`\`json
{
  "version": 10,
  "exercises": [
    {
      "name_es": "Exercise name in Spanish",
      "name_en": "Exercise name in English, copied verbatim from the catalog when it is there",
      "tracked_fields": ["weight", "reps"],
      "distance_unit": "m",
      "muscle_group_name": "Pecho",
      "instructions": "Exercise instructions (optional)"
    }
  ],
  "routine": {
    "name": "Routine name",
    "description": "Short description",
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
                "target_field": "reps",
                "reps": "8-12",
                "rir": 2,
                "rest_seconds": 90,
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
2. The "exercise_name" must EXACTLY match the "name_es" of the exercise
3. Each day must have exactly 2 blocks: "Calentamiento" (sort_order: 0) and "Principal" (sort_order: 1)
4. Days must have sequential sort_order starting at 0
5. If this prompt includes an EXERCISE CATALOG, use its exercises: when one fits, copy its name into "name_en" verbatim (same words, spelling and capitalization). Create a new exercise only when nothing in the catalog fits

EXERCISE FIELDS (in "exercises"):
- name_es: exercise name in Spanish (REQUIRED)
- name_en: exercise name in English (REQUIRED). For an exercise in the EXERCISE CATALOG, the exact name listed there
- tracked_fields (REQUIRED): what gets logged for each set, as an array of 1 to 3 of these:
  - "weight": load lifted
  - "reps": repetitions
  - "time": duration of the set
  - "distance": distance covered
  - "pace": pace (min per distance unit)
  - "level": machine resistance level
  - "calories": calories burned
  Examples: bench press ["weight","reps"], pull-ups ["reps"], plank ["time"],
  farmer walk ["weight","distance"], stationary bike ["level","distance","time"],
  treadmill ["distance","time"], rowing machine ["level","calories"],
  running with target pace ["distance","pace"]
- distance_unit: "m" or "km", the unit its distance is shown and typed in (optional, only for exercises that track "distance"; defaults to "m"). Pick the scale the exercise is actually measured in: a rowing machine in "m" (500, 2000), a treadmill or an outdoor run in "km". It must agree with the unit written in "reps" when the target is distance
- muscle_group_name (REQUIRED, one of):
  - "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps"
  - "Cuádriceps", "Isquiotibiales", "Glúteos", "Pantorrillas"
  - "Abdominales", "Antebrazo"
- instructions: general exercise instructions (optional)

BLOCK FIELDS (in "days[].blocks"):
- name: "Calentamiento" or "Principal" (REQUIRED — always use these exact Spanish names)
- sort_order: 0 for Calentamiento, 1 for Principal (REQUIRED)
- duration_min: estimated block duration in minutes (optional)
- exercises: array of block exercises (REQUIRED)

ROUTINE EXERCISE FIELDS (in "blocks[].exercises"):
- exercise_name: must match "name_es" from exercises (REQUIRED)
- series: number of sets (REQUIRED)
- target_field: which measurement the prescription in "reps" refers to (REQUIRED). One of "reps", "time", "distance", "calories", and it must be present in that exercise's tracked_fields. Pick what makes sense for the exercise: a stationary bike is usually prescribed by "time", a treadmill run by "distance"
- reps: the prescribed value for target_field (REQUIRED). Always write the unit: "8-12" for reps, "30s" or "20min" for time, "40m" or "5km" for distance, "100kcal" for calories
- level: machine resistance level for this routine, only for exercises that track "level" (optional, e.g.: 8)
- rir: effort. Scale depends on whether the exercise tracks reps: -1..3 when "reps" is in tracked_fields (-1 = to failure, 3 = 3 or more in reserve), 1..5 otherwise (RPE, 1 = easy, 5 = max). Optional
- rest_seconds: rest between sets in seconds (optional)
- notes: specific execution notes for this routine (optional, e.g.: "Close grip", "Pause at chest", "Tempo 3-1-1-0")
- superset_group: positive integer shared by the exercises done back to back as one superset (optional, omit it for an exercise outside a superset). A superset has at least 2 exercises, written consecutively in the same block, and each superset of a day uses its own number (1, 2...). A group that breaks these rules is imported as individual exercises`

// Rule 5 of ROUTINE_JSON_RULES refers to the block by this name.
const EXERCISE_CATALOG_HEADING = 'EXERCISE CATALOG (the "name_en" of every exercise in the app, by muscle group):'
const EXERCISE_CATALOG_OTHER_GROUP = 'Other'

/**
 * Catalog block for the AI prompts (#159). It lists the system exercises by `name_en`, the first
 * key the importer tries (`buildExerciseIndex`): an AI that copies a name from here lands on the
 * catalog exercise instead of a new custom one. `name` is no use here, because
 * useExercisesWithMuscleGroup() overwrites it with the localized name.
 * @param {Array<{ name_en: string|null, is_system: boolean, muscle_group: { name_en: string|null, name: string } | null }>|null} exercises
 *   Rows as returned by useExercisesWithMuscleGroup(). Non-system rows and rows without name_en are skipped.
 * @returns {string} A heading line, then one "## <muscle group name_en>" line per group followed by
 *   "- <exercise name_en>" lines, groups and names sorted alphabetically. Exercises without a muscle
 *   group go under a final "## Other" group. Empty string when no row qualifies.
 */
export function formatExerciseCatalog(exercises) {
  const namesByGroup = new Map()
  for (const exercise of exercises || []) {
    if (!exercise?.is_system || !exercise.name_en) continue
    const group = exercise.muscle_group?.name_en || exercise.muscle_group?.name || EXERCISE_CATALOG_OTHER_GROUP
    if (!namesByGroup.has(group)) namesByGroup.set(group, [])
    namesByGroup.get(group).push(exercise.name_en)
  }
  if (namesByGroup.size === 0) return ''

  const byName = (a, b) => a.localeCompare(b, 'en')
  const isOther = (group) => group === EXERCISE_CATALOG_OTHER_GROUP
  const groups = [...namesByGroup.keys()].sort((a, b) => isOther(a) - isOther(b) || byName(a, b))

  const lines = [EXERCISE_CATALOG_HEADING]
  for (const group of groups) {
    lines.push(`## ${group}`, ...namesByGroup.get(group).sort(byName).map(name => `- ${name}`))
  }
  return lines.join('\n')
}

export const PROMPT_CATALOG_STATUS = {
  READY: 'ready',     // loaded: the prompt can be copied
  LOADING: 'loading', // not loaded yet, also while paused offline: copying waits
  ERROR: 'error',     // failed with nothing loaded: pressing copy retries and says why
}

/**
 * Whether an AI prompt can be copied yet, from the state of the catalog query. Only loaded data
 * counts: a prompt copied without the catalog brings the custom duplicates back without a
 * warning, so "not loaded yet" is never an empty catalog. A catalog that loaded once stays usable
 * when a later background refetch fails.
 * @param {{ data: unknown, isError: boolean }} catalogQuery
 * @returns {string} One of PROMPT_CATALOG_STATUS
 */
export function getPromptCatalogStatus({ data, isError }) {
  if (data) return PROMPT_CATALOG_STATUS.READY
  return isError ? PROMPT_CATALOG_STATUS.ERROR : PROMPT_CATALOG_STATUS.LOADING
}

// Goes right after the rules: the on-screen preview starts with the readable part, and the
// closing instructions stay last.
function catalogSection(catalog) {
  return catalog ? `\n\n${catalog}` : ''
}

export function buildChatbotPrompt({ objetivo, diasPorSemana, nivelExperiencia, duracionSesion, equipamiento, notas }, catalog) {
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

${ROUTINE_JSON_RULES}${catalogSection(catalog)}

${jsonOnly}`
}

export function buildAdaptRoutinePrompt(catalog) {
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

${ROUTINE_JSON_RULES}${catalogSection(catalog)}

${jsonOnly}

${myRoutine}
`
}
