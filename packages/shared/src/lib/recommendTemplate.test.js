import { describe, it, expect } from 'vitest'
import { recommendTemplate } from './recommendTemplate.js'
import { ROUTINE_TEMPLATES } from './routineTemplates.js'
import { GOAL_VALUES, LEVEL_VALUES, EQUIPMENT_VALUES } from './routineWizardOptions.js'

const TEMPLATE_IDS = ROUTINE_TEMPLATES.map(t => t.id)

const beginner = LEVEL_VALUES.BEGINNER
const intermediate = LEVEL_VALUES.INTERMEDIATE
const advanced = LEVEL_VALUES.ADVANCED
const FULL = EQUIPMENT_VALUES.FULL

describe('recommendTemplate — equipo no-gimnasio', () => {
  it('peso corporal → home-bodyweight, ignorando objetivo/nivel/días', () => {
    for (const d of ['1', '3', '6']) {
      expect(recommendTemplate({ equipamiento: EQUIPMENT_VALUES.BODYWEIGHT, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: advanced, diasPorSemana: d })).toBe('home-bodyweight')
    }
  })

  it('mancuernas → home-dumbbell, ignorando objetivo/nivel/días', () => {
    for (const d of ['2', '4', '6']) {
      expect(recommendTemplate({ equipamiento: EQUIPMENT_VALUES.DUMBBELL, objetivo: GOAL_VALUES.STRENGTH, nivelExperiencia: beginner, diasPorSemana: d })).toBe('home-dumbbell')
    }
  })
})

describe('recommendTemplate — fuerza (gimnasio)', () => {
  it('principiante + fuerza → siempre 5x5 (nunca 531 ni alta frecuencia)', () => {
    for (const d of ['1', '3', '4', '6']) {
      expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.STRENGTH, nivelExperiencia: beginner, diasPorSemana: d })).toBe('strength-5x5')
    }
  })

  it('no principiante + fuerza → pool de fuerza por días (3→5x5, 4→531, 5+→alta frecuencia)', () => {
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.STRENGTH, nivelExperiencia: intermediate, diasPorSemana: '3' })).toBe('strength-5x5')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.STRENGTH, nivelExperiencia: intermediate, diasPorSemana: '4' })).toBe('531')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.STRENGTH, nivelExperiencia: advanced, diasPorSemana: '5' })).toBe('strength-hf')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.STRENGTH, nivelExperiencia: advanced, diasPorSemana: '6' })).toBe('strength-hf')
  })
})

describe('recommendTemplate — resistencia', () => {
  it('resistencia → endurance-circuit (cualquier nivel/días)', () => {
    for (const lvl of [beginner, intermediate, advanced])
      for (const d of ['2', '3', '5'])
        expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.ENDURANCE, nivelExperiencia: lvl, diasPorSemana: d })).toBe('endurance-circuit')
  })
})

describe('recommendTemplate — principiante (no fuerza/resistencia)', () => {
  it('≤2 días → full-body-2; ≥3 días → full-body (objetivo hipertrofia/general)', () => {
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: beginner, diasPorSemana: '1' })).toBe('full-body-2')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: beginner, diasPorSemana: '2' })).toBe('full-body-2')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.GENERAL, nivelExperiencia: beginner, diasPorSemana: '3' })).toBe('full-body')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: beginner, diasPorSemana: '6' })).toBe('full-body')
  })
})

describe('recommendTemplate — interm/avanz hipertrofia y otros objetivos', () => {
  it('hipertrofia por días: 3→ppl-3, 4→upper-lower, 5→weider-5, 6→ppl', () => {
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: intermediate, diasPorSemana: '3' })).toBe('ppl-3')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: intermediate, diasPorSemana: '4' })).toBe('upper-lower')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: advanced, diasPorSemana: '5' })).toBe('weider-5')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: advanced, diasPorSemana: '6' })).toBe('ppl')
  })

  it('7 días → ppl (más cercana); 2 días → ppl-3 (más cercana)', () => {
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: advanced, diasPorSemana: '7' })).toBe('ppl')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: intermediate, diasPorSemana: '2' })).toBe('ppl-3')
  })

  it('pérdida grasa / mantenimiento (no principiante) usan el pool de hipertrofia por días', () => {
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.FAT_LOSS, nivelExperiencia: intermediate, diasPorSemana: '4' })).toBe('upper-lower')
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.MAINTENANCE, nivelExperiencia: advanced, diasPorSemana: '6' })).toBe('ppl')
  })
})

describe('recommendTemplate — robustez', () => {
  it('sin señal de equipo, nunca recomienda plantillas de casa (peso corporal ni mancuernas)', () => {
    const home = new Set(['home-bodyweight', 'home-dumbbell'])
    for (const lvl of [beginner, intermediate, advanced])
      for (const g of Object.values(GOAL_VALUES))
        for (const d of ['1', '2', '3', '4', '5', '6', '7'])
          expect(home.has(recommendTemplate({ nivelExperiencia: lvl, objetivo: g, diasPorSemana: d }))).toBe(false)
  })

  it('entrada vacía o inválida devuelve un id válido', () => {
    expect(TEMPLATE_IDS).toContain(recommendTemplate())
    expect(TEMPLATE_IDS).toContain(recommendTemplate({}))
    expect(TEMPLATE_IDS).toContain(recommendTemplate({ diasPorSemana: 'abc' }))
  })

  it('acepta diasPorSemana como número', () => {
    expect(recommendTemplate({ equipamiento: FULL, objetivo: GOAL_VALUES.HYPERTROPHY, nivelExperiencia: advanced, diasPorSemana: 6 })).toBe('ppl')
  })

  it('siempre devuelve un id existente en ROUTINE_TEMPLATES', () => {
    for (const lvl of [beginner, intermediate, advanced, undefined])
      for (const g of [...Object.values(GOAL_VALUES), undefined])
        for (const eq of [FULL, EQUIPMENT_VALUES.DUMBBELL, EQUIPMENT_VALUES.BODYWEIGHT, undefined])
          for (const d of ['2', '4', '6', undefined])
            expect(TEMPLATE_IDS).toContain(recommendTemplate({ nivelExperiencia: lvl, objetivo: g, equipamiento: eq, diasPorSemana: d }))
  })
})
