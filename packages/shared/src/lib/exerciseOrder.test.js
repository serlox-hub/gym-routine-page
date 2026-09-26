import { describe, it, expect } from 'vitest'
import {
  getBlockUnits,
  moveExercise,
  moveSuperset,
  placeInSuperset,
  getExerciseReorderScope,
  buildExerciseRows,
  collapseForDrag,
  resolveRowDrop,
  rowDropToMove,
  resolveMembershipDrop,
  getMembershipDropPreview,
  canDragExerciseRow,
  membershipDropToPlacement,
  applyRowDrop,
  idsToOrderItems,
} from './exerciseOrder.js'

// Ejercicios de un bloque: `superset_group` null = individual.
const ex = (id, sortOrder, supersetGroup = null) => ({ id, sort_order: sortOrder, superset_group: supersetGroup })

// A block's order as `reorderRoutineExercises` items: `[1, [2, 1]]` = 1 with no membership change,
// 2 moves to group 1.
const items = (...entries) => entries.map(entry => (Array.isArray(entry) ? { id: entry[0], supersetGroup: entry[1] } : { id: entry }))


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
  it('pinta una cabecera y un pie por tirada y una fila por ejercicio', () => {
    expect(buildExerciseRows(blockWithRun)).toEqual([
      { id: 'ex-1', kind: 'exercise', exerciseId: 1, group: null, runSize: 0, firstMemberId: null },
      { id: 'ss-1-2', kind: 'supersetHeader', exerciseId: null, group: 1, runSize: 2, firstMemberId: 2 },
      { id: 'ex-2', kind: 'exercise', exerciseId: 2, group: 1, runSize: 2, firstMemberId: null },
      { id: 'ex-3', kind: 'exercise', exerciseId: 3, group: 1, runSize: 2, firstMemberId: null },
      { id: 'sf-1-2', kind: 'supersetFooter', exerciseId: null, group: 1, runSize: 2, firstMemberId: 2 },
      { id: 'ex-4', kind: 'exercise', exerciseId: 4, group: null, runSize: 0, firstMemberId: null },
    ])
  })

  it('una tirada de un solo miembro también la cierra su pie', () => {
    const rows = buildExerciseRows([ex(2, 1, 1)])
    expect(rows.map(r => [r.id, r.kind, r.runSize])).toEqual([
      ['ss-1-2', 'supersetHeader', 1],
      ['ex-2', 'exercise', 1],
      ['sf-1-2', 'supersetFooter', 1],
    ])
  })

  it('un grupo partido da dos cabeceras y dos pies con id distinto', () => {
    const rows = buildExerciseRows(splitBlock)
    expect(rows.map(r => r.id)).toEqual(['ss-1-2', 'ex-2', 'sf-1-2', 'ex-1', 'ss-1-3', 'ex-3', 'sf-1-3'])
  })

  it('devuelve lista vacía sin ejercicios', () => {
    expect(buildExerciseRows([])).toEqual([])
    expect(buildExerciseRows(null)).toEqual([])
  })
})

