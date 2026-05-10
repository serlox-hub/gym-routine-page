import { describe, it, expect } from 'vitest'
import { getFeedbackCounts, filterFeedback } from './feedbackUtils.js'

const SAMPLE = [
  { id: 1, resolved_at: null },
  { id: 2, resolved_at: '2026-01-01T10:00:00Z' },
  { id: 3, resolved_at: null },
  { id: 4, resolved_at: '2026-02-01T10:00:00Z' },
]

describe('getFeedbackCounts', () => {
  it('cuenta pendientes y total', () => {
    expect(getFeedbackCounts(SAMPLE)).toEqual({ pending: 2, all: 4 })
  })

  it('devuelve ceros si no hay reportes', () => {
    expect(getFeedbackCounts([])).toEqual({ pending: 0, all: 0 })
  })

  it('trata null/undefined como lista vacia', () => {
    expect(getFeedbackCounts(null)).toEqual({ pending: 0, all: 0 })
    expect(getFeedbackCounts(undefined)).toEqual({ pending: 0, all: 0 })
  })
})

describe('filterFeedback', () => {
  it('devuelve solo pendientes con filter="pending"', () => {
    const result = filterFeedback(SAMPLE, 'pending')
    expect(result).toHaveLength(2)
    expect(result.every(f => f.resolved_at === null)).toBe(true)
  })

  it('devuelve todos con filter="all"', () => {
    expect(filterFeedback(SAMPLE, 'all')).toEqual(SAMPLE)
  })

  it('devuelve todos con cualquier filtro desconocido', () => {
    expect(filterFeedback(SAMPLE, 'foo')).toEqual(SAMPLE)
  })

  it('trata null/undefined como lista vacia', () => {
    expect(filterFeedback(null, 'pending')).toEqual([])
    expect(filterFeedback(undefined, 'all')).toEqual([])
  })
})
