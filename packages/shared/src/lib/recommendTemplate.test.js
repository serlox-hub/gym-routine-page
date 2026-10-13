import { describe, it, expect } from 'vitest'
import {
  recommendTemplate,
  getGoalGuidance,
  getGoalChips,
  formatGoalGuidance,
  GOAL_GUIDANCE,
  getTemplateDaysNote,
  TEMPLATE_DAYS_NOTE,
} from './recommendTemplate.js'
import { ROUTINE_TEMPLATES } from './routineTemplates.js'
import { GOAL_VALUES, GOAL_OPTIONS, MAX_GOALS, LEVEL_VALUES, EQUIPMENT_VALUES } from './routineWizardOptions.js'
import esRoutine from '../i18n/locales/es/routine.json'
import enRoutine from '../i18n/locales/en/routine.json'

const TEMPLATES_BY_ID = new Map(ROUTINE_TEMPLATES.map(tpl => [tpl.id, tpl]))
const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 }
const DECLARED_RANK = {
  [LEVEL_VALUES.BEGINNER]: 0,
  [LEVEL_VALUES.INTERMEDIATE]: 1,
  [LEVEL_VALUES.ADVANCED]: 2,
}
const TEMPLATE_EQUIPMENT = {
  [EQUIPMENT_VALUES.FULL]: 'full',
  [EQUIPMENT_VALUES.DUMBBELL]: 'dumbbell',
  [EQUIPMENT_VALUES.BODYWEIGHT]: 'bodyweight',
}

const { BEGINNER, INTERMEDIATE, ADVANCED } = LEVEL_VALUES
const LEVELS = [BEGINNER, INTERMEDIATE, ADVANCED]
const DAYS = [1, 2, 3, 4, 5, 6, 7]

const recommend = (goal, days, level, equipment = EQUIPMENT_VALUES.FULL) =>
  recommendTemplate({ objetivos: [goal], diasPorSemana: String(days), nivelExperiencia: level, equipamiento: equipment })

const GOALS = Object.values(GOAL_VALUES)
const GOAL_PAIRS = GOALS.flatMap((first, i) => GOALS.slice(i + 1).map(second => [first, second]))

// A synthetic template: only the metadata recommendTemplate reads.
const fixture = (id, overrides = {}) => ({
  id, goal: GOAL_VALUES.GENERAL, daysPerWeek: 3, minDays: 1, level: 'beginner', equipment: 'full', ...overrides,
})

describe('recommendTemplate: contract', () => {
  it('returns the template id, the available days it leaves free and the guidance', () => {
    expect(recommend(GOAL_VALUES.HYPERTROPHY, 6, INTERMEDIATE)).toEqual({ templateId: 'upper-lower', daysShortfall: 2, guidance: null })
    expect(recommend(GOAL_VALUES.HYPERTROPHY, 4, INTERMEDIATE)).toEqual({ templateId: 'upper-lower', daysShortfall: 0, guidance: null })
  })

  it('a template with more days than available rotates them: the shortfall stays at 0', () => {
    expect(recommend(GOAL_VALUES.GENERAL, 1, BEGINNER)).toEqual({ templateId: 'full-body-2', daysShortfall: 0, guidance: null })
  })

  it('empty or garbage input still returns an existing template, no shortfall and no guidance', () => {
    const inputs = [
      undefined,
      {},
      { diasPorSemana: 'abc' },
      { diasPorSemana: '0' },
      { diasPorSemana: '-3' },
      { diasPorSemana: '2.5' },
      { objetivos: GOAL_VALUES.STRENGTH },
      { objetivos: [''] },
      { objetivos: ['Mantenimiento', 'toString'] },
      { objetivos: null },
      { nivelExperiencia: 'toString' },
      { equipamiento: '__proto__' },
    ]
    for (const input of inputs) {
      const { templateId, daysShortfall, guidance } = recommendTemplate(input)
      expect(TEMPLATES_BY_ID.has(templateId)).toBe(true)
      expect(daysShortfall).toBe(0)
      expect(guidance).toBeNull()
    }
  })

  it('without answers, a full gym general health template', () => {
    expect(recommendTemplate().templateId).toBe('full-body')
  })

  it('takes the days as a number too', () => {
    expect(recommendTemplate({ objetivos: [GOAL_VALUES.HYPERTROPHY], diasPorSemana: 6, nivelExperiencia: ADVANCED }).templateId).toBe('ppl')
  })

  it('is deterministic: the order of the templates does not change the result', () => {
    const reversed = [...ROUTINE_TEMPLATES].reverse()
    for (const goals of [...GOALS.map(goal => [goal]), ...GOAL_PAIRS])
      for (const level of LEVELS)
        for (const days of DAYS) {
          const answers = { objetivos: goals, diasPorSemana: days, nivelExperiencia: level }
          expect(recommendTemplate(answers, reversed)).toEqual(recommendTemplate(answers))
        }
  })
})