describe('collapseForDrag', () => {
  const rows = buildExerciseRows(blockWithRun)

  it('arrastrar la cabecera deja la tirada plegada en ella, pie incluido', () => {
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
    expect(collapseForDrag(splitRows, 'ss-1-2').map(r => r.id)).toEqual(['ss-1-2', 'ex-1', 'ss-1-3', 'ex-3', 'sf-1-3'])
    expect(collapseForDrag(splitRows, 'ss-1-3').map(r => r.id)).toEqual(['ss-1-2', 'ex-2', 'sf-1-2', 'ex-1', 'ss-1-3'])
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
    // Filas: [ex-1, ss-1-2, ex-2, ex-3, sf-1-2, ex-4]; válidas para ex-1: 0 (delante de la tirada),
    // 4 (detrás del pie, delante de ex-4) y 5 (al final). En un empate manda la más baja.
    expect(resolveRowDrop(rows, 'ex-1', 1)).toBe(0)
    expect(resolveRowDrop(rows, 'ex-1', 2)).toBe(0)
    expect(resolveRowDrop(rows, 'ex-1', 3)).toBe(4)
    expect(resolveRowDrop(rows, 'ex-1', 4)).toBe(4)
    expect(resolveRowDrop(rows, 'ex-1', 5)).toBe(5)
  })

  it('un miembro se queda dentro de su tirada aunque se suelte fuera', () => {
    // Válidas para ex-2 (cabecera en 1, tirada de 2): 2 y 3, nunca detrás del pie.
    expect(resolveRowDrop(rows, 'ex-2', 0)).toBe(2)
    expect(resolveRowDrop(rows, 'ex-2', 5)).toBe(3)
    expect(resolveRowDrop(rows, 'ex-3', 0)).toBe(2)
  })

  it('la cabecera plegada puede caer en cualquier posición de unidad', () => {
    const collapsed = collapseForDrag(rows, 'ss-1-2')
    expect(resolveRowDrop(collapsed, 'ss-1-2', 0)).toBe(0)
    expect(resolveRowDrop(collapsed, 'ss-1-2', 2)).toBe(2)
  })

  it('acota una posición fuera de la lista', () => {
    expect(resolveRowDrop(rows, 'ex-4', -5)).toBe(0)
    expect(resolveRowDrop(rows, 'ex-4', 99)).toBe(5)
  })

  it('el miembro de una tirada de uno se queda donde está', () => {
    const single = buildExerciseRows([ex(1, 1), ex(2, 2, 1)])
    expect(resolveRowDrop(single, 'ex-2', 0)).toBe(2)
  })

  it('con id desconocido acota la posición cruda, y con lista vacía devuelve 0', () => {
    expect(resolveRowDrop(rows, 'ex-99', 99)).toBe(5)
    expect(resolveRowDrop([], 'ex-1', 2)).toBe(0)
    expect(resolveRowDrop(null, 'ex-1', 2)).toBe(0)
  })
})

describe('rowDropToMove', () => {
  const rows = buildExerciseRows(blockWithRun)

  it('un individual traduce a posición de unidad (el pie no cuenta como unidad)', () => {
    expect(rowDropToMove(rows, 'ex-1', 0)).toEqual({ exerciseId: 1, targetIndex: 0 })
    expect(rowDropToMove(rows, 'ex-1', 4)).toEqual({ exerciseId: 1, targetIndex: 1 })
    expect(rowDropToMove(rows, 'ex-1', 5)).toEqual({ exerciseId: 1, targetIndex: 2 })
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

    const single = rowDropToMove(rows, 'ex-1', 5)
    expect(moveExercise(blockWithRun, single.exerciseId, single.targetIndex)).toEqual([2, 3, 4, 1])
  })

  it('devuelve null con id desconocido o lista vacía', () => {
    expect(rowDropToMove(rows, 'ex-99', 0)).toBeNull()
    expect(rowDropToMove([], 'ex-1', 0)).toBeNull()
    expect(rowDropToMove(null, 'ex-1', 0)).toBeNull()
  })
})


// A(1) · [B(2), C(3), E(5)] in group 1 · D(4)
const blockWithLongRun = [ex(1, 1), ex(2, 2, 1), ex(3, 3, 1), ex(5, 4, 1), ex(4, 5)]
// Group 1 split with something in between: [B(2)] · X(6) · [C(3)] · A(1)
const splitWithSingles = [ex(2, 1, 1), ex(6, 2), ex(3, 3, 1), ex(1, 4)]

