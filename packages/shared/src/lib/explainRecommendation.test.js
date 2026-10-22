import { describe, it, expect } from 'vitest'
import {
  explainRecommendation,
  formatRecommendationReason,
  formatAlternativeWhy,
  groupTemplateChoices,
  formatChoiceDaysNote,
  RECOMMENDATION_REASON,
  ALTERNATIVE_WHY,
  MAX_ALTERNATIVES,
} from './explainRecommendation.js'
import { recommendTemplate, getTemplateDaysNote, TEMPLATE_DAYS_NOTE, GOAL_GUIDANCE } from './recommendTemplate.js'
import { ROUTINE_TEMPLATES } from './routineTemplates.js'
import { GOAL_VALUES, LEVEL_VALUES, EQUIPMENT_VALUES } from './routineWizardOptions.js'
import { i18n, initI18n } from '../i18n/index.js'
import esRoutine from '../i18n/locales/es/routine.json'
import enRoutine from '../i18n/locales/en/routine.json'

initI18n()

const { HYPERTROPHY, STRENGTH, FAT_LOSS, ENDURANCE, GENERAL } = GOAL_VALUES
const { BEGINNER, INTERMEDIATE, ADVANCED } = LEVEL_VALUES
const LEVELS = [BEGINNER, INTERMEDIATE, ADVANCED]
const DAYS = [1, 2, 3, 4, 5, 6, 7]
const GOALS = Object.values(GOAL_VALUES)
const GOAL_PAIRS = GOALS.flatMap((first, i) => GOALS.slice(i + 1).map(second => [first, second]))
const TEMPLATES_BY_ID = new Map(ROUTINE_TEMPLATES.map(tpl => [tpl.id, tpl]))
const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 }
const DECLARED_RANK = { [BEGINNER]: 0, [INTERMEDIATE]: 1, [ADVANCED]: 2 }
const TEMPLATE_EQUIPMENT = {
  [EQUIPMENT_VALUES.FULL]: 'full',
  [EQUIPMENT_VALUES.DUMBBELL]: 'dumbbell',
  [EQUIPMENT_VALUES.BODYWEIGHT]: 'bodyweight',
}

const answersFor = (goals, days, level, equipment = EQUIPMENT_VALUES.FULL) =>
  ({ objetivos: goals, diasPorSemana: String(days), nivelExperiencia: level, equipamiento: equipment })
const explain = (goals, days, level, equipment) => {
  const answers = answersFor(goals, days, level, equipment)
  return explainRecommendation(answers, recommendTemplate(answers))
}
const alternativeIds = explanation => explanation.alternatives.map(alt => alt.templateId)

// Every answer the wizard can give at its last step: at least one goal, every other step answered.
function* everyAnswer() {
  for (const equipment of Object.values(EQUIPMENT_VALUES))
    for (const goals of [...GOALS.map(goal => [goal]), ...GOAL_PAIRS])
      for (const level of LEVELS)
        for (const days of DAYS) yield answersFor(goals, days, level, equipment)
}

// A synthetic template: only the metadata the recommendation reads.
const fixture = (id, overrides = {}) => ({
  id, goal: GENERAL, daysPerWeek: 3, minDays: 1, level: 'beginner', equipment: 'full', ...overrides,
})

const fakeT = (key, params) => (params ? `${key}${JSON.stringify(params)}` : key)

describe('explainRecommendation: one goal', () => {
  it('the reason is the goal the template serves, and the alternatives say why', () => {
    expect(explain([HYPERTROPHY], 4, INTERMEDIATE)).toEqual({
      reasonKey: RECOMMENDATION_REASON.HYPERTROPHY_ON_YOUR_DAYS,
      reasonParams: { goal: HYPERTROPHY, daysNote: null, availableDays: '4', yourDays: 4 },
      alternatives: [
        { templateId: 'ppl-3', whyKey: ALTERNATIVE_WHY.FEWER_DAYS, whyParams: { days: 3 } },
        { templateId: 'full-body', whyKey: ALTERNATIVE_WHY.GENERAL, whyParams: {} },
      ],
    })
  })

  it('each goal with templates of its own has its sentence', () => {
    expect(explain([STRENGTH], 3, BEGINNER).reasonKey).toBe(RECOMMENDATION_REASON.STRENGTH_ON_YOUR_DAYS)
    expect(explain([ENDURANCE], 3, BEGINNER).reasonKey).toBe(RECOMMENDATION_REASON.ENDURANCE_ON_YOUR_DAYS)
    expect(explain([GENERAL], 3, BEGINNER).reasonKey).toBe(RECOMMENDATION_REASON.GENERAL_ON_YOUR_DAYS)
  })

  it('a general template has no "more general" alternative, only fewer days', () => {
    expect(explain([GENERAL], 3, BEGINNER).alternatives).toEqual([
      { templateId: 'full-body-2', whyKey: ALTERNATIVE_WHY.FEWER_DAYS, whyParams: { days: 2 } },
    ])
  })
})