describe('recommendTemplate: guarantees over every answer', () => {
  it('every equipment has a beginner template with minDays 1 (what guarantees a result)', () => {
    for (const equipment of new Set(ROUTINE_TEMPLATES.map(tpl => tpl.equipment))) {
      const fallback = ROUTINE_TEMPLATES.find(tpl => tpl.equipment === equipment && tpl.level === 'beginner' && tpl.minDays === 1)
      expect(fallback, equipment).toBeTruthy()
    }
  })

  it('with one goal, two or none: never exceeds the days, never goes above the level, always matches the equipment', () => {
    for (const equipment of [...Object.values(EQUIPMENT_VALUES), undefined])
      for (const goals of [[], ...GOALS.map(goal => [goal]), ...GOAL_PAIRS])
        for (const level of [...LEVELS, undefined])
          for (const days of DAYS) {
            const result = recommendTemplate({ objetivos: goals, diasPorSemana: days, nivelExperiencia: level, equipamiento: equipment })
            const tpl = TEMPLATES_BY_ID.get(result.templateId)
            const label = `${equipment}/${goals}/${level}/${days}`
            expect(tpl, label).toBeTruthy()
            expect(tpl.minDays, label).toBeLessThanOrEqual(days)
            expect(LEVEL_RANK[tpl.level], label).toBeLessThanOrEqual(level === undefined ? 2 : DECLARED_RANK[level])
            expect(tpl.equipment, label).toBe(equipment === undefined ? 'full' : TEMPLATE_EQUIPMENT[equipment])
            expect(result.daysShortfall, label).toBe(Math.max(0, days - tpl.daysPerWeek))
          }
  })

  it('a beginner never gets an advanced template', () => {
    for (const equipment of Object.values(EQUIPMENT_VALUES))
      for (const goal of Object.values(GOAL_VALUES))
        for (const days of DAYS)
          expect(TEMPLATES_BY_ID.get(recommend(goal, days, BEGINNER, equipment).templateId).level).not.toBe('advanced')
  })

  it('without an equipment answer, never a home template', () => {
    const home = new Set(['home-bodyweight', 'home-dumbbell'])
    for (const goal of Object.values(GOAL_VALUES))
      for (const level of LEVELS)
        for (const days of DAYS)
          expect(home.has(recommendTemplate({ objetivos: [goal], diasPorSemana: days, nivelExperiencia: level }).templateId)).toBe(false)
  })
})

// Expected template per days (1..7) for [beginner, intermediate, advanced], full gym.
const FULL_GYM_MATRIX = {
  [GOAL_VALUES.HYPERTROPHY]: [
    ['full-body-2', 'full-body-2', 'full-body-2'],
    ['full-body-2', 'full-body-2', 'full-body-2'],
    ['full-body', 'ppl-3', 'ppl-3'],
    ['full-body', 'upper-lower', 'upper-lower'],
    ['full-body', 'upper-lower', 'weider-5'],
    ['full-body', 'upper-lower', 'ppl'],
    ['full-body', 'upper-lower', 'ppl'],
  ],
  [GOAL_VALUES.STRENGTH]: [
    ['full-body-2', 'full-body-2', 'full-body-2'],
    ['strength-5x5', 'strength-5x5', 'strength-5x5'],
    ['strength-5x5', 'strength-5x5', 'strength-5x5'],
    ['strength-5x5', '531', '531'],
    ['strength-5x5', '531', 'strength-hf'],
    ['strength-5x5', '531', 'strength-hf'],
    ['strength-5x5', '531', 'strength-hf'],
  ],
  [GOAL_VALUES.ENDURANCE]: [
    ['full-body-2', 'full-body-2', 'full-body-2'],
    ...Array(6).fill(['endurance-circuit', 'endurance-circuit', 'endurance-circuit']),
  ],
}
// Goals without templates of their own fall back to general health.
const GENERAL_ROWS = [
  ...Array(2).fill(['full-body-2', 'full-body-2', 'full-body-2']),
  ...Array(5).fill(['full-body', 'full-body', 'full-body']),
]
for (const goal of [GOAL_VALUES.GENERAL, GOAL_VALUES.FAT_LOSS]) FULL_GYM_MATRIX[goal] = GENERAL_ROWS

