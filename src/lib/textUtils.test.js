import { describe, it, expect } from 'vitest'
import { sanitizeFilename } from './textUtils.js'

describe('sanitizeFilename', () => {
  it('reemplaza espacios por guiones bajos', () => {
    expect(sanitizeFilename('mi rutina')).toBe('mi_rutina')
  })

  it('reemplaza caracteres especiales', () => {
    expect(sanitizeFilename('Rutina #1 (nueva)')).toBe('rutina__1__nueva_')
  })

  it('convierte a minúsculas', () => {
    expect(sanitizeFilename('MAYUSCULAS')).toBe('mayusculas')
  })

  it('mantiene números', () => {
    expect(sanitizeFilename('rutina123')).toBe('rutina123')
  })

  it('maneja acentos y ñ', () => {
    expect(sanitizeFilename('Día señal')).toBe('d_a_se_al')
  })

  it('devuelve "file" para valores vacíos', () => {
    expect(sanitizeFilename('')).toBe('file')
    expect(sanitizeFilename(null)).toBe('file')
    expect(sanitizeFilename(undefined)).toBe('file')
  })
})
