import { describe, it, expect } from 'vitest'
import { convertWeight, getWeightUnits, toggleWeightMode, convertWeightValue, convertSessionsToDisplayUnit } from './weightConversion.js'

describe('convertWeight', () => {
  it('convierte libras a kilogramos', () => {
    expect(convertWeight('100', 'lb-to-kg')).toBe(45.36)
  })

  it('convierte kilogramos a libras', () => {
    expect(convertWeight('100', 'kg-to-lb')).toBe(220.46)
  })

  it('retorna null para string vacío', () => {
    expect(convertWeight('', 'lb-to-kg')).toBe(null)
  })

  it('retorna null para valor no numérico', () => {
    expect(convertWeight('abc', 'lb-to-kg')).toBe(null)
  })

  it('convierte cero correctamente', () => {
    expect(convertWeight('0', 'lb-to-kg')).toBe(0)
  })

  it('maneja decimales', () => {
    expect(convertWeight('2.5', 'kg-to-lb')).toBe(5.51)
  })
})

describe('getWeightUnits', () => {
  it('retorna lb/kg para modo lb-to-kg', () => {
    expect(getWeightUnits('lb-to-kg')).toEqual({ from: 'lb', to: 'kg' })
  })

  it('retorna kg/lb para modo kg-to-lb', () => {
    expect(getWeightUnits('kg-to-lb')).toEqual({ from: 'kg', to: 'lb' })
  })
})

describe('toggleWeightMode', () => {
  it('cambia de lb-to-kg a kg-to-lb', () => {
    expect(toggleWeightMode('lb-to-kg')).toBe('kg-to-lb')
  })

  it('cambia de kg-to-lb a lb-to-kg', () => {
    expect(toggleWeightMode('kg-to-lb')).toBe('lb-to-kg')
  })
})

describe('convertWeightValue', () => {
  it('devuelve el valor sin tocar si las unidades coinciden', () => {
    expect(convertWeightValue(100, 'kg', 'kg')).toBe(100)
  })

  it('convierte kg a lb', () => {
    expect(convertWeightValue(100, 'kg', 'lb')).toBeCloseTo(220.46, 1)
  })

  it('convierte lb a kg', () => {
    expect(convertWeightValue(100, 'lb', 'kg')).toBeCloseTo(45.36, 1)
  })

  it('propaga null/undefined y valores no numéricos', () => {
    expect(convertWeightValue(null, 'kg', 'lb')).toBe(null)
    expect(convertWeightValue(undefined, 'kg', 'lb')).toBe(undefined)
    expect(convertWeightValue('x', 'kg', 'lb')).toBe('x')
  })
})

describe('convertSessionsToDisplayUnit', () => {
  const unitByGym = { g1: 'kg', g2: 'lb' }

  it('convierte las series de un gym en otra unidad a la unidad de display (redondeo 2 dec)', () => {
    const sessions = [{ sessionId: 1, gymId: 'g2', sets: [{ weight: 100, reps_completed: 5 }] }]
    const out = convertSessionsToDisplayUnit(sessions, unitByGym, 'kg')
    expect(out[0].sets[0].weight).toBe(45.36) // 100 lb → kg
    expect(out[0].sets[0].reps_completed).toBe(5) // resto intacto
  })

  it('convierte también en dirección kg → lb', () => {
    const sessions = [{ sessionId: 1, gymId: 'g1', sets: [{ weight: 100 }] }]
    const out = convertSessionsToDisplayUnit(sessions, unitByGym, 'lb')
    expect(out[0].sets[0].weight).toBe(220.46) // 100 kg → lb
  })

  it('mezcla de gyms en una llamada: convierte solo los que difieren de la unidad de display', () => {
    const sessions = [
      { sessionId: 1, gymId: 'g1', sets: [{ weight: 80 }] }, // kg → kg: no-op
      { sessionId: 2, gymId: 'g2', sets: [{ weight: 100 }] }, // lb → kg: convierte
    ]
    const out = convertSessionsToDisplayUnit(sessions, unitByGym, 'kg')
    expect(out[0]).toBe(sessions[0]) // misma referencia (no clona)
    expect(out[1].sets[0].weight).toBe(45.36)
  })

  it('deja intactas las sesiones cuyo gym ya está en la unidad de display', () => {
    const sessions = [{ sessionId: 1, gymId: 'g1', sets: [{ weight: 80 }] }]
    const out = convertSessionsToDisplayUnit(sessions, unitByGym, 'kg')
    expect(out[0]).toBe(sessions[0]) // misma referencia (no clona)
  })

  it('no convierte pesos null (ejercicios sin peso)', () => {
    const sessions = [{ sessionId: 1, gymId: 'g2', sets: [{ weight: null, time_seconds: 60 }] }]
    const out = convertSessionsToDisplayUnit(sessions, unitByGym, 'kg')
    expect(out[0].sets[0].weight).toBeNull()
    expect(out[0].sets[0].time_seconds).toBe(60)
  })

  it('gym sin unidad conocida (o gymId null) cae a la unidad de display (sin conversión)', () => {
    const sessions = [{ sessionId: 1, gymId: null, sets: [{ weight: 100 }] }]
    const out = convertSessionsToDisplayUnit(sessions, unitByGym, 'kg')
    expect(out[0].sets[0].weight).toBe(100)
  })

  it('propaga null/undefined', () => {
    expect(convertSessionsToDisplayUnit(null, unitByGym, 'kg')).toBeNull()
    expect(convertSessionsToDisplayUnit(undefined, unitByGym, 'kg')).toBeUndefined()
  })
})