describe('recommendTemplate: days × goal × level (full gym)', () => {
  for (const [goal, rows] of Object.entries(FULL_GYM_MATRIX)) {
    it(goal, () => {
      rows.forEach((expectedByLevel, dayIndex) => {
        LEVELS.forEach((level, levelIndex) => {
          expect(recommend(goal, dayIndex + 1, level).templateId, `${dayIndex + 1} days, ${level}`).toBe(expectedByLevel[levelIndex])
        })
      })
    })
  }

  // Only these two goals have templates above beginner: the others fall back to general health.
  it('with hypertrophy or strength, intermediate and advanced differ from 5 days on', () => {
    for (const goal of [GOAL_VALUES.HYPERTROPHY, GOAL_VALUES.STRENGTH])
      for (const days of [5, 6, 7])
        expect(recommend(goal, days, INTERMEDIATE).templateId).not.toBe(recommend(goal, days, ADVANCED).templateId)
  })

  it('a split never goes to someone with fewer days than it needs', () => {
    expect(recommend(GOAL_VALUES.HYPERTROPHY, 3, ADVANCED).templateId).toBe('ppl-3')
    expect(recommend(GOAL_VALUES.STRENGTH, 3, ADVANCED).templateId).toBe('strength-5x5')
  })
})

describe('recommendTemplate: home equipment (real catalog)', () => {
  it('each home equipment gets its own template, with the spare days as shortfall', () => {
    for (const goal of Object.values(GOAL_VALUES))
      for (const level of LEVELS)
        for (const days of DAYS) {
          const shortfall = Math.max(0, days - 3)
          expect(recommend(goal, days, level, EQUIPMENT_VALUES.BODYWEIGHT)).toMatchObject({ templateId: 'home-bodyweight', daysShortfall: shortfall })
          expect(recommend(goal, days, level, EQUIPMENT_VALUES.DUMBBELL)).toMatchObject({ templateId: 'home-dumbbell', daysShortfall: shortfall })
        }
  })
})

describe('recommendTemplate: the funnel (synthetic templates)', () => {
  const answer = (overrides) => ({
    objetivos: [GOAL_VALUES.GENERAL], diasPorSemana: 7, nivelExperiencia: ADVANCED, equipamiento: EQUIPMENT_VALUES.FULL, ...overrides,
  })

  it('equipment narrows the pool, and goal and level still decide inside it', () => {
    const templates = [
      fixture('bw-general', { equipment: 'bodyweight' }),
      fixture('bw-strength', { equipment: 'bodyweight', goal: GOAL_VALUES.STRENGTH, level: 'intermediate' }),
      fixture('gym-strength', { goal: GOAL_VALUES.STRENGTH, level: 'intermediate' }),
    ]
    const bodyweight = { equipamiento: EQUIPMENT_VALUES.BODYWEIGHT, objetivos: [GOAL_VALUES.STRENGTH] }
    expect(recommendTemplate(answer({ ...bodyweight, nivelExperiencia: INTERMEDIATE }), templates).templateId).toBe('bw-strength')
    expect(recommendTemplate(answer({ ...bodyweight, nivelExperiencia: BEGINNER }), templates).templateId).toBe('bw-general')
    expect(recommendTemplate(answer({ ...bodyweight, objetivos: [GOAL_VALUES.GENERAL] }), templates).templateId).toBe('bw-general')
  })

  it('days are a hard filter on minDays', () => {
    const templates = [fixture('general'), fixture('split', { goal: GOAL_VALUES.HYPERTROPHY, daysPerWeek: 4, minDays: 4 })]
    expect(recommendTemplate(answer({ objetivos: [GOAL_VALUES.HYPERTROPHY], diasPorSemana: 3 }), templates).templateId).toBe('general')
    expect(recommendTemplate(answer({ objetivos: [GOAL_VALUES.HYPERTROPHY], diasPorSemana: 4 }), templates).templateId).toBe('split')
  })

  it('without a days answer there is no day filter', () => {
    const templates = [fixture('general'), fixture('split', { goal: GOAL_VALUES.HYPERTROPHY, daysPerWeek: 6, minDays: 6 })]
    expect(recommendTemplate(answer({ objetivos: [GOAL_VALUES.HYPERTROPHY], diasPorSemana: undefined }), templates))
      .toEqual({ templateId: 'split', daysShortfall: 0, guidance: null })
  })

  it('level is a ceiling, and without a level answer there is none', () => {
    const templates = [fixture('easy'), fixture('hard', { goal: GOAL_VALUES.STRENGTH, level: 'advanced' })]
    const strength = { objetivos: [GOAL_VALUES.STRENGTH] }
    expect(recommendTemplate(answer({ ...strength, nivelExperiencia: INTERMEDIATE }), templates).templateId).toBe('easy')
    expect(recommendTemplate(answer({ ...strength, nivelExperiencia: ADVANCED }), templates).templateId).toBe('hard')
    expect(recommendTemplate(answer({ ...strength, nivelExperiencia: undefined }), templates).templateId).toBe('hard')
  })

  it('a goal with no template falls back to general health, and without one to the whole pool', () => {
    const withGeneral = [fixture('general'), fixture('strength', { goal: GOAL_VALUES.STRENGTH, daysPerWeek: 5 })]
    expect(recommendTemplate(answer({ objetivos: [GOAL_VALUES.ENDURANCE] }), withGeneral).templateId).toBe('general')

    const withoutGeneral = [fixture('strength', { goal: GOAL_VALUES.STRENGTH }), fixture('hypertrophy', { goal: GOAL_VALUES.HYPERTROPHY, daysPerWeek: 5 })]
    expect(recommendTemplate(answer({ objetivos: [GOAL_VALUES.ENDURANCE] }), withoutGeneral).templateId).toBe('hypertrophy')
  })

  it('order: the most days that fit, or the fewest when none fits', () => {
    const templates = [
      fixture('two', { daysPerWeek: 2 }),
      fixture('four', { daysPerWeek: 4 }),
      fixture('five', { daysPerWeek: 5 }),
    ]
    expect(recommendTemplate(answer({ diasPorSemana: 4 }), templates)).toMatchObject({ templateId: 'four', daysShortfall: 0 })
    expect(recommendTemplate(answer({ diasPorSemana: 3 }), templates)).toMatchObject({ templateId: 'two', daysShortfall: 1 })
    expect(recommendTemplate(answer({ diasPorSemana: 1 }), templates)).toMatchObject({ templateId: 'two', daysShortfall: 0 })
  })

  it('order: same days, the level closest to the declared one, then id', () => {
    // The beginner one goes first by id, so only the level rule puts an intermediate one ahead.
    const templates = [
      fixture('a-beginner'),
      fixture('c-intermediate', { level: 'intermediate' }),
      fixture('b-intermediate', { level: 'intermediate' }),
    ]
    expect(recommendTemplate(answer({ nivelExperiencia: INTERMEDIATE }), templates).templateId).toBe('b-intermediate')
    expect(recommendTemplate(answer({ nivelExperiencia: ADVANCED }), templates).templateId).toBe('b-intermediate')
    expect(recommendTemplate(answer({ nivelExperiencia: BEGINNER }), templates).templateId).toBe('a-beginner')
  })
})

