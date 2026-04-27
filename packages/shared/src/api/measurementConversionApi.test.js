import { describe, it, expect } from 'vitest'
import { getMeasurementConversionFactor } from './measurementConversionApi.js'

describe('getMeasurementConversionFactor', () => {
  it('returns 1 when units are the same', () => {
    expect(getMeasurementConversionFactor('cm', 'cm')).toBe(1)
    expect(getMeasurementConversionFactor('in', 'in')).toBe(1)
  })

  it('returns cm→in factor (~0.39370079)', () => {
    expect(getMeasurementConversionFactor('cm', 'in')).toBeCloseTo(0.39370079, 6)
  })

  it('returns in→cm factor (=2.54)', () => {
    expect(getMeasurementConversionFactor('in', 'cm')).toBeCloseTo(2.54, 6)
  })

  it('roundtrip cm→in→cm preserves value within rounding', () => {
    const factorOut = getMeasurementConversionFactor('cm', 'in')
    const factorBack = getMeasurementConversionFactor('in', 'cm')
    const value = 90
    const out = value * factorOut
    const back = out * factorBack
    expect(back).toBeCloseTo(value, 4)
  })

  it('throws on unsupported conversion', () => {
    expect(() => getMeasurementConversionFactor('cm', 'm')).toThrow()
    expect(() => getMeasurementConversionFactor('foo', 'bar')).toThrow()
  })
})
