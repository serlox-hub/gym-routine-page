import { describe, it, expect } from 'vitest'
import {
  calculateEpley1RM,
  calculateSetVolume,
  calculateTotalVolume,
  getBestValueFromSets,
  getBest1RMFromSets,
  transformSessionsToChartData,
  countCompletedSets,
  filterSessionsByMonth,
  transformSessionsToDurationChartData,
  calculateAverageDuration,
  calculateExerciseStats,
} from './workoutCalculations.js'

describe('workoutCalculations', () => {
  describe('calculateEpley1RM', () => {
    it('retorna 0 si no hay peso', () => {
      expect(calculateEpley1RM(0, 10)).toBe(0)
    })

    it('retorna 0 si no hay reps', () => {
      expect(calculateEpley1RM(100, 0)).toBe(0)
    })

    it('retorna el peso si es 1 rep', () => {
      expect(calculateEpley1RM(100, 1)).toBe(100)
    })

    it('calcula 1RM para múltiples reps', () => {
      // 100kg x 10 reps = 100 * (1 + 10/30) = 100 * 1.333 = 133.3 ≈ 133
      expect(calculateEpley1RM(100, 10)).toBe(133)
    })

    it('calcula 1RM para 5 reps', () => {
      // 100kg x 5 reps = 100 * (1 + 5/30) = 100 * 1.167 = 116.7 ≈ 117
      expect(calculateEpley1RM(100, 5)).toBe(117)
    })
  })

  describe('calculateSetVolume', () => {
    it('retorna 0 si no hay peso', () => {
      expect(calculateSetVolume(0, 10)).toBe(0)
    })

    it('retorna 0 si no hay reps', () => {
      expect(calculateSetVolume(100, 0)).toBe(0)
    })

    it('calcula volumen correctamente', () => {
      expect(calculateSetVolume(100, 10)).toBe(1000)
    })
  })

  describe('calculateTotalVolume', () => {
    it('retorna 0 para array vacío', () => {
      expect(calculateTotalVolume([])).toBe(0)
    })

    it('retorna 0 si es null', () => {
      expect(calculateTotalVolume(null)).toBe(0)
    })

    it('calcula volumen de una serie', () => {
      const sets = [{ weight: 100, reps_completed: 10 }]
      expect(calculateTotalVolume(sets)).toBe(1000)
    })

    it('calcula volumen de múltiples series', () => {
      const sets = [
        { weight: 100, reps_completed: 10 },
        { weight: 100, reps_completed: 8 },
        { weight: 90, reps_completed: 8 },
      ]
      expect(calculateTotalVolume(sets)).toBe(2520)
    })

    it('usa reps como fallback', () => {
      const sets = [{ weight: 100, reps: 10 }]
      expect(calculateTotalVolume(sets)).toBe(1000)
    })

    it('maneja series sin datos', () => {
      const sets = [{ weight: 100, reps_completed: 10 }, {}]
      expect(calculateTotalVolume(sets)).toBe(1000)
    })
  })

  describe('getBestValueFromSets', () => {
    it('retorna 0 para array vacío', () => {
      expect(getBestValueFromSets([])).toEqual({ value: 0, unit: '' })
    })

    it('obtiene mejor peso para weight_reps', () => {
      const sets = [
        { weight: 80, weight_unit: 'kg' },
        { weight: 100, weight_unit: 'kg' },
        { weight: 90, weight_unit: 'kg' },
      ]
      expect(getBestValueFromSets(sets, 'weight_reps')).toEqual({ value: 100, unit: 'kg' })
    })

    it('obtiene mejor tiempo para time', () => {
      const sets = [
        { time_seconds: 30 },
        { time_seconds: 60 },
        { time_seconds: 45 },
      ]
      expect(getBestValueFromSets(sets, 'time')).toEqual({ value: 60, unit: 's' })
    })

    it('obtiene mejores reps para reps_only', () => {
      const sets = [
        { reps_completed: 10 },
        { reps_completed: 15 },
        { reps_completed: 12 },
      ]
      expect(getBestValueFromSets(sets, 'reps_only')).toEqual({ value: 15, unit: 'reps' })
    })

    it('usa reps como fallback', () => {
      const sets = [{ reps: 10 }, { reps: 15 }]
      expect(getBestValueFromSets(sets, 'reps_only')).toEqual({ value: 15, unit: 'reps' })
    })
  })

  describe('getBest1RMFromSets', () => {
    it('retorna 0 para array vacío', () => {
      expect(getBest1RMFromSets([])).toBe(0)
    })

    it('retorna 0 si es null', () => {
      expect(getBest1RMFromSets(null)).toBe(0)
    })

    it('calcula mejor 1RM de múltiples series', () => {
      const sets = [
        { weight: 100, reps_completed: 5 },  // 117
        { weight: 90, reps_completed: 10 },  // 120
        { weight: 80, reps_completed: 12 },  // 112
      ]
      expect(getBest1RMFromSets(sets)).toBe(120)
    })

    it('ignora series sin peso o reps', () => {
      const sets = [
        { weight: 100, reps_completed: 5 },
        { weight: 90 },
        { reps_completed: 10 },
      ]
      expect(getBest1RMFromSets(sets)).toBe(117)
    })
  })

  describe('transformSessionsToChartData', () => {
    it('retorna array vacío para sessions vacías', () => {
      expect(transformSessionsToChartData([], 'weight_reps')).toEqual([])
    })

    it('retorna array vacío si es null', () => {
      expect(transformSessionsToChartData(null, 'weight_reps')).toEqual([])
    })

    it('transforma sesiones a datos de gráfico', () => {
      const sessions = [
        {
          date: '2024-01-15T10:00:00Z',
          sets: [
            { weight: 100, reps_completed: 10, weight_unit: 'kg' },
            { weight: 100, reps_completed: 8, weight_unit: 'kg' },
          ],
        },
      ]
      const result = transformSessionsToChartData(sessions, 'weight_reps')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        best: 100,
        volume: 1800,
        unit: 'kg',
      })
      expect(result[0].e1rm).toBeGreaterThan(0)
    })
  })

  describe('countCompletedSets', () => {
    it('retorna 0 si el mapa es null', () => {
      expect(countCompletedSets(null, 123)).toBe(0)
    })

    it('cuenta series correctamente', () => {
      const completedSetsMap = {
        '123-1': { routineExerciseId: 123 },
        '123-2': { routineExerciseId: 123 },
        '456-1': { routineExerciseId: 456 },
      }
      expect(countCompletedSets(completedSetsMap, 123)).toBe(2)
    })

    it('retorna 0 si no hay series para el ejercicio', () => {
      const completedSetsMap = {
        '456-1': { routineExerciseId: 456 },
      }
      expect(countCompletedSets(completedSetsMap, 123)).toBe(0)
    })
  })

  describe('filterSessionsByMonth', () => {
    const sessions = [
      { started_at: '2024-01-15T10:00:00Z' },
      { started_at: '2024-01-20T10:00:00Z' },
      { started_at: '2024-02-10T10:00:00Z' },
    ]

    it('retorna array vacío si sessions es null', () => {
      expect(filterSessionsByMonth(null, 2024, 0)).toEqual([])
    })

    it('filtra sesiones por mes', () => {
      const result = filterSessionsByMonth(sessions, 2024, 0) // Enero
      expect(result).toHaveLength(2)
    })

    it('retorna vacío si no hay sesiones en el mes', () => {
      const result = filterSessionsByMonth(sessions, 2024, 5) // Junio
      expect(result).toHaveLength(0)
    })
  })

  describe('transformSessionsToDurationChartData', () => {
    const sessions = [
      {
        started_at: '2024-01-15T10:00:00Z',
        duration_minutes: 45,
        routine_day: { name: 'Push' },
      },
      {
        started_at: '2024-01-20T10:00:00Z',
        duration_minutes: 60,
        routine_day: { name: 'Pull' },
      },
      {
        started_at: '2024-02-10T10:00:00Z',
        duration_minutes: 50,
      },
    ]

    it('filtra y transforma sesiones del mes', () => {
      const result = transformSessionsToDurationChartData(sessions, new Date('2024-01-25'))
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        date: 15,
        duration: 45,
        dayName: 'Push',
      })
    })

    it('excluye sesiones sin duración', () => {
      const sessionsWithNull = [
        { started_at: '2024-01-15T10:00:00Z', duration_minutes: 45 },
        { started_at: '2024-01-20T10:00:00Z', duration_minutes: null },
      ]
      const result = transformSessionsToDurationChartData(sessionsWithNull, new Date('2024-01-25'))
      expect(result).toHaveLength(1)
    })

    it('usa "Sesión" como nombre por defecto', () => {
      const result = transformSessionsToDurationChartData(
        [{ started_at: '2024-02-10T10:00:00Z', duration_minutes: 50 }],
        new Date('2024-02-15')
      )
      expect(result[0].dayName).toBe('Sesión')
    })

    it('usa day_name desnormalizado con prioridad sobre routine_day.name', () => {
      const sessionsWithDayName = [
        {
          started_at: '2024-01-15T10:00:00Z',
          duration_minutes: 45,
          day_name: 'Push (desnormalizado)',
          routine_day: { name: 'Push' },
        },
      ]
      const result = transformSessionsToDurationChartData(sessionsWithDayName, new Date('2024-01-25'))
      expect(result[0].dayName).toBe('Push (desnormalizado)')
    })

    it('usa routine_day.name como fallback si day_name es null', () => {
      const sessionsWithoutDayName = [
        {
          started_at: '2024-01-15T10:00:00Z',
          duration_minutes: 45,
          day_name: null,
          routine_day: { name: 'Pull' },
        },
      ]
      const result = transformSessionsToDurationChartData(sessionsWithoutDayName, new Date('2024-01-25'))
      expect(result[0].dayName).toBe('Pull')
    })
  })

  describe('calculateAverageDuration', () => {
    it('retorna 0 para array vacío', () => {
      expect(calculateAverageDuration([])).toBe(0)
    })

    it('retorna 0 si es null', () => {
      expect(calculateAverageDuration(null)).toBe(0)
    })

    it('calcula promedio correctamente', () => {
      const chartData = [
        { duration: 40 },
        { duration: 50 },
        { duration: 60 },
      ]
      expect(calculateAverageDuration(chartData)).toBe(50)
    })

    it('redondea el promedio', () => {
      const chartData = [
        { duration: 40 },
        { duration: 45 },
      ]
      expect(calculateAverageDuration(chartData)).toBe(43)
    })
  })

  describe('calculateExerciseStats', () => {
    it('retorna null para sessions vacías', () => {
      expect(calculateExerciseStats([], 'weight_reps')).toBeNull()
    })

    it('retorna null si sessions es null', () => {
      expect(calculateExerciseStats(null, 'weight_reps')).toBeNull()
    })

    it('calcula estadísticas para weight_reps', () => {
      const sessions = [
        {
          sets: [
            { weight: 100, reps_completed: 5 },
            { weight: 90, reps_completed: 10 },
          ],
        },
        {
          sets: [
            { weight: 95, reps_completed: 8 },
          ],
        },
      ]
      const result = calculateExerciseStats(sessions, 'weight_reps')

      expect(result.sessionCount).toBe(2)
      expect(result.maxWeight).toBe(100)
      expect(result.maxReps).toBe(10)
      expect(result.best1RM).toBe(120) // 90kg x 10 reps
      expect(result.totalVolume).toBe(2160) // 500 + 900 + 760
    })

    it('calcula estadísticas para reps_only', () => {
      const sessions = [
        {
          sets: [
            { reps_completed: 10 },
            { reps_completed: 12 },
          ],
        },
        {
          sets: [
            { reps_completed: 15 },
          ],
        },
      ]
      const result = calculateExerciseStats(sessions, 'reps_only')

      expect(result.sessionCount).toBe(2)
      expect(result.maxReps).toBe(15)
      expect(result.best1RM).toBe(0)
      expect(result.maxWeight).toBe(0)
      expect(result.totalVolume).toBe(0)
    })

    it('calcula estadísticas para reps_per_side', () => {
      const sessions = [
        {
          sets: [
            { reps_completed: 8 },
            { reps_completed: 10 },
          ],
        },
      ]
      const result = calculateExerciseStats(sessions, 'reps_per_side')

      expect(result.maxReps).toBe(10)
      expect(result.sessionCount).toBe(1)
    })
  })
})
