import { ROUTINE_TEMPLATES, getTemplateDisplay } from './routineTemplates.js'
import { GOAL_VALUES, GOAL_OPTIONS, MAX_GOALS, LEVEL_VALUES, EQUIPMENT_VALUES, getGoalLabel } from './routineWizardOptions.js'

const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 }

const KNOWN_GOALS = new Set(Object.values(GOAL_VALUES))

// With candidates for two goals, the first in this list wins: its templates are the most specific.
// A goal missing from it (fat loss has no template of its own) ranks last.
const GOAL_SPECIFICITY = [GOAL_VALUES.STRENGTH, GOAL_VALUES.ENDURANCE, GOAL_VALUES.HYPERTROPHY, GOAL_VALUES.GENERAL]

function goalSpecificity(goal) {
  const rank = GOAL_SPECIFICITY.indexOf(goal)
  return rank === -1 ? GOAL_SPECIFICITY.length : rank
}

// Why a requested goal got no template of its own: the reasonKey is the i18n key of the sentence.
export const GOAL_GUIDANCE = {
  NO_TEMPLATE: 'routine:onboarding.guidance.noTemplate',
  EQUIPMENT: 'routine:onboarding.guidance.equipment',
  LEVEL: 'routine:onboarding.guidance.level',
  DAYS: 'routine:onboarding.guidance.days',
}

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

// Level before days: a beginner asking for hypertrophy gets nothing with any number of days, so
// "you need 3 days" would be false. Days come last, when they are the only thing missing.
function explainFallback(goal, templates, { fitsEquipment, fitsLevel, days }) {
  const params = { goal }
  const ofGoal = templates.filter(tpl => tpl.goal === goal)
  if (!ofGoal.length) return { reasonKey: GOAL_GUIDANCE.NO_TEMPLATE, params }
  const forEquipment = ofGoal.filter(fitsEquipment)
  if (!forEquipment.length) return { reasonKey: GOAL_GUIDANCE.EQUIPMENT, params }
  const forLevel = forEquipment.filter(fitsLevel)
  if (!forLevel.length) return { reasonKey: GOAL_GUIDANCE.LEVEL, params }
  const minDays = Math.min(...forLevel.map(tpl => tpl.minDays))
  return { reasonKey: GOAL_GUIDANCE.DAYS, params: { goal, minDays, days } }
}

// The answers as the funnel reads them: anything it does not recognize counts as no answer.
function readAnswers({ objetivos, diasPorSemana, nivelExperiencia, equipamiento } = {}) {
  const days = parseAvailableDays(diasPorSemana)
  const levelCeiling = DECLARED_LEVEL_RANK.get(nivelExperiencia) ?? LEVEL_RANK.advanced
  const equipment = TEMPLATE_EQUIPMENT.get(equipamiento) ?? 'full'
  const goals = [...new Set(Array.isArray(objetivos) ? objetivos : [])]
    .filter(goal => KNOWN_GOALS.has(goal))
    .sort((a, b) => goalSpecificity(a) - goalSpecificity(b))
  return {
    days,
    goals,
    fitsEquipment: tpl => tpl.equipment === equipment,
    fitsDays: tpl => days == null || tpl.minDays <= days,
    fitsLevel: tpl => LEVEL_RANK[tpl.level] <= levelCeiling,
  }
}

/**
 * The templates the user can do: the declared equipment, no `minDays` above the available days and
 * no level above the declared one (steps 1 to 3 of `recommendTemplate`). The goals play no part.
 *
 * @param {object} answers - same as `recommendTemplate`
 * @param {object[]} [templates]
 * @returns {object[]}
 */
export function getViableTemplates(answers, templates = ROUTINE_TEMPLATES) {
  const { fitsEquipment, fitsDays, fitsLevel } = readAnswers(answers)
  return templates.filter(tpl => fitsEquipment(tpl) && fitsDays(tpl) && fitsLevel(tpl))
}

/**
 * The first of `candidates` in the funnel's order (`compareCandidates`), or null when there are none.
 *
 * @param {object[]} candidates
 * @param {string|number} [diasPorSemana] - available days per week
 * @returns {object|null}
 */
export function pickTemplate(candidates, diasPorSemana) {
  return [...candidates].sort(compareCandidates(parseAvailableDays(diasPorSemana)))[0] ?? null
}

