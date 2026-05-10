import { describe, it, expect } from 'vitest'
import { getDaysSince, getPendingReminders } from './reminderUtils.js'

const NOW = new Date('2026-05-10T12:00:00Z')

describe('getDaysSince', () => {
  it('devuelve 0 si la fecha es hoy', () => {
    expect(getDaysSince('2026-05-10T08:00:00Z', NOW)).toBe(0)
  })

  it('devuelve dias enteros redondeados hacia abajo', () => {
    // 5 dias y 12h
    expect(getDaysSince('2026-05-05T00:00:00Z', NOW)).toBe(5)
    // 30 dias exactos
    expect(getDaysSince('2026-04-10T12:00:00Z', NOW)).toBe(30)
  })

  it('devuelve null si la fecha es invalida o ausente', () => {
    expect(getDaysSince(null, NOW)).toBeNull()
    expect(getDaysSince(undefined, NOW)).toBeNull()
    expect(getDaysSince('', NOW)).toBeNull()
    expect(getDaysSince('not-a-date', NOW)).toBeNull()
  })

  it('devuelve 0 si la fecha es futura (no negativo)', () => {
    expect(getDaysSince('2026-06-01T00:00:00Z', NOW)).toBe(0)
  })
})

describe('getPendingReminders', () => {
  it('devuelve ambos null si los thresholds son 0 o null', () => {
    const result = getPendingReminders({
      latestWeightDate: '2025-01-01T00:00:00Z',
      latestMeasurementsDate: '2025-01-01T00:00:00Z',
      weightThresholdDays: 0,
      measurementsThresholdDays: null,
      now: NOW,
    })
    expect(result).toEqual({ weight: null, measurements: null })
  })

  it('devuelve null para weight si nunca hubo registro previo', () => {
    const result = getPendingReminders({
      latestWeightDate: null,
      latestMeasurementsDate: null,
      weightThresholdDays: 7,
      measurementsThresholdDays: 14,
      now: NOW,
    })
    expect(result).toEqual({ weight: null, measurements: null })
  })

  it('devuelve reminder de weight si dias transcurridos >= threshold', () => {
    const result = getPendingReminders({
      latestWeightDate: '2026-05-01T00:00:00Z',  // hace 9 dias
      latestMeasurementsDate: null,
      weightThresholdDays: 7,
      measurementsThresholdDays: 14,
      now: NOW,
    })
    expect(result.weight).toEqual({ daysSince: 9 })
    expect(result.measurements).toBeNull()
  })

  it('no devuelve reminder si dias < threshold', () => {
    const result = getPendingReminders({
      latestWeightDate: '2026-05-08T00:00:00Z',  // hace 2 dias
      latestMeasurementsDate: '2026-05-09T00:00:00Z',  // hace 1 dia
      weightThresholdDays: 7,
      measurementsThresholdDays: 14,
      now: NOW,
    })
    expect(result).toEqual({ weight: null, measurements: null })
  })

  it('devuelve reminder cuando dias = threshold (limite inclusivo)', () => {
    const result = getPendingReminders({
      latestWeightDate: '2026-05-03T12:00:00Z',  // hace exactamente 7 dias
      latestMeasurementsDate: null,
      weightThresholdDays: 7,
      measurementsThresholdDays: 0,
      now: NOW,
    })
    expect(result.weight).toEqual({ daysSince: 7 })
  })

  it('puede devolver ambos reminders simultaneamente', () => {
    const result = getPendingReminders({
      latestWeightDate: '2026-04-25T00:00:00Z',  // hace 15 dias
      latestMeasurementsDate: '2026-03-01T00:00:00Z',  // hace 70 dias
      weightThresholdDays: 7,
      measurementsThresholdDays: 30,
      now: NOW,
    })
    expect(result.weight).toEqual({ daysSince: 15 })
    expect(result.measurements).toEqual({ daysSince: 70 })
  })

  it('acepta thresholds en string como vienen de DB', () => {
    const result = getPendingReminders({
      latestWeightDate: '2026-05-01T00:00:00Z',  // hace 9 dias
      latestMeasurementsDate: null,
      weightThresholdDays: '7',
      measurementsThresholdDays: '0',
      now: NOW,
    })
    expect(result.weight).toEqual({ daysSince: 9 })
  })
})