describe('explainRecommendation: two goals', () => {
  it('the reason is the goal that decided, and the other goal is the first alternative', () => {
    const explanation = explain([HYPERTROPHY, STRENGTH], 4, INTERMEDIATE)
    expect(explanation.reasonKey).toBe(RECOMMENDATION_REASON.STRENGTH_ON_YOUR_DAYS)
    expect(explanation.reasonParams.goal).toBe(STRENGTH)
    expect(explanation.alternatives).toEqual([
      { templateId: 'upper-lower', whyKey: ALTERNATIVE_WHY.OTHER_GOAL, whyParams: { goal: HYPERTROPHY } },
      { templateId: 'strength-5x5', whyKey: ALTERNATIVE_WHY.FEWER_DAYS, whyParams: { days: 3 } },
    ])
  })

  it(`with three possible alternatives, only the first ${MAX_ALTERNATIVES} are offered`, () => {
    // Other goal, fewer days and general all exist here: general is the one left out.
    expect(alternativeIds(explain([HYPERTROPHY, STRENGTH], 4, INTERMEDIATE))).not.toContain('full-body')
  })

  it('a template that answers two criteria is offered once, under the first', () => {
    // General health is the other goal and also the "more general" option: same template.
    expect(explain([STRENGTH, GENERAL], 3, BEGINNER).alternatives).toEqual([
      { templateId: 'full-body', whyKey: ALTERNATIVE_WHY.OTHER_GOAL, whyParams: { goal: GENERAL } },
    ])
  })

  it('the other goal is not offered when it has no template of its own', () => {
    const explanation = explain([FAT_LOSS, HYPERTROPHY], 4, INTERMEDIATE)
    expect(explanation.reasonKey).toBe(RECOMMENDATION_REASON.HYPERTROPHY_ON_YOUR_DAYS)
    expect(explanation.alternatives.some(alt => alt.whyKey === ALTERNATIVE_WHY.OTHER_GOAL)).toBe(false)
  })
})

describe('explainRecommendation: with guidance, the reason explains the fallback', () => {
  it('LEVEL', () => {
    expect(explain([HYPERTROPHY], 3, BEGINNER)).toMatchObject({
      reasonKey: RECOMMENDATION_REASON.LEVEL,
      reasonParams: { goal: HYPERTROPHY },
    })
  })

  it('never the sentence that opens with the days, even when the template uses exactly them', () => {
    // Full Body is 3 days, the user has 3: the sentence is about the fallback, not the days.
    expect(explain([HYPERTROPHY], 3, BEGINNER).reasonParams).not.toHaveProperty('yourDays')
  })

  it('only NO_TEMPLATE says there is no routine for the goal: every other guidance has its own sentence', () => {
    for (const key of Object.values(GOAL_GUIDANCE)) {
      const { reasonKey } = explainRecommendation({}, { templateId: 'full-body', guidance: { reasonKey: key, params: { goal: HYPERTROPHY } } })
      expect(reasonKey === RECOMMENDATION_REASON.NO_TEMPLATE, key).toBe(key === GOAL_GUIDANCE.NO_TEMPLATE)
    }
  })

  it('DAYS, with how many days the goal needs', () => {
    expect(explain([HYPERTROPHY], 2, INTERMEDIATE)).toMatchObject({
      reasonKey: RECOMMENDATION_REASON.DAYS,
      reasonParams: { goal: HYPERTROPHY, minDays: 3, days: 2 },
    })
  })

  it('EQUIPMENT', () => {
    expect(explain([STRENGTH], 3, ADVANCED, EQUIPMENT_VALUES.BODYWEIGHT)).toMatchObject({
      reasonKey: RECOMMENDATION_REASON.EQUIPMENT,
      reasonParams: { goal: STRENGTH },
    })
  })

  it('fat loss gets its own sentence instead of "there is no routine for it"', () => {
    expect(explain([FAT_LOSS], 3, BEGINNER)).toMatchObject({
      reasonKey: RECOMMENDATION_REASON.FAT_LOSS,
      reasonParams: { goal: FAT_LOSS },
    })
  })

  it('any other goal with no template at all gets the generic one', () => {
    const templates = [fixture('general')]
    const answers = { objetivos: [STRENGTH], diasPorSemana: '3' }
    expect(explainRecommendation(answers, recommendTemplate(answers, templates), templates).reasonKey)
      .toBe(RECOMMENDATION_REASON.NO_TEMPLATE)
  })
})

