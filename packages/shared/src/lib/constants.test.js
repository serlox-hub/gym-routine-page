import { describe, it, expect } from 'vitest'
import { SENSATION_LABELS, SET_TYPE_LABELS } from './constants.js'

// Los proxies de labels resuelven claves string vía i18n. Una clave SYMBOL (llega al trap `get`
// en spreads, inspección o accesos a Symbol.*) NO debe lanzar TypeError al interpolarse en el
// template literal: debe devolver undefined. Bug latente hallado con el spike de checkJs (G4).
describe('SENSATION_LABELS / SET_TYPE_LABELS: guard de clave symbol', () => {
  it('acceder por una clave symbol devuelve undefined sin lanzar', () => {
    expect(() => SENSATION_LABELS[Symbol.iterator]).not.toThrow()
    expect(SENSATION_LABELS[Symbol.iterator]).toBeUndefined()
    expect(() => SET_TYPE_LABELS[Symbol.iterator]).not.toThrow()
    expect(SET_TYPE_LABELS[Symbol.iterator]).toBeUndefined()
  })
})
