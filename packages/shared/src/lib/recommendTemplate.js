import { ROUTINE_TEMPLATES } from './routineTemplates.js'
import { GOAL_VALUES, LEVEL_VALUES, EQUIPMENT_VALUES } from './routineWizardOptions.js'

// De un pool de plantillas, la de daysPerWeek más cercano al objetivo (empate → la primera).
function pickClosestByDays(pool, targetDays) {
  if (!pool.length) return null
  if (targetDays == null) return pool[0]
  return pool.reduce((best, tpl) =>
    Math.abs(tpl.daysPerWeek - targetDays) < Math.abs(best.daysPerWeek - targetDays) ? tpl : best
  )
}

/**
 * Recomienda una plantilla a partir de las respuestas del onboarding. Data-driven sobre la
 * metadata estructurada de ROUTINE_TEMPLATES (goal/level/daysPerWeek), así añadir plantillas
 * NO requiere tocar esta función.
 *
 * Reglas (en orden):
 *  0. Equipo no-gimnasio (peso corporal / mancuernas) → plantilla de ese equipo según días.
 *  1. Objetivo fuerza → plantilla de fuerza según días (novato → solo la de principiante, 5x5).
 *  2. Objetivo resistencia → plantilla de resistencia (circuito).
 *  3. Principiante → full body general según días (nunca un split alto).
 *  4. Resto (interm/avanz, hipertrofia/otros objetivos) → plantilla de hipertrofia según días.
 * Sin señal de equipo, las plantillas de casa (peso corporal / mancuernas) se EXCLUYEN de la
 * recomendación automática; quedan disponibles para elegir en el selector.
 *
 * @param {object} answers
 * @param {string} [answers.objetivo] - valor de GOAL_VALUES
 * @param {string|number} [answers.diasPorSemana] - días por semana ('1'..'7')
 * @param {string} [answers.nivelExperiencia] - valor de LEVEL_VALUES
 * @param {string} [answers.equipamiento] - valor de EQUIPMENT_VALUES
 * @returns {string} id de plantilla (siempre uno existente en ROUTINE_TEMPLATES)
 */
export function recommendTemplate({ objetivo, diasPorSemana, nivelExperiencia, equipamiento } = {}) {
  const days = Number(diasPorSemana) || null
  const isBeginner = nivelExperiencia === LEVEL_VALUES.BEGINNER
  const byEquipment = (eq) => ROUTINE_TEMPLATES.filter(tpl => tpl.equipment === eq)

  // 0. Equipo no-gimnasio → pool por equipo (ignora objetivo/nivel)
  if (equipamiento === EQUIPMENT_VALUES.BODYWEIGHT) {
    const chosen = pickClosestByDays(byEquipment('bodyweight'), days)
    if (chosen) return chosen.id
  }
  if (equipamiento === EQUIPMENT_VALUES.DUMBBELL) {
    const chosen = pickClosestByDays(byEquipment('dumbbell'), days)
    if (chosen) return chosen.id
  }

  const gym = byEquipment('full')

  // 1. Fuerza → plantillas de fuerza por días; el novato solo recibe la de principiante (5x5)
  if (objetivo === GOAL_VALUES.STRENGTH) {
    let pool = gym.filter(tpl => tpl.goal === GOAL_VALUES.STRENGTH)
    if (isBeginner) pool = pool.filter(tpl => tpl.level === 'beginner')
    const chosen = pickClosestByDays(pool, days)
    if (chosen) return chosen.id
  }

  // 2. Resistencia → plantilla(s) de resistencia (circuito)
  if (objetivo === GOAL_VALUES.ENDURANCE) {
    const chosen = pickClosestByDays(gym.filter(tpl => tpl.goal === GOAL_VALUES.ENDURANCE), days)
    if (chosen) return chosen.id
  }

  // 3/4. Principiante → full body general; interm/avanz → hipertrofia (ambos por días)
  const pool = isBeginner
    ? gym.filter(tpl => tpl.level === 'beginner' && tpl.goal === GOAL_VALUES.GENERAL)
    : gym.filter(tpl => tpl.goal === GOAL_VALUES.HYPERTROPHY)

  const chosen =
    pickClosestByDays(pool, days) ||
    gym.find(tpl => tpl.id === 'full-body') ||
    ROUTINE_TEMPLATES[0]
  return chosen.id
}
