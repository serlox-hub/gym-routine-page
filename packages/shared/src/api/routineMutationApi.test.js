import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from './_client.js'

import {
  createRoutine,
  createRoutineDay,
  updateRoutine,
  deleteRoutine,
  deleteRoutines,
  setFavoriteRoutine,
  updateRoutineDay,
  deleteRoutineDay,
  reorderRoutineDays,
  deleteRoutineExercise,
  updateRoutineExercise,
  reorderRoutineExercises,
  addExerciseToDay,
  duplicateRoutineExercise,
  moveRoutineExerciseToDay,
} from './routineMutationApi.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// createRoutine
// ============================================

describe('createRoutine', () => {
  it('returns created routine on success', async () => {
    const created = { id: 1, name: 'Push Pull Legs', description: null, goal: 'Hipertrofia', user_id: 'u-1' }
    const mock = makeQueryMock({ data: created, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await createRoutine({ userId: 'u-1', routine: { name: 'Push Pull Legs', goal: 'Hipertrofia' } })
    expect(result).toEqual(created)
    expect(result.name).toBe('Push Pull Legs')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('create routine failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(createRoutine({ userId: 'u-1', routine: { name: 'Test' } })).rejects.toThrow('create routine failed')
  })
})

// ============================================
// createRoutineDay
// ============================================

describe('createRoutineDay', () => {
  it('returns created day on success', async () => {
    const created = { id: 10, routine_id: 1, name: 'Día A', sort_order: 1 }
    const mock = makeQueryMock({ data: created, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await createRoutineDay({ routineId: 1, day: { name: 'Día A', sort_order: 1 } })
    expect(result).toEqual(created)
    expect(result.sort_order).toBe(1)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('create day failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(createRoutineDay({ routineId: 1, day: { name: 'Día A', sort_order: 1 } })).rejects.toThrow('create day failed')
  })
})

// ============================================
// updateRoutine
// ============================================

describe('updateRoutine', () => {
  it('returns updated routine on success', async () => {
    const updated = { id: 1, name: 'Rutina Actualizada', goal: 'Fuerza' }
    const mock = makeQueryMock({ data: updated, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await updateRoutine({ routineId: 1, data: { name: 'Rutina Actualizada', goal: 'Fuerza' } })
    expect(result).toEqual(updated)
    expect(result.name).toBe('Rutina Actualizada')
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('update routine failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateRoutine({ routineId: 1, data: { name: 'X' } })).rejects.toThrow('update routine failed')
  })
})

// ============================================
// deleteRoutine
// ============================================

describe('deleteRoutine', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteRoutine(1)).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('delete routine failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteRoutine(1)).rejects.toThrow('delete routine failed')
  })
})

// ============================================
// deleteRoutines
// ============================================

describe('deleteRoutines', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteRoutines([1, 2, 3])).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('bulk delete failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteRoutines([1, 2])).rejects.toThrow('bulk delete failed')
  })
})

// ============================================
// setFavoriteRoutine
// ============================================

describe('setFavoriteRoutine', () => {
  it('when isFavorite=true: unsets all others then sets the target', async () => {
    let callCount = 0
    getClient.mockImplementation(() => {
      callCount++
      // First call: unset all (neq), second call: set the target (eq)
      return makeClientMock({ routines: { data: null, error: null } })
    })
    await expect(setFavoriteRoutine({ routineId: 1, isFavorite: true })).resolves.toBeUndefined()
    expect(callCount).toBe(2)
  })

  it('when isFavorite=false: only calls update on the target routine', async () => {
    let callCount = 0
    getClient.mockImplementation(() => {
      callCount++
      return makeClientMock({ routines: { data: null, error: null } })
    })
    await expect(setFavoriteRoutine({ routineId: 1, isFavorite: false })).resolves.toBeUndefined()
    expect(callCount).toBe(1)
  })

  it('throws when clearing favorites fails (isFavorite=true)', async () => {
    let callCount = 0
    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeClientMock({ routines: { data: null, error: new Error('clear failed') } })
      }
      return makeClientMock({ routines: { data: null, error: null } })
    })
    await expect(setFavoriteRoutine({ routineId: 1, isFavorite: true })).rejects.toThrow('clear failed')
  })

  it('throws when setting favorite fails', async () => {
    let callCount = 0
    getClient.mockImplementation(() => {
      callCount++
      // isFavorite=false path: single call that fails
      return makeClientMock({ routines: { data: null, error: new Error('set failed') } })
    })
    await expect(setFavoriteRoutine({ routineId: 1, isFavorite: false })).rejects.toThrow('set failed')
  })
})

