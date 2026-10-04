import { describe, it, expect } from 'vitest'
import {
  getRecentExercises,
  getVisibleRecentExercises,
  RECENT_EXERCISES_LIMIT,
} from './recentExercises.js'

// Catalog in its alphabetical order, as the picker loads it.
const CATALOG = [
  { id: 10, name: 'Curl bíceps', muscle_group_id: 3, is_system: true, equipment_type: { id: 20 } },
  { id: 20, name: 'Dominadas', muscle_group_id: 2, is_system: true, equipment_type: null },
  { id: 30, name: 'Press banca', muscle_group_id: 1, is_system: true, equipment_type: { id: 10 } },
  { id: 40, name: 'Press inclinado', muscle_group_id: 1, is_system: false, equipment_type: { id: 10 } },
  { id: 50, name: 'Remo con barra', muscle_group_id: 2, is_system: true, equipment_type: { id: 10 } },
  { id: 60, name: 'Sentadilla', muscle_group_id: 4, is_system: true, equipment_type: { id: 10 } },
  { id: 70, name: 'Zancadas', muscle_group_id: 4, is_system: true, equipment_type: null },
]

const LAST = '2026-09-30T18:00:00+00:00'
const BEFORE = '2026-09-27T18:00:00+00:00'
const OLDEST = '2026-09-24T18:00:00+00:00'

const row = (exerciseId, sessionDate) => ({ exercise_id: exerciseId, session_date: sessionDate })
const ids = exercises => exercises.map(e => e.id)

describe('getRecentExercises', () => {
  it('returns the exercises of the latest sessions, newest session first', () => {
    const rows = [row(50, LAST), row(10, BEFORE)]
    expect(ids(getRecentExercises(rows, CATALOG))).toEqual([50, 10])
  })

  it('breaks ties on session_date by catalog order, whatever order the rows come in', () => {
    // Last session had Sentadilla and Dominadas, the one before Curl and Sentadilla.
    const rows = [row(60, LAST), row(20, LAST), row(10, BEFORE), row(60, BEFORE)]
    expect(ids(getRecentExercises(rows, CATALOG))).toEqual([20, 60, 10])
  })

  it('keeps an exercise at its newest occurrence', () => {
    const rows = [row(30, LAST), row(50, BEFORE), row(30, BEFORE), row(30, OLDEST)]
    expect(ids(getRecentExercises(rows, CATALOG))).toEqual([30, 50])
  })

  it('stops at the limit, by default RECENT_EXERCISES_LIMIT', () => {
    const rows = CATALOG.map(e => row(e.id, LAST))
    expect(getRecentExercises(rows, CATALOG)).toHaveLength(RECENT_EXERCISES_LIMIT)
    expect(ids(getRecentExercises(rows, CATALOG, 2))).toEqual([10, 20])
  })

  it('takes the limit after ordering, so an older session never pushes out a newer one', () => {
    const rows = [row(70, LAST), row(10, BEFORE), row(20, BEFORE)]
    expect(ids(getRecentExercises(rows, CATALOG, 2))).toEqual([70, 10])
  })

  it('skips ids missing from the catalog (soft-deleted exercises)', () => {
    const rows = [row(999, LAST), row(30, LAST), row(888, BEFORE), row(50, BEFORE)]
    expect(ids(getRecentExercises(rows, CATALOG))).toEqual([30, 50])
  })

  it('returns the catalog objects themselves, so rows render like the list', () => {
    const [recent] = getRecentExercises([row(30, LAST)], CATALOG)
    expect(recent).toBe(CATALOG[2])
  })

  it('returns [] for null or empty rows or catalog', () => {
    expect(getRecentExercises(null, CATALOG)).toEqual([])
    expect(getRecentExercises(undefined, CATALOG)).toEqual([])
    expect(getRecentExercises([], CATALOG)).toEqual([])
    expect(getRecentExercises([row(30, LAST)], null)).toEqual([])
    expect(getRecentExercises([row(30, LAST)], [])).toEqual([])
  })

  it('returns [] when no row is in the catalog', () => {
    expect(getRecentExercises([row(999, LAST)], CATALOG)).toEqual([])
  })
})

describe('getVisibleRecentExercises', () => {
  // Recency order, not alphabetical: the section must keep it.
  const RECENT = [CATALOG[5], CATALOG[2], CATALOG[0], CATALOG[3]]

  it('shows every recent exercise in its recency order with no search and no filters', () => {
    expect(ids(getVisibleRecentExercises(RECENT))).toEqual([60, 30, 10, 40])
    expect(ids(getVisibleRecentExercises(RECENT, { search: '' }))).toEqual([60, 30, 10, 40])
  })

  it('treats a search of only spaces as no search', () => {
    expect(ids(getVisibleRecentExercises(RECENT, { search: '   ' }))).toEqual([60, 30, 10, 40])
  })

  it('treats a null or missing search as no search', () => {
    expect(getVisibleRecentExercises(RECENT, { search: null })).toHaveLength(4)
    expect(getVisibleRecentExercises(RECENT, {})).toHaveLength(4)
  })

  it('hides the section as soon as there is search text, even one that matches', () => {
    expect(getVisibleRecentExercises(RECENT, { search: 'p' })).toEqual([])
    expect(getVisibleRecentExercises(RECENT, { search: ' press ' })).toEqual([])
  })

  it('applies the list filters', () => {
    expect(ids(getVisibleRecentExercises(RECENT, { muscleGroupId: 1 }))).toEqual([30, 40])
    expect(ids(getVisibleRecentExercises(RECENT, { equipmentTypeId: 20 }))).toEqual([10])
    expect(ids(getVisibleRecentExercises(RECENT, { sourceFilter: 'custom' }))).toEqual([40])
  })

  it('returns [] when the filters leave nothing', () => {
    expect(getVisibleRecentExercises(RECENT, { muscleGroupId: 2 })).toEqual([])
  })

  it('returns [] for null or empty recents', () => {
    expect(getVisibleRecentExercises(null)).toEqual([])
    expect(getVisibleRecentExercises([], { search: '' })).toEqual([])
  })
})
