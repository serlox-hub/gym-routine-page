import { ROUTINE_TEMPLATES, getTemplateDisplay } from './routineTemplates.js'
import { GOAL_VALUES, getGoalLabel } from './routineWizardOptions.js'
import {
  GOAL_GUIDANCE,
  getViableTemplates,
  pickTemplate,
  getTemplateDaysNote,
  formatTemplateDaysNote,
} from './recommendTemplate.js'

// Why the recommended template is the user's. The value is the i18n key of the sentence.
export const RECOMMENDATION_REASON = {
  HYPERTROPHY: 'routine:onboarding.reason.hypertrophy',
  STRENGTH: 'routine:onboarding.reason.strength',
  ENDURANCE: 'routine:onboarding.reason.endurance',
  GENERAL: 'routine:onboarding.reason.general',
  // The same four, opening with the user's days: for a template that uses exactly those days.
  HYPERTROPHY_ON_YOUR_DAYS: 'routine:onboarding.reason.onYourDays.hypertrophy',
  STRENGTH_ON_YOUR_DAYS: 'routine:onboarding.reason.onYourDays.strength',
  ENDURANCE_ON_YOUR_DAYS: 'routine:onboarding.reason.onYourDays.endurance',
  GENERAL_ON_YOUR_DAYS: 'routine:onboarding.reason.onYourDays.general',
  FAT_LOSS: 'routine:onboarding.reason.fatLoss',
  NO_TEMPLATE: 'routine:onboarding.reason.noTemplate',
  EQUIPMENT: 'routine:onboarding.reason.equipment',
  LEVEL: 'routine:onboarding.reason.level',
  DAYS: 'routine:onboarding.reason.days',
}

// Why the user might prefer an alternative. The value is the i18n key of the line.
export const ALTERNATIVE_WHY = {
  OTHER_GOAL: 'routine:onboarding.why.otherGoal',
  FEWER_DAYS: 'routine:onboarding.why.fewerDays',
  GENERAL: 'routine:onboarding.why.general',
}

export const MAX_ALTERNATIVES = 2

// One pair per goal a template serves (a test keeps it so). Fat loss has none: it only gets here as guidance.
const REASON_BY_GOAL = new Map([
  [GOAL_VALUES.HYPERTROPHY, { reason: RECOMMENDATION_REASON.HYPERTROPHY, onYourDays: RECOMMENDATION_REASON.HYPERTROPHY_ON_YOUR_DAYS }],
  [GOAL_VALUES.STRENGTH, { reason: RECOMMENDATION_REASON.STRENGTH, onYourDays: RECOMMENDATION_REASON.STRENGTH_ON_YOUR_DAYS }],
  [GOAL_VALUES.ENDURANCE, { reason: RECOMMENDATION_REASON.ENDURANCE, onYourDays: RECOMMENDATION_REASON.ENDURANCE_ON_YOUR_DAYS }],
  [GOAL_VALUES.GENERAL, { reason: RECOMMENDATION_REASON.GENERAL, onYourDays: RECOMMENDATION_REASON.GENERAL_ON_YOUR_DAYS }],
])

const REASON_BY_GUIDANCE = new Map([
  [GOAL_GUIDANCE.NO_TEMPLATE, RECOMMENDATION_REASON.NO_TEMPLATE],
  [GOAL_GUIDANCE.EQUIPMENT, RECOMMENDATION_REASON.EQUIPMENT],
  [GOAL_GUIDANCE.LEVEL, RECOMMENDATION_REASON.LEVEL],
  [GOAL_GUIDANCE.DAYS, RECOMMENDATION_REASON.DAYS],
])

function getReasonKey(template, guidance, onYourDays) {
  if (!guidance) {
    const sentences = REASON_BY_GOAL.get(template.goal) ?? REASON_BY_GOAL.get(GOAL_VALUES.GENERAL)
    return onYourDays ? sentences.onYourDays : sentences.reason
  }
  // Fat loss is the goal with no template that people ask for, and it has a better answer than
  // "there is none": diet does the fat loss, the routine keeps the muscle.
  if (guidance.reasonKey === GOAL_GUIDANCE.NO_TEMPLATE && guidance.params.goal === GOAL_VALUES.FAT_LOSS) {
    return RECOMMENDATION_REASON.FAT_LOSS
  }
  return REASON_BY_GUIDANCE.get(guidance.reasonKey) ?? RECOMMENDATION_REASON.NO_TEMPLATE
}

const alternative = (template, whyKey, whyParams = {}) => template && { templateId: template.id, whyKey, whyParams }

// In this order, all from the templates the user can do and none twice:
//  1. The other goal the user marked, when it has a template of its own.
//  2. The same goal with fewer days per week.
//  3. A general health one, when the recommended template is not.
function getAlternatives(answers, recommended, templates) {
  const viable = getViableTemplates(answers, templates).filter(tpl => tpl.id !== recommended.id)
  const best = fits => pickTemplate(viable.filter(fits), answers.diasPorSemana)
  const otherGoals = (Array.isArray(answers.objetivos) ? answers.objetivos : []).filter(goal => goal !== recommended.goal)
  const fewerDays = best(tpl => tpl.goal === recommended.goal && tpl.daysPerWeek < recommended.daysPerWeek)
  const general = recommended.goal !== GOAL_VALUES.GENERAL && best(tpl => tpl.goal === GOAL_VALUES.GENERAL)

  const options = [
    ...otherGoals.map(goal => alternative(best(tpl => tpl.goal === goal), ALTERNATIVE_WHY.OTHER_GOAL, { goal })),
    alternative(fewerDays, ALTERNATIVE_WHY.FEWER_DAYS, { days: fewerDays?.daysPerWeek }),
    alternative(general, ALTERNATIVE_WHY.GENERAL),
  ]
  const alternatives = []
  for (const option of options) {
    if (option && !alternatives.some(alt => alt.templateId === option.templateId)) alternatives.push(option)
  }
  return alternatives.slice(0, MAX_ALTERNATIVES)
}