describe('placeInSuperset — join', () => {
  it('by default goes right after the last member of the run', () => {
    expect(placeInSuperset(blockWithRun, 1, 1)).toEqual(items(2, 3, [1, 1], 4))
  })

  it('with an explicit position lands there within the run', () => {
    expect(placeInSuperset(blockWithRun, 4, 1, 0)).toEqual(items(1, [4, 1], 2, 3))
    expect(placeInSuperset(blockWithRun, 4, 1, 1)).toEqual(items(1, 2, [4, 1], 3))
    expect(placeInSuperset(blockWithRun, 4, 1, 2)).toEqual(items(1, 2, 3, [4, 1]))
  })

  it('a group with no members in the block is set in place, without moving the row', () => {
    expect(placeInSuperset(blockWithRun, 1, 7)).toEqual(items([1, 7], 2, 3, 4))
    expect(placeInSuperset(blockWithRun, 1, 7, 0)).toEqual(items([1, 7], 2, 3, 4))
  })

  it('a group with no members, from the middle of another run: out of that run first, so it does not split', () => {
    // [B(2), C(3), E(5)] in group 1: set in place, C would leave B | C | E as three cards.
    expect(placeInSuperset(blockWithLongRun, 3, 7)).toEqual(items(1, 2, 5, [3, 7], 4))
    // The last member is already at the edge: its position does not change.
    expect(placeInSuperset(blockWithLongRun, 5, 7)).toEqual(items(1, 2, 3, [5, 7], 4))
    // The only member of a run: nothing to split, set in place.
    expect(placeInSuperset([ex(1, 1), ex(2, 2, 1), ex(4, 3)], 2, 7)).toEqual(items(1, [2, 7], 4))
  })

  it('with a split group, firstMemberId picks the run; without it, the last one', () => {
    expect(placeInSuperset(splitWithSingles, 1, 1, 1, 2)).toEqual(items(2, [1, 1], 6, 3))
    expect(placeInSuperset(splitWithSingles, 1, 1)).toEqual(items(2, 6, 3, [1, 1]))
  })

  it('a member of another group changes group even when the order does not change', () => {
    // [B(2), C(3)] in group 1 · [E(5), F(6)] in group 2: E joins group 1 at the end.
    const twoRuns = [ex(2, 1, 1), ex(3, 2, 1), ex(5, 3, 2), ex(6, 4, 2)]
    expect(placeInSuperset(twoRuns, 5, 1)).toEqual(items(2, 3, [5, 1], 6))
  })

  it('moving to the other run of its own group moves the row without touching its group', () => {
    // [B(2), B2(7)] · X(6) · [C(3)], all in group 1 except X.
    const split = [ex(2, 1, 1), ex(7, 2, 1), ex(6, 3), ex(3, 4, 1)]
    expect(placeInSuperset(split, 7, 1, 0, 3)).toEqual(items(2, 6, 7, 3))
  })
})

describe('placeInSuperset — leave', () => {
  it('by default goes right after the run it leaves, also from the middle', () => {
    expect(placeInSuperset(blockWithLongRun, 3, null)).toEqual(items(1, 2, 5, [3, null], 4))
  })

  it('with an explicit position lands at that unit', () => {
    // Units without C: [A] · [B, E] · [D] → C to the first and to the last position.
    expect(placeInSuperset(blockWithLongRun, 3, null, 0)).toEqual(items([3, null], 1, 2, 5, 4))
    expect(placeInSuperset(blockWithLongRun, 3, null, 3)).toEqual(items(1, 2, 5, 4, [3, null]))
  })

  it('the only member of a run stays where it was, now individual', () => {
    expect(placeInSuperset([ex(1, 1), ex(2, 2, 1), ex(4, 3)], 2, null)).toEqual(items(1, [2, null], 4))
  })
})

describe('placeInSuperset — nothing to write', () => {
  it('returns null for an unknown id', () => {
    expect(placeInSuperset(blockWithRun, 99, 1)).toBeNull()
    expect(placeInSuperset([], 1, 1)).toBeNull()
  })

  it('returns null when joining its own group or its own run', () => {
    expect(placeInSuperset(blockWithRun, 2, 1)).toBeNull()
    expect(placeInSuperset(blockWithRun, 3, 1, 0, 2)).toBeNull()
  })

  it('returns null when taking an individual out', () => {
    expect(placeInSuperset(blockWithRun, 1, null)).toBeNull()
  })

  it('returns null for an out-of-range position', () => {
    expect(placeInSuperset(blockWithRun, 1, 1, 3)).toBeNull()
    expect(placeInSuperset(blockWithRun, 1, 1, -1)).toBeNull()
    expect(placeInSuperset(blockWithLongRun, 3, null, 4)).toBeNull()
    expect(placeInSuperset(blockWithLongRun, 3, null, -1)).toBeNull()
    // A group with no members only has position 0.
    expect(placeInSuperset(blockWithRun, 1, 7, 1)).toBeNull()
  })

  it('returns null if firstMemberId starts no run of the group', () => {
    expect(placeInSuperset(blockWithRun, 1, 1, 0, 3)).toBeNull()
    expect(placeInSuperset(blockWithRun, 1, 7, 0, 2)).toBeNull()
  })
})

