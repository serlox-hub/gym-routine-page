import { describe, it, expect } from 'vitest'
import {
  getBlockUnits,
  moveExercise,
  moveSuperset,
  getExerciseReorderScope,
  buildExerciseRows,
  collapseForDrag,
  resolveRowDrop,
  rowDropToMove,
  applyRowDrop,
} from './exerciseOrder.js'

// Ejercicios de un bloque: `superset_group` null = individual.
const ex = (id, sortOrder, supersetGroup = null) => ({ id, sort_order: sortOrder, superset_group: supersetGroup })

// A(1) · B(2)+C(3) del grupo 1 · D(4)
const blockWithRun = [ex(1, 1), ex(2, 2, 1), ex(3, 3, 1), ex(4, 4)]
// Grupo 1 partido en dos tiradas no consecutivas: B(2) · A(1) · C(3)
const splitBlock = [ex(2, 1, 1), ex(1, 2), ex(3, 3, 1)]

describe('getBlockUnits', () => {
  it('devuelve lista vacía sin ejercicios', () => {
    expect(getBlockUnits([])).toEqual([])
    expect(getBlockUnits(null)).toEqual([])
  })

  it('agrupa los consecutivos del mismo grupo en una unidad', () => {
    expect(getBlockUnits(blockWithRun)).toEqual([
      { kind: 'single', ids: [1] },
      { kind: 'superset', group: 1, ids: [2, 3] },
      { kind: 'single', ids: [4] },
    ])
  })

  it('ordena por sort_order antes de agrupar', () => {
    const shuffled = [ex(3, 3, 1), ex(1, 1), ex(4, 4), ex(2, 2, 1)]
    expect(getBlockUnits(shuffled)).toEqual(getBlockUnits(blockWithRun))
  })

  it('un grupo partido son dos unidades, no se cura', () => {
    expect(getBlockUnits(splitBlock)).toEqual([
      { kind: 'superset', group: 1, ids: [2] },
      { kind: 'single', ids: [1] },
      { kind: 'superset', group: 1, ids: [3] },
    ])
  })
})

describe('moveExercise', () => {
  it('mueve un individual entre las unidades del bloque, no entre filas', () => {
    // A a la última posición de unidades: detrás de la tirada completa y de D.
    expect(moveExercise(blockWithRun, 1, 2)).toEqual([2, 3, 4, 1])
  })

  it('mueve un individual delante de la tirada completa', () => {
    expect(moveExercise(blockWithRun, 4, 1)).toEqual([1, 4, 2, 3])
  })

  it('un miembro se mueve solo dentro de su tirada', () => {
    expect(moveExercise(blockWithRun, 3, 0)).toEqual([1, 3, 2, 4])
  })

  it('una tirada de un solo miembro se mueve como unidad del bloque', () => {
    // Grupo 1 con un único miembro (2): pasa a la última posición de unidades.
    expect(moveExercise([ex(1, 1), ex(2, 2, 1), ex(3, 3)], 2, 2)).toEqual([1, 3, 2])
  })

  it('devuelve null con id desconocido', () => {
    expect(moveExercise(blockWithRun, 99, 0)).toBeNull()
  })

  it('devuelve null si la posición es la actual', () => {
    expect(moveExercise(blockWithRun, 1, 0)).toBeNull()
  })

  it('devuelve null con posición fuera de rango', () => {
    expect(moveExercise(blockWithRun, 1, 3)).toBeNull()
    expect(moveExercise(blockWithRun, 1, -1)).toBeNull()
    // Un miembro solo tiene las posiciones de su tirada.
    expect(moveExercise(blockWithRun, 2, 2)).toBeNull()
  })

  it('devuelve null con posición nula', () => {
    expect(moveExercise(blockWithRun, 1, null)).toBeNull()
    expect(moveExercise(blockWithRun, 1, undefined)).toBeNull()
  })

  it('no toca la pertenencia: devuelve exactamente los mismos ids', () => {
    const result = moveExercise(blockWithRun, 1, 2)
    expect([...result].sort()).toEqual([1, 2, 3, 4])
  })
})

