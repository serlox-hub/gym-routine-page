import { describe, it, expect } from 'vitest'
import {
  countSheetFilters,
  hasActiveExerciseFilters,
  shouldOfferClearFilters,
  getFilterSheetDoneLabel,
} from './exerciseFilters.js'

const CHEST = 1
const LEGS = 2
const BARBELL = 10
const TRX = 30

const CATALOG = [
  { id: 1, name: 'Press banca', muscle_group_id: CHEST, is_system: true, equipment_type: { id: BARBELL } },
  { id: 2, name: 'Press inclinado', muscle_group_id: CHEST, is_system: false, equipment_type: { id: BARBELL } },
  { id: 3, name: 'Sentadilla', muscle_group_id: LEGS, is_system: true, equipment_type: { id: BARBELL } },
  { id: 4, name: 'Remo TRX', muscle_group_id: LEGS, is_system: true, equipment_type: { id: TRX } },
]

describe('countSheetFilters', () => {
  it('is 0 with no filter', () => {
    expect(countSheetFilters({ equipmentTypeId: null, sourceFilter: 'all' })).toBe(0)
  })

  it('is 0 with nothing passed', () => {
    expect(countSheetFilters()).toBe(0)
    expect(countSheetFilters({})).toBe(0)
  })

  it('counts the equipment alone', () => {
    expect(countSheetFilters({ equipmentTypeId: BARBELL, sourceFilter: 'all' })).toBe(1)
  })

  it('counts only mine alone', () => {
    expect(countSheetFilters({ equipmentTypeId: null, sourceFilter: 'custom' })).toBe(1)
  })

  it('counts "system" as active, though the UI no longer offers it', () => {
    expect(countSheetFilters({ equipmentTypeId: null, sourceFilter: 'system' })).toBe(1)
  })

  it('counts both together', () => {
    expect(countSheetFilters({ equipmentTypeId: BARBELL, sourceFilter: 'custom' })).toBe(2)
  })

  it('leaves the muscle group out', () => {
    expect(countSheetFilters({ muscleGroupId: CHEST, equipmentTypeId: null, sourceFilter: 'all' })).toBe(0)
  })
})

describe('hasActiveExerciseFilters', () => {
  it('is false with no filter', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: null, equipmentTypeId: null, sourceFilter: 'all' })).toBe(false)
  })

  it('is false with nothing passed', () => {
    expect(hasActiveExerciseFilters()).toBe(false)
  })

  it('is true with the muscle group alone', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: CHEST, equipmentTypeId: null, sourceFilter: 'all' })).toBe(true)
  })

  it('is true with the equipment alone', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: null, equipmentTypeId: BARBELL, sourceFilter: 'all' })).toBe(true)
  })

  it('is true with only mine alone', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: null, equipmentTypeId: null, sourceFilter: 'custom' })).toBe(true)
  })

  it('is true with "system"', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: null, equipmentTypeId: null, sourceFilter: 'system' })).toBe(true)
  })

  it('is true with all three combined', () => {
    expect(hasActiveExerciseFilters({ muscleGroupId: CHEST, equipmentTypeId: BARBELL, sourceFilter: 'custom' })).toBe(true)
  })
})

describe('shouldOfferClearFilters', () => {
  const noFilters = { search: '', muscleGroupId: null, equipmentTypeId: null, sourceFilter: 'all' }

  it('is true when the filters are what empties the list', () => {
    expect(shouldOfferClearFilters(CATALOG, { ...noFilters, muscleGroupId: CHEST, equipmentTypeId: TRX })).toBe(true)
  })

  it('is true when the filters empty a list the search alone would fill', () => {
    const filters = { ...noFilters, search: 'sentadilla', muscleGroupId: CHEST }
    expect(shouldOfferClearFilters(CATALOG, filters)).toBe(true)
  })

  it('is false when the search finds nothing even without filters', () => {
    expect(shouldOfferClearFilters(CATALOG, { ...noFilters, search: 'xyzq', muscleGroupId: CHEST })).toBe(false)
  })

  it('is false with no filter active', () => {
    expect(shouldOfferClearFilters(CATALOG, { ...noFilters, search: 'xyzq' })).toBe(false)
  })

  it('is false when the filtered list is not empty', () => {
    expect(shouldOfferClearFilters(CATALOG, { ...noFilters, muscleGroupId: CHEST })).toBe(false)
  })

  it('is false while the catalog is not loaded', () => {
    expect(shouldOfferClearFilters(undefined, { ...noFilters, muscleGroupId: CHEST })).toBe(false)
    expect(shouldOfferClearFilters([], { ...noFilters, muscleGroupId: CHEST })).toBe(false)
  })

  it('treats only mine as a filter', () => {
    const systemOnly = CATALOG.filter(e => e.is_system)
    expect(shouldOfferClearFilters(systemOnly, { ...noFilters, sourceFilter: 'custom' })).toBe(true)
  })
})

describe('getFilterSheetDoneLabel', () => {
  it('shows how many exercises there are', () => {
    expect(getFilterSheetDoneLabel(23)).toBe('Ver 23 ejercicios')
  })

  it('uses the singular for one', () => {
    expect(getFilterSheetDoneLabel(1)).toBe('Ver 1 ejercicio')
  })

  it('says there are no results for 0', () => {
    expect(getFilterSheetDoneLabel(0)).toBe('Sin resultados')
  })

  it('carries no number while the catalog is loading', () => {
    expect(getFilterSheetDoneLabel(null)).toBe('Hecho')
    expect(getFilterSheetDoneLabel(undefined)).toBe('Hecho')
  })
})
