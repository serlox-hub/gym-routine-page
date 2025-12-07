import { describe, it, expect } from 'vitest'
import {
  MEASUREMENT_TYPES,
  WEIGHT_MEASUREMENT_TYPES,
  isValidMeasurementType,
  measurementTypeUsesWeight,
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
      expect(MEASUREMENT_TYPES).toContain('distance')
      expect(MEASUREMENT_TYPES).toHaveLength(4)
    })
  })

  describe('WEIGHT_MEASUREMENT_TYPES', () => {
    it('contiene tipos que usan peso', () => {
      expect(WEIGHT_MEASUREMENT_TYPES).toContain('weight_reps')
      expect(WEIGHT_MEASUREMENT_TYPES).toContain('distance')
      expect(WEIGHT_MEASUREMENT_TYPES).toHaveLength(2)
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

    it('retorna true para distance', () => {
      expect(measurementTypeUsesWeight('distance')).toBe(true)
    })

    it('retorna false para reps_only', () => {
      expect(measurementTypeUsesWeight('reps_only')).toBe(false)
    })

    it('retorna false para time', () => {
      expect(measurementTypeUsesWeight('time')).toBe(false)
    })

    it('retorna false para tipos inválidos', () => {
      expect(measurementTypeUsesWeight('invalid')).toBe(false)
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

    it('retorna metros para distance', () => {
      expect(getDefaultReps('distance')).toBe('40m')
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

    it('retorna "Distancia" para distance', () => {
      expect(getRepsLabel('distance')).toBe('Distancia')
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

    it('retorna placeholder correcto para distance', () => {
      expect(getRepsPlaceholder('distance')).toBe('Ej: 40m')
    })

    it('retorna valor por defecto para tipo desconocido', () => {
      expect(getRepsPlaceholder('unknown')).toBe('Ej: 8-12')
    })
  })
})
