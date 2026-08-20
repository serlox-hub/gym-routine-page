import { describe, it, expect } from 'vitest'
import { getSetColumns, getSetFieldValues, buildSetFieldsPayload } from './setColumns.js'
import { DEFAULT_TRACKED_FIELDS, FIELD_ORDER, MAX_TRACKED_FIELDS, SetField } from './measurementFields.js'

const fieldsOf = (fields, units) => getSetColumns(fields, units).map(c => c.field)

const LEVEL_TIME = [SetField.LEVEL, SetField.TIME]
const WEIGHT_REPS = [SetField.WEIGHT, SetField.REPS]
const DISTANCE_PACE = [SetField.DISTANCE, SetField.PACE]
const LEVEL_CALORIES = [SetField.LEVEL, SetField.CALORIES]
const BIKE = [SetField.LEVEL, SetField.DISTANCE, SetField.TIME]

describe('getSetColumns', () => {
  it('una columna por campo, en el orden canónico', () => {
    expect(fieldsOf(['time', 'level'])).toEqual(LEVEL_TIME)
    expect(fieldsOf(['reps', 'weight'])).toEqual(WEIGHT_REPS)
    expect(fieldsOf(BIKE)).toEqual(BIKE)
  })

  it('nunca pasa del máximo de columnas (el grid no admite más)', () => {
    expect(getSetColumns(FIELD_ORDER)).toHaveLength(MAX_TRACKED_FIELDS)
  })

  it('campos nulos o desconocidos caen en peso × reps (fallback único de lectura)', () => {
    expect(fieldsOf(null)).toEqual(DEFAULT_TRACKED_FIELDS)
    expect(fieldsOf(undefined)).toEqual(DEFAULT_TRACKED_FIELDS)
    expect(fieldsOf(['lo_que_sea'])).toEqual(DEFAULT_TRACKED_FIELDS)
  })

  it('las cabeceras de peso y distancia usan la unidad recibida', () => {
    expect(getSetColumns(WEIGHT_REPS, { weightUnit: 'lb' })[0].label).toBe('LB')
    expect(getSetColumns(WEIGHT_REPS)[0].label).toBe('KG')
    expect(getSetColumns(['distance', 'time'], { distanceUnit: 'km' })[0].label).toBe('KM')
    expect(getSetColumns(['distance', 'time'])[0].label).toBe('M')
  })

  it('la columna de tiempo anuncia el formato del input', () => {
    expect(getSetColumns(['time'])[0].label).toBe('MM:SS')
  })

  it('todas las columnas traen cabecera y unidad no vacías', () => {
    FIELD_ORDER.forEach(field => {
      const [col] = getSetColumns([field])
      expect(col.label).not.toBe('')
      expect(col.unit).not.toBe('')
    })
  })

  it('la unidad del tiempo es "min" (no "MM:SS"): dice en qué unidad está, no el formato', () => {
    expect(getSetColumns(['time'])[0].unit).toBe('min')
    expect(getSetColumns(DISTANCE_PACE)[1].unit).toBe('mm:ss')
    expect(getSetColumns(WEIGHT_REPS, { weightUnit: 'lb' })[0].unit).toBe('lb')
  })

  it('marca como decimales solo peso y distancia', () => {
    expect(getSetColumns(WEIGHT_REPS).map(c => c.decimal)).toEqual([true, false])
    expect(getSetColumns(['distance', 'time']).map(c => c.decimal)).toEqual([true, false])
    expect(getSetColumns(LEVEL_CALORIES).map(c => c.decimal)).toEqual([false, false])
  })
})

describe('getSetFieldValues / buildSetFieldsPayload', () => {
  const row = {
    weight: 80, reps_completed: 10, time_seconds: 1200, distance_meters: 5000,
    calories_burned: 240, level: 12, pace_seconds: 300,
  }

  it('lee de la fila de completed_sets solo los campos del ejercicio', () => {
    expect(getSetFieldValues(row, getSetColumns(LEVEL_TIME)))
      .toEqual({ level: 12, time: 1200 })
    expect(getSetFieldValues(row, getSetColumns(DISTANCE_PACE)))
      .toEqual({ distance: 5000, pace: 300 })
    expect(getSetFieldValues(row, getSetColumns(BIKE)))
      .toEqual({ level: 12, distance: 5000, time: 1200 })
  })

  it('los campos vacíos llegan como "" (input controlado, nunca null)', () => {
    expect(getSetFieldValues({ level: null }, getSetColumns(LEVEL_CALORIES)))
      .toEqual({ level: '', calories: '' })
    expect(getSetFieldValues(undefined, getSetColumns(['time'])))
      .toEqual({ time: '' })
  })

  it('el 0 es un valor, no un vacío', () => {
    expect(getSetFieldValues({ weight: 0, reps_completed: 0 }, getSetColumns(WEIGHT_REPS)))
      .toEqual({ weight: 0, reps: 0 })
  })

  it('construye el payload de upsert con las claves camelCase', () => {
    expect(buildSetFieldsPayload({ level: '12', time: 1200 }, getSetColumns(LEVEL_TIME)))
      .toEqual({ level: 12, timeSeconds: 1200 })
    expect(buildSetFieldsPayload({ weight: '82,5', reps: '10' }, getSetColumns(WEIGHT_REPS)))
      .toEqual({ weight: 82.5, repsCompleted: 10 })
  })

  it('no incluye los campos que el ejercicio no mide (el upsert no los pisa)', () => {
    const payload = buildSetFieldsPayload({ level: 5, calories: 200 }, getSetColumns(LEVEL_CALORIES))
    expect(Object.keys(payload).sort()).toEqual(['caloriesBurned', 'level'])
  })

  it('vacío → null (borrar el valor)', () => {
    expect(buildSetFieldsPayload({ time: '' }, getSetColumns(['time'])))
      .toEqual({ timeSeconds: null })
  })
})
