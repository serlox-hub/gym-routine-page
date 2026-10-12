import { ROUTINE_TEMPLATES } from './routineTemplates.js'
import { GOAL_VALUES, LEVEL_VALUES, EQUIPMENT_VALUES } from './routineWizardOptions.js'

const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 }

// Maps, not objects: a garbage answer like 'toString' must not hit the prototype.
const TEMPLATE_EQUIPMENT = new Map([
  [EQUIPMENT_VALUES.FULL, 'full'],
  [EQUIPMENT_VALUES.DUMBBELL, 'dumbbell'],
  [EQUIPMENT_VALUES.BODYWEIGHT, 'bodyweight'],
])

const DECLARED_LEVEL_RANK = new Map([
  [LEVEL_VALUES.BEGINNER, LEVEL_RANK.beginner],
  [LEVEL_VALUES.INTERMEDIATE, LEVEL_RANK.intermediate],
  [LEVEL_VALUES.ADVANCED, LEVEL_RANK.advanced],
])

function parseAvailableDays(value) {
  const days = Number(value)
  return Number.isInteger(days) && days > 0 ? days : null
}

// Most days that fit (if none fits, the fewest), then the level closest to the declared one
// (an exact match before a lower one), then id, so the same answers always give the same template.
function compareCandidates(days) {
  const fits = tpl => days == null || tpl.daysPerWeek <= days
  return (a, b) => {
    if (fits(a) !== fits(b)) return fits(a) ? -1 : 1
    if (a.daysPerWeek !== b.daysPerWeek) {
      return fits(a) ? b.daysPerWeek - a.daysPerWeek : a.daysPerWeek - b.daysPerWeek
    }
    const levelOrder = LEVEL_RANK[b.level] - LEVEL_RANK[a.level]
    if (levelOrder !== 0) return levelOrder
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  }
}

/**
 * Recommends a template from the onboarding answers. A funnel over the template metadata, so a
 * new template needs no change here:
 *  1. Equipment narrows the pool, it never decides on its own (no answer = full gym).
 *  2. Days are a hard filter: no template whose `minDays` exceeds them.
 *  3. Level is a ceiling: never a template above the declared one (no answer = no ceiling).
 *  4. Within the pool, the declared goals. None matches → general health. None → the whole pool.
 *  5. First by `compareCandidates`.
 * A result is guaranteed because every equipment has a beginner template with `minDays: 1`
 * (asserted in recommendTemplate.test.js).
 *
 * @param {object} answers
 * @param {string[]} [answers.objetivos] - GOAL_VALUES values
 * @param {string|number} [answers.diasPorSemana] - available days per week (no answer = no limit)
 * @param {string} [answers.nivelExperiencia] - LEVEL_VALUES value
 * @param {string} [answers.equipamiento] - EQUIPMENT_VALUES value
 * @param {object[]} [templates] - candidates (tests pass their own)
 * @returns {{ templateId: string, daysShortfall: number }} `daysShortfall`: available days the
 *   template leaves free. Never negative: a template with more days than available rotates them.
 */
export function recommendTemplate(
  { objetivos, diasPorSemana, nivelExperiencia, equipamiento } = {},
  templates = ROUTINE_TEMPLATES,
) {
  const days = parseAvailableDays(diasPorSemana)
  const levelCeiling = DECLARED_LEVEL_RANK.get(nivelExperiencia) ?? LEVEL_RANK.advanced
  const equipment = TEMPLATE_EQUIPMENT.get(equipamiento) ?? 'full'
  const goals = Array.isArray(objetivos) ? objetivos : []

  const pool = templates.filter(tpl =>
    tpl.equipment === equipment &&
    (days == null || tpl.minDays <= days) &&
    LEVEL_RANK[tpl.level] <= levelCeiling
  )
  const byGoal = pool.filter(tpl => goals.includes(tpl.goal))
  const general = pool.filter(tpl => tpl.goal === GOAL_VALUES.GENERAL)
  const candidates = byGoal.length ? byGoal : general.length ? general : pool

  const [chosen] = [...candidates].sort(compareCandidates(days))
  return {
    templateId: chosen.id,
    daysShortfall: days == null ? 0 : Math.max(0, days - chosen.daysPerWeek),
  }
}

export const TEMPLATE_DAYS_NOTE = {
  SPARE: 'spare',
  ROTATES: 'rotates',
  TOO_FEW: 'tooFew',
}

/**
 * Which onboarding note a template needs against the days the user has. It runs on the template
 * the user has selected, not only the recommended one: a recommendation can only give SPARE or
 * ROTATES, TOO_FEW is reachable only by picking a template by hand.
 *
 * @param {{ daysPerWeek: number, minDays: number }} [template]
 * @param {string|number} [diasPorSemana] - available days per week
 * @returns {string|null} a TEMPLATE_DAYS_NOTE value, or null when there is nothing to say
 */
export function getTemplateDaysNote(template, diasPorSemana) {
  const days = parseAvailableDays(diasPorSemana)
  if (!template || days == null) return null
  if (template.minDays > days) return TEMPLATE_DAYS_NOTE.TOO_FEW
  if (template.daysPerWeek > days) return TEMPLATE_DAYS_NOTE.ROTATES
  if (template.daysPerWeek < days) return TEMPLATE_DAYS_NOTE.SPARE
  return null
}