describe('resolveRowDrop — with membership change allowed', () => {
  const rows = buildExerciseRows(blockWithRun)

  it('an individual can land inside a run', () => {
    expect(resolveRowDrop(rows, 'ex-1', 1, true)).toBe(1)
    expect(resolveRowDrop(rows, 'ex-1', 2, true)).toBe(2)
  })

  it('a member can leave its run', () => {
    expect(resolveRowDrop(rows, 'ex-2', 0, true)).toBe(0)
    expect(resolveRowDrop(rows, 'ex-2', 5, true)).toBe(5)
  })

  it('does not affect a header: it still lands only between units', () => {
    const splitRows = buildExerciseRows(splitWithSingles)
    // Rows: [ss-1-2, ex-2, sf-1-2, ex-6, ss-1-3, ex-3, sf-1-3, ex-1]; C's run cannot land inside B's.
    const collapsed = collapseForDrag(splitRows, 'ss-1-3')
    expect(resolveRowDrop(collapsed, 'ss-1-3', 1, true)).toBe(resolveRowDrop(collapsed, 'ss-1-3', 1))
  })

  it('the member of a run of one still stays where it is', () => {
    const single = buildExerciseRows([ex(1, 1), ex(2, 2, 1)])
    expect(resolveRowDrop(single, 'ex-2', 0, true)).toBe(2)
  })
})

