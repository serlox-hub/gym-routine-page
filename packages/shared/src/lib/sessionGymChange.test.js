import { describe, it, expect } from 'vitest'
import { resolveUnitsForExercises, planSessionWeightConversion, buildGymChangeJob, pickGymUnitOverrides } from './sessionGymChange.js'

describe('pickGymUnitOverrides', () => {
  const rows = [
    { exercise_id: 1, gym_id: 5, weight_unit: 'lb' },
    { exercise_id: 2, gym_id: 5, weight_unit: 'kg' },
    { exercise_id: 1, gym_id: 8, weight_unit: 'kg' },
  ]

  it('devuelve exercise_id -> unidad solo del gym pedido', () => {
    expect(pickGymUnitOverrides(rows, 5)).toEqual({ 1: 'lb', 2: 'kg' })
    expect(pickGymUnitOverrides(rows, 8)).toEqual({ 1: 'kg' })
  })

  it('compara gym_id de forma laxa (número vs string)', () => {
    expect(pickGymUnitOverrides(rows, '5')).toEqual({ 1: 'lb', 2: 'kg' })
  })

  it('devuelve {} si el gym no tiene overrides o rows es vacío/undefined', () => {
    expect(pickGymUnitOverrides(rows, 99)).toEqual({})
    expect(pickGymUnitOverrides([], 5)).toEqual({})
    expect(pickGymUnitOverrides(undefined, 5)).toEqual({})
  })
})

describe('resolveUnitsForExercises', () => {
  it('usa el override del gym cuando existe, y la global cuando no', () => {
    const map = resolveUnitsForExercises([1, 2], { 1: 'lb' }, 'kg')
    expect(map).toEqual({ 1: 'lb', 2: 'kg' })
  })

  it('cae a kg si no hay override ni preferencia global', () => {
    expect(resolveUnitsForExercises([5], {}, null)).toEqual({ 5: 'kg' })
  })

  it('tolera exerciseIds vacío/undefined', () => {
    expect(resolveUnitsForExercises(undefined, {}, 'kg')).toEqual({})
    expect(resolveUnitsForExercises([], {}, 'kg')).toEqual({})
  })
})