// ============================================
// updateRoutineDay
// ============================================

describe('updateRoutineDay', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateRoutineDay({ dayId: 10, data: { name: 'Día Actualizado' } })).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('update day failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateRoutineDay({ dayId: 10, data: { name: 'X' } })).rejects.toThrow('update day failed')
  })
})

// ============================================
// deleteRoutineDay
// ============================================

describe('deleteRoutineDay', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteRoutineDay(10)).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('delete day failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteRoutineDay(10)).rejects.toThrow('delete day failed')
  })
})

// ============================================
// reorderRoutineDays
// ============================================

describe('reorderRoutineDays', () => {
  it('calls rpc with mapped day orders', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) }
    getClient.mockReturnValue(clientMock)
    const days = [{ id: 10 }, { id: 11 }, { id: 12 }]
    await expect(reorderRoutineDays(days)).resolves.toBeUndefined()
    expect(clientMock.rpc).toHaveBeenCalledWith('reorder_routine_days', {
      day_orders: [
        { id: 10, sort_order: 1 },
        { id: 11, sort_order: 2 },
        { id: 12, sort_order: 3 },
      ],
    })
  })

  it('throws when rpc returns error', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('rpc failed') }) }
    getClient.mockReturnValue(clientMock)
    await expect(reorderRoutineDays([{ id: 1 }, { id: 2 }])).rejects.toThrow('rpc failed')
  })
})

// ============================================
// deleteRoutineExercise
// ============================================

describe('deleteRoutineExercise', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteRoutineExercise(40)).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('delete exercise failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteRoutineExercise(40)).rejects.toThrow('delete exercise failed')
  })
})

// ============================================
// updateRoutineExercise
// ============================================

describe('updateRoutineExercise', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateRoutineExercise({ exerciseId: 40, data: { series: 4 } })).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('update exercise failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateRoutineExercise({ exerciseId: 40, data: { series: 4 } })).rejects.toThrow('update exercise failed')
  })
})

// ============================================
// reorderRoutineExercises
// ============================================

describe('reorderRoutineExercises', () => {
  it('calls rpc with mapped exercise orders', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) }
    getClient.mockReturnValue(clientMock)
    const exercises = [{ id: 40 }, { id: 41 }]
    await expect(reorderRoutineExercises(exercises)).resolves.toBeUndefined()
    expect(clientMock.rpc).toHaveBeenCalledWith('reorder_routine_exercises', {
      exercise_orders: [
        { id: 40, sort_order: 1 },
        { id: 41, sort_order: 2 },
      ],
    })
  })

  it('throws when rpc returns error', async () => {
    const clientMock = { rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('rpc failed') }) }
    getClient.mockReturnValue(clientMock)
    await expect(reorderRoutineExercises([{ id: 1 }])).rejects.toThrow('rpc failed')
  })
})

// ============================================
// addExerciseToDay (composed)
// ============================================

describe('addExerciseToDay', () => {
  it('inserts exercise with next sort_order when day has exercises', async () => {
    const newExercise = { id: 50, exercise_id: 'ex-1', sort_order: 3 }
    let callCount = 0

    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // fetch max sort_order in day
        return makeClientMock({ routine_exercises: { data: [{ sort_order: 2 }], error: null } })
      }
      // insert exercise
      return makeClientMock({ routine_exercises: { data: newExercise, error: null } })
    })

    const result = await addExerciseToDay({ dayId: 10, exerciseId: 'ex-1' })
    expect(result).toEqual(newExercise)
  })

  it('inserts exercise with sort_order 1 when day is empty', async () => {
    const newExercise = { id: 51, exercise_id: 'ex-2', sort_order: 1 }
    let callCount = 0

    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // fetch max sort_order in day: empty
        return makeClientMock({ routine_exercises: { data: [], error: null } })
      }
      // insert exercise
      return makeClientMock({ routine_exercises: { data: newExercise, error: null } })
    })

    const result = await addExerciseToDay({ dayId: 10, exerciseId: 'ex-2' })
    expect(result).toEqual(newExercise)
    expect(result.sort_order).toBe(1)
  })

  it('throws when max sort_order fetch fails', async () => {
    getClient.mockImplementation(() =>
      makeClientMock({ routine_exercises: { data: null, error: new Error('permission denied') } })
    )
    await expect(addExerciseToDay({ dayId: 10, exerciseId: 'ex-1' })).rejects.toThrow('permission denied')
  })

  it('throws when exercise insert fails', async () => {
    let callCount = 0
    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeClientMock({ routine_exercises: { data: [], error: null } })
      }
      return makeClientMock({ routine_exercises: { data: null, error: new Error('insert failed') } })
    })
    await expect(addExerciseToDay({ dayId: 10, exerciseId: 'ex-1' })).rejects.toThrow('insert failed')
  })
})

