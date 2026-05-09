import { describe, it, expect } from 'vitest'
import { formatRoutineAsText } from './routineTextFormat.js'

const baseExportData = {
  routine: {
    name: 'Push Pull Legs',
    description: 'PPL clásico de 3 días',
    days: [
      {
        name: 'Día 1 - Push',
        sort_order: 0,
        estimated_duration_min: 60,
        blocks: [
          {
            name: 'Principal',
            sort_order: 1,
            exercises: [
              { exercise_name: 'Press banca', series: 4, reps: '8-10', rir: 2, rest_seconds: 90, notes: null },
              { exercise_name: 'Press inclinado mancuernas', series: 3, reps: '10-12', rir: 1, rest_seconds: 60, notes: 'Hacer lento en excéntrica' },
            ],
          },
        ],
      },
    ],
  },
}

describe('formatRoutineAsText', () => {
  it('devuelve string vacío si no hay rutina', () => {
    expect(formatRoutineAsText(null)).toBe('')
    expect(formatRoutineAsText({})).toBe('')
  })

  it('incluye nombre y descripción de la rutina', () => {
    const out = formatRoutineAsText(baseExportData)
    expect(out).toContain('*Push Pull Legs*')
    expect(out).toContain('PPL clásico de 3 días')
  })

  it('omite la descripción si no existe', () => {
    const data = { routine: { ...baseExportData.routine, description: null } }
    const out = formatRoutineAsText(data)
    expect(out).not.toContain('PPL clásico')
    expect(out.split('\n')[0]).toBe('*Push Pull Legs*')
  })

  it('formatea cada ejercicio con series×reps, RIR y descanso', () => {
    const out = formatRoutineAsText(baseExportData)
    expect(out).toContain('- Press banca · 4×8-10 · RIR 2 · 90s desc')
    expect(out).toContain('- Press inclinado mancuernas · 3×10-12 · RIR 1 · 1 min desc')
  })

  it('omite RIR y descanso si son null/undefined', () => {
    const data = {
      routine: {
        name: 'Test',
        days: [{
          name: 'D1', sort_order: 0,
          blocks: [{ name: 'Principal', sort_order: 1, exercises: [
            { exercise_name: 'X', series: 3, reps: '10', rir: null, rest_seconds: null },
          ] }],
        }],
      },
    }
    const out = formatRoutineAsText(data)
    expect(out).toContain('- X · 3×10')
    expect(out).not.toContain('RIR')
    expect(out).not.toContain('desc')
  })

  it('incluye las notas del ejercicio en línea aparte', () => {
    const out = formatRoutineAsText(baseExportData)
    expect(out).toContain('  Hacer lento en excéntrica')
  })

  it('muestra heading del bloque solo cuando hay calentamiento Y principal', () => {
    const data = {
      routine: {
        name: 'R', days: [{
          name: 'D1', sort_order: 0,
          blocks: [
            { name: 'Calentamiento', sort_order: 0, exercises: [{ exercise_name: 'Movilidad', series: 1, reps: '30s' }] },
            { name: 'Principal', sort_order: 1, exercises: [{ exercise_name: 'Press', series: 3, reps: '10' }] },
          ],
        }],
      },
    }
    const out = formatRoutineAsText(data)
    expect(out).toContain('Calentamiento:')
    expect(out).toContain('Principal:')
  })

  it('no muestra heading del bloque si solo hay principal', () => {
    const out = formatRoutineAsText(baseExportData)
    expect(out).not.toContain('Principal:')
  })

  it('ordena días y bloques por sort_order', () => {
    const data = {
      routine: {
        name: 'R', days: [
          { name: 'D2', sort_order: 1, blocks: [{ name: 'Principal', sort_order: 1, exercises: [{ exercise_name: 'B', series: 1, reps: '1' }] }] },
          { name: 'D1', sort_order: 0, blocks: [{ name: 'Principal', sort_order: 1, exercises: [{ exercise_name: 'A', series: 1, reps: '1' }] }] },
        ],
      },
    }
    const out = formatRoutineAsText(data)
    expect(out.indexOf('D1')).toBeLessThan(out.indexOf('D2'))
    expect(out.indexOf('A')).toBeLessThan(out.indexOf('B'))
  })

  it('omite duración del día si es null', () => {
    const data = {
      routine: {
        name: 'R', days: [{
          name: 'D1', sort_order: 0, estimated_duration_min: null,
          blocks: [{ name: 'Principal', sort_order: 1, exercises: [{ exercise_name: 'X', series: 1, reps: '1' }] }],
        }],
      },
    }
    const out = formatRoutineAsText(data)
    expect(out).toContain('📅 *D1*')
    expect(out).not.toContain('min')
  })

  it('formatea descansos no múltiplos de 60 en segundos', () => {
    const data = {
      routine: {
        name: 'R', days: [{
          name: 'D1', sort_order: 0,
          blocks: [{ name: 'Principal', sort_order: 1, exercises: [
            { exercise_name: 'X', series: 1, reps: '1', rest_seconds: 45 },
          ] }],
        }],
      },
    }
    const out = formatRoutineAsText(data)
    expect(out).toContain('45s desc')
  })

  it('acepta RIR de 0 (no lo trata como falsy)', () => {
    const data = {
      routine: {
        name: 'R', days: [{
          name: 'D1', sort_order: 0,
          blocks: [{ name: 'Principal', sort_order: 1, exercises: [
            { exercise_name: 'X', series: 1, reps: '1', rir: 0 },
          ] }],
        }],
      },
    }
    const out = formatRoutineAsText(data)
    expect(out).toContain('RIR 0')
  })
})
