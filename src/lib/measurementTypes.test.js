import { describe, it, expect } from 'vitest'
import {
  MEASUREMENT_TYPES,
  WEIGHT_MEASUREMENT_TYPES,
  REPS_MEASUREMENT_TYPES,
  isValidMeasurementType,
  measurementTypeUsesWeight,
  measurementTypeUsesReps,
  getEffortLabel,
  getDefaultReps,
  getRepsLabel,
  getRepsPlaceholder,
} from './measurementTypes.js'

describe('measurementTypes', () => {
  describe('MEASUREMENT_TYPES', () => {
    it('contiene todos los tipos esperados', () => {
      expect(MEASUREMENT_TYPES).toContain('weight_reps')
      expect(MEASUREMENT_TYPES).toContain('reps_only')
      expect(MEASUREMENT_TYPES).toContain('time')
      expect(MEASUREMENT_TYPES).toContain('weight_time')
      expect(MEASUREMENT_TYPES).toContain('distance')
      expect(MEASUREMENT_TYPES).toContain('weight_distance')
      expect(MEASUREMENT_TYPES).toContain('calories')
      expect(MEASUREMENT_TYPES).toHaveLength(7)
    })
  })

  describe('WEIGHT_MEASUREMENT_TYPES', () => {
    it('contiene tipos que usan peso obligatorio', () => {
      expect(WEIGHT_MEASUREMENT_TYPES).toContain('weight_reps')
      expect(WEIGHT_MEASUREMENT_TYPES).toContain('weight_time')
      expect(WEIGHT_MEASUREMENT_TYPES).toContain('weight_distance')
      expect(WEIGHT_MEASUREMENT_TYPES).toHaveLength(3)
    })
  })

  describe('REPS_MEASUREMENT_TYPES', () => {
    it('contiene tipos que usan repeticiones', () => {
      expect(REPS_MEASUREMENT_TYPES).toContain('weight_reps')
      expect(REPS_MEASUREMENT_TYPES).toContain('reps_only')
      expect(REPS_MEASUREMENT_TYPES).toHaveLength(2)
    })
  })

  describe('isValidMeasurementType', () => {
    it('retorna true para tipos válidos', () => {
      MEASUREMENT_TYPES.forEach(type => {
        expect(isValidMeasurementType(type)).toBe(true)
      })
    })

    it('retorna false para tipos inválidos', () => {
      expect(isValidMeasurementType('invalid')).toBe(false)
      expect(isValidMeasurementType('')).toBe(false)
      expect(isValidMeasurementType(null)).toBe(false)
    })
  })

  describe('measurementTypeUsesWeight', () => {
    it('retorna true para weight_reps', () => {
      expect(measurementTypeUsesWeight('weight_reps')).toBe(true)
    })

    it('retorna true para weight_time', () => {
      expect(measurementTypeUsesWeight('weight_time')).toBe(true)
    })

    it('retorna true para weight_distance', () => {
      expect(measurementTypeUsesWeight('weight_distance')).toBe(true)
    })

    it('retorna false para reps_only', () => {
      expect(measurementTypeUsesWeight('reps_only')).toBe(false)
    })

    it('retorna false para time', () => {
      expect(measurementTypeUsesWeight('time')).toBe(false)
    })

    it('retorna false para calories', () => {
      expect(measurementTypeUsesWeight('calories')).toBe(false)
    })

    it('retorna false para tipos inválidos', () => {
      expect(measurementTypeUsesWeight('invalid')).toBe(false)
    })
  })

  describe('measurementTypeUsesReps', () => {
    it('retorna true para weight_reps', () => {
      expect(measurementTypeUsesReps('weight_reps')).toBe(true)
    })

    it('retorna true para reps_only', () => {
      expect(measurementTypeUsesReps('reps_only')).toBe(true)
    })

    it('retorna false para time', () => {
      expect(measurementTypeUsesReps('time')).toBe(false)
    })

    it('retorna false para distance', () => {
      expect(measurementTypeUsesReps('distance')).toBe(false)
    })

    it('retorna false para tipos inválidos', () => {
      expect(measurementTypeUsesReps('invalid')).toBe(false)
    })
  })

  describe('getEffortLabel', () => {
    it('retorna "RIR" para tipos con repeticiones', () => {
      expect(getEffortLabel('weight_reps')).toBe('RIR')
      expect(getEffortLabel('reps_only')).toBe('RIR')
    })

    it('retorna "Esfuerzo" para tipos sin repeticiones', () => {
      expect(getEffortLabel('time')).toBe('Esfuerzo')
      expect(getEffortLabel('distance')).toBe('Esfuerzo')
      expect(getEffortLabel('weight_distance')).toBe('Esfuerzo')
    })
  })

  describe('getDefaultReps', () => {
    it('retorna reps por defecto para weight_reps', () => {
      expect(getDefaultReps('weight_reps')).toBe('8-12')
    })

    it('retorna reps por defecto para reps_only', () => {
      expect(getDefaultReps('reps_only')).toBe('8-12')
    })

    it('retorna segundos para time', () => {
      expect(getDefaultReps('time')).toBe('30s')
    })

    it('retorna segundos para weight_time', () => {
      expect(getDefaultReps('weight_time')).toBe('30s')
    })

    it('retorna metros para distance', () => {
      expect(getDefaultReps('distance')).toBe('40m')
    })

    it('retorna metros para weight_distance', () => {
      expect(getDefaultReps('weight_distance')).toBe('40m')
    })

    it('retorna kcal para calories', () => {
      expect(getDefaultReps('calories')).toBe('100kcal')
    })

    it('retorna valor por defecto para tipo desconocido', () => {
      expect(getDefaultReps('unknown')).toBe('8-12')
    })
  })

  describe('getRepsLabel', () => {
    it('retorna "Repeticiones" para weight_reps', () => {
      expect(getRepsLabel('weight_reps')).toBe('Repeticiones')
    })

    it('retorna "Repeticiones" para reps_only', () => {
      expect(getRepsLabel('reps_only')).toBe('Repeticiones')
    })

    it('retorna "Tiempo" para time', () => {
      expect(getRepsLabel('time')).toBe('Tiempo')
    })

    it('retorna "Tiempo" para weight_time', () => {
      expect(getRepsLabel('weight_time')).toBe('Tiempo')
    })

    it('retorna "Distancia" para distance', () => {
      expect(getRepsLabel('distance')).toBe('Distancia')
    })

    it('retorna "Distancia" para weight_distance', () => {
      expect(getRepsLabel('weight_distance')).toBe('Distancia')
    })

    it('retorna "Calorías" para calories', () => {
      expect(getRepsLabel('calories')).toBe('Calorías')
    })

    it('retorna valor por defecto para tipo desconocido', () => {
      expect(getRepsLabel('unknown')).toBe('Repeticiones')
    })
  })

  describe('getRepsPlaceholder', () => {
    it('retorna placeholder correcto para weight_reps', () => {
      expect(getRepsPlaceholder('weight_reps')).toBe('Ej: 8-12')
    })

    it('retorna placeholder correcto para time', () => {
      expect(getRepsPlaceholder('time')).toBe('Ej: 30s, 1min')
    })

    it('retorna placeholder correcto para weight_time', () => {
      expect(getRepsPlaceholder('weight_time')).toBe('Ej: 30s, 1min')
    })

    it('retorna placeholder correcto para distance', () => {
      expect(getRepsPlaceholder('distance')).toBe('Ej: 40m')
    })

    it('retorna placeholder correcto para weight_distance', () => {
      expect(getRepsPlaceholder('weight_distance')).toBe('Ej: 40m')
    })

    it('retorna placeholder correcto para calories', () => {
      expect(getRepsPlaceholder('calories')).toBe('Ej: 100kcal')
    })

    it('retorna valor por defecto para tipo desconocido', () => {
      expect(getRepsPlaceholder('unknown')).toBe('Ej: 8-12')
    })
  })
})
