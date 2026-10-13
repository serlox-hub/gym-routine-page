import { describe, it, expect } from 'vitest'
import { GOAL_OPTIONS, GOAL_VALUES, MAX_GOALS, toggleGoal } from './routineWizardOptions.js'

const { HYPERTROPHY, STRENGTH, FAT_LOSS, ENDURANCE, GENERAL } = GOAL_VALUES

describe('GOAL_OPTIONS', () => {
  it('offers every goal value once, and no maintenance (a synonym of general health)', () => {
    const offered = GOAL_OPTIONS.map(o => o.value)
    expect(new Set(offered).size).toBe(offered.length)
    expect(offered.sort()).toEqual(Object.values(GOAL_VALUES).sort())
    expect(offered).not.toContain('Mantenimiento')
  })

  it('keeps the endurance value the AI prompt and the templates read', () => {
    expect(ENDURANCE).toBe('Resistencia')
  })
})

describe('toggleGoal', () => {
  it('marks a goal', () => {
    expect(toggleGoal([], STRENGTH)).toEqual([STRENGTH])
  })

  it('unmarks a marked goal, and unmarking the last one leaves the selection empty', () => {
    expect(toggleGoal([HYPERTROPHY, STRENGTH], HYPERTROPHY)).toEqual([STRENGTH])
    expect(toggleGoal([STRENGTH], STRENGTH)).toEqual([])
  })

  it('keeps GOAL_OPTIONS order, whatever the order of the taps', () => {
    expect(toggleGoal([GENERAL], HYPERTROPHY)).toEqual([HYPERTROPHY, GENERAL])
    expect(toggleGoal([HYPERTROPHY], GENERAL)).toEqual([HYPERTROPHY, GENERAL])
  })

  it(`at ${MAX_GOALS} goals, marking another does nothing`, () => {
    expect(MAX_GOALS).toBe(2)
    expect(toggleGoal([HYPERTROPHY, FAT_LOSS], ENDURANCE)).toEqual([HYPERTROPHY, FAT_LOSS])
  })

  it('at the maximum, unmarking still works and frees a place', () => {
    const one = toggleGoal([HYPERTROPHY, FAT_LOSS], FAT_LOSS)
    expect(toggleGoal(one, ENDURANCE)).toEqual([HYPERTROPHY, ENDURANCE])
  })

  it('ignores values that are not offered, maintenance included', () => {
    expect(toggleGoal([STRENGTH], 'Mantenimiento')).toEqual([STRENGTH])
    expect(toggleGoal([], 'nope')).toEqual([])
    expect(toggleGoal([], undefined)).toEqual([])
  })

  it('cleans a dirty selection: no array, unknown values, duplicates, over the maximum', () => {
    expect(toggleGoal(null, STRENGTH)).toEqual([STRENGTH])
    expect(toggleGoal('Fuerza', HYPERTROPHY)).toEqual([HYPERTROPHY])
    expect(toggleGoal([STRENGTH, STRENGTH, 'nope'], GENERAL)).toEqual([STRENGTH, GENERAL])
    expect(toggleGoal([HYPERTROPHY, STRENGTH, FAT_LOSS], GENERAL)).toEqual([HYPERTROPHY, STRENGTH])
  })
})