describe('recommendTemplate: two goals', () => {
  const { STRENGTH, ENDURANCE, HYPERTROPHY, GENERAL, FAT_LOSS } = GOAL_VALUES
  const both = (goals, days, level, equipment = EQUIPMENT_VALUES.FULL) =>
    recommendTemplate({ objetivos: goals, diasPorSemana: days, nivelExperiencia: level, equipamiento: equipment })

  it('with candidates for both, the most specific goal wins: strength, endurance, hypertrophy, general', () => {
    const specificity = [STRENGTH, ENDURANCE, HYPERTROPHY, GENERAL]
    const templates = specificity.map(goal => fixture(goal, { goal }))
    for (const [i, first] of specificity.entries())
      for (const second of specificity.slice(i + 1)) {
        expect(recommendTemplate({ objetivos: [first, second] }, templates).templateId, `${first}+${second}`).toBe(first)
        expect(recommendTemplate({ objetivos: [second, first] }, templates).templateId, `${second}+${first}`).toBe(first)
      }
  })

  it('on the real catalog: strength over hypertrophy, endurance over hypertrophy, hypertrophy over general', () => {
    expect(both([HYPERTROPHY, STRENGTH], 4, INTERMEDIATE).templateId).toBe('531')
    expect(both([HYPERTROPHY, ENDURANCE], 3, INTERMEDIATE).templateId).toBe('endurance-circuit')
    expect(both([GENERAL, HYPERTROPHY], 3, INTERMEDIATE).templateId).toBe('ppl-3')
    expect(both([STRENGTH, ENDURANCE], 3, BEGINNER).templateId).toBe('strength-5x5')
  })

  it('when only one of the two has candidates, that one decides and there is no guidance', () => {
    // Hypertrophy has no beginner template, endurance does.
    expect(both([HYPERTROPHY, ENDURANCE], 3, BEGINNER)).toEqual({ templateId: 'endurance-circuit', daysShortfall: 0, guidance: null })
    // Fat loss has no template of its own: the second goal is what the user gets.
    expect(both([FAT_LOSS, HYPERTROPHY], 4, INTERMEDIATE)).toEqual({ templateId: 'upper-lower', daysShortfall: 0, guidance: null })
    // Strength needs 2 days: with 1, general health was also asked for, so it is not a fallback.
    expect(both([STRENGTH, GENERAL], 1, ADVANCED)).toEqual({ templateId: 'full-body-2', daysShortfall: 0, guidance: null })
  })

  it('the second goal does not change the template, only which one is chosen', () => {
    for (const [first, second] of GOAL_PAIRS)
      for (const level of LEVELS)
        for (const days of DAYS) {
          const { templateId } = both([first, second], days, level)
          const alone = [both([first], days, level).templateId, both([second], days, level).templateId]
          expect(alone, `${first}+${second}/${level}/${days}`).toContain(templateId)
        }
  })

  it('a repeated goal counts once', () => {
    expect(both([STRENGTH, STRENGTH], 4, INTERMEDIATE)).toEqual(both([STRENGTH], 4, INTERMEDIATE))
  })
})