describe('moveSuperset', () => {
  it('mueve la tirada completa a una posición de unidades', () => {
    expect(moveSuperset(blockWithRun, 1, 0)).toEqual([2, 3, 1, 4])
    expect(moveSuperset(blockWithRun, 1, 2)).toEqual([1, 4, 2, 3])
  })

  it('con el grupo partido mueve solo la tirada del primer miembro dado', () => {
    // Segunda tirada (C) al principio: la primera (B) se queda donde estaba.
    expect(moveSuperset(splitBlock, 1, 0, 3)).toEqual([3, 2, 1])
    // Primera tirada (B) al final.
    expect(moveSuperset(splitBlock, 1, 2, 2)).toEqual([1, 3, 2])
  })

  it('sin firstMemberId mueve la primera tirada del grupo', () => {
    expect(moveSuperset(splitBlock, 1, 2)).toEqual([1, 3, 2])
  })

  it('devuelve null con grupo inexistente', () => {
    expect(moveSuperset(blockWithRun, 9, 0)).toBeNull()
  })

  it('devuelve null con firstMemberId que no empieza ninguna tirada', () => {
    expect(moveSuperset(blockWithRun, 1, 0, 3)).toBeNull()
  })

  it('devuelve null si la posición es la actual, está fuera de rango o es nula', () => {
    expect(moveSuperset(blockWithRun, 1, 1)).toBeNull()
    expect(moveSuperset(blockWithRun, 1, 3)).toBeNull()
    expect(moveSuperset(blockWithRun, 1, -1)).toBeNull()
    expect(moveSuperset(blockWithRun, 1, null)).toBeNull()
  })
})

describe('getExerciseReorderScope', () => {
  it('devuelve null si el ejercicio no está en el bloque', () => {
    expect(getExerciseReorderScope(blockWithRun, 99)).toBeNull()
    expect(getExerciseReorderScope([], 1)).toBeNull()
  })

  it('un individual se mueve entre las unidades del bloque', () => {
    // A(1) · [B,C] · D(4) → tres unidades, representadas por su primer miembro.
    expect(getExerciseReorderScope(blockWithRun, 1)).toEqual({ scope: 'unit', ids: [1, 2, 4], index: 0 })
    expect(getExerciseReorderScope(blockWithRun, 4)).toEqual({ scope: 'unit', ids: [1, 2, 4], index: 2 })
  })

  it('un miembro de una tirada de más de uno solo se mueve dentro de su tirada', () => {
    expect(getExerciseReorderScope(blockWithRun, 2)).toEqual({ scope: 'run', ids: [2, 3], index: 0 })
    expect(getExerciseReorderScope(blockWithRun, 3)).toEqual({ scope: 'run', ids: [2, 3], index: 1 })
  })

  it('una tirada de UNO se mueve como unidad, no dentro de sí misma', () => {
    // En `splitBlock` el grupo 1 está partido en dos tiradas de un miembro cada una.
    expect(getExerciseReorderScope(splitBlock, 2)).toEqual({ scope: 'unit', ids: [2, 1, 3], index: 0 })
    expect(getExerciseReorderScope(splitBlock, 3)).toEqual({ scope: 'unit', ids: [2, 1, 3], index: 2 })
  })

  it('el ámbito coincide con lo que acepta moveExercise', () => {
    // Es el contrato que usan los menús: cada posición del ámbito es un movimiento aplicable.
    for (const id of [1, 2, 3, 4]) {
      const scope = getExerciseReorderScope(blockWithRun, id)
      for (let i = 0; i < scope.ids.length; i++) {
        const ids = moveExercise(blockWithRun, id, i)
        // La posición actual no mueve nada; el resto devuelve un orden completo del bloque.
        if (i === scope.index) expect(ids).toBeNull()
        else expect(ids).toHaveLength(blockWithRun.length)
      }
    }
  })

  it('un miembro nunca puede salir de su tirada por el menú', () => {
    // Mover B a la última posición de su ámbito lo deja detrás de C, no fuera de la superserie.
    expect(moveExercise(blockWithRun, 2, 1)).toEqual([1, 3, 2, 4])
  })
})

