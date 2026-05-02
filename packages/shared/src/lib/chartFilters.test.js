import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CHART_RANGES, filterRecordsByRange } from './chartFilters.js'

describe('filterRecordsByRange', () => {
  const NOW = new Date('2026-04-28T12:00:00Z').getTime()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function makeRecord(daysAgo) {
    return { recorded_at: new Date(NOW - daysAgo * 86400_000).toISOString() }
  }

  it('devuelve [] si records es null o vacío', () => {
    expect(filterRecordsByRange(null, CHART_RANGES.ONE_MONTH)).toEqual([])
    expect(filterRecordsByRange([], CHART_RANGES.ONE_MONTH)).toEqual([])
  })

  it('devuelve todos los records con rango ALL', () => {
    const records = [makeRecord(0), makeRecord(60), makeRecord(400)]
    expect(filterRecordsByRange(records, CHART_RANGES.ALL)).toEqual(records)
  })

  it('1M filtra a los últimos 30 días', () => {
    const records = [makeRecord(0), makeRecord(15), makeRecord(31), makeRecord(60)]
    const result = filterRecordsByRange(records, CHART_RANGES.ONE_MONTH)
    expect(result).toHaveLength(2)
    expect(result).toEqual([records[0], records[1]])
  })

  it('3M filtra a los últimos 90 días', () => {
    const records = [makeRecord(0), makeRecord(60), makeRecord(89), makeRecord(91)]
    const result = filterRecordsByRange(records, CHART_RANGES.THREE_MONTHS)
    expect(result).toHaveLength(3)
  })

  it('rango desconocido devuelve los records sin filtrar', () => {
    const records = [makeRecord(0), makeRecord(400)]
    expect(filterRecordsByRange(records, 'xyz')).toEqual(records)
  })

  it('soporta dateField personalizado', () => {
    const records = [
      { performed_at: new Date(NOW - 5 * 86400_000).toISOString() },
      { performed_at: new Date(NOW - 60 * 86400_000).toISOString() },
    ]
    const result = filterRecordsByRange(records, CHART_RANGES.ONE_MONTH, 'performed_at')
    expect(result).toHaveLength(1)
  })

  it('ignora records con fecha inválida', () => {
    const records = [makeRecord(5), { recorded_at: 'invalid-date' }, makeRecord(10)]
    const result = filterRecordsByRange(records, CHART_RANGES.ONE_MONTH)
    expect(result).toHaveLength(2)
  })
})
