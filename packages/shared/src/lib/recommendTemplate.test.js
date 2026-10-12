import { describe, it, expect } from 'vitest'
import { recommendTemplate, getTemplateDaysNote, TEMPLATE_DAYS_NOTE } from './recommendTemplate.js'
import { ROUTINE_TEMPLATES } from './routineTemplates.js'
import { GOAL_VALUES, LEVEL_VALUES, EQUIPMENT_VALUES } from './routineWizardOptions.js'

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

// A synthetic template: only the metadata recommendTemplate reads.
const fixture = (id, overrides = {}) => ({
  id, goal: GOAL_VALUES.GENERAL, daysPerWeek: 3, minDays: 1, level: 'beginner', equipment: 'full', ...overrides,
})

describe('recommendTemplate: contract', () => {
  it('returns the template id and the available days it leaves free', () => {
    expect(recommend(GOAL_VALUES.HYPERTROPHY, 6, INTERMEDIATE)).toEqual({ templateId: 'upper-lower', daysShortfall: 2 })
    expect(recommend(GOAL_VALUES.HYPERTROPHY, 4, INTERMEDIATE)).toEqual({ templateId: 'upper-lower', daysShortfall: 0 })
  })

  it('a template with more days than available rotates them: the shortfall stays at 0', () => {
    expect(recommend(GOAL_VALUES.GENERAL, 1, BEGINNER)).toEqual({ templateId: 'full-body-2', daysShortfall: 0 })
  })

  it('empty or garbage input still returns an existing template and no shortfall', () => {
    const inputs = [
      undefined,
      {},
      { diasPorSemana: 'abc' },
      { diasPorSemana: '0' },
      { diasPorSemana: '-3' },
      { diasPorSemana: '2.5' },
      { objetivos: GOAL_VALUES.STRENGTH },
      { objetivos: [''] },
      { nivelExperiencia: 'toString' },
      { equipamiento: '__proto__' },
    ]
    for (const input of inputs) {
      const { templateId, daysShortfall } = recommendTemplate(input)
      expect(TEMPLATES_BY_ID.has(templateId)).toBe(true)
      expect(daysShortfall).toBe(0)
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
    for (const goal of Object.values(GOAL_VALUES))
      for (const level of LEVELS)
        for (const days of DAYS) {
          const answers = { objetivos: [goal], diasPorSemana: days, nivelExperiencia: level }
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

  it('never exceeds the days, never goes above the level, always matches the equipment', () => {
    for (const equipment of [...Object.values(EQUIPMENT_VALUES), undefined])
      for (const goal of [...Object.values(GOAL_VALUES), undefined])
        for (const level of [...LEVELS, undefined])
          for (const days of DAYS) {
            const result = recommendTemplate({ objetivos: [goal], diasPorSemana: days, nivelExperiencia: level, equipamiento: equipment })
            const tpl = TEMPLATES_BY_ID.get(result.templateId)
            const label = `${equipment}/${goal}/${level}/${days}`
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
for (const goal of [GOAL_VALUES.GENERAL, GOAL_VALUES.FAT_LOSS, GOAL_VALUES.MAINTENANCE]) FULL_GYM_MATRIX[goal] = GENERAL_ROWS

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
          expect(recommend(goal, days, level, EQUIPMENT_VALUES.BODYWEIGHT)).toEqual({ templateId: 'home-bodyweight', daysShortfall: shortfall })
          expect(recommend(goal, days, level, EQUIPMENT_VALUES.DUMBBELL)).toEqual({ templateId: 'home-dumbbell', daysShortfall: shortfall })
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
      .toEqual({ templateId: 'split', daysShortfall: 0 })
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
    expect(recommendTemplate(answer({ diasPorSemana: 4 }), templates)).toEqual({ templateId: 'four', daysShortfall: 0 })
    expect(recommendTemplate(answer({ diasPorSemana: 3 }), templates)).toEqual({ templateId: 'two', daysShortfall: 1 })
    expect(recommendTemplate(answer({ diasPorSemana: 1 }), templates)).toEqual({ templateId: 'two', daysShortfall: 0 })
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
