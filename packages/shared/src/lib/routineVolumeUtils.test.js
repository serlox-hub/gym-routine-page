import { describe, it, expect } from 'vitest'
import { countSetsByMuscleGroup, normalizeToWeekly, buildVolumeSummary } from './routineVolumeUtils.js'

const makeExercise = (muscleGroup, series) => ({
  series,
  exercise: { muscle_group: { name: muscleGroup } },
})

const makeBlock = (exercises) => ({
  routine_exercises: exercises,
})

describe('countSetsByMuscleGroup', () => {
  it('suma series por grupo muscular de todos los dias', () => {
    const day1Blocks = [makeBlock([makeExercise('Pecho', 4), makeExercise('Pecho', 3)])]
    const day2Blocks = [makeBlock([makeExercise('Espalda', 4), makeExercise('Pecho', 3)])]

    const result = countSetsByMuscleGroup([day1Blocks, day2Blocks])
    expect(result['Pecho']).toBe(10)
    expect(result['Espalda']).toBe(4)
  })

  it('ignora Cardio y Movilidad', () => {
    const blocks = [makeBlock([makeExercise('Cardio', 3), makeExercise('Movilidad', 2)])]
    const result = countSetsByMuscleGroup([blocks])
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('maneja arrays vacios', () => {
    expect(countSetsByMuscleGroup([])).toEqual({})
    expect(countSetsByMuscleGroup([[], null])).toEqual({})
  })

  it('maneja ejercicios sin grupo muscular', () => {
    const blocks = [makeBlock([{ series: 3, exercise: {} }])]
    const result = countSetsByMuscleGroup([blocks])
    expect(Object.keys(result)).toHaveLength(0)
  })
})

describe('normalizeToWeekly', () => {
  it('no modifica si ciclo es 7 dias', () => {
    const sets = { Pecho: 10, Espalda: 12 }
    expect(normalizeToWeekly(sets, 7)).toEqual(sets)
  })

  it('normaliza ciclo de 14 dias', () => {
    const sets = { Pecho: 20 }
    const result = normalizeToWeekly(sets, 14)
    expect(result['Pecho']).toBe(10)
  })

  it('normaliza ciclo de 9 dias', () => {
    const sets = { Pecho: 18 }
    const result = normalizeToWeekly(sets, 9)
    expect(result['Pecho']).toBe(14)
  })

  it('maneja ciclo de 0 dias sin romper', () => {
    const sets = { Pecho: 10 }
    expect(normalizeToWeekly(sets, 0)).toEqual(sets)
  })
})

describe('buildVolumeSummary', () => {
  it('genera resumen ordenado por series descendente', () => {
    const weeklySets = { Pecho: 16, Espalda: 20, Bíceps: 8 }
    const summary = buildVolumeSummary(weeklySets)

    expect(summary[0].name).toBe('Espalda')
    expect(summary[0].sets).toBe(20)
    expect(summary[1].name).toBe('Pecho')
    expect(summary[2].name).toBe('Bíceps')
  })

  it('asigna zona correcta segun rangos', () => {
    const weeklySets = { Pecho: 3, Espalda: 16, Bíceps: 27 }
    const summary = buildVolumeSummary(weeklySets)

    const pecho = summary.find(s => s.name === 'Pecho')
    const espalda = summary.find(s => s.name === 'Espalda')
    const biceps = summary.find(s => s.name === 'Bíceps')

    expect(pecho.zone).toBe('below_mv')
    expect(espalda.zone).toBe('mev_mav')
    expect(biceps.zone).toBe('above_mrv')
  })

  it('maneja grupo muscular sin rangos definidos', () => {
    const weeklySets = { 'Grupo Inventado': 10 }
    const summary = buildVolumeSummary(weeklySets)
    expect(summary[0].zone).toBeNull()
    expect(summary[0].landmarks).toBeNull()
  })
})
