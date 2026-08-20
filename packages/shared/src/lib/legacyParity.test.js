import { describe, it, expect } from 'vitest'
import { trackedFieldsFromLegacyType } from './measurementFields.js'
import { getDefaultTarget, getDefaultTargetField, getTargetLabel } from './measurementFields.js'
import { getSetColumns } from './setColumns.js'
import { getPRMetrics, getTrackableMetrics } from './sessionStatsCalculation.js'
import { formatSetValueByType } from './setUtils.js'

/**
 * Paridad con el modelo anterior.
 *
 * Hasta la v7 del esquema, un ejercicio elegía uno de 12 `measurement_type` cerrados y cada
 * comportamiento (columnas de la fila, métricas de stats, métricas de PR, objetivo, formato del
 * valor) salía de un `switch` o un mapa escrito a mano con los 12 casos. Ahora todo eso se DERIVA
 * de los campos que mide el ejercicio.
 *
 * Esta tabla congela la salida que tenían aquellos 12 casos. Es la red que justifica las reglas
 * derivadas: si una regla cambia de forma que altere el comportamiento histórico, aquí se ve.
 * No borrar al retirar el último dato v6: los usuarios pueden importar un JSON antiguo siempre.
 */
const LEGACY = [
  {
    type: 'weight_reps',
    columns: ['weight', 'reps'],
    metrics: ['weight', 'reps', '1rm', 'volume', 'repPR'],
    prMetrics: ['1rm', 'weight', 'repPR'],
    targetLabel: 'Repeticiones',
    defaultTarget: '8-12',
    set: { weight: 80, reps: 12 },
    formatted: '80kg × 12',
  },
  {
    type: 'reps_only',
    columns: ['reps'],
    metrics: ['reps'],
    prMetrics: ['reps'],
    targetLabel: 'Repeticiones',
    defaultTarget: '8-12',
    set: { reps: 15 },
    formatted: '15 reps',
  },
  {
    type: 'time',
    columns: ['time'],
    metrics: ['time'],
    prMetrics: ['time'],
    targetLabel: 'Tiempo',
    defaultTarget: '30s',
    set: { timeSeconds: 45 },
    formatted: '45s',
  },
  {
    type: 'weight_time',
    columns: ['weight', 'time'],
    metrics: ['weight', 'time'],
    prMetrics: [],
    targetLabel: 'Tiempo',
    defaultTarget: '30s',
    set: { weight: 10, timeSeconds: 30 },
    formatted: '10kg × 30s',
  },
  {
    type: 'distance',
    columns: ['distance'],
    metrics: ['distance'],
    prMetrics: ['distance'],
    targetLabel: 'Distancia',
    defaultTarget: '40m',
    set: { distanceMeters: 100 },
    formatted: '100m',
  },
  {
    type: 'weight_distance',
    columns: ['weight', 'distance'],
    metrics: ['weight', 'distance'],
    prMetrics: [],
    targetLabel: 'Distancia',
    defaultTarget: '40m',
    set: { weight: 20, distanceMeters: 100 },
    formatted: '20kg × 100m',
  },
  {
    type: 'calories',
    columns: ['calories'],
    metrics: [],
    prMetrics: [],
    targetLabel: 'Calorías',
    defaultTarget: '100kcal',
    set: { caloriesBurned: 300 },
    formatted: '300kcal',
  },
  {
    type: 'level_time',
    columns: ['level', 'time'],
    metrics: ['time'],
    prMetrics: [],
    targetLabel: 'Tiempo',
    defaultTarget: '30s',
    set: { level: 12, timeSeconds: 1200 },
    formatted: 'Nv12 × 20:00 min',
  },
  {
    type: 'level_distance',
    columns: ['level', 'distance'],
    metrics: ['distance'],
    prMetrics: [],
    targetLabel: 'Distancia',
    defaultTarget: '40m',
    set: { level: 8, distanceMeters: 500 },
    formatted: 'Nv8 × 500m',
  },
  {
    type: 'level_calories',
    columns: ['level', 'calories'],
    metrics: [],
    prMetrics: [],
    targetLabel: 'Calorías',
    defaultTarget: '100kcal',
    set: { level: 10, caloriesBurned: 200 },
    formatted: 'Nv10 × 200kcal',
  },
  {
    type: 'distance_time',
    columns: ['distance', 'time'],
    metrics: ['distance', 'time'],
    prMetrics: [],
    targetLabel: 'Distancia',
    defaultTarget: '5km',
    set: { distanceMeters: 500, timeSeconds: 120 },
    formatted: '500m × 2:00 min',
  },
  {
    type: 'distance_pace',
    columns: ['distance', 'pace'],
    metrics: ['distance', 'pace'],
    prMetrics: ['pace'],
    targetLabel: 'Distancia',
    defaultTarget: '5km',
    set: { distanceMeters: 5000, paceSeconds: 300 },
    formatted: '5000m @ 5:00/m',
  },
]

describe('paridad con los 12 measurement_type históricos', () => {
  it.each(LEGACY)('$type', ({ type, columns, metrics, prMetrics, targetLabel, defaultTarget, set, formatted }) => {
    const fields = trackedFieldsFromLegacyType(type)
    expect(getSetColumns(fields).map(c => c.field)).toEqual(columns)
    expect(getTrackableMetrics(fields)).toEqual(metrics)
    expect(getPRMetrics(fields)).toEqual(prMetrics)
    // El objetivo ya es explícito por fila (issue #28); lo que se comprueba aquí es que el campo
    // PROPUESTO al añadir el ejercicio sigue siendo el que la app venía asumiendo con el enum.
    const targetField = getDefaultTargetField(fields)
    expect(getTargetLabel(targetField)).toBe(targetLabel)
    expect(getDefaultTarget(targetField, fields)).toBe(defaultTarget)
    expect(formatSetValueByType(set, fields)).toBe(formatted)
  })

  it('cubre los 12 tipos, sin duplicados', () => {
    expect(new Set(LEGACY.map(l => l.type)).size).toBe(12)
  })
})

// El caso que motivó el cambio: tres métricas no cabían en el enum de pares.
describe('bici estática (nivel × distancia × tiempo)', () => {
  const BIKE = ['level', 'distance', 'time']

  it('pinta las tres columnas, en orden', () => {
    expect(getSetColumns(BIKE).map(c => c.field)).toEqual(['level', 'distance', 'time'])
    expect(getSetColumns(BIKE).map(c => c.label)).toEqual(['NIVEL', 'M', 'MM:SS'])
  })

  it('registra distancia y tiempo en stats, pero no dispara PRs', () => {
    // Tres dimensiones no son comparables entre sí: más distancia a menos nivel no es mejor.
    expect(getTrackableMetrics(BIKE)).toEqual(['distance', 'time'])
    expect(getPRMetrics(BIKE)).toEqual([])
  })

  it('el objetivo va en kilómetros y el valor se lee entero', () => {
    expect(getDefaultTarget(getDefaultTargetField(BIKE), BIKE)).toBe('5km')
    expect(formatSetValueByType({ level: 12, distanceMeters: 5000, timeSeconds: 1200 }, BIKE))
      .toBe('Nv12 × 5000m × 20:00 min')
  })
})