/**
 * Recommends a template from the onboarding answers. A funnel over the template metadata, so a
 * new template needs no change here:
 *  1. Equipment narrows the pool, it never decides on its own (no answer = full gym).
 *  2. Days are a hard filter: no template whose `minDays` exceeds them.
 *  3. Level is a ceiling: never a template above the declared one (no answer = no ceiling).
 *  4. Within the pool, the declared goals. With candidates for two, the most specific goal wins
 *     (GOAL_SPECIFICITY): the other one only takes part in the choice, it changes nothing in the
 *     template. None has candidates → general health, and `guidance` says why. No goal → the whole pool.
 *  5. First by `compareCandidates`.
 * A result is guaranteed because every equipment has a beginner template with `minDays: 1`
 * (asserted in recommendTemplate.test.js).
 *
 * @param {object} answers
 * @param {string[]} [answers.objetivos] - GOAL_VALUES values (unknown values are ignored)
 * @param {string|number} [answers.diasPorSemana] - available days per week (no answer = no limit)
 * @param {string} [answers.nivelExperiencia] - LEVEL_VALUES value
 * @param {string} [answers.equipamiento] - EQUIPMENT_VALUES value
 * @param {object[]} [templates] - candidates (tests pass their own)
 * @returns {{ templateId: string, daysShortfall: number, guidance: { reasonKey: string, params: object }|null }}
 *   `daysShortfall`: available days the template leaves free. Never negative: a template with more
 *   days than available rotates them. `guidance`: null unless the goals were requested and none had
 *   a template, then why, for the most specific of them (`params.goal` is its GOAL_VALUES value,
 *   `formatGoalGuidance` turns it into the sentence).
 */
export function recommendTemplate(answers = {}, templates = ROUTINE_TEMPLATES) {
  const { days, goals, fitsEquipment, fitsLevel } = readAnswers(answers)
  const pool = getViableTemplates(answers, templates)
  const byGoal = goals
    .map(goal => pool.filter(tpl => tpl.goal === goal))
    .find(goalCandidates => goalCandidates.length > 0)
  const general = pool.filter(tpl => tpl.goal === GOAL_VALUES.GENERAL)
  const candidates = byGoal ?? (general.length ? general : pool)

  const chosen = pickTemplate(candidates, days)
  return {
    templateId: chosen.id,
    daysShortfall: days == null ? 0 : Math.max(0, days - chosen.daysPerWeek),
    guidance: byGoal || !goals.length
      ? null
      : explainFallback(goals[0], templates, { fitsEquipment, fitsLevel, days }),
  }
}

/**
 * Why this goal, marked alone, would get a template that is not its own with the other answers.
 * What the goal selector marks: null when the goal has a template that fits.
 *
 * @param {string} goal - GOAL_VALUES value
 * @param {object} answers - same as `recommendTemplate` (its `objetivos` is ignored)
 * @param {object[]} [templates]
 * @returns {{ reasonKey: string, params: object }|null}
 */
export function getGoalGuidance(goal, answers, templates = ROUTINE_TEMPLATES) {
  return recommendTemplate({ ...answers, objetivos: [goal] }, templates).guidance
}

/**
 * The onboarding goal selector, one chip per offered goal. Both kinds of unavailable chip are
 * dimmed and still pressable (the "botón bloqueado" pattern in CLAUDE.md): a `isBlocked` one (the
 * selection is at MAX_GOALS) says so on press without changing anything, and one with `guidance`
 * (no template of its own for the other answers) gets marked and then says why.
 *
 * @param {object} answers - same as `recommendTemplate`, `objetivos` being the current selection
 * @param {object[]} [templates]
 * @returns {{ value: string, labelKey: string, isSelected: boolean, isBlocked: boolean, isDimmed: boolean,
 *   guidance: { reasonKey: string, params: object }|null }[]}
 */
export function getGoalChips(answers = {}, templates = ROUTINE_TEMPLATES) {
  const selected = Array.isArray(answers.objetivos) ? answers.objetivos : []
  const atMax = selected.length >= MAX_GOALS
  return GOAL_OPTIONS.map(({ value, labelKey }) => {
    const isSelected = selected.includes(value)
    const isBlocked = !isSelected && atMax
    const guidance = getGoalGuidance(value, answers, templates)
    return { value, labelKey, isSelected, isBlocked, isDimmed: !isSelected && (isBlocked || guidance != null), guidance }
  })
}

/**
 * The guidance as a sentence: why the goal has no template of its own, and which one is
 * recommended instead. Takes `t` (useTranslation) so it follows a language change live.
 *
 * @param {{ reasonKey: string, params: object }} guidance
 * @param {object} template - the recommended template
 * @param {Function} t
 * @returns {string}
 */
export function formatGoalGuidance(guidance, template, t) {
  return t(guidance.reasonKey, {
    ...guidance.params,
    goal: getGoalLabel(guidance.params.goal, t),
    template: getTemplateDisplay(template, t).name,
  })
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

/**
 * The days note as a sentence. Takes `t` (useTranslation) so it follows a language change live.
 *
 * @param {string} note - a TEMPLATE_DAYS_NOTE value (from `getTemplateDaysNote`)
 * @param {{ daysPerWeek: number, minDays: number }} template - the template the note is about
 * @param {string|number} diasPorSemana - available days per week
 * @param {Function} t
 * @returns {string}
 */
export function formatTemplateDaysNote(note, template, diasPorSemana, t) {
  return t(`routine:onboarding.daysNote.${note}`, {
    requested: parseAvailableDays(diasPorSemana),
    actual: template.daysPerWeek,
    min: template.minDays,
  })
}