describe('explainRecommendation: the days', () => {
  it('daysShortfall > 0: the reason carries the SPARE note', () => {
    const answers = answersFor([HYPERTROPHY], 6, INTERMEDIATE)
    const recommendation = recommendTemplate(answers)
    expect(recommendation.daysShortfall).toBe(2)
    expect(explainRecommendation(answers, recommendation).reasonParams.daysNote).toBe(TEMPLATE_DAYS_NOTE.SPARE)
  })

  it('fewer days than the template has: the ROTATES note', () => {
    expect(explain([GENERAL], 1, BEGINNER).reasonParams.daysNote).toBe(TEMPLATE_DAYS_NOTE.ROTATES)
  })

  it('the exact days, or no days answer: no note', () => {
    expect(explain([HYPERTROPHY], 4, INTERMEDIATE).reasonParams.daysNote).toBeNull()
    const answers = { objetivos: [GENERAL] }
    expect(explainRecommendation(answers, recommendTemplate(answers)).reasonParams.daysNote).toBeNull()
  })

  it('the exact days: the sentence opens with them', () => {
    expect(explain([STRENGTH], 3, BEGINNER)).toMatchObject({
      reasonKey: RECOMMENDATION_REASON.STRENGTH_ON_YOUR_DAYS,
      reasonParams: { yourDays: 3, daysNote: null },
    })
  })

  it('with a days note, the sentence does not open with the days: the note tells them', () => {
    const explanation = explain([HYPERTROPHY], 6, INTERMEDIATE)
    expect(explanation.reasonKey).toBe(RECOMMENDATION_REASON.HYPERTROPHY)
    expect(explanation.reasonParams).not.toHaveProperty('yourDays')
  })

  it('no days answer: the sentence without days', () => {
    const answers = { objetivos: [GENERAL] }
    const explanation = explainRecommendation(answers, recommendTemplate(answers))
    expect(explanation.reasonKey).toBe(RECOMMENDATION_REASON.GENERAL)
    expect(explanation.reasonParams).not.toHaveProperty('yourDays')
  })
})

describe('explainRecommendation: no alternatives', () => {
  it('when the equipment leaves a single template', () => {
    expect(explain([HYPERTROPHY], 4, ADVANCED, EQUIPMENT_VALUES.DUMBBELL).alternatives).toEqual([])
    expect(explain([GENERAL], 3, BEGINNER, EQUIPMENT_VALUES.BODYWEIGHT).alternatives).toEqual([])
  })

  it('when nothing else that fits the days is of the same goal or more general', () => {
    // At 2 days: strength and endurance fit, but nobody asked for them.
    expect(explain([HYPERTROPHY], 2, INTERMEDIATE).alternatives).toEqual([])
  })

  it('without answers', () => {
    const recommendation = recommendTemplate()
    expect(explainRecommendation(undefined, recommendation).alternatives).toEqual([
      { templateId: 'full-body-2', whyKey: ALTERNATIVE_WHY.FEWER_DAYS, whyParams: { days: 2 } },
    ])
  })
})

