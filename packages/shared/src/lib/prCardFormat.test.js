import { describe, it, expect } from 'vitest'
import { formatPRDetailValue, formatPRDetailPrevious, formatPRDetailLabel, formatPRDetailAmount } from './prCardFormat.js'

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

    it('bestTimeSeconds → a duration, never raw seconds', () => {
      expect(formatPRDetailValue({ type: 'bestTimeSeconds', newValue: 90, unit: 's' })).toBe('1:30 min')
      expect(formatPRDetailValue({ type: 'bestTimeSeconds', newValue: 45, unit: 's' })).toBe('45s')
    })
  })

  describe('formatPRDetailAmount', () => {
    it('repPR → the weight alone', () => {
      expect(formatPRDetailAmount({ type: 'repPR', newValue: 110, unit: 'kg', repCount: 5 })).toBe('110 kg')
    })

    it('bestTimeSeconds → a duration', () => {
      expect(formatPRDetailAmount({ type: 'bestTimeSeconds', newValue: 90, unit: 's' })).toBe('1:30 min')
    })
  })

  describe('formatPRDetailLabel', () => {
    it('names the record type', () => {
      expect(formatPRDetailLabel({ type: 'bestWeight' })).toBe('Peso')
      expect(formatPRDetailLabel({ type: 'best1rm' })).toBe('1RM')
    })

    it('repPR → names its rep count', () => {
      expect(formatPRDetailLabel({ type: 'repPR', repCount: 5 })).toBe('Récord a 5 reps')
    })

    it('unknown type → empty', () => {
      expect(formatPRDetailLabel({ type: 'nope' })).toBe('')
    })
  })

  describe('formatPRDetailPrevious', () => {
    it('con oldValue → "anterior · {old} {unit}"', () => {
      const detail = { type: 'best1rm', newValue: 132, oldValue: 120, unit: 'kg' }
      expect(formatPRDetailPrevious(detail)).toBe('anterior · 120 kg')
    })

    it('bestTimeSeconds con oldValue → duración', () => {
      const detail = { type: 'bestTimeSeconds', newValue: 150, oldValue: 120, unit: 's' }
      expect(formatPRDetailPrevious(detail)).toBe('anterior · 2:00 min')
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