describe('recommendTemplate: guidance', () => {
  const { STRENGTH, ENDURANCE, HYPERTROPHY, GENERAL, FAT_LOSS } = GOAL_VALUES

  it('null when a requested goal has a template, or when no goal was requested', () => {
    expect(recommend(HYPERTROPHY, 4, INTERMEDIATE).guidance).toBeNull()
    expect(recommendTemplate({ diasPorSemana: 3 }).guidance).toBeNull()
    expect(recommendTemplate({ objetivos: [], diasPorSemana: 3 }).guidance).toBeNull()
  })

  it('NO_TEMPLATE: the goal has no template at all (fat loss)', () => {
    expect(recommend(FAT_LOSS, 3, ADVANCED)).toEqual({
      templateId: 'full-body', daysShortfall: 0,
      guidance: { reasonKey: GOAL_GUIDANCE.NO_TEMPLATE, params: { goal: FAT_LOSS } },
    })
  })

  it('EQUIPMENT: the goal has templates, none for the declared equipment', () => {
    expect(recommend(HYPERTROPHY, 4, ADVANCED, EQUIPMENT_VALUES.DUMBBELL)).toEqual({
      templateId: 'home-dumbbell', daysShortfall: 1,
      guidance: { reasonKey: GOAL_GUIDANCE.EQUIPMENT, params: { goal: HYPERTROPHY } },
    })
  })

  it('LEVEL before DAYS: a beginner gets no hypertrophy template with any number of days', () => {
    for (const days of DAYS)
      expect(recommend(HYPERTROPHY, days, BEGINNER).guidance, String(days))
        .toEqual({ reasonKey: GOAL_GUIDANCE.LEVEL, params: { goal: HYPERTROPHY } })
  })

  it('DAYS: hypertrophy under 3 days falls back to full body, and says how many it needs', () => {
    expect(recommend(HYPERTROPHY, 2, INTERMEDIATE)).toEqual({
      templateId: 'full-body-2', daysShortfall: 0,
      guidance: { reasonKey: GOAL_GUIDANCE.DAYS, params: { goal: HYPERTROPHY, minDays: 3, days: 2 } },
    })
  })

  it('DAYS: the minimum is the lowest among the templates of the goal at the declared level', () => {
    const templates = [
      fixture('general'),
      fixture('strength-4', { goal: STRENGTH, daysPerWeek: 4, minDays: 4, level: 'intermediate' }),
      fixture('strength-3', { goal: STRENGTH, daysPerWeek: 3, minDays: 3, level: 'intermediate' }),
      fixture('strength-2-advanced', { goal: STRENGTH, daysPerWeek: 3, minDays: 2, level: 'advanced' }),
    ]
    const answers = { objetivos: [STRENGTH], diasPorSemana: 1, nivelExperiencia: INTERMEDIATE }
    expect(recommendTemplate(answers, templates).guidance)
      .toEqual({ reasonKey: GOAL_GUIDANCE.DAYS, params: { goal: STRENGTH, minDays: 3, days: 1 } })
  })

  it('with two goals and no template for either, it explains the most specific one', () => {
    const expected = { reasonKey: GOAL_GUIDANCE.DAYS, params: { goal: HYPERTROPHY, minDays: 3, days: 2 } }
    expect(recommendTemplate({ objetivos: [FAT_LOSS, HYPERTROPHY], diasPorSemana: 2, nivelExperiencia: INTERMEDIATE }).guidance).toEqual(expected)
    expect(recommendTemplate({ objetivos: [HYPERTROPHY, FAT_LOSS], diasPorSemana: 2, nivelExperiencia: INTERMEDIATE }).guidance).toEqual(expected)
    expect(recommendTemplate({ objetivos: [ENDURANCE, STRENGTH], diasPorSemana: 1 }).guidance.params.goal).toBe(STRENGTH)
  })

  it('over every answer: guidance exactly when the template is not of the requested goal', () => {
    for (const equipment of Object.values(EQUIPMENT_VALUES))
      for (const goal of GOALS)
        for (const level of LEVELS)
          for (const days of DAYS) {
            const { templateId, guidance } = recommend(goal, days, level, equipment)
            const label = `${equipment}/${goal}/${level}/${days}`
            expect(guidance === null, label).toBe(TEMPLATES_BY_ID.get(templateId).goal === goal)
            if (guidance) expect(guidance.params.goal, label).toBe(goal)
          }
  })

  it('over every answer: the advice is true (DAYS minDays gives a template of the goal, LEVEL no number of days does)', () => {
    for (const equipment of Object.values(EQUIPMENT_VALUES))
      for (const goal of GOALS)
        for (const level of LEVELS)
          for (const days of DAYS) {
            const { guidance } = recommend(goal, days, level, equipment)
            const label = `${equipment}/${goal}/${level}/${days}`
            if (guidance?.reasonKey === GOAL_GUIDANCE.DAYS) {
              expect(guidance.params.minDays, label).toBeGreaterThan(days)
              expect(recommend(goal, guidance.params.minDays, level, equipment).guidance, label).toBeNull()
            }
            if (guidance?.reasonKey === GOAL_GUIDANCE.LEVEL)
              for (const otherDays of DAYS)
                expect(recommend(goal, otherDays, level, equipment).guidance?.reasonKey, `${label} → ${otherDays}`).toBe(GOAL_GUIDANCE.LEVEL)
          }
  })

  it('general health never needs guidance: every equipment has a template for it', () => {
    for (const equipment of Object.values(EQUIPMENT_VALUES))
      for (const level of LEVELS)
        for (const days of DAYS)
          expect(recommend(GENERAL, days, level, equipment).guidance).toBeNull()
  })
})

