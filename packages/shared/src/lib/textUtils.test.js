import { describe, it, expect } from 'vitest'
import { sanitizeFilename, normalizeSearchText, fuzzyMatchScore } from './textUtils.js'

// La búsqueda flexible se expone vía fuzzyMatchScore (null = no coincide).
const matches = (text, query) => fuzzyMatchScore(text, query) !== null

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

describe('fuzzyMatchScore — coincidencia (null = no coincide)', () => {
  it('coincide con substring contiguo', () => {
    expect(matches('Press banca', 'press')).toBe(true)
    expect(matches('Peso muerto rumano', 'rum')).toBe(true)
  })

  it('coincide con subsecuencia dispersa (lo que antes fallaba con includes)', () => {
    expect(matches('Peso Muerto Rumano', 'pmr')).toBe(true)
    // includes clásico lo daría por falso:
    expect('peso muerto rumano'.includes('pmr')).toBe(false)
  })

  it('salta huecos entre palabras', () => {
    // "press banca" no es substring de "Press de banca", pero sí subsecuencia
    expect(matches('Press de banca', 'press banca')).toBe(true)
    expect('press de banca'.includes('press banca')).toBe(false)
  })

  it('es case- y tilde-insensitive', () => {
    expect(matches('Extensión de tríceps', 'EXTN')).toBe(true)
    expect(matches('Extensión de tríceps', 'triceps')).toBe(true)
    expect(matches('Glúteo', 'GLUTEO')).toBe(true)
  })

  it('no coincide si falta un carácter o el orden es incorrecto', () => {
    expect(matches('Peso muerto rumano', 'xyz')).toBe(false)
    expect(matches('Peso muerto rumano', 'mrp')).toBe(false)
  })

  it('query vacía coincide con todo (score 0, orden neutro)', () => {
    expect(fuzzyMatchScore('lo que sea', '')).toBe(0)
    expect(matches('cualquier cosa', '   ')).toBe(true)
  })

  it('no coincide con texto vacío y query no vacía', () => {
    expect(fuzzyMatchScore('', 'x')).toBeNull()
    expect(fuzzyMatchScore(null, 'x')).toBeNull()
    expect(fuzzyMatchScore('Press banca', 'zzz')).toBeNull()
  })
})

describe('fuzzyMatchScore — ranking por similitud', () => {
  it('contigua > dispersa', () => {
    const contiguo = fuzzyMatchScore('xxxpress', 'press')
    const disperso = fuzzyMatchScore('p-r-e-s-s dispersa', 'press')
    expect(contiguo).toBeGreaterThan(disperso)
  })

  it('exacta total > prefijo > interior', () => {
    const exacta = fuzzyMatchScore('press', 'press')
    const prefijo = fuzzyMatchScore('press banca', 'press')
    const interior = fuzzyMatchScore('banca press', 'press')
    expect(exacta).toBeGreaterThan(prefijo)
    expect(prefijo).toBeGreaterThan(interior)
  })

  it('a igual tramo, mayor cobertura (nombre más corto) puntúa más', () => {
    // ambas en prefijo NO-exacto ('press' !== 'pres'); 'pres' cubre más de
    // 'Press' que de 'Press banca' => mismo tramo, desempata la cobertura
    expect(fuzzyMatchScore('Press', 'pres'))
      .toBeGreaterThan(fuzzyMatchScore('Press banca', 'pres'))
  })

  it('en dispersa, menor dispersión (chars más juntos) puntúa más', () => {
    // sin 'ab' contiguo en ninguno => ambos son coincidencia dispersa
    expect(fuzzyMatchScore('axb', 'ab'))
      .toBeGreaterThan(fuzzyMatchScore('axxxb', 'ab'))
  })
})
