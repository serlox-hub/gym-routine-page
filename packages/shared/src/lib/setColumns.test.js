import { describe, it, expect } from 'vitest'
import { getSetColumns, getSetFieldValues, buildSetFieldsPayload, SetField } from './setColumns.js'
import {
  MEASUREMENT_TYPES,
  MeasurementType,
  measurementTypeUsesWeight,
  measurementTypeUsesReps,
  measurementTypeUsesTime,
  measurementTypeUsesDistance,
  measurementTypeUsesLevel,
} from './measurementTypes.js'

const fieldsOf = (type, units) => getSetColumns(type, units).map(c => c.field)

describe('getSetColumns', () => {
  it('devuelve los campos de cada tipo de medición', () => {
    expect(fieldsOf(MeasurementType.WEIGHT_REPS)).toEqual([SetField.WEIGHT, SetField.REPS])
    expect(fieldsOf(MeasurementType.REPS_ONLY)).toEqual([SetField.REPS])
    expect(fieldsOf(MeasurementType.TIME)).toEqual([SetField.TIME])
    expect(fieldsOf(MeasurementType.WEIGHT_TIME)).toEqual([SetField.WEIGHT, SetField.TIME])
    expect(fieldsOf(MeasurementType.DISTANCE)).toEqual([SetField.DISTANCE])
    expect(fieldsOf(MeasurementType.WEIGHT_DISTANCE)).toEqual([SetField.WEIGHT, SetField.DISTANCE])
    expect(fieldsOf(MeasurementType.CALORIES)).toEqual([SetField.CALORIES])
    expect(fieldsOf(MeasurementType.LEVEL_TIME)).toEqual([SetField.LEVEL, SetField.TIME])
    expect(fieldsOf(MeasurementType.LEVEL_DISTANCE)).toEqual([SetField.LEVEL, SetField.DISTANCE])
    expect(fieldsOf(MeasurementType.LEVEL_CALORIES)).toEqual([SetField.LEVEL, SetField.CALORIES])
    expect(fieldsOf(MeasurementType.DISTANCE_TIME)).toEqual([SetField.DISTANCE, SetField.TIME])
    expect(fieldsOf(MeasurementType.DISTANCE_PACE)).toEqual([SetField.DISTANCE, SetField.PACE])
  })

  it('todos los tipos tienen 1 o 2 columnas (el grid no admite más)', () => {
    MEASUREMENT_TYPES.forEach(type => {
      const count = getSetColumns(type).length
      expect(count).toBeGreaterThanOrEqual(1)
      expect(count).toBeLessThanOrEqual(2)
    })
  })

  // Red de seguridad del fallback silencioso: si alguien añade un measurement_type y olvida la
  // tabla, getSetColumns devolvería peso+reps para un ejercicio de distancia sin avisar.
  it.each(MEASUREMENT_TYPES)('las columnas de %s casan con los predicados de measurementTypes', (type) => {
    const fields = fieldsOf(type)
    expect(fields.includes(SetField.WEIGHT)).toBe(measurementTypeUsesWeight(type))
    expect(fields.includes(SetField.REPS)).toBe(measurementTypeUsesReps(type))
    expect(fields.includes(SetField.TIME)).toBe(measurementTypeUsesTime(type))
    expect(fields.includes(SetField.DISTANCE)).toBe(measurementTypeUsesDistance(type))
    expect(fields.includes(SetField.LEVEL)).toBe(measurementTypeUsesLevel(type))
  })

  it('tipo nulo o desconocido cae en weight_reps (fallback único de lectura)', () => {
    expect(fieldsOf(null)).toEqual([SetField.WEIGHT, SetField.REPS])
    expect(fieldsOf(undefined)).toEqual([SetField.WEIGHT, SetField.REPS])
    expect(fieldsOf('lo_que_sea')).toEqual([SetField.WEIGHT, SetField.REPS])
  })

  it('las cabeceras de peso y distancia usan la unidad recibida', () => {
    expect(getSetColumns(MeasurementType.WEIGHT_REPS, { weightUnit: 'lb' })[0].label).toBe('LB')
    expect(getSetColumns(MeasurementType.WEIGHT_REPS)[0].label).toBe('KG')
    expect(getSetColumns(MeasurementType.DISTANCE_TIME, { distanceUnit: 'km' })[0].label).toBe('KM')
    expect(getSetColumns(MeasurementType.DISTANCE_TIME)[0].label).toBe('M')
  })

  it('la columna de tiempo anuncia el formato del input', () => {
    expect(getSetColumns(MeasurementType.TIME)[0].label).toBe('MM:SS')
  })

  it('todas las columnas traen cabecera y unidad no vacías', () => {
    MEASUREMENT_TYPES.forEach(type => {
      getSetColumns(type).forEach(col => {
        expect(col.label).not.toBe('')
        expect(col.unit).not.toBe('')
      })
    })
  })

  it('la unidad del tiempo es "min" (no "MM:SS"): dice en qué unidad está, no el formato', () => {
    expect(getSetColumns(MeasurementType.TIME)[0].unit).toBe('min')
    expect(getSetColumns(MeasurementType.DISTANCE_PACE)[1].unit).toBe('mm:ss')
    expect(getSetColumns(MeasurementType.WEIGHT_REPS, { weightUnit: 'lb' })[0].unit).toBe('lb')
  })

  it('marca como decimales solo peso y distancia', () => {
    expect(getSetColumns(MeasurementType.WEIGHT_REPS).map(c => c.decimal)).toEqual([true, false])
    expect(getSetColumns(MeasurementType.DISTANCE_TIME).map(c => c.decimal)).toEqual([true, false])
    expect(getSetColumns(MeasurementType.LEVEL_CALORIES).map(c => c.decimal)).toEqual([false, false])
  })
})