describe('getGoalGuidance', () => {
  const { HYPERTROPHY, STRENGTH, GENERAL } = GOAL_VALUES
  const answers = { diasPorSemana: '2', nivelExperiencia: INTERMEDIATE, equipamiento: EQUIPMENT_VALUES.FULL }

  it('is the guidance of the goal marked alone', () => {
    for (const goal of GOALS)
      expect(getGoalGuidance(goal, answers), goal).toEqual(recommendTemplate({ ...answers, objetivos: [goal] }).guidance)
  })

  it('ignores the goals already marked', () => {
    // Strength has a 2-day template: marked with it, hypertrophy would not fall back, alone it does.
    expect(getGoalGuidance(HYPERTROPHY, { ...answers, objetivos: [STRENGTH] }))
      .toEqual({ reasonKey: GOAL_GUIDANCE.DAYS, params: { goal: HYPERTROPHY, minDays: 3, days: 2 } })
    expect(getGoalGuidance(GENERAL, { ...answers, objetivos: [HYPERTROPHY] })).toBeNull()
  })

  it('without the other answers, only a goal with no template at all falls back', () => {
    for (const goal of GOALS)
      expect(getGoalGuidance(goal, {})?.reasonKey ?? null, goal)
        .toBe(goal === GOAL_VALUES.FAT_LOSS ? GOAL_GUIDANCE.NO_TEMPLATE : null)
  })
})

