import { describe, it, expect } from 'vitest'
import { formatPRDetailValue, formatPRDetailPrevious } from './prCardFormat.js'

describe('prCardFormat', () => {
  describe('formatPRDetailValue', () => {
    it('repPR → "{weight} kg × {repCount}"', () => {
      const detail = { type: 'repPR', newValue: 110, unit: 'kg', repCount: 5 }
      expect(formatPRDetailValue(detail)).toBe('110 kg × 5')
    })

    it('bestWeight → "{weight} kg"', () => {
      const detail = { type: 'bestWeight', newValue: 110, unit: 'kg' }
      expect(formatPRDetailValue(detail)).toBe('110 kg')
    })
  })

  describe('formatPRDetailPrevious', () => {
    it('con oldValue → "anterior · {old} {unit}"', () => {
      const detail = { type: 'best1rm', newValue: 132, oldValue: 120, unit: 'kg' }
      expect(formatPRDetailPrevious(detail)).toBe('anterior · 120 kg')
    })

    it('repPR con oldValue → incluye × repCount en anterior', () => {
      const detail = { type: 'repPR', newValue: 110, oldValue: 100, unit: 'kg', repCount: 5 }
      expect(formatPRDetailPrevious(detail)).toBe('anterior · 100 kg × 5')
    })

    // Issue #125: the previous set can have more reps than the new record.
    it('repPR with oldRepCount prints the previous set\'s own rep count', () => {
      const detail = { type: 'repPR', repCount: 6, newValue: 25, oldValue: 20, oldRepCount: 8, unit: 'kg' }
      expect(formatPRDetailPrevious(detail)).toBe('anterior · 20 kg × 8')
    })

    it('repPR without oldRepCount falls back to repCount', () => {
      const detail = { type: 'repPR', repCount: 6, newValue: 25, oldValue: 20, unit: 'kg' }
      expect(formatPRDetailPrevious(detail)).toBe('anterior · 20 kg × 6')
    })

    it('repPR sin oldValue → "primera vez a N reps"', () => {
      const detail = { type: 'repPR', newValue: 110, oldValue: null, unit: 'kg', repCount: 5 }
      expect(formatPRDetailPrevious(detail)).toBe('primera vez a 5 reps')
    })

    it('non-repPR sin oldValue → null', () => {
      const detail = { type: 'best1rm', newValue: 132, oldValue: null, unit: 'kg' }
      expect(formatPRDetailPrevious(detail)).toBeNull()
    })
  })

})
