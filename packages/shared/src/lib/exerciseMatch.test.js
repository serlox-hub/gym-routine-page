import { describe, it, expect } from 'vitest'
import { normalizeExerciseName, buildExerciseIndex, resolveExerciseId } from './exerciseMatch.js'

describe('normalizeExerciseName', () => {
  it('minúsculas + trim + colapsa espacios', () => {
    expect(normalizeExerciseName('  Press   de  Banca ')).toBe('press de banca')
    expect(normalizeExerciseName('PRESS DE BANCA')).toBe('press de banca')
  })

  it('elimina acentos/diacríticos', () => {
    expect(normalizeExerciseName('Jalón al pecho')).toBe('jalon al pecho')
    expect(normalizeExerciseName('Pájaros con mancuernas')).toBe('pajaros con mancuernas')
    expect(normalizeExerciseName('Elevación de talones')).toBe('elevacion de talones')
  })

  it('acento-insensible casa versiones con y sin tilde', () => {
    expect(normalizeExerciseName('Jalón')).toBe(normalizeExerciseName('Jalon'))
    expect(normalizeExerciseName('Sentadilla búlgara')).toBe(normalizeExerciseName('sentadilla bulgara'))
  })

  it('null/undefined/vacío → cadena vacía', () => {
    expect(normalizeExerciseName(null)).toBe('')
    expect(normalizeExerciseName(undefined)).toBe('')
    expect(normalizeExerciseName('')).toBe('')
    expect(normalizeExerciseName('   ')).toBe('')
  })
})

describe('buildExerciseIndex', () => {
  const systemRows = [
    { id: 'sys-bench', name_es: 'Press de banca con barra', name_en: 'Barbell Bench Press' },
    { id: 'sys-squat', name_es: 'Sentadilla con barra alta', name_en: 'High Bar Squat' },
  ]

  it('indexa name_en y name_es de sistema (ambos apuntan al id)', () => {
    const idx = buildExerciseIndex({ systemRows })
    expect(idx.get('barbell bench press')).toBe('sys-bench')
    expect(idx.get('press de banca con barra')).toBe('sys-bench')
    expect(idx.get('high bar squat')).toBe('sys-squat')
  })

  it('el custom del usuario gana ante colisión por name_es', () => {
    const customRows = [{ id: 'custom-bench', name_es: 'Press de banca con barra' }]
    const idx = buildExerciseIndex({ systemRows, customRows })
    // El name_es colisiona: debe ganar el custom (prioridad 2 > sistema-ES prioridad 3)
    expect(idx.get('press de banca con barra')).toBe('custom-bench')
    // Pero el name_en (solo sistema) sigue apuntando al de sistema
    expect(idx.get('barbell bench press')).toBe('sys-bench')
  })

  it('claves normalizadas (acento/caso indiferentes)', () => {
    const idx = buildExerciseIndex({ systemRows: [{ id: 'x', name_es: 'Elevación lateral', name_en: 'Lateral Raise' }] })
    expect(idx.get('elevacion lateral')).toBe('x')
    expect(idx.get('lateral raise')).toBe('x')
  })

  it('sin filas → índice vacío; ignora nombres nulos', () => {
    expect(buildExerciseIndex().size).toBe(0)
    const idx = buildExerciseIndex({ systemRows: [{ id: 'c', name_es: 'Curl', name_en: null }] })
    expect(idx.get('curl')).toBe('c')
    expect(idx.size).toBe(1)
  })
})

describe('resolveExerciseId', () => {
  const systemRows = [
    { id: 'sys-bench', name_es: 'Press de banca con barra', name_en: 'Barbell Bench Press' },
    { id: 'sys-row', name_es: 'Remo con barra agarre prono', name_en: 'Barbell Row' },
  ]
  const index = buildExerciseIndex({ systemRows })

  it('resuelve por name_en', () => {
    expect(resolveExerciseId({ name_en: 'Barbell Bench Press' }, index)).toBe('sys-bench')
  })

  it('resuelve por name_es cuando no hay name_en', () => {
    expect(resolveExerciseId({ name_es: 'Press de banca con barra' }, index)).toBe('sys-bench')
  })

  it('resuelve por `name` (referencia de día)', () => {
    expect(resolveExerciseId({ name: 'Remo con barra agarre prono' }, index)).toBe('sys-row')
  })

  it('tolerante a acentos/mayúsculas/espacios', () => {
    expect(resolveExerciseId({ name_es: '  PRESS de BANCA con barra ' }, index)).toBe('sys-bench')
    expect(resolveExerciseId({ name_es: 'Remo con barra agarré prono' }, index)).toBe('sys-row')
  })

  it('name_en tiene prioridad sobre name_es si apuntan a ejercicios distintos', () => {
    // name_en → bench, name_es → row: debe ganar name_en
    const id = resolveExerciseId({ name_en: 'Barbell Bench Press', name_es: 'Remo con barra agarre prono' }, index)
    expect(id).toBe('sys-bench')
  })

  it('sin match → null', () => {
    expect(resolveExerciseId({ name_es: 'Ejercicio inventado' }, index)).toBeNull()
    expect(resolveExerciseId({}, index)).toBeNull()
    expect(resolveExerciseId(null, index)).toBeNull()
    expect(resolveExerciseId({ name_es: 'X' }, null)).toBeNull()
  })
})