describe('getSetFieldValues / buildSetFieldsPayload', () => {
  const row = {
    weight: 80, reps_completed: 10, time_seconds: 1200, distance_meters: 5000,
    calories_burned: 240, level: 12, pace_seconds: 300,
  }

  it('lee de la fila de completed_sets solo los campos del tipo', () => {
    expect(getSetFieldValues(row, getSetColumns(MeasurementType.LEVEL_TIME)))
      .toEqual({ level: 12, time: 1200 })
    expect(getSetFieldValues(row, getSetColumns(MeasurementType.DISTANCE_PACE)))
      .toEqual({ distance: 5000, pace: 300 })
  })

  it('los campos vacíos llegan como "" (input controlado, nunca null)', () => {
    expect(getSetFieldValues({ level: null }, getSetColumns(MeasurementType.LEVEL_CALORIES)))
      .toEqual({ level: '', calories: '' })
    expect(getSetFieldValues(undefined, getSetColumns(MeasurementType.TIME)))
      .toEqual({ time: '' })
  })

  it('el 0 es un valor, no un vacío', () => {
    expect(getSetFieldValues({ weight: 0, reps_completed: 0 }, getSetColumns(MeasurementType.WEIGHT_REPS)))
      .toEqual({ weight: 0, reps: 0 })
  })

  it('construye el payload de upsert con las claves camelCase', () => {
    expect(buildSetFieldsPayload({ level: '12', time: 1200 }, getSetColumns(MeasurementType.LEVEL_TIME)))
      .toEqual({ level: 12, timeSeconds: 1200 })
    expect(buildSetFieldsPayload({ weight: '82,5', reps: '10' }, getSetColumns(MeasurementType.WEIGHT_REPS)))
      .toEqual({ weight: 82.5, repsCompleted: 10 })
  })

  it('no incluye los campos de otros tipos (el upsert no los pisa)', () => {
    const payload = buildSetFieldsPayload({ level: 5, calories: 200 }, getSetColumns(MeasurementType.LEVEL_CALORIES))
    expect(Object.keys(payload).sort()).toEqual(['caloriesBurned', 'level'])
  })

  it('vacío → null (borrar el valor)', () => {
    expect(buildSetFieldsPayload({ time: '' }, getSetColumns(MeasurementType.TIME)))
      .toEqual({ timeSeconds: null })
  })
})