describe('getGoalChips', () => {
  const { HYPERTROPHY, STRENGTH, FAT_LOSS, ENDURANCE, GENERAL } = GOAL_VALUES
  // At 2 days: hypertrophy needs 3 (guidance DAYS), fat loss has no template (NO_TEMPLATE).
  const answers = { diasPorSemana: '2', nivelExperiencia: INTERMEDIATE, equipamiento: EQUIPMENT_VALUES.FULL }
  const chipOf = (chips, goal) => chips.find(chip => chip.value === goal)

  it('one chip per offered goal, in GOAL_OPTIONS order, with its label key', () => {
    const chips = getGoalChips(answers)
    expect(chips.map(chip => chip.value)).toEqual(GOAL_OPTIONS.map(o => o.value))
    expect(chips.map(chip => chip.labelKey)).toEqual(GOAL_OPTIONS.map(o => o.labelKey))
  })

  it('with nothing marked, none is selected or blocked, and only a goal with guidance is dimmed', () => {
    const chips = getGoalChips(answers)
    expect(chips.every(chip => !chip.isSelected && !chip.isBlocked)).toBe(true)
    expect(chips.filter(chip => chip.isDimmed).map(chip => chip.value)).toEqual([HYPERTROPHY, FAT_LOSS])
    expect(chipOf(chips, STRENGTH)).toMatchObject({ isDimmed: false, guidance: null })
    expect(chipOf(chips, GENERAL)).toMatchObject({ isDimmed: false, guidance: null })
  })

  it('a dimmed chip by guidance is still pressable (not blocked) and carries the reason', () => {
    const chips = getGoalChips(answers)
    expect(chipOf(chips, HYPERTROPHY)).toMatchObject({
      isBlocked: false, isDimmed: true,
      guidance: { reasonKey: GOAL_GUIDANCE.DAYS, params: { goal: HYPERTROPHY, minDays: 3, days: 2 } },
    })
    expect(chipOf(chips, FAT_LOSS)).toMatchObject({
      isBlocked: false, isDimmed: true,
      guidance: { reasonKey: GOAL_GUIDANCE.NO_TEMPLATE, params: { goal: FAT_LOSS } },
    })
  })

  it('a marked chip is never dimmed or blocked, even with guidance, and keeps the guidance (the note needs it)', () => {
    const chip = chipOf(getGoalChips({ ...answers, objetivos: [FAT_LOSS] }), FAT_LOSS)
    expect(chip).toMatchObject({ isSelected: true, isBlocked: false, isDimmed: false })
    expect(chip.guidance.reasonKey).toBe(GOAL_GUIDANCE.NO_TEMPLATE)
  })

  it(`at ${MAX_GOALS} goals the unmarked chips are blocked and dimmed, the marked ones are not`, () => {
    const chips = getGoalChips({ ...answers, objetivos: [STRENGTH, GENERAL] })
    for (const chip of chips) {
      const marked = chip.value === STRENGTH || chip.value === GENERAL
      expect(chip, chip.value).toMatchObject({ isSelected: marked, isBlocked: !marked, isDimmed: !marked })
    }
  })

  it(`below ${MAX_GOALS} goals nothing is blocked`, () => {
    expect(getGoalChips({ ...answers, objetivos: [STRENGTH] }).some(chip => chip.isBlocked)).toBe(false)
    expect(getGoalChips({ ...answers, objetivos: [] }).some(chip => chip.isBlocked)).toBe(false)
  })

  it('a blocked chip with no guidance of its own is dimmed all the same', () => {
    const chip = chipOf(getGoalChips({ ...answers, objetivos: [STRENGTH, GENERAL] }), ENDURANCE)
    expect(chip).toMatchObject({ isBlocked: true, isDimmed: true, guidance: null })
  })

  it('the guidance of a chip is that of its goal alone: what is marked does not change it', () => {
    const marked = chipOf(getGoalChips({ ...answers, objetivos: [STRENGTH] }), HYPERTROPHY)
    expect(marked.guidance).toEqual(getGoalGuidance(HYPERTROPHY, answers))
    expect(marked.guidance.reasonKey).toBe(GOAL_GUIDANCE.DAYS)
  })

  it('without arguments or with a garbage selection, nothing is marked or blocked and it does not throw', () => {
    for (const input of [undefined, {}, { objetivos: null }, { objetivos: 'Fuerza' }, { objetivos: undefined }]) {
      const chips = getGoalChips(input)
      expect(chips, JSON.stringify(input)).toHaveLength(GOAL_OPTIONS.length)
      expect(chips.every(chip => !chip.isSelected && !chip.isBlocked), JSON.stringify(input)).toBe(true)
    }
  })

  it('judges the goals against the templates it is given', () => {
    const onlyGeneral = [fixture('general')]
    const chips = getGoalChips({}, onlyGeneral)
    expect(chipOf(chips, GENERAL).guidance).toBeNull()
    for (const goal of GOALS.filter(goal => goal !== GENERAL))
      expect(chipOf(chips, goal), goal).toMatchObject({ isDimmed: true, guidance: { reasonKey: GOAL_GUIDANCE.NO_TEMPLATE } })

    const withStrength = [...onlyGeneral, fixture('strength', { goal: STRENGTH })]
    expect(chipOf(getGoalChips({}, withStrength), STRENGTH)).toMatchObject({ isDimmed: false, guidance: null })
  })
})

