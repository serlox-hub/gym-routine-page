import { describe, it, expect } from 'vitest'
import { getGymDisplayName, resolveSelectedGym } from './gymUtils.js'

describe('getGymDisplayName', () => {
  it('devuelve string vacío si el gym es null o undefined', () => {
    expect(getGymDisplayName(null, 'Mi gimnasio')).toBe('')
    expect(getGymDisplayName(undefined, 'Mi gimnasio')).toBe('')
  })

  it('devuelve la etiqueta por defecto cuando el gym no tiene nombre', () => {
    expect(getGymDisplayName({ is_default: true, name: null }, 'Mi gimnasio')).toBe('Mi gimnasio')
    expect(getGymDisplayName({ is_default: false, name: '' }, 'Mi gimnasio')).toBe('Mi gimnasio')
  })

  it('devuelve el nombre propio cuando existe', () => {
    expect(getGymDisplayName({ is_default: false, name: 'Basic-Fit' }, 'Mi gimnasio')).toBe('Basic-Fit')
    expect(getGymDisplayName({ is_default: true, name: 'Casa' }, 'Mi gimnasio')).toBe('Casa')
  })
})

describe('resolveSelectedGym', () => {
  const gyms = [
    { id: 1, is_default: true },
    { id: 2, is_default: false },
    { id: 3, is_default: false },
  ]

  it('devuelve null si no hay gyms', () => {
    expect(resolveSelectedGym([], 2)).toBeNull()
    expect(resolveSelectedGym(null, 2)).toBeNull()
  })

  it('devuelve el último gym usado si existe (comparando por id como string)', () => {
    expect(resolveSelectedGym(gyms, 2).id).toBe(2)
    expect(resolveSelectedGym(gyms, '3').id).toBe(3)
  })

  it('cae al gym por defecto si el último gym usado ya no existe', () => {
    expect(resolveSelectedGym(gyms, 999).id).toBe(1)
  })

  it('cae al gym por defecto cuando no hay último gym usado', () => {
    expect(resolveSelectedGym(gyms, null).id).toBe(1)
  })

  it('cae al primer gym si no hay ninguno marcado por defecto', () => {
    const noDefault = [{ id: 5, is_default: false }, { id: 6, is_default: false }]
    expect(resolveSelectedGym(noDefault, null).id).toBe(5)
  })
})