describe('buildExerciseRows', () => {
  it('pinta una cabecera por tirada y una fila por ejercicio', () => {
    expect(buildExerciseRows(blockWithRun)).toEqual([
      { id: 'ex-1', kind: 'exercise', exerciseId: 1, group: null, segment: null, runSize: 0, firstMemberId: null },
      { id: 'ss-1-2', kind: 'supersetHeader', exerciseId: null, group: 1, segment: 'start', runSize: 2, firstMemberId: 2 },
      { id: 'ex-2', kind: 'exercise', exerciseId: 2, group: 1, segment: 'middle', runSize: 2, firstMemberId: null },
      { id: 'ex-3', kind: 'exercise', exerciseId: 3, group: 1, segment: 'end', runSize: 2, firstMemberId: null },
      { id: 'ex-4', kind: 'exercise', exerciseId: 4, group: null, segment: null, runSize: 0, firstMemberId: null },
    ])
  })

  it('el único miembro de una tirada cierra la tarjeta él solo', () => {
    const rows = buildExerciseRows([ex(2, 1, 1)])
    expect(rows.map(r => [r.id, r.segment, r.runSize])).toEqual([
      ['ss-1-2', 'start', 1],
      ['ex-2', 'end', 1],
    ])
  })

  it('un grupo partido da dos cabeceras con id distinto', () => {
    const rows = buildExerciseRows(splitBlock)
    expect(rows.map(r => r.id)).toEqual(['ss-1-2', 'ex-2', 'ex-1', 'ss-1-3', 'ex-3'])
  })

  it('devuelve lista vacía sin ejercicios', () => {
    expect(buildExerciseRows([])).toEqual([])
    expect(buildExerciseRows(null)).toEqual([])
  })
})

describe('collapseForDrag', () => {
  const rows = buildExerciseRows(blockWithRun)

  it('arrastrar la cabecera deja la tirada plegada en ella', () => {
    expect(collapseForDrag(rows, 'ss-1-2').map(r => r.id)).toEqual(['ex-1', 'ss-1-2', 'ex-4'])
  })

  it('plegar no cambia el índice de la cabecera arrastrada', () => {
    const collapsed = collapseForDrag(rows, 'ss-1-2')
    expect(collapsed.findIndex(r => r.id === 'ss-1-2')).toBe(rows.findIndex(r => r.id === 'ss-1-2'))
  })

  it('arrastrar un miembro o un individual no pliega nada', () => {
    expect(collapseForDrag(rows, 'ex-2')).toEqual(rows)
    expect(collapseForDrag(rows, 'ex-1')).toEqual(rows)
  })

  it('con el grupo partido pliega solo la tirada arrastrada', () => {
    const splitRows = buildExerciseRows(splitBlock)
    expect(collapseForDrag(splitRows, 'ss-1-2').map(r => r.id)).toEqual(['ss-1-2', 'ex-1', 'ss-1-3', 'ex-3'])
    expect(collapseForDrag(splitRows, 'ss-1-3').map(r => r.id)).toEqual(['ss-1-2', 'ex-2', 'ex-1', 'ss-1-3'])
  })

  it('devuelve la lista intacta con id desconocido, y vacía sin filas', () => {
    expect(collapseForDrag(rows, 'ex-99')).toEqual(rows)
    expect(collapseForDrag([], 'ex-1')).toEqual([])
    expect(collapseForDrag(null, 'ex-1')).toEqual([])
  })
})

describe('resolveRowDrop', () => {
  const rows = buildExerciseRows(blockWithRun)

  it('un individual no cae dentro de una tirada: se va al borde más cercano', () => {
    // Filas: [ex-1, ss-1-2, ex-2, ex-3, ex-4]; válidas para ex-1: 0 (delante de la tirada),
    // 3 (detrás de la tirada, delante de ex-4) y 4 (al final).
    expect(resolveRowDrop(rows, 'ex-1', 1)).toBe(0)
    expect(resolveRowDrop(rows, 'ex-1', 2)).toBe(3)
    expect(resolveRowDrop(rows, 'ex-1', 3)).toBe(3)
    expect(resolveRowDrop(rows, 'ex-1', 4)).toBe(4)
  })

  it('un miembro se queda dentro de su tirada aunque se suelte fuera', () => {
    // Válidas para ex-2 (cabecera en 1, tirada de 2): 2 y 3.
    expect(resolveRowDrop(rows, 'ex-2', 0)).toBe(2)
    expect(resolveRowDrop(rows, 'ex-2', 4)).toBe(3)
    expect(resolveRowDrop(rows, 'ex-3', 0)).toBe(2)
  })

  it('la cabecera plegada puede caer en cualquier posición de unidad', () => {
    const collapsed = collapseForDrag(rows, 'ss-1-2')
    expect(resolveRowDrop(collapsed, 'ss-1-2', 0)).toBe(0)
    expect(resolveRowDrop(collapsed, 'ss-1-2', 2)).toBe(2)
  })

  it('acota una posición fuera de la lista', () => {
    expect(resolveRowDrop(rows, 'ex-4', -5)).toBe(0)
    expect(resolveRowDrop(rows, 'ex-4', 99)).toBe(4)
  })

  it('el miembro de una tirada de uno se queda donde está', () => {
    const single = buildExerciseRows([ex(1, 1), ex(2, 2, 1)])
    expect(resolveRowDrop(single, 'ex-2', 0)).toBe(2)
  })

  it('con id desconocido acota la posición cruda, y con lista vacía devuelve 0', () => {
    expect(resolveRowDrop(rows, 'ex-99', 99)).toBe(4)
    expect(resolveRowDrop([], 'ex-1', 2)).toBe(0)
    expect(resolveRowDrop(null, 'ex-1', 2)).toBe(0)
  })
})

