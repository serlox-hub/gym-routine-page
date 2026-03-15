import { describe, it, expect } from 'vitest'
import {
  calculateMeasurementStats,
  transformMeasurementToChartData,
  calculateMeasurementTrend,
} from './bodyMeasurementCalculations.js'

describe('bodyMeasurementCalculations', () => {
  describe('calculateMeasurementStats', () => {
    it('devuelve null para array vacío', () => {
      expect(calculateMeasurementStats([])).toBeNull()
      expect(calculateMeasurementStats(null)).toBeNull()
      expect(calculateMeasurementStats(undefined)).toBeNull()
    })

    it('calcula stats correctamente para un registro', () => {
      const records = [{ value: 85 }]
      const stats = calculateMeasurementStats(records)

      expect(stats.current).toBe(85)
      expect(stats.min).toBe(85)
      expect(stats.max).toBe(85)
      expect(stats.change).toBe(0)
    })

    it('calcula stats correctamente para múltiples registros', () => {
      const records = [
        { value: 82 },
        { value: 84 },
        { value: 86 },
        { value: 88 },
      ]
      const stats = calculateMeasurementStats(records)

      expect(stats.current).toBe(82)
      expect(stats.min).toBe(82)
      expect(stats.max).toBe(88)
      expect(stats.change).toBe(-6)
    })

    it('calcula cambio positivo correctamente', () => {
      const records = [
        { value: 40 },
        { value: 38 },
      ]
      const stats = calculateMeasurementStats(records)

      expect(stats.change).toBe(2)
    })

    it('maneja decimales correctamente', () => {
      const records = [
        { value: 85.5 },
        { value: 86.2 },
      ]
      const stats = calculateMeasurementStats(records)

      expect(stats.change).toBe(-0.7)
    })
  })

  describe('transformMeasurementToChartData', () => {
    it('devuelve array vacío para datos vacíos', () => {
      expect(transformMeasurementToChartData([])).toEqual([])
      expect(transformMeasurementToChartData(null)).toEqual([])
      expect(transformMeasurementToChartData(undefined)).toEqual([])
    })

    it('transforma registros correctamente', () => {
      const records = [
        { value: 85, recorded_at: '2024-01-15T10:00:00Z' },
        { value: 86, recorded_at: '2024-01-10T10:00:00Z' },
      ]
      const result = transformMeasurementToChartData(records)

      expect(result).toHaveLength(2)
      expect(result[0].value).toBe(86)
      expect(result[1].value).toBe(85)
      expect(result[0].date).toBeDefined()
      expect(result[0].fullDate).toBeDefined()
    })

    it('respeta el límite de registros', () => {
      const records = Array.from({ length: 50 }, (_, i) => ({
        value: 80 + i,
        recorded_at: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      }))
      const result = transformMeasurementToChartData(records, 10)

      expect(result).toHaveLength(10)
    })

    it('invierte el orden para el gráfico (cronológico)', () => {
      const records = [
        { value: 87, recorded_at: '2024-01-03T10:00:00Z' },
        { value: 86, recorded_at: '2024-01-02T10:00:00Z' },
        { value: 85, recorded_at: '2024-01-01T10:00:00Z' },
      ]
      const result = transformMeasurementToChartData(records)

      expect(result[0].value).toBe(85)
      expect(result[2].value).toBe(87)
    })
  })

  describe('calculateMeasurementTrend', () => {
    it('devuelve stable para datos insuficientes', () => {
      expect(calculateMeasurementTrend([])).toBe('stable')
      expect(calculateMeasurementTrend(null)).toBe('stable')
      expect(calculateMeasurementTrend([{ value: 85 }])).toBe('stable')
    })

    it('detecta tendencia creciente', () => {
      const records = [
        { value: 88 },
        { value: 87 },
        { value: 86 },
        { value: 85 },
      ]
      expect(calculateMeasurementTrend(records, 2)).toBe('increasing')
    })

    it('detecta tendencia decreciente', () => {
      const records = [
        { value: 82 },
        { value: 83 },
        { value: 84 },
        { value: 85 },
      ]
      expect(calculateMeasurementTrend(records, 2)).toBe('decreasing')
    })

    it('detecta tendencia estable', () => {
      const records = [
        { value: 85.1 },
        { value: 85.0 },
        { value: 85.2 },
        { value: 85.1 },
      ]
      expect(calculateMeasurementTrend(records, 2)).toBe('stable')
    })

    it('funciona con pocos registros sin datos previos suficientes', () => {
      const records = [
        { value: 87 },
        { value: 85 },
      ]
      expect(calculateMeasurementTrend(records, 7)).toBe('increasing')
    })
  })
})
