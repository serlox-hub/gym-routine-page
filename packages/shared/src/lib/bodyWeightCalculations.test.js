import { describe, it, expect } from 'vitest'
import {
  calculateBodyWeightStats,
  transformBodyWeightToChartData,
  calculateWeightTrend,
} from './bodyWeightCalculations.js'

describe('bodyWeightCalculations', () => {
  describe('calculateBodyWeightStats', () => {
    it('devuelve null para array vacío', () => {
      expect(calculateBodyWeightStats([])).toBeNull()
      expect(calculateBodyWeightStats(null)).toBeNull()
      expect(calculateBodyWeightStats(undefined)).toBeNull()
    })

    it('calcula stats correctamente para un registro', () => {
      const records = [{ weight: 75 }]
      const stats = calculateBodyWeightStats(records)

      expect(stats.current).toBe(75)
      expect(stats.min).toBe(75)
      expect(stats.max).toBe(75)
      expect(stats.average).toBe(75)
      expect(stats.change).toBe(0)
    })

    it('calcula stats correctamente para múltiples registros', () => {
      const records = [
        { weight: 74 },
        { weight: 75 },
        { weight: 76 },
        { weight: 77 },
      ]
      const stats = calculateBodyWeightStats(records)

      expect(stats.current).toBe(74)
      expect(stats.min).toBe(74)
      expect(stats.max).toBe(77)
      expect(stats.average).toBe(75.5)
      expect(stats.change).toBe(-3)
    })

    it('calcula cambio porcentual', () => {
      const records = [
        { weight: 80 },
        { weight: 100 },
      ]
      const stats = calculateBodyWeightStats(records)

      expect(stats.change).toBe(-20)
      expect(stats.changePercent).toBe(-20)
    })
  })

  describe('transformBodyWeightToChartData', () => {
    it('devuelve array vacío para datos vacíos', () => {
      expect(transformBodyWeightToChartData([])).toEqual([])
      expect(transformBodyWeightToChartData(null)).toEqual([])
      expect(transformBodyWeightToChartData(undefined)).toEqual([])
    })

    it('transforma registros correctamente', () => {
      const records = [
        { weight: 75, recorded_at: '2024-01-15T10:00:00Z' },
        { weight: 74, recorded_at: '2024-01-10T10:00:00Z' },
      ]
      const result = transformBodyWeightToChartData(records)

      expect(result).toHaveLength(2)
      expect(result[0].weight).toBe(74)
      expect(result[1].weight).toBe(75)
      expect(result[0].date).toBeDefined()
      expect(result[0].fullDate).toBeDefined()
    })

    it('respeta el límite de registros', () => {
      const records = Array.from({ length: 50 }, (_, i) => ({
        weight: 70 + i,
        recorded_at: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      }))
      const result = transformBodyWeightToChartData(records, 10)

      expect(result).toHaveLength(10)
    })

    it('invierte el orden para el gráfico (cronológico)', () => {
      const records = [
        { weight: 76, recorded_at: '2024-01-03T10:00:00Z' },
        { weight: 75, recorded_at: '2024-01-02T10:00:00Z' },
        { weight: 74, recorded_at: '2024-01-01T10:00:00Z' },
      ]
      const result = transformBodyWeightToChartData(records)

      expect(result[0].weight).toBe(74)
      expect(result[2].weight).toBe(76)
    })
  })

  describe('calculateWeightTrend', () => {
    it('devuelve stable para datos insuficientes', () => {
      expect(calculateWeightTrend([])).toBe('stable')
      expect(calculateWeightTrend(null)).toBe('stable')
      expect(calculateWeightTrend([{ weight: 75 }])).toBe('stable')
    })

    it('detecta tendencia creciente', () => {
      const records = [
        { weight: 78 },
        { weight: 77 },
        { weight: 76 },
        { weight: 75 },
      ]
      expect(calculateWeightTrend(records, 2)).toBe('increasing')
    })

    it('detecta tendencia decreciente', () => {
      const records = [
        { weight: 72 },
        { weight: 73 },
        { weight: 74 },
        { weight: 75 },
      ]
      expect(calculateWeightTrend(records, 2)).toBe('decreasing')
    })

    it('detecta tendencia estable', () => {
      const records = [
        { weight: 75.1 },
        { weight: 75.0 },
        { weight: 75.2 },
        { weight: 75.1 },
      ]
      expect(calculateWeightTrend(records, 2)).toBe('stable')
    })

    it('funciona con pocos registros sin datos previos suficientes', () => {
      const records = [
        { weight: 76 },
        { weight: 74 },
      ]
      expect(calculateWeightTrend(records, 7)).toBe('increasing')
    })
  })
})