describe('resolveMembershipDrop — slot table', () => {
  // Rows: [ex-1, ss-1-2, ex-2, ex-3, sf-1-2, ex-4]. D (ex-4) is dragged; without it:
  // [ex-1, ss-1-2, ex-2, ex-3, sf-1-2].
  const rows = buildExerciseRows(blockWithRun)
  const drop = (index, activeRowId = 'ex-4') => resolveMembershipDrop(rows, activeRowId, index)

  it('header of G above: joins at the start', () => {
    expect(drop(2)).toEqual({ index: 2, group: 1, firstMemberId: 2, kind: 'join' })
  })

  it('member of G above: joins, also right above the footer (at the end)', () => {
    expect(drop(3)).toEqual({ index: 3, group: 1, firstMemberId: 2, kind: 'join' })
    expect(drop(4)).toEqual({ index: 4, group: 1, firstMemberId: 2, kind: 'join' })
  })

  it('footer above: individual', () => {
    expect(drop(5)).toEqual({ index: 5, group: null, firstMemberId: null, kind: 'single' })
  })

  it('an individual or nothing above: individual', () => {
    expect(drop(0)).toEqual({ index: 0, group: null, firstMemberId: null, kind: 'single' })
    expect(drop(1)).toEqual({ index: 1, group: null, firstMemberId: null, kind: 'single' })
  })

  it('A | B adjacent: above A\'s footer joins A, between the footer and B\'s header stays out, below B\'s header joins B', () => {
    // [A1(1), A2(2)] in group 1 · [B1(3), B2(4)] in group 2 · X(5)
    const adjacent = buildExerciseRows([ex(1, 1, 1), ex(2, 2, 1), ex(3, 3, 2), ex(4, 4, 2), ex(5, 5)])
    // Without X: [ss-1-1, ex-1, ex-2, sf-1-1, ss-2-3, ex-3, ex-4, sf-2-3]
    expect(resolveMembershipDrop(adjacent, 'ex-5', 3)).toEqual({ index: 3, group: 1, firstMemberId: 1, kind: 'join' })
    expect(resolveMembershipDrop(adjacent, 'ex-5', 4)).toMatchObject({ kind: 'single', group: null })
    expect(resolveMembershipDrop(adjacent, 'ex-5', 5)).toEqual({ index: 5, group: 2, firstMemberId: 3, kind: 'join' })
  })

  it('a member leaves by being dropped below its footer, also when the superset closes the block', () => {
    // A(1) · [B(2), C(3)] in group 1, nothing after. Rows: [ex-1, ss-1-2, ex-2, ex-3, sf-1-2].
    const lastRun = buildExerciseRows([ex(1, 1), ex(2, 2, 1), ex(3, 3, 1)])
    expect(resolveMembershipDrop(lastRun, 'ex-3', 4)).toMatchObject({ kind: 'single', group: null })
    expect(resolveMembershipDrop(lastRun, 'ex-2', 4)).toMatchObject({ kind: 'single', group: null })
    // Right above the footer (where C already is) it stays in.
    expect(resolveMembershipDrop(lastRun, 'ex-3', 3)).toMatchObject({ kind: 'join', group: 1 })
  })

  it('a member of another run joins the run whose footer it lands above', () => {
    // [B(2), C(3)] in group 1 · [E(5), F(6)] in group 2. Without B:
    // [ss-1-2, ex-3, sf-1-2, ss-2-5, ex-5, ex-6, sf-2-5]
    const twoRuns = buildExerciseRows([ex(2, 1, 1), ex(3, 2, 1), ex(5, 3, 2), ex(6, 4, 2)])
    expect(resolveMembershipDrop(twoRuns, 'ex-2', 6)).toMatchObject({ kind: 'join', group: 2, firstMemberId: 5 })
    expect(resolveMembershipDrop(twoRuns, 'ex-2', 7)).toMatchObject({ kind: 'single', group: null })
  })

  it('returns null for what cannot change superset', () => {
    // The header, the member of a run of one, an unknown id and an empty list.
    expect(resolveMembershipDrop(collapseForDrag(rows, 'ss-1-2'), 'ss-1-2', 0)).toBeNull()
    expect(resolveMembershipDrop(buildExerciseRows([ex(1, 1), ex(2, 2, 1)]), 'ex-2', 0)).toBeNull()
    expect(resolveMembershipDrop(rows, 'ex-99', 0)).toBeNull()
    expect(resolveMembershipDrop([], 'ex-1', 0)).toBeNull()
    expect(resolveMembershipDrop(null, 'ex-1', 0)).toBeNull()
  })
})

describe('getMembershipDropPreview', () => {
  const rows = buildExerciseRows(blockWithRun)

  it('an individual about to join is painted as a member', () => {
    expect(getMembershipDropPreview(rows, 'ex-4', 3)).toBe('superset')
    expect(getMembershipDropPreview(rows, 'ex-4', 4)).toBe('superset')
  })

  it('an individual that stays individual is painted flush', () => {
    expect(getMembershipDropPreview(rows, 'ex-4', 5)).toBe('single')
  })

  it('a member about to become individual is painted flush', () => {
    expect(getMembershipDropPreview(rows, 'ex-2', 0)).toBe('single')
    expect(getMembershipDropPreview(rows, 'ex-2', 4)).toBe('single')
  })

  it('a member that stays in a superset is painted as a member', () => {
    expect(getMembershipDropPreview(rows, 'ex-2', 3)).toBe('superset')
  })

  it('a header, the member of a run of one or an unknown id: null (resting look)', () => {
    expect(getMembershipDropPreview(collapseForDrag(rows, 'ss-1-2'), 'ss-1-2', 0)).toBeNull()
    expect(getMembershipDropPreview(buildExerciseRows([ex(1, 1), ex(2, 2, 1)]), 'ex-2', 0)).toBeNull()
    expect(getMembershipDropPreview(rows, 'ex-99', 0)).toBeNull()
  })

  it('matches what applyRowDrop saves at the same slot', () => {
    // D below the footer (its own place) saves nothing; above the footer saves it into group 1.
    expect(getMembershipDropPreview(rows, 'ex-4', 5)).toBe('single')
    expect(applyRowDrop(blockWithRun, rows, 'ex-4', 5)).toBeNull()
    expect(getMembershipDropPreview(rows, 'ex-4', 4)).toBe('superset')
    expect(applyRowDrop(blockWithRun, rows, 'ex-4', 4)).toEqual(items(1, 2, 3, [4, 1]))
  })
})