describe('rowDropToMove', () => {
  const rows = buildExerciseRows(blockWithRun)

  it('un individual traduce a posición de unidad', () => {
    expect(rowDropToMove(rows, 'ex-1', 0)).toEqual({ exerciseId: 1, targetIndex: 0 })
    expect(rowDropToMove(rows, 'ex-1', 3)).toEqual({ exerciseId: 1, targetIndex: 1 })
    expect(rowDropToMove(rows, 'ex-1', 4)).toEqual({ exerciseId: 1, targetIndex: 2 })
  })

  it('un miembro traduce a posición dentro de su tirada', () => {
    expect(rowDropToMove(rows, 'ex-3', 2)).toEqual({ exerciseId: 3, targetIndex: 0 })
    expect(rowDropToMove(rows, 'ex-2', 3)).toEqual({ exerciseId: 2, targetIndex: 1 })
  })

  it('la cabecera traduce a movimiento de tirada completa', () => {
    const collapsed = collapseForDrag(rows, 'ss-1-2')
    expect(rowDropToMove(collapsed, 'ss-1-2', 0)).toEqual({ group: 1, targetUnitIndex: 0, firstMemberId: 2 })
    expect(rowDropToMove(collapsed, 'ss-1-2', 2)).toEqual({ group: 1, targetUnitIndex: 2, firstMemberId: 2 })
  })

  it('lo que traduce se puede aplicar tal cual', () => {
    const collapsed = collapseForDrag(rows, 'ss-1-2')
    const move = rowDropToMove(collapsed, 'ss-1-2', 2)
    expect(moveSuperset(blockWithRun, move.group, move.targetUnitIndex, move.firstMemberId)).toEqual([1, 4, 2, 3])

    const single = rowDropToMove(rows, 'ex-1', 4)
    expect(moveExercise(blockWithRun, single.exerciseId, single.targetIndex)).toEqual([2, 3, 4, 1])
  })

  it('devuelve null con id desconocido o lista vacía', () => {
    expect(rowDropToMove(rows, 'ex-99', 0)).toBeNull()
    expect(rowDropToMove([], 'ex-1', 0)).toBeNull()
    expect(rowDropToMove(null, 'ex-1', 0)).toBeNull()
  })
})

describe('applyRowDrop', () => {
  const rows = buildExerciseRows(blockWithRun)

  it('mueve un individual detrás de la superserie completa', () => {
    // Filas: [ex-1, ss-1-2, ex-2, ex-3, ex-4]; soltar ex-1 en la última posición.
    expect(applyRowDrop(blockWithRun, rows, 'ex-1', 4)).toEqual([2, 3, 4, 1])
  })

  it('mueve la superserie completa desde su cabecera', () => {
    expect(applyRowDrop(blockWithRun, rows, 'ss-1-2', 0)).toEqual([2, 3, 1, 4])
  })

  it('un miembro soltado fuera de su tarjeta se queda dentro de su tirada', () => {
    expect(applyRowDrop(blockWithRun, rows, 'ex-2', 99)).toEqual([1, 3, 2, 4])
  })

  it('con el grupo partido mueve solo la tirada arrastrada', () => {
    const splitRows = buildExerciseRows(splitBlock)
    // Filas: [ss-1-2, ex-2, ex-1, ss-1-3, ex-3]; la segunda tirada (C) a la primera posición.
    expect(applyRowDrop(splitBlock, splitRows, 'ss-1-3', 0)).toEqual([3, 2, 1])
  })

  it('devuelve null si la fila se queda donde estaba o no existe', () => {
    expect(applyRowDrop(blockWithRun, rows, 'ex-1', 0)).toBeNull()
    expect(applyRowDrop(blockWithRun, rows, 'ex-99', 1)).toBeNull()
  })
})
