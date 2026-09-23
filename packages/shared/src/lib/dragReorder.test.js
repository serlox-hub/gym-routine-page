import { describe, it, expect } from 'vitest'
import { getDropIndex, getDragShift, getAutoScrollSpeed } from './dragReorder.js'

const HEIGHTS = [100, 100, 100, 100]

describe('getDropIndex', () => {
  it('sin movimiento se queda en el índice de partida', () => {
    expect(getDropIndex(1, 0, HEIGHTS)).toBe(1)
  })

  it('no avanza mientras no se supere la mitad del vecino de abajo', () => {
    expect(getDropIndex(1, 50, HEIGHTS)).toBe(1)
  })

  it('avanza una posición al superar la mitad del vecino de abajo', () => {
    expect(getDropIndex(1, 51, HEIGHTS)).toBe(2)
  })

  it('avanza dos posiciones al superar también la mitad del siguiente', () => {
    expect(getDropIndex(1, 151, HEIGHTS)).toBe(3)
  })

  it('no se pasa del último índice por mucho que se arrastre', () => {
    expect(getDropIndex(1, 10000, HEIGHTS)).toBe(3)
  })

  it('retrocede al superar la mitad del vecino de arriba', () => {
    expect(getDropIndex(2, -51, HEIGHTS)).toBe(1)
  })

  it('no retrocede si no llega a la mitad del vecino de arriba', () => {
    expect(getDropIndex(2, -50, HEIGHTS)).toBe(2)
  })

  it('no baja de cero por mucho que se arrastre hacia arriba', () => {
    expect(getDropIndex(2, -10000, HEIGHTS)).toBe(0)
  })

  it('usa el alto real de cada vecino, no uno fijo', () => {
    // El vecino de abajo mide 300: hace falta cruzar 150, no 50.
    const heights = [100, 100, 300, 100]
    expect(getDropIndex(1, 140, heights)).toBe(1)
    expect(getDropIndex(1, 160, heights)).toBe(2)
  })

  it('devuelve el índice de partida con la lista vacía o sin alturas', () => {
    expect(getDropIndex(0, 500, [])).toBe(0)
    expect(getDropIndex(0, 500, null)).toBe(0)
    expect(getDropIndex(0, 500, undefined)).toBe(0)
  })

  it('devuelve el índice de partida si está fuera de rango', () => {
    expect(getDropIndex(-1, 500, HEIGHTS)).toBe(-1)
    expect(getDropIndex(9, 500, HEIGHTS)).toBe(9)
  })

  it('trata como 0 el alto de un elemento todavía sin medir', () => {
    const heights = [100, 100, undefined, 100]
    expect(getDropIndex(1, 10, heights)).toBe(2)
  })
})

describe('getDragShift', () => {
  it('el propio arrastrado nunca se desplaza', () => {
    expect(getDragShift(1, 1, 3, HEIGHTS)).toBe(0)
  })

  it('sin cambio de posición nadie se desplaza', () => {
    expect(getDragShift(2, 1, 1, HEIGHTS)).toBe(0)
  })

  it('al bajar, los que quedan entre origen y destino suben el alto del arrastrado', () => {
    expect(getDragShift(2, 1, 3, HEIGHTS)).toBe(-100)
    expect(getDragShift(3, 1, 3, HEIGHTS)).toBe(-100)
  })

  it('al subir, los que quedan entre destino y origen bajan el alto del arrastrado', () => {
    expect(getDragShift(1, 3, 1, HEIGHTS)).toBe(100)
    expect(getDragShift(2, 3, 1, HEIGHTS)).toBe(100)
  })

  it('los de fuera del tramo no se mueven', () => {
    expect(getDragShift(0, 1, 3, HEIGHTS)).toBe(0)
    expect(getDragShift(0, 3, 1, HEIGHTS)).toBe(0)
    expect(getDragShift(3, 2, 1, HEIGHTS)).toBe(0)
  })

  it('usa el alto del arrastrado, no el del que se aparta', () => {
    const heights = [100, 250, 100, 100]
    expect(getDragShift(2, 1, 2, heights)).toBe(-250)
  })

  it('no se desplaza nada sin alturas', () => {
    expect(getDragShift(2, 1, 3, null)).toBe(0)
    expect(getDragShift(2, 1, 3, [])).toBe(0)
  })

  it('no se desplaza nada si el propio arrastrado todavía no tiene alto medido', () => {
    const heights = [100, undefined, 100, 100]
    expect(getDragShift(2, 1, 3, heights)).toBe(0)
  })
})

describe('getAutoScrollSpeed', () => {
  const VIEWPORT = 800
  const EDGE = 100
  const MAX = 12

  it('no scrollea en la zona central', () => {
    expect(getAutoScrollSpeed(400, VIEWPORT, EDGE, MAX)).toBe(0)
    expect(getAutoScrollSpeed(EDGE, VIEWPORT, EDGE, MAX)).toBe(0)
    expect(getAutoScrollSpeed(VIEWPORT - EDGE, VIEWPORT, EDGE, MAX)).toBe(0)
  })

  it('sube con velocidad creciente al acercarse al borde superior', () => {
    expect(getAutoScrollSpeed(50, VIEWPORT, EDGE, MAX)).toBeCloseTo(-MAX / 2)
    expect(getAutoScrollSpeed(0, VIEWPORT, EDGE, MAX)).toBeCloseTo(-MAX)
  })

  it('baja con velocidad creciente al acercarse al borde inferior', () => {
    expect(getAutoScrollSpeed(750, VIEWPORT, EDGE, MAX)).toBeCloseTo(MAX / 2)
    expect(getAutoScrollSpeed(VIEWPORT, VIEWPORT, EDGE, MAX)).toBeCloseTo(MAX)
  })

  it('no supera maxSpeed aunque el dedo salga del viewport', () => {
    expect(getAutoScrollSpeed(-500, VIEWPORT, EDGE, MAX)).toBe(-MAX)
    expect(getAutoScrollSpeed(5000, VIEWPORT, EDGE, MAX)).toBe(MAX)
  })

  it('con las zonas solapadas manda la de arriba', () => {
    expect(getAutoScrollSpeed(60, 120, EDGE, MAX)).toBeLessThan(0)
  })

  it('devuelve 0 con parámetros degenerados', () => {
    expect(getAutoScrollSpeed(10, VIEWPORT, 0, MAX)).toBe(0)
    expect(getAutoScrollSpeed(10, VIEWPORT, EDGE, 0)).toBe(0)
    expect(getAutoScrollSpeed(10, 0, EDGE, MAX)).toBe(0)
  })
})
