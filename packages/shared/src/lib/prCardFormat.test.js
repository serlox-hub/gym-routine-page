import { describe, it, expect } from 'vitest'
import {
  preparePRCardData,
  formatPRDetailLabel,
  formatPRDetailValue,
  formatPRDetailPrevious,
  formatPRDetailListValue,
} from './prCardFormat.js'

describe('prCardFormat', () => {
  describe('preparePRCardData', () => {
    it('retorna null para entrada vacía', () => {
      expect(preparePRCardData(null)).toBeNull()
      expect(preparePRCardData({ exerciseName: 'X', details: [] })).toBeNull()
    })

    it('un solo detalle → modo hero', () => {
      const pr = {
        exerciseName: 'Press Banca',
        details: [{ type: 'best1rm', newValue: 132, oldValue: 120, unit: 'kg' }],
      }
      const result = preparePRCardData(pr)
      expect(result.mode).toBe('hero')
      expect(result.details).toHaveLength(1)
      expect(result.exerciseName).toBe('Press Banca')
    })

    it('múltiples detalles → modo list, ordenados por prioridad', () => {
      const pr = {
        exerciseName: 'Press Banca',
        details: [
          { type: 'bestWeight', newValue: 110, oldValue: 100, unit: 'kg' },
          { type: 'best1rm', newValue: 132, oldValue: 120, unit: 'kg' },
          { type: 'repPR', repCount: 5, newValue: 110, oldValue: 100, unit: 'kg' },
        ],
      }
      const result = preparePRCardData(pr)
      expect(result.mode).toBe('list')
      expect(result.details.map(d => d.type)).toEqual(['repPR', 'best1rm', 'bestWeight'])
    })

    it('agrupa repPRs cuando hay 3 o más', () => {
      const pr = {
        exerciseName: 'Press Banca',
        details: [
          { type: 'best1rm', newValue: 132, oldValue: 120, unit: 'kg' },
          { type: 'repPR', repCount: 5, newValue: 110, oldValue: null, unit: 'kg' },
          { type: 'repPR', repCount: 8, newValue: 90, oldValue: 80, unit: 'kg' },
          { type: 'repPR', repCount: 12, newValue: 70, oldValue: null, unit: 'kg' },
        ],
      }
      const result = preparePRCardData(pr)
      expect(result.details).toHaveLength(2) // 1RM + grupo
      const group = result.details.find(d => d.type === 'repPRGroup')
      expect(group).toBeDefined()
      expect(group.counts).toEqual([5, 8, 12])
      expect(group.values).toEqual([110, 90, 70])
    })

    it('NO agrupa repPRs cuando hay 2 (mantiene listados)', () => {
      const pr = {
        exerciseName: 'Press Banca',
        details: [
          { type: 'repPR', repCount: 5, newValue: 110, oldValue: null, unit: 'kg' },
          { type: 'repPR', repCount: 8, newValue: 90, oldValue: 80, unit: 'kg' },
        ],
      }
      const result = preparePRCardData(pr)
      expect(result.details).toHaveLength(2)
      expect(result.details.every(d => d.type === 'repPR')).toBe(true)
    })
  })

  describe('formatPRDetailLabel', () => {
    it('bestWeight → "Peso máximo"', () => {
      expect(formatPRDetailLabel({ type: 'bestWeight' })).toBe('Peso máximo')
    })

    it('best1rm → "1RM estimado"', () => {
      expect(formatPRDetailLabel({ type: 'best1rm' })).toBe('1RM estimado')
    })

    it('repPR → "PR a N reps" interpolado', () => {
      expect(formatPRDetailLabel({ type: 'repPR', repCount: 5 })).toBe('PR a 5 reps')
    })

    it('repPRGroup → string con counts y values', () => {
      const label = formatPRDetailLabel({
        type: 'repPRGroup',
        counts: [3, 5, 8],
        values: [120, 110, 90],
      })
      expect(label).toBe('PR a 3, 5, 8 reps · 120, 110, 90 kg')
    })
  })

  describe('formatPRDetailValue', () => {
    it('repPR → "{weight} kg × {repCount}"', () => {
      const detail = { type: 'repPR', newValue: 110, unit: 'kg', repCount: 5 }
      expect(formatPRDetailValue(detail)).toBe('110 kg × 5')
    })

    it('bestWeight → "{weight} kg"', () => {
      const detail = { type: 'bestWeight', newValue: 110, unit: 'kg' }
      expect(formatPRDetailValue(detail)).toBe('110 kg')
    })

    it('repPRGroup → null (rendering especial)', () => {
      expect(formatPRDetailValue({ type: 'repPRGroup' })).toBeNull()
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

    it('repPR sin oldValue → "primera vez a N reps"', () => {
      const detail = { type: 'repPR', newValue: 110, oldValue: null, unit: 'kg', repCount: 5 }
      expect(formatPRDetailPrevious(detail)).toBe('primera vez a 5 reps')
    })

    it('non-repPR sin oldValue → null', () => {
      const detail = { type: 'best1rm', newValue: 132, oldValue: null, unit: 'kg' }
      expect(formatPRDetailPrevious(detail)).toBeNull()
    })
  })

  describe('formatPRDetailListValue', () => {
    it('repPRGroup → values listados con unit', () => {
      const detail = { type: 'repPRGroup', counts: [5, 8], values: [110, 90], unit: 'kg' }
      expect(formatPRDetailListValue(detail)).toBe('110, 90 kg')
    })

    it('repPR → "{weight} {unit}" (sin × repCount, viene en label)', () => {
      const detail = { type: 'repPR', newValue: 110, unit: 'kg', repCount: 5 }
      expect(formatPRDetailListValue(detail)).toBe('110 kg')
    })
  })
})
