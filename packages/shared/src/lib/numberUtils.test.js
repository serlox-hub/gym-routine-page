import { describe, test, expect } from 'vitest'
import { parseDecimal } from './numberUtils.js'

describe('parseDecimal', () => {
  test('parsea números con punto decimal', () => {
    expect(parseDecimal('75.5')).toBe(75.5)
    expect(parseDecimal('100.25')).toBe(100.25)
    expect(parseDecimal('0.1')).toBe(0.1)
  })

  test('parsea números con coma decimal', () => {
    expect(parseDecimal('75,5')).toBe(75.5)
    expect(parseDecimal('100,25')).toBe(100.25)
    expect(parseDecimal('0,1')).toBe(0.1)
  })

  test('parsea enteros sin decimales', () => {
    expect(parseDecimal('75')).toBe(75)
    expect(parseDecimal('100')).toBe(100)
    expect(parseDecimal('0')).toBe(0)
  })

  test('maneja strings vacíos y null/undefined', () => {
    expect(parseDecimal('')).toBeNaN()
    expect(parseDecimal(null)).toBeNaN()
    expect(parseDecimal(undefined)).toBeNaN()
  })

  test('maneja valores inválidos', () => {
    expect(parseDecimal('abc')).toBeNaN()
    expect(parseDecimal('75.5.5')).toBe(75.5) // parseFloat se detiene en el primer decimal válido
    expect(parseDecimal('75,5,5')).toBe(75.5)
  })

  test('maneja números como strings', () => {
    expect(parseDecimal(String(75.5))).toBe(75.5)
    expect(parseDecimal(String(100))).toBe(100)
  })
})
