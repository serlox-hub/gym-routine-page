import { describe, it, expect } from 'vitest'
import {
  formatSupersetLabel,
  getSupersetLetter,
  getExistingSupersetIds,
  getNextSupersetId,
  isExerciseInSuperset,
  countExercisesInBlock,
} from '../supersetUtils.js'

describe('supersetUtils', () => {
  describe('formatSupersetLabel', () => {
    it('retorna "Superset A" para id 1', () => {
      expect(formatSupersetLabel(1)).toBe('Superset A')
    })

    it('retorna "Superset B" para id 2', () => {
      expect(formatSupersetLabel(2)).toBe('Superset B')
    })

    it('retorna "Superset Z" para id 26', () => {
      expect(formatSupersetLabel(26)).toBe('Superset Z')
    })

    it('retorna string vacío para null', () => {
      expect(formatSupersetLabel(null)).toBe('')
    })

    it('retorna string vacío para undefined', () => {
      expect(formatSupersetLabel(undefined)).toBe('')
    })

    it('retorna string vacío para 0', () => {
      expect(formatSupersetLabel(0)).toBe('')
    })

    it('retorna string vacío para números negativos', () => {
      expect(formatSupersetLabel(-1)).toBe('')
    })
  })

  describe('getSupersetLetter', () => {
    it('retorna "A" para id 1', () => {
      expect(getSupersetLetter(1)).toBe('A')
    })

    it('retorna "B" para id 2', () => {
      expect(getSupersetLetter(2)).toBe('B')
    })

    it('retorna "Z" para id 26', () => {
      expect(getSupersetLetter(26)).toBe('Z')
    })

    it('retorna string vacío para null', () => {
      expect(getSupersetLetter(null)).toBe('')
    })

    it('retorna string vacío para undefined', () => {
      expect(getSupersetLetter(undefined)).toBe('')
    })

    it('retorna string vacío para 0', () => {
      expect(getSupersetLetter(0)).toBe('')
    })
  })

  describe('getExistingSupersetIds', () => {
    it('retorna array vacío para null', () => {
      expect(getExistingSupersetIds(null)).toEqual([])
    })

    it('retorna array vacío para undefined', () => {
      expect(getExistingSupersetIds(undefined)).toEqual([])
    })

    it('retorna array vacío para array vacío', () => {
      expect(getExistingSupersetIds([])).toEqual([])
    })

    it('retorna array vacío si no hay supersets', () => {
      const exercises = [
        { id: 1, superset_group: null },
        { id: 2, superset_group: null },
      ]
      expect(getExistingSupersetIds(exercises)).toEqual([])
    })

    it('extrae IDs únicos de supersets', () => {
      const exercises = [
        { id: 1, superset_group: 1 },
        { id: 2, superset_group: 1 },
        { id: 3, superset_group: 2 },
        { id: 4, superset_group: null },
      ]
      expect(getExistingSupersetIds(exercises)).toEqual([1, 2])
    })

    it('ordena los IDs de menor a mayor', () => {
      const exercises = [
        { id: 1, superset_group: 3 },
        { id: 2, superset_group: 1 },
        { id: 3, superset_group: 2 },
      ]
      expect(getExistingSupersetIds(exercises)).toEqual([1, 2, 3])
    })

    it('ignora ejercicios con superset_group undefined', () => {
      const exercises = [
        { id: 1, superset_group: 1 },
        { id: 2 },
      ]
      expect(getExistingSupersetIds(exercises)).toEqual([1])
    })
  })

  describe('getNextSupersetId', () => {
    it('retorna 1 para null', () => {
      expect(getNextSupersetId(null)).toBe(1)
    })

    it('retorna 1 para undefined', () => {
      expect(getNextSupersetId(undefined)).toBe(1)
    })

    it('retorna 1 para array vacío', () => {
      expect(getNextSupersetId([])).toBe(1)
    })

    it('retorna siguiente ID disponible', () => {
      expect(getNextSupersetId([1])).toBe(2)
      expect(getNextSupersetId([1, 2])).toBe(3)
      expect(getNextSupersetId([1, 2, 3])).toBe(4)
    })

    it('retorna max + 1 aunque haya huecos', () => {
      expect(getNextSupersetId([1, 3])).toBe(4)
      expect(getNextSupersetId([2, 5])).toBe(6)
    })
  })

  describe('isExerciseInSuperset', () => {
    it('retorna false para null', () => {
      expect(isExerciseInSuperset(null)).toBe(false)
    })

    it('retorna false para undefined', () => {
      expect(isExerciseInSuperset(undefined)).toBe(false)
    })

    it('retorna false si superset_group es null', () => {
      expect(isExerciseInSuperset({ superset_group: null })).toBe(false)
    })

    it('retorna false si superset_group es undefined', () => {
      expect(isExerciseInSuperset({ id: 1 })).toBe(false)
    })

    it('retorna true si superset_group tiene valor', () => {
      expect(isExerciseInSuperset({ superset_group: 1 })).toBe(true)
      expect(isExerciseInSuperset({ superset_group: 2 })).toBe(true)
    })

    it('retorna true para superset_group 0', () => {
      // 0 es un valor válido aunque inusual
      expect(isExerciseInSuperset({ superset_group: 0 })).toBe(true)
    })
  })

  describe('countExercisesInBlock', () => {
    it('retorna 0 para null', () => {
      expect(countExercisesInBlock(null)).toBe(0)
    })

    it('retorna 0 para undefined', () => {
      expect(countExercisesInBlock(undefined)).toBe(0)
    })

    it('retorna 0 si no hay exerciseGroups', () => {
      expect(countExercisesInBlock({})).toBe(0)
      expect(countExercisesInBlock({ exerciseGroups: null })).toBe(0)
    })

    it('retorna 0 para exerciseGroups vacío', () => {
      expect(countExercisesInBlock({ exerciseGroups: [] })).toBe(0)
    })

    it('cuenta ejercicios individuales', () => {
      const block = {
        exerciseGroups: [
          { type: 'individual', exercise: { id: 1 } },
          { type: 'individual', exercise: { id: 2 } },
        ]
      }
      expect(countExercisesInBlock(block)).toBe(2)
    })

    it('cuenta ejercicios en supersets', () => {
      const block = {
        exerciseGroups: [
          { type: 'superset', exercises: [{ id: 1 }, { id: 2 }] },
        ]
      }
      expect(countExercisesInBlock(block)).toBe(2)
    })

    it('cuenta combinación de individuales y supersets', () => {
      const block = {
        exerciseGroups: [
          { type: 'individual', exercise: { id: 1 } },
          { type: 'superset', exercises: [{ id: 2 }, { id: 3 }] },
          { type: 'individual', exercise: { id: 4 } },
          { type: 'superset', exercises: [{ id: 5 }, { id: 6 }, { id: 7 }] },
        ]
      }
      expect(countExercisesInBlock(block)).toBe(7)
    })
  })
})
