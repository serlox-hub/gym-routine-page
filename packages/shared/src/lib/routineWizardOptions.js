/**
 * Opciones compartidas para los asistentes de creación de rutina (ChatbotView + onboarding).
 *
 * Los `value` son las cadenas canónicas en español que consume `buildChatbotPrompt`
 * y `recommendTemplate`; NO traducir los value (son identificadores estables), solo la
 * etiqueta mostrada vía `labelKey`/`descKey`. Fuente única para evitar duplicar estas
 * listas en web y native (antes estaban inline por duplicado en cada ChatbotView).
 */

// Valores semánticos (identificadores estables, en español) — usar en lugar de literales sueltos
export const GOAL_VALUES = {
  HYPERTROPHY: 'Hipertrofia',
  STRENGTH: 'Fuerza',
  FAT_LOSS: 'Pérdida de grasa',
  // Muscular endurance (high-rep circuits), which is what `endurance-circuit` delivers: the label
  // says so. The value stays because the AI prompt and the templates read it.
  ENDURANCE: 'Resistencia',
  GENERAL: 'Salud general',
}

export const LEVEL_VALUES = {
  BEGINNER: 'Principiante (menos de 1 año)',
  INTERMEDIATE: 'Intermedio (1-3 años)',
  ADVANCED: 'Avanzado (más de 3 años)',
}

export const GOAL_OPTIONS = [
  { value: GOAL_VALUES.HYPERTROPHY, labelKey: 'routine:chatbot.goals.hypertrophy' },
  { value: GOAL_VALUES.STRENGTH, labelKey: 'routine:chatbot.goals.strength' },
  { value: GOAL_VALUES.FAT_LOSS, labelKey: 'routine:chatbot.goals.fatLoss' },
  { value: GOAL_VALUES.ENDURANCE, labelKey: 'routine:chatbot.goals.endurance' },
  { value: GOAL_VALUES.GENERAL, labelKey: 'routine:chatbot.goals.general' },
]

// The onboarding lets the user mark up to two goals. "Crear con IA" still takes one.
export const MAX_GOALS = 2

const OFFERED_GOALS = GOAL_OPTIONS.map(o => o.value)

// Offered goals only, without duplicates, in GOAL_OPTIONS order and cut to MAX_GOALS.
function sortGoals(goals) {
  if (!Array.isArray(goals)) return []
  const selected = new Set(goals)
  return OFFERED_GOALS.filter(goal => selected.has(goal)).slice(0, MAX_GOALS)
}

/**
 * Marks or unmarks a goal in the onboarding selector, same shape as `toggleTrackedField`. At the
 * maximum, marking another does nothing (the selector also disables the rest, so this is the
 * safety net). Unmarking the last one leaves the selection empty: the wizard then blocks "Next".
 * @param {string[]} selected - GOAL_VALUES values
 * @param {string} value - the goal pressed
 * @returns {string[]}
 */
export function toggleGoal(selected, value) {
  const current = sortGoals(selected)
  if (current.includes(value)) return current.filter(goal => goal !== value)
  if (current.length >= MAX_GOALS || !OFFERED_GOALS.includes(value)) return current
  return sortGoals([...current, value])
}

export const LEVEL_OPTIONS = [
  { value: LEVEL_VALUES.BEGINNER, labelKey: 'routine:chatbot.levels.beginner', descKey: 'routine:chatbot.levelsDesc.beginner' },
  { value: LEVEL_VALUES.INTERMEDIATE, labelKey: 'routine:chatbot.levels.intermediate', descKey: 'routine:chatbot.levelsDesc.intermediate' },
  { value: LEVEL_VALUES.ADVANCED, labelKey: 'routine:chatbot.levels.advanced', descKey: 'routine:chatbot.levelsDesc.advanced' },
]

// Equipo disponible (onboarding). Alimenta `recommendTemplate` para elegir entre plantillas de
// gimnasio y las de peso corporal. NO es el campo de texto libre `equipamiento` del ChatbotView.
export const EQUIPMENT_VALUES = {
  FULL: 'Gimnasio completo',
  DUMBBELL: 'Mancuernas',
  BODYWEIGHT: 'Peso corporal',
}

export const EQUIPMENT_OPTIONS = [
  { value: EQUIPMENT_VALUES.FULL, labelKey: 'routine:onboarding.equipment.full', descKey: 'routine:onboarding.equipment.fullDesc' },
  { value: EQUIPMENT_VALUES.DUMBBELL, labelKey: 'routine:onboarding.equipment.dumbbell', descKey: 'routine:onboarding.equipment.dumbbellDesc' },
  { value: EQUIPMENT_VALUES.BODYWEIGHT, labelKey: 'routine:onboarding.equipment.bodyweight', descKey: 'routine:onboarding.equipment.bodyweightDesc' },
]