describe('explainRecommendation: over every answer', () => {
  it('the alternatives are at most two, distinct, not the recommended one, and doable', () => {
    for (const answers of everyAnswer()) {
      const recommendation = recommendTemplate(answers)
      const { alternatives } = explainRecommendation(answers, recommendation)
      const label = JSON.stringify(answers)
      const ids = alternatives.map(alt => alt.templateId)
      expect(ids.length, label).toBeLessThanOrEqual(MAX_ALTERNATIVES)
      expect(new Set(ids).size, label).toBe(ids.length)
      expect(ids, label).not.toContain(recommendation.templateId)
      for (const id of ids) {
        const tpl = TEMPLATES_BY_ID.get(id)
        expect(tpl.equipment, `${label} → ${id}`).toBe(TEMPLATE_EQUIPMENT[answers.equipamiento])
        expect(tpl.minDays, `${label} → ${id}`).toBeLessThanOrEqual(Number(answers.diasPorSemana))
        expect(LEVEL_RANK[tpl.level], `${label} → ${id}`).toBeLessThanOrEqual(DECLARED_RANK[answers.nivelExperiencia])
      }
    }
  })

  it('the days the user gave are told once: opening the sentence or in the days note, never both nor neither', () => {
    for (const answers of everyAnswer()) {
      const recommendation = recommendTemplate(answers)
      const { reasonParams } = explainRecommendation(answers, recommendation)
      const label = JSON.stringify(answers)
      const tellsDays = [reasonParams.yourDays != null, reasonParams.daysNote != null]
      if (recommendation.guidance) {
        // The sentence is about the fallback, not the days.
        expect(reasonParams, label).not.toHaveProperty('yourDays')
      } else {
        expect(tellsDays.filter(Boolean), label).toHaveLength(1)
      }
      // SPARE is exactly the template leaving days over.
      expect(reasonParams.daysNote === TEMPLATE_DAYS_NOTE.SPARE, label).toBe(recommendation.daysShortfall > 0)
    }
  })

  it('garbage or missing answers still give a well-formed explanation and never throw', () => {
    const inputs = [
      undefined,
      {},
      { diasPorSemana: 'abc' },
      { diasPorSemana: '0' },
      { diasPorSemana: '2.5' },
      { diasPorSemana: 4 },
      { objetivos: STRENGTH },
      { objetivos: null },
      { objetivos: [''] },
      { objetivos: ['Mantenimiento', 'toString'] },
      { objetivos: [STRENGTH, STRENGTH, HYPERTROPHY, HYPERTROPHY] },
      { nivelExperiencia: 'toString' },
      { equipamiento: '__proto__' },
    ]
    for (const input of inputs) {
      const label = JSON.stringify(input)
      const explanation = explainRecommendation(input, recommendTemplate(input))
      const ids = alternativeIds(explanation)
      expect(explanation.reasonKey, label).toEqual(expect.any(String))
      expect(ids.length, label).toBeLessThanOrEqual(MAX_ALTERNATIVES)
      expect(new Set(ids).size, label).toBe(ids.length)
    }
  })

  for (const language of ['es', 'en']) {
    it(`${language}: a reason and every why are text, never empty and never a key or a placeholder`, () => {
      const t = i18n.getFixedT(language)
      const isText = text => typeof text === 'string' && text.trim() !== '' && !/routine:|onboarding\.|{{|undefined|null/.test(text)
      for (const answers of everyAnswer()) {
        const recommendation = recommendTemplate(answers)
        const explanation = explainRecommendation(answers, recommendation)
        const label = JSON.stringify(answers)
        const reason = formatRecommendationReason(explanation, TEMPLATES_BY_ID.get(recommendation.templateId), t)
        expect(isText(reason), `${label}: ${reason}`).toBe(true)
        for (const alternative of explanation.alternatives) {
          const why = formatAlternativeWhy(alternative, t)
          expect(isText(why), `${label}: ${why}`).toBe(true)
        }
      }
    })
  }
})

// The sentences say things about the templates that the metadata can back. If a template breaks
// one of these, the sentence has to change with it.
describe('the copy holds on the catalog', () => {
  it('every goal a template serves has a sentence of its own, with and without the days', () => {
    for (const goal of new Set(ROUTINE_TEMPLATES.map(tpl => tpl.goal))) {
      if (goal === GENERAL) continue
      const tpl = ROUTINE_TEMPLATES.find(template => template.goal === goal)
      const recommendation = { templateId: tpl.id, guidance: null }
      expect(explainRecommendation({}, recommendation).reasonKey, goal).not.toBe(RECOMMENDATION_REASON.GENERAL)
      expect(explainRecommendation({ diasPorSemana: String(tpl.daysPerWeek) }, recommendation).reasonKey, goal)
        .not.toBe(RECOMMENDATION_REASON.GENERAL_ON_YOUR_DAYS)
    }
  })

  it('"trains different muscles on different days": every hypertrophy template is a split (needs all its days)', () => {
    for (const tpl of ROUTINE_TEMPLATES.filter(template => template.goal === HYPERTROPHY))
      expect(tpl.minDays, tpl.id).toBe(tpl.daysPerWeek)
  })

  it('"trains your whole body": every fallback lands on a general template, a full body that rotates its days', () => {
    for (const answers of everyAnswer()) {
      const { templateId, guidance } = recommendTemplate(answers)
      if (guidance) expect(TEMPLATES_BY_ID.get(templateId).goal, JSON.stringify(answers)).toBe(GENERAL)
    }
    for (const tpl of ROUTINE_TEMPLATES.filter(template => template.goal === GENERAL))
      expect(tpl.minDays, tpl.id).toBeLessThan(tpl.daysPerWeek)
  })
})

describe('formatRecommendationReason', () => {
  const template = TEMPLATES_BY_ID.get('upper-lower')

  it('translates the goal into its label and the template into its name', () => {
    const explanation = { reasonKey: RECOMMENDATION_REASON.DAYS, reasonParams: { goal: HYPERTROPHY, minDays: 3, days: 2, daysNote: null, availableDays: '2' } }
    expect(formatRecommendationReason(explanation, template, fakeT)).toBe(`${RECOMMENDATION_REASON.DAYS}${JSON.stringify({
      goal: 'routine:chatbot.goals.hypertrophy',
      minDays: 3,
      days: 2,
      daysNote: null,
      availableDays: '2',
      template: 'routine:templates.items.upper-lower.name',
    })}`)
  })

  it('with a days note, adds it after the sentence, about the recommended template', () => {
    const explanation = { reasonKey: RECOMMENDATION_REASON.HYPERTROPHY, reasonParams: { goal: HYPERTROPHY, daysNote: TEMPLATE_DAYS_NOTE.SPARE, availableDays: '6' } }
    const [, note] = formatRecommendationReason(explanation, template, fakeT).split(' ')
    expect(note).toBe(`routine:onboarding.daysNote.spare${JSON.stringify({ requested: 6, actual: 4, min: 4 })}`)
  })

  it('the days that open the sentence go as "N days", with their plural', () => {
    const answers = answersFor([STRENGTH], 3, BEGINNER)
    const explanation = explainRecommendation(answers, recommendTemplate(answers))
    const strength = TEMPLATES_BY_ID.get('strength-5x5')
    expect(formatRecommendationReason(explanation, strength, i18n.getFixedT('es'))).toBe(
      'Para ganar fuerza con 3 días a la semana, Fuerza 5x5 se centra en los básicos pesados y sube la carga poco a poco.',
    )
    expect(formatRecommendationReason(explanation, strength, i18n.getFixedT('en'))).toBe(
      'To get stronger on 3 days a week, Strength 5x5 focuses on the heavy basics and adds weight little by little.',
    )
  })

  it('in Spanish, the SPARE reason says the days without apologizing', () => {
    const answers = answersFor([HYPERTROPHY], 6, INTERMEDIATE)
    const explanation = explainRecommendation(answers, recommendTemplate(answers))
    expect(formatRecommendationReason(explanation, template, i18n.getFixedT('es'))).toBe(
      'Para ganar músculo, Upper / Lower reparte los músculos entre los días. Así cada uno recibe más trabajo del que cabría en una sola sesión. ' +
      'Esta rutina es de 4 días y tienes 6. Los días que sobran son de descanso.',
    )
  })
})

describe('formatAlternativeWhy', () => {
  it('the other goal goes as its label', () => {
    const alternative = { whyKey: ALTERNATIVE_WHY.OTHER_GOAL, whyParams: { goal: STRENGTH } }
    expect(formatAlternativeWhy(alternative, fakeT)).toBe(`${ALTERNATIVE_WHY.OTHER_GOAL}${JSON.stringify({ goal: 'routine:chatbot.goals.strength' })}`)
  })

  it('the days go as "N days", with their plural', () => {
    const alternative = { whyKey: ALTERNATIVE_WHY.FEWER_DAYS, whyParams: { days: 3 } }
    expect(formatAlternativeWhy(alternative, i18n.getFixedT('es'))).toBe('Si te viene mejor entrenar 3 días a la semana.')
    expect(formatAlternativeWhy(alternative, i18n.getFixedT('en'))).toBe('If 3 days a week suits you better.')
  })

  it('a why without params translates as it is', () => {
    expect(formatAlternativeWhy({ whyKey: ALTERNATIVE_WHY.GENERAL, whyParams: {} }, fakeT)).toBe(`${ALTERNATIVE_WHY.GENERAL}{}`)
  })
})

describe('formatChoiceDaysNote', () => {
  const split = TEMPLATES_BY_ID.get('upper-lower')

  it('a template picked by hand gets its days note', () => {
    expect(formatChoiceDaysNote(split, 'full-body', '3', fakeT))
      .toBe(`routine:onboarding.daysNote.tooFew${JSON.stringify({ requested: 3, actual: 4, min: 4 })}`)
    expect(formatChoiceDaysNote(split, 'full-body', '6', fakeT)).toContain('routine:onboarding.daysNote.spare')
  })

  it('the recommended one gets none, its reason tells the days', () => {
    expect(formatChoiceDaysNote(split, 'upper-lower', '6', fakeT)).toBeNull()
  })

  it('null when the days match or were not answered', () => {
    expect(formatChoiceDaysNote(split, 'full-body', '4', fakeT)).toBeNull()
    expect(formatChoiceDaysNote(split, 'full-body', '', fakeT)).toBeNull()
  })

  for (const language of ['es', 'en']) {
    it(`${language}: any template against any days gives a note with its numbers and no placeholder left, or nothing`, () => {
      const t = i18n.getFixedT(language)
      const noteToNumber = {
        [TEMPLATE_DAYS_NOTE.TOO_FEW]: tpl => tpl.minDays,
        [TEMPLATE_DAYS_NOTE.ROTATES]: tpl => tpl.daysPerWeek,
        [TEMPLATE_DAYS_NOTE.SPARE]: tpl => tpl.daysPerWeek,
      }
      const seen = new Set()
      for (const tpl of ROUTINE_TEMPLATES)
        for (const days of DAYS) {
          const label = `${tpl.id} / ${days}`
          const text = formatChoiceDaysNote(tpl, 'none', String(days), t)
          const note = getTemplateDaysNote(tpl, days)
          if (!note) {
            expect(text, label).toBeNull()
            continue
          }
          seen.add(note)
          expect(text, label).not.toMatch(/routine:|onboarding\.|{{|undefined|NaN/)
          expect(text, label).toMatch(new RegExp(`\\b${days}\\b`))
          expect(text, label).toMatch(new RegExp(`\\b${noteToNumber[note](tpl)}\\b`))
        }
      // The catalog reaches all three notes, so none goes untested.
      expect([...seen].sort()).toEqual(Object.values(TEMPLATE_DAYS_NOTE).sort())
    })
  }
})

describe('the sentences exist in es and en', () => {
  const read = (locale, key) => key.split(':')[1].split('.').reduce((node, part) => node?.[part], locale)
  const placeholders = text => [...text.matchAll(/{{(\w+)}}/g)].map(m => m[1]).sort()

  it('every reason and every why, with the same placeholders in both languages', () => {
    for (const key of [...Object.values(RECOMMENDATION_REASON), ...Object.values(ALTERNATIVE_WHY)]) {
      expect(read(esRoutine, key), key).toEqual(expect.any(String))
      expect(placeholders(read(enRoutine, key)), key).toEqual(placeholders(read(esRoutine, key)))
    }
  })

  it('every reason names the template', () => {
    for (const key of Object.values(RECOMMENDATION_REASON))
      expect(placeholders(read(esRoutine, key)), key).toContain('template')
  })
})

describe('groupTemplateChoices', () => {
  it('the recommended one, its alternatives with their template, and the rest, each template once', () => {
    const answers = answersFor([HYPERTROPHY], 4, INTERMEDIATE)
    const { templateId } = recommendTemplate(answers)
    const { alternatives } = explainRecommendation(answers, { templateId, guidance: null })
    const groups = groupTemplateChoices(templateId, alternatives)

    expect(groups.recommended.id).toBe('upper-lower')
    expect(groups.alternatives.map(alt => [alt.template.id, alt.whyKey])).toEqual([
      ['ppl-3', ALTERNATIVE_WHY.FEWER_DAYS],
      ['full-body', ALTERNATIVE_WHY.GENERAL],
    ])
    const all = [groups.recommended, ...groups.alternatives.map(alt => alt.template), ...groups.others].map(tpl => tpl.id)
    expect(all.slice().sort()).toEqual(ROUTINE_TEMPLATES.map(tpl => tpl.id).sort())
  })

  it('keeps the catalog order in the rest', () => {
    const { others } = groupTemplateChoices('full-body', [])
    expect(others.map(tpl => tpl.id)).toEqual(ROUTINE_TEMPLATES.filter(tpl => tpl.id !== 'full-body').map(tpl => tpl.id))
  })
})