describe('planSessionWeightConversion', () => {
  const exerciseIdBySe = { 10: 100, 20: 200 }

  it('convierte solo las series de ejercicios cuya unidad cambia', () => {
    const completedSets = {
      '10-1': { sessionExerciseId: 10, setNumber: 1, weight: 80 },   // 100: kg -> lb
      '10-2': { sessionExerciseId: 10, setNumber: 2, weight: 100 },  // 100: kg -> lb
      '20-1': { sessionExerciseId: 20, setNumber: 1, weight: 50 },   // 200: kg -> kg (sin cambio)
    }
    const plan = planSessionWeightConversion({
      completedSets,
      exerciseIdBySe,
      oldUnitByExercise: { 100: 'kg', 200: 'kg' },
      newUnitByExercise: { 100: 'lb', 200: 'kg' },
    })
    expect(plan).toHaveLength(2)
    expect(plan.find(c => c.setNumber === 1 && c.sessionExerciseId === 10)).toMatchObject({
      exerciseId: 100, fromUnit: 'kg', toUnit: 'lb', oldWeight: 80, newWeight: 176.37,
    })
    expect(plan.some(c => c.sessionExerciseId === 20)).toBe(false)
  })

  it('soporta direcciones opuestas por ejercicio en el mismo cambio', () => {
    const completedSets = {
      '10-1': { sessionExerciseId: 10, setNumber: 1, weight: 100 }, // kg -> lb
      '20-1': { sessionExerciseId: 20, setNumber: 1, weight: 100 }, // lb -> kg
    }
    const plan = planSessionWeightConversion({
      completedSets,
      exerciseIdBySe,
      oldUnitByExercise: { 100: 'kg', 200: 'lb' },
      newUnitByExercise: { 100: 'lb', 200: 'kg' },
    })
    expect(plan.find(c => c.sessionExerciseId === 10).toUnit).toBe('lb')
    expect(plan.find(c => c.sessionExerciseId === 10).newWeight).toBe(220.46)
    expect(plan.find(c => c.sessionExerciseId === 20).toUnit).toBe('kg')
    expect(plan.find(c => c.sessionExerciseId === 20).newWeight).toBe(45.36)
  })

  it('ignora series sin peso (tiempo/distancia/reps) y pesos null', () => {
    const completedSets = {
      '10-1': { sessionExerciseId: 10, setNumber: 1, weight: null },
      '10-2': { sessionExerciseId: 10, setNumber: 2, timeSeconds: 60 },
    }
    const plan = planSessionWeightConversion({
      completedSets,
      exerciseIdBySe,
      oldUnitByExercise: { 100: 'kg' },
      newUnitByExercise: { 100: 'lb' },
    })
    expect(plan).toEqual([])
  })

  it('no convierte cuando la unidad no cambia', () => {
    const completedSets = { '10-1': { sessionExerciseId: 10, setNumber: 1, weight: 80 } }
    const plan = planSessionWeightConversion({
      completedSets,
      exerciseIdBySe,
      oldUnitByExercise: { 100: 'kg' },
      newUnitByExercise: { 100: 'kg' },
    })
    expect(plan).toEqual([])
  })

  it('ignora series cuyo sessionExerciseId no mapea a un ejercicio', () => {
    const completedSets = { '99-1': { sessionExerciseId: 99, setNumber: 1, weight: 80 } }
    const plan = planSessionWeightConversion({
      completedSets,
      exerciseIdBySe,
      oldUnitByExercise: { 100: 'kg' },
      newUnitByExercise: { 100: 'lb' },
    })
    expect(plan).toEqual([])
  })

  it('tolera completedSets vacío/undefined', () => {
    expect(planSessionWeightConversion({ completedSets: {}, exerciseIdBySe, oldUnitByExercise: {}, newUnitByExercise: {} })).toEqual([])
    expect(planSessionWeightConversion({ completedSets: undefined, exerciseIdBySe, oldUnitByExercise: {}, newUnitByExercise: {} })).toEqual([])
  })
})

describe('buildGymChangeJob', () => {
  const completedSets = {
    '10-1': { sessionExerciseId: 10, setNumber: 1, weight: 86.18 },
    '10-2': { sessionExerciseId: 10, setNumber: 2, weight: null },   // sin peso: se ignora
    '20-1': { sessionExerciseId: 20, setNumber: 1, weight: 50 },
  }

  it('con conversión: manda el snapshot completo de pesos (ignora los null)', () => {
    const job = buildGymChangeJob({ gymId: 7, completedSets, hasConversions: true, hadPendingWeights: false })
    expect(job.gymId).toBe(7)
    expect(job.weights).toEqual([
      { sessionExerciseId: 10, setNumber: 1, weight: 86.18 },
      { sessionExerciseId: 20, setNumber: 1, weight: 50 },
    ])
  })

  it('sin conversión ahora pero con pendiente sin sincronizar: arrastra el snapshot completo', () => {
    const job = buildGymChangeJob({ gymId: 7, completedSets, hasConversions: false, hadPendingWeights: true })
    expect(job.weights).toHaveLength(2)
  })

  it('cambio de gym sin conversión ni pendiente: solo el gym, sin pesos', () => {
    const job = buildGymChangeJob({ gymId: 7, completedSets, hasConversions: false, hadPendingWeights: false })
    expect(job).toEqual({ gymId: 7, weights: [] })
  })

  it('tolera completedSets vacío/undefined', () => {
    expect(buildGymChangeJob({ gymId: 1, completedSets: undefined, hasConversions: true, hadPendingWeights: false })).toEqual({ gymId: 1, weights: [] })
  })
})
