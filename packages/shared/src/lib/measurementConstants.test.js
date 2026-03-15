import { describe, it, expect } from 'vitest'
import {
  BODY_MEASUREMENT_TYPES,
  BODY_MEASUREMENT_INFO,
  getOrderedMeasurementTypes,
  getMeasurementLabel,
} from './measurementConstants.js'

describe('measurementConstants', () => {
  describe('BODY_MEASUREMENT_TYPES', () => {
    it('contiene todos los tipos esperados', () => {
      expect(BODY_MEASUREMENT_TYPES.WAIST).toBe('cintura')
      expect(BODY_MEASUREMENT_TYPES.CHEST).toBe('pecho')
      expect(BODY_MEASUREMENT_TYPES.HIPS).toBe('cadera')
      expect(BODY_MEASUREMENT_TYPES.ARM_LEFT).toBe('brazo_izquierdo')
      expect(BODY_MEASUREMENT_TYPES.ARM_RIGHT).toBe('brazo_derecho')
      expect(BODY_MEASUREMENT_TYPES.NECK).toBe('cuello')
      expect(BODY_MEASUREMENT_TYPES.SHOULDERS).toBe('hombros')
    })
  })

  describe('BODY_MEASUREMENT_INFO', () => {
    it('tiene info para cada tipo de medida', () => {
      const types = Object.values(BODY_MEASUREMENT_TYPES)
      types.forEach(type => {
        expect(BODY_MEASUREMENT_INFO[type]).toBeDefined()
        expect(BODY_MEASUREMENT_INFO[type].label).toBeDefined()
        expect(BODY_MEASUREMENT_INFO[type].order).toBeDefined()
      })
    })

    it('tiene labels en español', () => {
      expect(BODY_MEASUREMENT_INFO.cintura.label).toBe('Cintura')
      expect(BODY_MEASUREMENT_INFO.pecho.label).toBe('Pecho')
      expect(BODY_MEASUREMENT_INFO.cadera.label).toBe('Cadera')
    })

    it('tiene órdenes únicos', () => {
      const orders = Object.values(BODY_MEASUREMENT_INFO).map(info => info.order)
      const uniqueOrders = new Set(orders)
      expect(uniqueOrders.size).toBe(orders.length)
    })
  })

  describe('getOrderedMeasurementTypes', () => {
    it('devuelve array de strings', () => {
      const result = getOrderedMeasurementTypes()
      expect(Array.isArray(result)).toBe(true)
      result.forEach(type => {
        expect(typeof type).toBe('string')
      })
    })

    it('devuelve todos los tipos', () => {
      const result = getOrderedMeasurementTypes()
      const expectedCount = Object.keys(BODY_MEASUREMENT_INFO).length
      expect(result).toHaveLength(expectedCount)
    })

    it('devuelve tipos en orden correcto', () => {
      const result = getOrderedMeasurementTypes()
      expect(result[0]).toBe('cintura')
      expect(result[1]).toBe('pecho')
      expect(result[2]).toBe('cadera')
    })

    it('mantiene orden consistente', () => {
      const result1 = getOrderedMeasurementTypes()
      const result2 = getOrderedMeasurementTypes()
      expect(result1).toEqual(result2)
    })
  })

  describe('getMeasurementLabel', () => {
    it('devuelve label correcto para tipos válidos', () => {
      expect(getMeasurementLabel('cintura')).toBe('Cintura')
      expect(getMeasurementLabel('pecho')).toBe('Pecho')
      expect(getMeasurementLabel('brazo_izquierdo')).toBe('Brazo izq.')
      expect(getMeasurementLabel('brazo_derecho')).toBe('Brazo der.')
    })

    it('devuelve el tipo como fallback para tipos desconocidos', () => {
      expect(getMeasurementLabel('tipo_inexistente')).toBe('tipo_inexistente')
      expect(getMeasurementLabel('custom')).toBe('custom')
    })

    it('maneja null y undefined', () => {
      expect(getMeasurementLabel(null)).toBe(null)
      expect(getMeasurementLabel(undefined)).toBe(undefined)
    })
  })
})
