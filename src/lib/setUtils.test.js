import { describe, it, expect, vi } from 'vitest'
import {
  createSetKey,
  isExtraExercise,
  generateExtraExerciseId,
  isSetDataValid,
  buildCompletedSetData,
  formatSetValue,
  formatSetValueByType,
  getSetsForExercise,
  buildExtraExerciseConfig,
} from './setUtils.js'

describe('setUtils', () => {
  describe('createSetKey', () => {
    it('crea clave con ID numérico', () => {
      expect(createSetKey(123, 1)).toBe('123-1')
    })

    it('crea clave con ID string', () => {
      expect(createSetKey('extra-456', 2)).toBe('extra-456-2')
    })
  })

  describe('isExtraExercise', () => {
    it('retorna true para IDs extra', () => {
      expect(isExtraExercise('extra-123')).toBe(true)
    })

    it('retorna false para IDs numéricos', () => {
      expect(isExtraExercise(123)).toBe(false)
    })

    it('retorna false para strings que no empiezan con extra-', () => {
      expect(isExtraExercise('normal-123')).toBe(false)
    })
  })

  describe('generateExtraExerciseId', () => {
    it('genera ID con prefijo extra-', () => {
      const id = generateExtraExerciseId()
      expect(id.startsWith('extra-')).toBe(true)
    })

    it('genera IDs únicos', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
      const id1 = generateExtraExerciseId()
      vi.setSystemTime(new Date('2024-01-15T10:00:01Z'))
      const id2 = generateExtraExerciseId()
      vi.useRealTimers()
      expect(id1).not.toBe(id2)
    })
  })

  describe('isSetDataValid', () => {
    describe('weight_reps', () => {
      it('válido con peso y reps', () => {
        expect(isSetDataValid('weight_reps', { weight: '80', reps: '12' })).toBe(true)
      })

      it('inválido sin peso', () => {
        expect(isSetDataValid('weight_reps', { weight: '', reps: '12' })).toBe(false)
      })

      it('inválido sin reps', () => {
        expect(isSetDataValid('weight_reps', { weight: '80', reps: '' })).toBe(false)
      })
    })

    describe('reps_only', () => {
      it('válido con reps', () => {
        expect(isSetDataValid('reps_only', { reps: '15' })).toBe(true)
      })

      it('inválido sin reps', () => {
        expect(isSetDataValid('reps_only', { reps: '' })).toBe(false)
      })
    })

    describe('time', () => {
      it('válido con tiempo', () => {
        expect(isSetDataValid('time', { time: '60' })).toBe(true)
      })

      it('inválido sin tiempo', () => {
        expect(isSetDataValid('time', { time: '' })).toBe(false)
      })
    })

    describe('distance', () => {
      it('válido con distancia', () => {
        expect(isSetDataValid('distance', { distance: '100' })).toBe(true)
      })

      it('válido con peso y distancia', () => {
        expect(isSetDataValid('distance', { weight: '20', distance: '100' })).toBe(true)
      })

      it('inválido sin distancia', () => {
        expect(isSetDataValid('distance', { distance: '' })).toBe(false)
      })
    })

    describe('weight_distance', () => {
      it('válido con peso y distancia', () => {
        expect(isSetDataValid('weight_distance', { weight: '20', distance: '100' })).toBe(true)
      })

      it('inválido sin peso', () => {
        expect(isSetDataValid('weight_distance', { weight: '', distance: '100' })).toBe(false)
      })

      it('inválido sin distancia', () => {
        expect(isSetDataValid('weight_distance', { weight: '20', distance: '' })).toBe(false)
      })
    })

    describe('weight_time', () => {
      it('válido con peso y tiempo', () => {
        expect(isSetDataValid('weight_time', { weight: '10', time: '30' })).toBe(true)
      })

      it('inválido sin peso', () => {
        expect(isSetDataValid('weight_time', { weight: '', time: '30' })).toBe(false)
      })

      it('inválido sin tiempo', () => {
        expect(isSetDataValid('weight_time', { weight: '10', time: '' })).toBe(false)
      })
    })

    describe('calories', () => {
      it('válido con calorías', () => {
        expect(isSetDataValid('calories', { calories: '200' })).toBe(true)
      })

      it('inválido sin calorías', () => {
        expect(isSetDataValid('calories', { calories: '' })).toBe(false)
      })
    })

    describe('tipo desconocido', () => {
      it('retorna false', () => {
        expect(isSetDataValid('unknown', { reps: '10' })).toBe(false)
      })
    })
  })

  describe('buildCompletedSetData', () => {
    const baseInfo = {
      routineExerciseId: 123,
      exerciseId: 456,
      setNumber: 1,
      rirActual: 2,
      notes: 'Test note',
    }

    it('construye datos para weight_reps', () => {
      const result = buildCompletedSetData(
        'weight_reps',
        { weight: '80', reps: '12' },
        baseInfo
      )
      expect(result).toMatchObject({
        routineExerciseId: 123,
        exerciseId: 456,
        setNumber: 1,
        weight: 80,
        weightUnit: 'kg',
        repsCompleted: 12,
        rirActual: 2,
        notes: 'Test note',
      })
    })

    it('construye datos para reps_only', () => {
      const result = buildCompletedSetData(
        'reps_only',
        { reps: '15' },
        baseInfo
      )
      expect(result.repsCompleted).toBe(15)
      expect(result.weight).toBeUndefined()
    })

    it('construye datos para time', () => {
      const result = buildCompletedSetData(
        'time',
        { time: '60' },
        baseInfo
      )
      expect(result.timeSeconds).toBe(60)
    })

    it('construye datos para distance', () => {
      const result = buildCompletedSetData(
        'distance',
        { distance: '100' },
        baseInfo
      )
      expect(result.distanceMeters).toBe(100)
      expect(result.weight).toBeUndefined()
    })

    it('construye datos para weight_distance', () => {
      const result = buildCompletedSetData(
        'weight_distance',
        { distance: '100', weight: '20' },
        baseInfo
      )
      expect(result.distanceMeters).toBe(100)
      expect(result.weight).toBe(20)
      expect(result.weightUnit).toBe('kg')
    })

    it('construye datos para weight_time', () => {
      const result = buildCompletedSetData(
        'weight_time',
        { weight: '10', time: '30' },
        baseInfo
      )
      expect(result.weight).toBe(10)
      expect(result.weightUnit).toBe('kg')
      expect(result.timeSeconds).toBe(30)
    })

    it('construye datos para calories', () => {
      const result = buildCompletedSetData(
        'calories',
        { calories: '250' },
        baseInfo
      )
      expect(result.caloriesBurned).toBe(250)
    })

    it('soporta sessionExerciseId', () => {
      const result = buildCompletedSetData(
        'weight_reps',
        { weight: '80', reps: '12' },
        { sessionExerciseId: 789, exerciseId: 456, setNumber: 1 }
      )
      expect(result.sessionExerciseId).toBe(789)
      expect(result.routineExerciseId).toBeUndefined()
    })

    it('soporta videoUrl', () => {
      const result = buildCompletedSetData(
        'weight_reps',
        { weight: '80', reps: '12' },
        { ...baseInfo, videoUrl: 'https://example.com/video.mp4' }
      )
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
    })
  })

  describe('formatSetValue', () => {
    it('formatea peso y reps', () => {
      expect(formatSetValue({ weight: 80, weight_unit: 'kg', reps_completed: 12 }))
        .toBe('80kg × 12 reps')
    })

    it('formatea solo reps', () => {
      expect(formatSetValue({ reps_completed: 15 })).toBe('15 reps')
    })

    it('formatea tiempo', () => {
      expect(formatSetValue({ time_seconds: 60 })).toBe('60s')
    })

    it('formatea distancia', () => {
      expect(formatSetValue({ distance_meters: 100 })).toBe('100m')
    })

    it('formatea peso y distancia', () => {
      expect(formatSetValue({ weight: 20, weight_unit: 'kg', distance_meters: 100 }))
        .toBe('20kg × 100m')
    })

    it('usa kg por defecto', () => {
      expect(formatSetValue({ weight: 80, reps_completed: 10 }))
        .toBe('80kg × 10 reps')
    })

    it('formatea calorías', () => {
      expect(formatSetValue({ calories_burned: 300 })).toBe('300kcal')
    })

    it('formatea peso y tiempo', () => {
      expect(formatSetValue({ weight: 10, weight_unit: 'kg', time_seconds: 30 }))
        .toBe('10kg × 30s')
    })
  })

  describe('formatSetValueByType', () => {
    it('formatea weight_reps', () => {
      expect(formatSetValueByType({ weight: 80, weightUnit: 'kg', reps: 12 }, 'weight_reps'))
        .toBe('80kg × 12')
    })

    it('formatea reps_only', () => {
      expect(formatSetValueByType({ reps: 15 }, 'reps_only'))
        .toBe('15 reps')
    })

    it('formatea time', () => {
      expect(formatSetValueByType({ timeSeconds: 60 }, 'time'))
        .toBe('60s')
    })

    it('formatea distance', () => {
      expect(formatSetValueByType({ distanceMeters: 100 }, 'distance'))
        .toBe('100m')
    })

    it('formatea weight_distance', () => {
      expect(formatSetValueByType({ weight: 24, weightUnit: 'kg', distanceMeters: 40 }, 'weight_distance'))
        .toBe('24kg × 40m')
    })

    it('formatea weight_time', () => {
      expect(formatSetValueByType({ weight: 10, weightUnit: 'kg', timeSeconds: 30 }, 'weight_time'))
        .toBe('10kg × 30s')
    })

    it('formatea calories', () => {
      expect(formatSetValueByType({ caloriesBurned: 300 }, 'calories'))
        .toBe('300kcal')
    })
  })

  describe('getSetsForExercise', () => {
    const completedSets = {
      '123-1': { routineExerciseId: 123, setNumber: 1, weight: 80 },
      '123-2': { routineExerciseId: 123, setNumber: 2, weight: 85 },
      '456-1': { routineExerciseId: 456, setNumber: 1, weight: 60 },
      '123-3': { routineExerciseId: 123, setNumber: 3, weight: 90 },
    }

    it('filtra series por ejercicio', () => {
      const result = getSetsForExercise(completedSets, 123)
      expect(result).toHaveLength(3)
      expect(result.every(s => s.routineExerciseId === 123)).toBe(true)
    })

    it('ordena por número de serie', () => {
      const result = getSetsForExercise(completedSets, 123)
      expect(result[0].setNumber).toBe(1)
      expect(result[1].setNumber).toBe(2)
      expect(result[2].setNumber).toBe(3)
    })

    it('retorna array vacío si no hay series', () => {
      const result = getSetsForExercise(completedSets, 999)
      expect(result).toHaveLength(0)
    })
  })

  describe('buildExtraExerciseConfig', () => {
    const exercise = { id: 1, name: 'Test', measurement_type: 'weight_reps' }

    it('construye config con valores por defecto', () => {
      const result = buildExtraExerciseConfig('extra-123', exercise, {})
      expect(result).toMatchObject({
        id: 'extra-123',
        exercise,
        series: 3,
        reps: '10',
        rir: 2,
        rest_seconds: 90,
        measurement_type: 'weight_reps',
      })
    })

    it('usa valores personalizados', () => {
      const result = buildExtraExerciseConfig('extra-123', exercise, {
        series: 4,
        reps: '8-10',
        rir: 1,
        rest_seconds: 120,
      })
      expect(result).toMatchObject({
        series: 4,
        reps: '8-10',
        rir: 1,
        rest_seconds: 120,
      })
    })

    it('permite rir 0', () => {
      const result = buildExtraExerciseConfig('extra-123', exercise, { rir: 0 })
      expect(result.rir).toBe(0)
    })
  })
})
