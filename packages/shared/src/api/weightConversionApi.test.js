import { describe, it, expect } from 'vitest'
import { getConversionFactor } from './weightConversionApi.js'

describe('getConversionFactor', () => {
  it('returns 1 when units are the same', () => {
    expect(getConversionFactor('kg', 'kg')).toBe(1)
    expect(getConversionFactor('lb', 'lb')).toBe(1)
  })

  it('returns kg→lb factor (~2.20462262)', () => {
    expect(getConversionFactor('kg', 'lb')).toBeCloseTo(2.20462262, 6)
  })

  it('returns lb→kg factor (~0.45359237)', () => {
    expect(getConversionFactor('lb', 'kg')).toBeCloseTo(0.45359237, 6)
  })

  it('roundtrip kg→lb→kg preserves value within rounding', () => {
    const factorOut = getConversionFactor('kg', 'lb')
    const factorBack = getConversionFactor('lb', 'kg')
    const value = 100
    const out = value * factorOut
    const back = out * factorBack
    expect(back).toBeCloseTo(value, 4)
  })

  it('throws on unsupported conversion', () => {
    expect(() => getConversionFactor('kg', 'oz')).toThrow()
    expect(() => getConversionFactor('foo', 'bar')).toThrow()
  })
})
