import { describe, it, expect, vi } from 'vitest'
import {
  PENDING_SHARED_ROUTINE_KEY,
  PENDING_SHARED_ROUTINE_TTL_MS,
  buildRoutineShareUrl,
  savePendingSharedRoutine,
  takePendingSharedRoutine,
  buildSharedRoutinePreview,
} from './routineShare.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value) },
    removeItem: (key) => { delete data[key] },
  }
}

const NOW = 1_700_000_000_000

describe('buildRoutineShareUrl', () => {
  it('joins origin and token under /r/', () => {
    expect(buildRoutineShareUrl('https://app.example.com', 'abc')).toBe('https://app.example.com/r/abc')
  })

  it('drops trailing slashes of the origin', () => {
    expect(buildRoutineShareUrl('https://app.example.com//', 'abc')).toBe('https://app.example.com/r/abc')
  })
})

describe('savePendingSharedRoutine / takePendingSharedRoutine', () => {
  it('returns a saved path once, then nothing', () => {
    const storage = memoryStorage()
    savePendingSharedRoutine(storage, '/r/abc', NOW)
    expect(takePendingSharedRoutine(storage, NOW + 1000)).toBe('/r/abc')
    expect(takePendingSharedRoutine(storage, NOW + 2000)).toBeNull()
  })

  it('keeps an entry valid up to the TTL', () => {
    const storage = memoryStorage()
    savePendingSharedRoutine(storage, '/r/abc', NOW)
    expect(takePendingSharedRoutine(storage, NOW + PENDING_SHARED_ROUTINE_TTL_MS)).toBe('/r/abc')
  })

  it('deletes and ignores an expired entry', () => {
    const storage = memoryStorage()
    savePendingSharedRoutine(storage, '/r/abc', NOW)
    expect(takePendingSharedRoutine(storage, NOW + PENDING_SHARED_ROUTINE_TTL_MS + 1)).toBeNull()
    expect(storage.data[PENDING_SHARED_ROUTINE_KEY]).toBeUndefined()
  })

  it('returns null when there is no entry', () => {
    expect(takePendingSharedRoutine(memoryStorage(), NOW)).toBeNull()
  })

  it('deletes and ignores a malformed entry or one that is not a shared-routine path', () => {
    for (const raw of ['not json', JSON.stringify({ path: '/history', savedAt: NOW }), JSON.stringify({ path: '/r/abc' }), 'null']) {
      const storage = memoryStorage({ [PENDING_SHARED_ROUTINE_KEY]: raw })
      expect(takePendingSharedRoutine(storage, NOW)).toBeNull()
      expect(storage.data[PENDING_SHARED_ROUTINE_KEY]).toBeUndefined()
    }
  })

  it('survives a storage that throws', () => {
    const broken = { getItem: vi.fn(() => { throw new Error('denied') }), setItem: vi.fn(() => { throw new Error('denied') }), removeItem: vi.fn() }
    expect(() => savePendingSharedRoutine(broken, '/r/abc', NOW)).not.toThrow()
    expect(takePendingSharedRoutine(broken, NOW)).toBeNull()
  })
})

describe('buildSharedRoutinePreview', () => {
  const row = (name, superset_group = null) => ({ exercise_name: name, series: 3, reps: '10', superset_group })
  const exportData = {
    exercises: [
      { name_es: 'A', name_en: 'A en', tracked_fields: ['weight', 'reps'], muscle_group_name: 'Pecho' },
      { name_es: 'B', name_en: null, tracked_fields: ['time'], muscle_group_name: null },
    ],
    routine: {
      name: 'R',
      description: 'desc',
      days: [
        { name: 'Second', sort_order: 2, estimated_duration_min: null, blocks: [{ name: 'Principal', exercises: [row('A')] }] },
        {
          name: 'First', sort_order: 1, estimated_duration_min: 45,
          blocks: [
            { name: 'Principal', exercises: [row('A', 1), row('B', 1), row('A'), row('B', 2)] },
            { name: 'Calentamiento', exercises: [row('B')] },
            { name: 'Principal', exercises: [] },
          ],
        },
      ],
    },
  }

  it('orders days, puts the warm-up first and drops empty blocks', () => {
    const preview = buildSharedRoutinePreview(exportData)
    expect(preview).toMatchObject({ name: 'R', description: 'desc' })
    expect(preview.days.map(day => [day.name, day.estimatedDurationMin])).toEqual([['First', 45], ['Second', null]])
    expect(preview.days[0].blocks.map(block => block.isWarmup)).toEqual([true, false])
  })

  it('groups consecutive superset members and treats a lone member as individual', () => {
    const units = buildSharedRoutinePreview(exportData).days[0].blocks[1].units
    expect(units.map(unit => [unit.supersetGroup, unit.exercises.map(e => e.exercise_name)])).toEqual([
      [1, ['A', 'B']],
      [null, ['A']],
      [null, ['B']],
    ])
  })

  it('shows a group split by other rows as individual exercises, as the import would copy it', () => {
    const data = { routine: { name: 'R', days: [{ name: 'D', sort_order: 1, blocks: [{ name: 'Principal', exercises: [row('A', 1), row('B', 1), row('A'), row('B', 1), row('A', 1)] }] }] } }
    const units = buildSharedRoutinePreview(data).days[0].blocks[0].units
    expect(units.map(unit => unit.supersetGroup)).toEqual([null, null, null, null, null])
  })

  it('attaches the catalog entry of each exercise, or a bare one when the catalog lacks it', () => {
    const preview = buildSharedRoutinePreview({ ...exportData, exercises: exportData.exercises.slice(0, 1) })
    const [warmupUnit] = preview.days[0].blocks[0].units
    expect(warmupUnit.exercises[0].catalog).toEqual({ name_es: 'B' })
    expect(preview.days[0].blocks[1].units[0].exercises[0].catalog.name_en).toBe('A en')
  })

  it('returns an empty preview for missing data', () => {
    expect(buildSharedRoutinePreview(null)).toEqual({ name: undefined, description: null, days: [] })
  })
})
