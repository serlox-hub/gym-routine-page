import { describe, it, expect } from 'vitest'
import {
  MEASUREMENT_TYPES,
  WEIGHT_MEASUREMENT_TYPES,
  REPS_MEASUREMENT_TYPES,
  LEVEL_MEASUREMENT_TYPES,
  isValidMeasurementType,
  measurementTypeUsesWeight,
  measurementTypeUsesReps,
  measurementTypeUsesLevel,
  getEffortLabel,
  getEffortOptions,
  getEffortInfo,
  formatEffortBadge,
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
      expect(MEASUREMENT_TYPES).toContain('level_time')
      expect(MEASUREMENT_TYPES).toContain('level_distance')
      expect(MEASUREMENT_TYPES).toContain('level_calories')
      expect(MEASUREMENT_TYPES).toContain('distance_time')
      expect(MEASUREMENT_TYPES).toContain('distance_pace')
      expect(MEASUREMENT_TYPES).toHaveLength(12)
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

  describe('LEVEL_MEASUREMENT_TYPES', () => {
    it('contiene tipos que usan nivel', () => {
      expect(LEVEL_MEASUREMENT_TYPES).toContain('level_time')
      expect(LEVEL_MEASUREMENT_TYPES).toContain('level_distance')
      expect(LEVEL_MEASUREMENT_TYPES).toContain('level_calories')
      expect(LEVEL_MEASUREMENT_TYPES).toHaveLength(3)
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

    it('retorna false para level_time', () => {
      expect(measurementTypeUsesWeight('level_time')).toBe(false)
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

    it('retorna false para level_time', () => {
      expect(measurementTypeUsesReps('level_time')).toBe(false)
    })

    it('retorna false para tipos inválidos', () => {
      expect(measurementTypeUsesReps('invalid')).toBe(false)
    })
  })

  describe('measurementTypeUsesLevel', () => {
    it('retorna true para level_time', () => {
      expect(measurementTypeUsesLevel('level_time')).toBe(true)
    })

    it('retorna true para level_distance', () => {
      expect(measurementTypeUsesLevel('level_distance')).toBe(true)
    })

    it('retorna true para level_calories', () => {
      expect(measurementTypeUsesLevel('level_calories')).toBe(true)
    })

    it('retorna false para weight_reps', () => {
      expect(measurementTypeUsesLevel('weight_reps')).toBe(false)
    })

    it('retorna false para distance_time', () => {
      expect(measurementTypeUsesLevel('distance_time')).toBe(false)
    })

    it('retorna false para tipos inválidos', () => {
      expect(measurementTypeUsesLevel('invalid')).toBe(false)
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
      expect(getEffortLabel('level_time')).toBe('Esfuerzo')
      expect(getEffortLabel('distance_time')).toBe('Esfuerzo')
    })
  })

  describe('getEffortOptions', () => {
    it('devuelve las opciones RIR (F/0/1/2/3+) para tipos con reps', () => {
      const opts = getEffortOptions('weight_reps')
      expect(opts).toHaveLength(5)
      expect(opts.map(o => o.value)).toEqual([-1, 0, 1, 2, 3])
      expect(opts.map(o => o.label)).toEqual(['F', '0', '1', '2', '3+'])
      expect(getEffortOptions('reps_only')).toBe(opts)
    })

    it('devuelve las opciones RPE (1-5) para tipos sin reps', () => {
      const opts = getEffortOptions('time')
      expect(opts).toHaveLength(5)
      expect(opts.map(o => o.value)).toEqual([1, 2, 3, 4, 5])
      opts.forEach(o => expect(o.label).toBeTruthy())
    })

    it('trata un tipo desconocido como no-reps (RPE)', () => {
      expect(getEffortOptions('unknown').map(o => o.value)).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('getEffortInfo', () => {
    it('devuelve null si el valor es null o undefined', () => {
      expect(getEffortInfo(null, 'weight_reps')).toBeNull()
      expect(getEffortInfo(undefined, 'weight_reps')).toBeNull()
    })

    it('devuelve label de RIR para ejercicios con reps', () => {
      expect(getEffortInfo(0, 'weight_reps').label).toBe('0')
      expect(getEffortInfo(3, 'reps_only').label).toBe('3+')
      expect(getEffortInfo(-1, 'weight_reps').label).toBe('F')
    })

    it('devuelve label descriptivo de RPE para ejercicios sin reps', () => {
      // El label viene de i18n — verificamos que existe (no string vacío)
      expect(getEffortInfo(1, 'time').label).toBeTruthy()
      expect(getEffortInfo(5, 'distance').label).toBeTruthy()
    })

    it('devuelve labels diferentes para mismo valor según measurementType', () => {
      const rirInfo = getEffortInfo(1, 'weight_reps')
      const rpeInfo = getEffortInfo(1, 'time')
      expect(rirInfo.label).not.toBe(rpeInfo.label)
    })
  })

  describe('formatEffortBadge', () => {
    it('devuelve string vacío si el valor es null o undefined', () => {
      expect(formatEffortBadge(null, 'weight_reps')).toBe('')
      expect(formatEffortBadge(undefined, 'time')).toBe('')
    })

    it('prefija con "@" la etiqueta RIR para ejercicios con reps', () => {
      expect(formatEffortBadge(0, 'weight_reps')).toBe('@0')
      expect(formatEffortBadge(1, 'weight_reps')).toBe('@1')
      expect(formatEffortBadge(3, 'reps_only')).toBe('@3+')
      expect(formatEffortBadge(-1, 'weight_reps')).toBe('@F')
    })

    it('devuelve la etiqueta RPE sin "@" para ejercicios sin reps', () => {
      const badge = formatEffortBadge(1, 'time')
      expect(badge).toBeTruthy()
      expect(badge.startsWith('@')).toBe(false)
    })

    it('produce badges distintos para mismo valor según measurementType', () => {
      expect(formatEffortBadge(1, 'weight_reps')).not.toBe(formatEffortBadge(1, 'time'))
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

    it('retorna segundos para level_time', () => {
      expect(getDefaultReps('level_time')).toBe('30s')
    })

    it('retorna metros para level_distance', () => {
      expect(getDefaultReps('level_distance')).toBe('40m')
    })

    it('retorna kcal para level_calories', () => {
      expect(getDefaultReps('level_calories')).toBe('100kcal')
    })

    it('retorna km para distance_time', () => {
      expect(getDefaultReps('distance_time')).toBe('5km')
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

    it('retorna "Tiempo" para level_time', () => {
      expect(getRepsLabel('level_time')).toBe('Tiempo')
    })

    it('retorna "Distancia" para level_distance', () => {
      expect(getRepsLabel('level_distance')).toBe('Distancia')
    })

    it('retorna "Calorías" para level_calories', () => {
      expect(getRepsLabel('level_calories')).toBe('Calorías')
    })

    it('retorna "Distancia" para distance_time', () => {
      expect(getRepsLabel('distance_time')).toBe('Distancia')
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

    it('retorna placeholder correcto para level_time', () => {
      expect(getRepsPlaceholder('level_time')).toBe('Ej: 30s, 1min')
    })

    it('retorna placeholder correcto para level_distance', () => {
      expect(getRepsPlaceholder('level_distance')).toBe('Ej: 40m')
    })

    it('retorna placeholder correcto para level_calories', () => {
      expect(getRepsPlaceholder('level_calories')).toBe('Ej: 100kcal')
    })

    it('retorna placeholder correcto para distance_time', () => {
      expect(getRepsPlaceholder('distance_time')).toBe('Ej: 5km')
    })

    it('retorna valor por defecto para tipo desconocido', () => {
      expect(getRepsPlaceholder('unknown')).toBe('Ej: 8-12')
    })
  })
})