/**
 * Why the recommended template is the user's, and which others could also suit them. Presentation
 * only: it never changes what `recommendTemplate` chose.
 *
 * @param {object} answers - the onboarding answers, same as `recommendTemplate`
 * @param {{ templateId: string, guidance: object|null }} recommendation - what `recommendTemplate` returned
 * @param {object[]} [templates]
 * @returns {{ reasonKey: string, reasonParams: object, alternatives: { templateId: string, whyKey: string, whyParams: object }[] }}
 *   `reasonKey`: by the goal the template serves or, with `guidance`, by why the goal fell back.
 *   With no `guidance` and a template that uses exactly the available days, the sentence opens
 *   with them (`reasonParams.yourDays`), so the days the user gave are always told: there or in
 *   the days note. `reasonParams.daysNote`: the template's TEMPLATE_DAYS_NOTE against the available days (SPARE
 *   exactly when `daysShortfall > 0`), told as part of the reason. `alternatives`: at most
 *   MAX_ALTERNATIVES, all doable with the declared equipment, days and level.
 */
export function explainRecommendation(answers = {}, { templateId, guidance }, templates = ROUTINE_TEMPLATES) {
  const template = templates.find(tpl => tpl.id === templateId)
  const goal = guidance ? guidance.params.goal : template.goal
  // When the days differ, the days note says them: the sentence does not repeat them.
  const onYourDays = !guidance && Number(answers.diasPorSemana) === template.daysPerWeek
  return {
    reasonKey: getReasonKey(template, guidance, onYourDays),
    reasonParams: {
      ...guidance?.params,
      goal,
      daysNote: getTemplateDaysNote(template, answers.diasPorSemana),
      availableDays: answers.diasPorSemana,
      ...(onYourDays && { yourDays: template.daysPerWeek }),
    },
    alternatives: getAlternatives(answers, template, templates),
  }
}

/**
 * The reason as text: its sentence and, when the template does not use exactly the available
 * days, the days note. The recommended template's days are told here, not in a note of their own.
 * Takes `t` (useTranslation) so it follows a language change live.
 *
 * @param {{ reasonKey: string, reasonParams: object }} explanation - from `explainRecommendation`
 * @param {object} template - the recommended template
 * @param {Function} t
 * @returns {string}
 */
export function formatRecommendationReason({ reasonKey, reasonParams }, template, t) {
  const { daysNote, availableDays, yourDays } = reasonParams
  const reason = t(reasonKey, {
    ...reasonParams,
    goal: getGoalLabel(reasonParams.goal, t),
    template: getTemplateDisplay(template, t).name,
    ...(yourDays != null && { yourDays: t('common:home.nDays', { count: yourDays }) }),
  })
  return daysNote ? `${reason} ${formatTemplateDaysNote(daysNote, template, availableDays, t)}` : reason
}

/**
 * An alternative's line: why the user might prefer it. Takes `t` (useTranslation).
 *
 * @param {{ whyKey: string, whyParams: object }} alternative - from `explainRecommendation`
 * @param {Function} t
 * @returns {string}
 */
export function formatAlternativeWhy({ whyKey, whyParams }, t) {
  const { goal, days } = whyParams
  return t(whyKey, {
    ...(goal != null && { goal: getGoalLabel(goal, t) }),
    ...(days != null && { days: t('common:home.nDays', { count: days }) }),
  })
}

/**
 * The days note of a template the user picked instead of the recommended one, as text, or null
 * when there is nothing to say. The recommended template gets none: its reason already tells them.
 *
 * @param {object} template
 * @param {string} recommendedId
 * @param {string|number} diasPorSemana - available days per week
 * @param {Function} t
 * @returns {string|null}
 */
export function formatChoiceDaysNote(template, recommendedId, diasPorSemana, t) {
  if (template.id === recommendedId) return null
  const note = getTemplateDaysNote(template, diasPorSemana)
  return note ? formatTemplateDaysNote(note, template, diasPorSemana, t) : null
}

/**
 * The onboarding's last step in the order it lists the templates: the recommended one, its
 * alternatives, and the rest behind "see all". Every template is in exactly one group, so any of
 * them can still be picked.
 *
 * @param {string} recommendedId
 * @param {{ templateId: string }[]} alternatives - from `explainRecommendation`
 * @param {object[]} [templates]
 * @returns {{ recommended: object, alternatives: object[], others: object[] }} `alternatives` keeps
 *   each one's fields and adds its `template`
 */
export function groupTemplateChoices(recommendedId, alternatives, templates = ROUTINE_TEMPLATES) {
  const byId = new Map(templates.map(tpl => [tpl.id, tpl]))
  const listed = new Set([recommendedId, ...alternatives.map(alt => alt.templateId)])
  return {
    recommended: byId.get(recommendedId),
    alternatives: alternatives.map(alt => ({ ...alt, template: byId.get(alt.templateId) })),
    others: templates.filter(tpl => !listed.has(tpl.id)),
  }
}
