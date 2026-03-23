import { describe, it, expect } from 'vitest'
import { convertWeight, getWeightUnits, toggleWeightMode } from './weightConversion.js'

describe('convertWeight', () => {
  it('convierte libras a kilogramos', () => {
    expect(convertWeight('100', 'lb-to-kg')).toBe(45.36)
  })

  it('convierte kilogramos a libras', () => {
    expect(convertWeight('100', 'kg-to-lb')).toBe(220.46)
  })

  it('retorna null para string vacío', () => {
    expect(convertWeight('', 'lb-to-kg')).toBe(null)
  })

  it('retorna null para valor no numérico', () => {
    expect(convertWeight('abc', 'lb-to-kg')).toBe(null)
  })

  it('convierte cero correctamente', () => {
    expect(convertWeight('0', 'lb-to-kg')).toBe(0)
  })

  it('maneja decimales', () => {
    expect(convertWeight('2.5', 'kg-to-lb')).toBe(5.51)
  })
})

describe('getWeightUnits', () => {
  it('retorna lb/kg para modo lb-to-kg', () => {
    expect(getWeightUnits('lb-to-kg')).toEqual({ from: 'lb', to: 'kg' })
  })

  it('retorna kg/lb para modo kg-to-lb', () => {
    expect(getWeightUnits('kg-to-lb')).toEqual({ from: 'kg', to: 'lb' })
  })
})

describe('toggleWeightMode', () => {
  it('cambia de lb-to-kg a kg-to-lb', () => {
    expect(toggleWeightMode('lb-to-kg')).toBe('kg-to-lb')
  })

  it('cambia de kg-to-lb a lb-to-kg', () => {
    expect(toggleWeightMode('kg-to-lb')).toBe('lb-to-kg')
  })
})