// ============================================
// duplicateRoutineExercise (composed)
// ============================================

describe('duplicateRoutineExercise', () => {
  it('inserts a copy with next sort_order', async () => {
    const original = {
      routine_day_id: 20,
      exercise_id: 'ex-1',
      series: 3,
      reps: '8-12',
      rir: 2,
      rest_seconds: 90,
      notes: null,
    }
    const copy = { id: 55, ...original, sort_order: 2, superset_group: null }
    let callCount = 0

    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // fetch max sort_order
        return makeClientMock({ routine_exercises: { data: [{ sort_order: 1 }], error: null } })
      }
      // insert copy
      return makeClientMock({ routine_exercises: { data: copy, error: null } })
    })

    const result = await duplicateRoutineExercise({ routineExercise: original })
    expect(result).toEqual(copy)
    expect(result.sort_order).toBe(2)
    expect(result.superset_group).toBeNull()
  })

  it('uses sort_order=1 when block is empty', async () => {
    const original = { routine_day_id: 20, exercise_id: 'ex-1', series: 3, reps: '10' }
    const copy = { id: 56, sort_order: 1 }
    let callCount = 0

    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // fetch max sort_order: empty block
        return makeClientMock({ routine_exercises: { data: [], error: null } })
      }
      return makeClientMock({ routine_exercises: { data: copy, error: null } })
    })

    const result = await duplicateRoutineExercise({ routineExercise: original })
    expect(result.sort_order).toBe(1)
  })

  it('throws when insert fails', async () => {
    let callCount = 0
    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeClientMock({ routine_exercises: { data: [], error: null } })
      }
      return makeClientMock({ routine_exercises: { data: null, error: new Error('duplicate failed') } })
    })
    await expect(duplicateRoutineExercise({ routineExercise: { routine_day_id: 20 } })).rejects.toThrow('duplicate failed')
  })
})

// ============================================
// moveRoutineExerciseToDay (composed)
// ============================================

describe('moveRoutineExerciseToDay', () => {
  it('moves exercise to target day with next sort_order', async () => {
    const moved = { id: 40, routine_day_id: 11, sort_order: 3, is_warmup: false }
    let callCount = 0

    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // fetch max sort_order in target day
        return makeClientMock({ routine_exercises: { data: [{ sort_order: 2 }], error: null } })
      }
      // update exercise
      return makeClientMock({ routine_exercises: { data: moved, error: null } })
    })

    const result = await moveRoutineExerciseToDay({
      routineExercise: { id: 40 },
      targetDayId: 11,
    })
    expect(result).toEqual(moved)
    expect(result.routine_day_id).toBe(11)
  })

  it('moves exercise with sort_order 1 when target day is empty', async () => {
    const moved = { id: 41, routine_day_id: 12, sort_order: 1, is_warmup: false }
    let callCount = 0

    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // fetch max sort_order: empty
        return makeClientMock({ routine_exercises: { data: [], error: null } })
      }
      // update exercise
      return makeClientMock({ routine_exercises: { data: moved, error: null } })
    })

    const result = await moveRoutineExerciseToDay({
      routineExercise: { id: 41 },
      targetDayId: 12,
    })
    expect(result).toEqual(moved)
    expect(result.sort_order).toBe(1)
  })

  it('throws when max sort_order fetch fails', async () => {
    getClient.mockImplementation(() =>
      makeClientMock({ routine_exercises: { data: null, error: new Error('db error') } })
    )
    await expect(moveRoutineExerciseToDay({
      routineExercise: { id: 40 },
      targetDayId: 11,
    })).rejects.toThrow('db error')
  })

  it('throws when update exercise fails', async () => {
    let callCount = 0
    getClient.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeClientMock({ routine_exercises: { data: [], error: null } })
      }
      return makeClientMock({ routine_exercises: { data: null, error: new Error('move failed') } })
    })
    await expect(moveRoutineExerciseToDay({
      routineExercise: { id: 40 },
      targetDayId: 11,
    })).rejects.toThrow('move failed')
  })
})
