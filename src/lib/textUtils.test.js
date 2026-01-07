import { describe, it, expect } from 'vitest'
import { sanitizeFilename, normalizeSearchText } from './textUtils.js'

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

describe('normalizeSearchText', () => {
  it('convierte a minúsculas', () => {
    expect(normalizeSearchText('PRESS BANCA')).toBe('press banca')
  })

  it('elimina tildes', () => {
    expect(normalizeSearchText('Extensión')).toBe('extension')
    expect(normalizeSearchText('Glúteo')).toBe('gluteo')
    expect(normalizeSearchText('Bíceps')).toBe('biceps')
  })

  it('maneja combinación de mayúsculas y tildes', () => {
    expect(normalizeSearchText('EXTENSIÓN DE TRÍCEPS')).toBe('extension de triceps')
  })

  it('normaliza ñ a n', () => {
    expect(normalizeSearchText('Señal')).toBe('senal')
    expect(normalizeSearchText('Niño')).toBe('nino')
  })

  it('devuelve string vacío para valores nulos', () => {
    expect(normalizeSearchText('')).toBe('')
    expect(normalizeSearchText(null)).toBe('')
    expect(normalizeSearchText(undefined)).toBe('')
  })
})