describe('canDragExerciseRow', () => {
  it('a member of a run of more than one has a handle, even when the run is the only unit', () => {
    const rows = buildExerciseRows([ex(2, 1, 1), ex(3, 2, 1)])
    expect(canDragExerciseRow(rows[1], 1)).toBe(true)
    expect(canDragExerciseRow(rows[2], 1)).toBe(true)
  })

  it('a header or an individual only when there is another unit', () => {
    const rows = buildExerciseRows(blockWithRun)
    expect(canDragExerciseRow(rows[0], 3)).toBe(true)
    expect(canDragExerciseRow(rows[1], 3)).toBe(true)
    expect(canDragExerciseRow(rows[0], 1)).toBe(false)
    expect(canDragExerciseRow(rows[1], 1)).toBe(false)
  })

  it('the member of a run of one never has one', () => {
    const rows = buildExerciseRows([ex(1, 1), ex(2, 2, 1)])
    expect(canDragExerciseRow(rows[2], 2)).toBe(false)
  })

  it('a footer never has one', () => {
    const rows = buildExerciseRows(blockWithRun)
    expect(rows[4].kind).toBe('supersetFooter')
    expect(canDragExerciseRow(rows[4], 3)).toBe(false)
  })

  it('without a row: false', () => {
    expect(canDragExerciseRow(null, 2)).toBe(false)
    expect(canDragExerciseRow(undefined, 2)).toBe(false)
  })
})

describe('membershipDropToPlacement', () => {
  const rows = buildExerciseRows(blockWithRun)
  const placement = (activeRowId, index) =>
    membershipDropToPlacement(rows, activeRowId, resolveMembershipDrop(rows, activeRowId, index))

  it('joining translates to a position within the target run', () => {
    // Without A: [ss-1-2, ex-2, ex-3, sf-1-2, ex-4]
    expect(placement('ex-1', 1)).toEqual({ exerciseId: 1, group: 1, targetIndex: 0, firstMemberId: 2, changesMembership: true })
    expect(placement('ex-1', 2)).toEqual({ exerciseId: 1, group: 1, targetIndex: 1, firstMemberId: 2, changesMembership: true })
    expect(placement('ex-1', 3)).toEqual({ exerciseId: 1, group: 1, targetIndex: 2, firstMemberId: 2, changesMembership: true })
  })

  it('moving within its own run does not change membership', () => {
    expect(placement('ex-3', 2)).toEqual({ exerciseId: 3, group: 1, targetIndex: 0, firstMemberId: 2, changesMembership: false })
  })

  it('ending up individual translates to a unit position (the footer is not a unit)', () => {
    // A member leaving: without B, [ex-1, ss-1-2, ex-3, sf-1-2, ex-4].
    expect(placement('ex-2', 4)).toEqual({ exerciseId: 2, group: null, targetIndex: 2, firstMemberId: null, changesMembership: true })
    expect(placement('ex-2', 5)).toEqual({ exerciseId: 2, group: null, targetIndex: 3, firstMemberId: null, changesMembership: true })
    // An individual that stays individual.
    expect(placement('ex-1', 4)).toEqual({ exerciseId: 1, group: null, targetIndex: 1, firstMemberId: null, changesMembership: false })
  })

  it('returns null without a drop, for a header or for a run that does not exist', () => {
    expect(membershipDropToPlacement(rows, 'ex-1', null)).toBeNull()
    expect(membershipDropToPlacement(rows, 'ss-1-2', { index: 0, group: null, firstMemberId: null })).toBeNull()
    expect(membershipDropToPlacement(rows, 'ex-1', { index: 1, group: 1, firstMemberId: 99 })).toBeNull()
    expect(membershipDropToPlacement([], 'ex-1', { index: 0, group: null, firstMemberId: null })).toBeNull()
  })
})

