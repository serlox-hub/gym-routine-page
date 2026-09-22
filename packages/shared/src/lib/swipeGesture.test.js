import { describe, it, expect } from 'vitest'
import { shouldClaimSwipe, clampSwipeOffset } from './swipeGesture.js'

const ACTIVATION = 5
const MAX_TRAVEL = 96

describe('shouldClaimSwipe', () => {
  it('no reclama por debajo de la distancia de activación', () => {
    expect(shouldClaimSwipe(4, 3, { activationDistance: ACTIVATION })).toBe(false)
    expect(shouldClaimSwipe(0, 0, { activationDistance: ACTIVATION })).toBe(false)
    expect(shouldClaimSwipe(-4, 0, { activationDistance: ACTIVATION })).toBe(false)
  })

  it('reclama un movimiento horizontal puro en el límite exacto', () => {
    expect(shouldClaimSwipe(5, 0, { activationDistance: ACTIVATION })).toBe(true)
    expect(shouldClaimSwipe(-5, 0, { activationDistance: ACTIVATION })).toBe(true)
  })

  it('exige dominancia 2:1 sobre el eje vertical', () => {
    // 5px de recorrido, pero 3 de ellos verticales: es scroll, no swipe
    expect(shouldClaimSwipe(5, 3, { activationDistance: ACTIVATION })).toBe(false)
    expect(shouldClaimSwipe(10, 5, { activationDistance: ACTIVATION })).toBe(true)
    expect(shouldClaimSwipe(10, 6, { activationDistance: ACTIVATION })).toBe(false)
    expect(shouldClaimSwipe(-10, 5, { activationDistance: ACTIVATION })).toBe(true)
  })

  it('nunca reclama un movimiento vertical dominante', () => {
    expect(shouldClaimSwipe(2, 40, { activationDistance: ACTIVATION })).toBe(false)
    expect(shouldClaimSwipe(0, -40, { activationDistance: ACTIVATION })).toBe(false)
  })

  it('`blocked` gana siempre, por claro que sea el swipe', () => {
    expect(shouldClaimSwipe(100, 0, { activationDistance: ACTIVATION, blocked: true })).toBe(false)
    expect(shouldClaimSwipe(-100, 0, { activationDistance: ACTIVATION, blocked: true })).toBe(false)
  })

  it('`blocked` por defecto es false', () => {
    expect(shouldClaimSwipe(100, 0, { activationDistance: ACTIVATION })).toBe(true)
  })

  it('es pura: mismos argumentos, mismo resultado', () => {
    const args = [7, 2, { activationDistance: ACTIVATION }]
    const first = shouldClaimSwipe(...args)
    expect(shouldClaimSwipe(...args)).toBe(first)
    expect(shouldClaimSwipe(...args)).toBe(first)
  })
})

describe('clampSwipeOffset', () => {
  it('arrastrar a la derecha desde el reposo no mueve nada', () => {
    expect(clampSwipeOffset(10, MAX_TRAVEL)).toBe(0)
    expect(clampSwipeOffset(0, MAX_TRAVEL)).toBe(0)
  })

  it('a la izquierda sigue al dedo hasta el recorrido máximo', () => {
    expect(clampSwipeOffset(-1, MAX_TRAVEL)).toBe(-1)
    expect(clampSwipeOffset(-50, MAX_TRAVEL)).toBe(-50)
    expect(clampSwipeOffset(-MAX_TRAVEL, MAX_TRAVEL)).toBe(-MAX_TRAVEL)
  })

  it('acota pasado el recorrido máximo', () => {
    expect(clampSwipeOffset(-MAX_TRAVEL - 1, MAX_TRAVEL)).toBe(-MAX_TRAVEL)
    expect(clampSwipeOffset(-1000, MAX_TRAVEL)).toBe(-MAX_TRAVEL)
  })

  it('el resultado siempre cae en [-maxTravel, 0]', () => {
    for (const dx of [-1000, -97, -96, -1, 0, 1, 1000]) {
      const offset = clampSwipeOffset(dx, MAX_TRAVEL)
      expect(offset).toBeLessThanOrEqual(0)
      expect(offset).toBeGreaterThanOrEqual(-MAX_TRAVEL)
    }
  })
})