describe('formatGoalGuidance', () => {
  const fakeT = (key, params) => (params ? `${key}${JSON.stringify(params)}` : key)

  it('translates the goal into its label and the template into its name, and keeps the rest', () => {
    const guidance = { reasonKey: GOAL_GUIDANCE.DAYS, params: { goal: GOAL_VALUES.ENDURANCE, minDays: 2, days: 1 } }
    const text = formatGoalGuidance(guidance, TEMPLATES_BY_ID.get('full-body-2'), fakeT)
    expect(text).toBe(`${GOAL_GUIDANCE.DAYS}${JSON.stringify({
      goal: 'routine:chatbot.goals.endurance',
      minDays: 2,
      days: 1,
      template: 'routine:templates.items.full-body-2.name',
    })}`)
  })

  it('an unknown goal goes through as it is', () => {
    const guidance = { reasonKey: GOAL_GUIDANCE.NO_TEMPLATE, params: { goal: 'Mantenimiento' } }
    expect(formatGoalGuidance(guidance, TEMPLATES_BY_ID.get('full-body'), fakeT)).toContain('"goal":"Mantenimiento"')
  })

  it('every reason has its sentence in es and en, with the same placeholders', () => {
    for (const reasonKey of Object.values(GOAL_GUIDANCE)) {
      const [, path] = reasonKey.split(':')
      const read = locale => path.split('.').reduce((node, key) => node?.[key], locale)
      const placeholders = text => [...text.matchAll(/{{(\w+)}}/g)].map(m => m[1]).sort()
      expect(read(esRoutine), reasonKey).toEqual(expect.any(String))
      expect(placeholders(read(enRoutine)), reasonKey).toEqual(placeholders(read(esRoutine)))
      expect(placeholders(read(esRoutine)), reasonKey).toContain('template')
    }
  })
})

describe('getTemplateDaysNote', () => {
  const { SPARE, ROTATES, TOO_FEW } = TEMPLATE_DAYS_NOTE
  // A 4-day split that needs all 4.
  const split = fixture('split', { daysPerWeek: 4, minDays: 4 })
  // A 3-day template that still works with 2 days.
  const flexible = fixture('flexible', { daysPerWeek: 3, minDays: 2 })

  it('exposes three different note values', () => {
    expect(new Set(Object.values(TEMPLATE_DAYS_NOTE)).size).toBe(3)
  })

  it('has nothing to say when the template matches the days exactly', () => {
    expect(getTemplateDaysNote(split, 4)).toBeNull()
    expect(getTemplateDaysNote(flexible, 3)).toBeNull()
  })

  it('SPARE: the user has more days than the template uses', () => {
    expect(getTemplateDaysNote(split, 5)).toBe(SPARE)
    expect(getTemplateDaysNote(flexible, 7)).toBe(SPARE)
  })

  it('ROTATES: fewer days than the template has, but at least its minimum', () => {
    expect(getTemplateDaysNote(flexible, 2)).toBe(ROTATES)
    expect(getTemplateDaysNote(fixture('one-day-ok', { daysPerWeek: 3, minDays: 1 }), 1)).toBe(ROTATES)
  })

  it('TOO_FEW: fewer days than the template needs at least', () => {
    expect(getTemplateDaysNote(split, 3)).toBe(TOO_FEW)
    expect(getTemplateDaysNote(split, 1)).toBe(TOO_FEW)
    expect(getTemplateDaysNote(flexible, 1)).toBe(TOO_FEW)
  })

  it('minDays is inclusive: with exactly minDays it is no longer TOO_FEW', () => {
    expect(getTemplateDaysNote(flexible, 2)).not.toBe(TOO_FEW)
    expect(getTemplateDaysNote(flexible, 1)).toBe(TOO_FEW)
  })

  it('takes the days as a string or as a number', () => {
    expect(getTemplateDaysNote(split, '6')).toBe(SPARE)
    expect(getTemplateDaysNote(split, 6)).toBe(SPARE)
    expect(getTemplateDaysNote(split, '2')).toBe(TOO_FEW)
  })

  it('without a usable days answer or without a template, null', () => {
    for (const days of [undefined, null, '', 'abc', 0, '0', -2, 2.5, NaN])
      expect(getTemplateDaysNote(split, days), String(days)).toBeNull()
    expect(getTemplateDaysNote(undefined, 4)).toBeNull()
    expect(getTemplateDaysNote(null, 4)).toBeNull()
  })

  it('a recommendation is never TOO_FEW, and is SPARE exactly when daysShortfall > 0', () => {
    for (const equipment of Object.values(EQUIPMENT_VALUES))
      for (const goal of Object.values(GOAL_VALUES))
        for (const level of LEVELS)
          for (const days of DAYS) {
            const { templateId, daysShortfall } = recommend(goal, days, level, equipment)
            const note = getTemplateDaysNote(TEMPLATES_BY_ID.get(templateId), days)
            const label = `${equipment}/${goal}/${level}/${days}`
            expect(note, label).not.toBe(TOO_FEW)
            expect(note === SPARE, label).toBe(daysShortfall > 0)
          }
  })

  it('every real template gets TOO_FEW with one day fewer than its minimum, and none at its minimum', () => {
    for (const tpl of ROUTINE_TEMPLATES) {
      if (tpl.minDays > 1) expect(getTemplateDaysNote(tpl, tpl.minDays - 1), tpl.id).toBe(TOO_FEW)
      expect(getTemplateDaysNote(tpl, tpl.minDays), tpl.id).not.toBe(TOO_FEW)
    }
  })
})