describe('applyRowDrop', () => {
  const rows = buildExerciseRows(blockWithRun)

  it('moves an individual after the whole superset', () => {
    // Rows: [ex-1, ss-1-2, ex-2, ex-3, sf-1-2, ex-4]; drop ex-1 at the last position.
    expect(applyRowDrop(blockWithRun, rows, 'ex-1', 5)).toEqual(items(2, 3, 4, 1))
  })

  it('moves the whole superset from its header, without touching membership', () => {
    expect(applyRowDrop(blockWithRun, rows, 'ss-1-2', 0)).toEqual(items(2, 3, 1, 4))
  })

  it('an individual dropped between two members, or right below the header, joins', () => {
    expect(applyRowDrop(blockWithRun, rows, 'ex-1', 2)).toEqual(items(2, [1, 1], 3, 4))
    // Right below the header the order does not change: only membership.
    expect(applyRowDrop(blockWithRun, rows, 'ex-1', 1)).toEqual(items([1, 1], 2, 3, 4))
  })

  it('a member dropped between two individuals leaves the superset', () => {
    // A · [B, C] · D · E; B between D and E.
    const block = [ex(1, 1), ex(2, 2, 1), ex(3, 3, 1), ex(4, 4), ex(5, 5)]
    expect(applyRowDrop(block, buildExerciseRows(block), 'ex-2', 5)).toEqual(items(1, 3, 4, [2, null], 5))
  })

  it('right above the footer joins at the end; below it stays individual', () => {
    expect(applyRowDrop(blockWithRun, rows, 'ex-4', 4)).toEqual(items(1, 2, 3, [4, 1]))
    expect(applyRowDrop(blockWithRun, rows, 'ex-4', 5)).toBeNull()
  })

  it('with the superset closing the block, a member leaves by being dropped below the footer', () => {
    // A(1) · [B(2), C(3)]. Rows: [ex-1, ss-1-2, ex-2, ex-3, sf-1-2].
    const block = [ex(1, 1), ex(2, 2, 1), ex(3, 3, 1)]
    const lastRows = buildExerciseRows(block)
    expect(applyRowDrop(block, lastRows, 'ex-3', 4)).toEqual(items(1, 2, [3, null]))
    expect(applyRowDrop(block, lastRows, 'ex-2', 4)).toEqual(items(1, 3, [2, null]))
  })

  it('a member reorders within its run without changing group', () => {
    expect(applyRowDrop(blockWithRun, rows, 'ex-2', 3)).toEqual(items(1, 3, 2, 4))
  })

  it('with a split group, dropping into the FIRST run joins that one', () => {
    const splitRows = buildExerciseRows(splitWithSingles)
    // Rows: [ss-1-2, ex-2, sf-1-2, ex-6, ss-1-3, ex-3, sf-1-3, ex-1]; A right above B's footer.
    expect(applyRowDrop(splitWithSingles, splitRows, 'ex-1', 2)).toEqual(items(2, [1, 1], 6, 3))
  })

  it('with a split group moves only the dragged run', () => {
    const splitRows = buildExerciseRows(splitBlock)
    // Rows: [ss-1-2, ex-2, sf-1-2, ex-1, ss-1-3, ex-3, sf-1-3]; the second run (C) to the first position.
    expect(applyRowDrop(splitBlock, splitRows, 'ss-1-3', 0)).toEqual(items(3, 2, 1))
  })

  it('returns null if the row stays where it was (including the last member, above its footer) or does not exist', () => {
    expect(applyRowDrop(blockWithRun, rows, 'ex-1', 0)).toBeNull()
    expect(applyRowDrop(blockWithRun, rows, 'ex-3', 3)).toBeNull()
    expect(applyRowDrop(blockWithRun, rows, 'ex-99', 1)).toBeNull()
  })
})

describe('idsToOrderItems', () => {
  it('turns ids into items with no membership change', () => {
    expect(idsToOrderItems([3, 1])).toEqual([{ id: 3 }, { id: 1 }])
    expect(idsToOrderItems([])).toEqual([])
  })

  it('keeps null as null (nothing to write)', () => {
    expect(idsToOrderItems(null)).toBeNull()
  })
})
