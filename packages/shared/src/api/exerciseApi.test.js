import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchExercisesWithMuscleGroup,
  fetchMuscleGroups,
  fetchExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  getExerciseGifUrl,
  fetchUserExerciseGymUnit,
  fetchExerciseUnitsByGym,
  fetchUserExerciseWeightUnits,
  fetchAllUserExerciseGymUnits,
  upsertUserExerciseGymUnit,
} from './exerciseApi.js'
import { makeQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
  getGifBaseUrl: vi.fn(() => null),
}))

import { getClient, getGifBaseUrl } from './_client.js'

beforeEach(() => {
  vi.clearAllMocks()
  getGifBaseUrl.mockReturnValue(null)
})

// ============================================
// getExerciseGifUrl
// ============================================

describe('getExerciseGifUrl', () => {
  function mockStorageClient() {
    const getPublicUrl = vi.fn((path) => ({
      data: { publicUrl: `https://proj.supabase.co/storage/v1/object/public/exercise-gifs/${path}` },
    }))
    const from = vi.fn(() => ({ getPublicUrl }))
    getClient.mockReturnValue({ storage: { from } })
    return { from, getPublicUrl }
  }

  it('resuelve la URL pública para el tamaño pedido', () => {
    const { from, getPublicUrl } = mockStorageClient()
    const url = getExerciseGifUrl('1519', 'lg')
    expect(from).toHaveBeenCalledWith('exercise-gifs')
    expect(getPublicUrl).toHaveBeenCalledWith('gif/1519_720.gif')
    expect(url).toBe('https://proj.supabase.co/storage/v1/object/public/exercise-gifs/gif/1519_720.gif')
  })

  it('usa sm (360) por defecto', () => {
    const { getPublicUrl } = mockStorageClient()
    getExerciseGifUrl('1519')
    expect(getPublicUrl).toHaveBeenCalledWith('gif/1519_360.gif')
  })

  it('con gifBaseUrl inyectada resuelve contra esa base y no toca el Storage', () => {
    const { from } = mockStorageClient()
    getGifBaseUrl.mockReturnValue('https://otra.supabase.co/storage/v1/object/public/exercise-gifs')
    expect(getExerciseGifUrl('1519', 'xs'))
      .toBe('https://otra.supabase.co/storage/v1/object/public/exercise-gifs/gif/1519_180.gif')
    expect(from).not.toHaveBeenCalled()
  })

  it('devuelve null sin gif_key y no toca el cliente', () => {
    const { from } = mockStorageClient()
    expect(getExerciseGifUrl(null)).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })
})

// ============================================
// fetchExercisesWithMuscleGroup
// ============================================

describe('fetchExercisesWithMuscleGroup', () => {
  it('devuelve ejercicios con muscle_group', async () => {
    const fakeData = [
      { id: 'ex-1', name: 'Press banca', muscle_group: { id: 'mg-1', name: 'Pecho' } },
    ]
    getClient.mockReturnValue(makeClientMock({
      exercises: { data: fakeData, error: null },
    }))

    const result = await fetchExercisesWithMuscleGroup()
    expect(result).toEqual(fakeData)
  })

  it('lanza error si la query falla', async () => {
    const fakeError = new Error('DB error')
    getClient.mockReturnValue(makeClientMock({
      exercises: { data: null, error: fakeError },
    }))

    await expect(fetchExercisesWithMuscleGroup()).rejects.toThrow('DB error')
  })
})

// ============================================
// fetchMuscleGroups
// ============================================

describe('fetchMuscleGroups', () => {
  it('devuelve array de grupos musculares', async () => {
    const fakeData = [{ id: 'mg-1', name: 'Pecho' }, { id: 'mg-2', name: 'Espalda' }]
    getClient.mockReturnValue(makeClientMock({
      muscle_groups: { data: fakeData, error: null },
    }))

    const result = await fetchMuscleGroups()
    expect(result).toEqual(fakeData)
  })

  it('lanza error si la query falla', async () => {
    const fakeError = new Error('DB error')
    getClient.mockReturnValue(makeClientMock({
      muscle_groups: { data: null, error: fakeError },
    }))

    await expect(fetchMuscleGroups()).rejects.toThrow('DB error')
  })
})

// ============================================
// fetchExercise
// ============================================

describe('fetchExercise', () => {
  it('devuelve el ejercicio por id', async () => {
    const fakeExercise = { id: 'ex-1', name: 'Sentadilla' }
    getClient.mockReturnValue(makeClientMock({
      exercises: { data: fakeExercise, error: null },
    }))

    const result = await fetchExercise('ex-1')
    expect(result).toEqual(fakeExercise)
  })

  it('lanza error si la query falla', async () => {
    const fakeError = new Error('not found')
    getClient.mockReturnValue(makeClientMock({
      exercises: { data: null, error: fakeError },
    }))

    await expect(fetchExercise('ex-999')).rejects.toThrow('not found')
  })
})

// ============================================
// createExercise
// ============================================

describe('createExercise', () => {
  it('inserta un ejercicio y devuelve el registro creado', async () => {
    const fakeCreated = { id: 'ex-new', name: 'Curl bíceps', tracked_fields: ['weight', 'reps'] }
    getClient.mockReturnValue(makeClientMock({
      exercises: { data: fakeCreated, error: null },
    }))

    const result = await createExercise({
      userId: 'user-1',
      exercise: { name: 'Curl bíceps', tracked_fields: ['weight', 'reps'] },
      muscleGroupId: 'mg-1',
    })
    expect(result).toEqual(fakeCreated)
  })

  it('lanza error si la inserción falla', async () => {
    const fakeError = new Error('insert failed')
    getClient.mockReturnValue(makeClientMock({
      exercises: { data: null, error: fakeError },
    }))

    await expect(
      createExercise({ userId: 'user-1', exercise: { name: 'Test' }, muscleGroupId: null })
    ).rejects.toThrow('insert failed')
  })
})

// ============================================
// updateExercise
// ============================================

describe('updateExercise', () => {
  it('actualiza un ejercicio y devuelve el registro actualizado', async () => {
    const fakeUpdated = { id: 'ex-1', name: 'Press banca actualizado' }
    getClient.mockReturnValue(makeClientMock({
      exercises: { data: fakeUpdated, error: null },
    }))

    const result = await updateExercise({
      exerciseId: 'ex-1',
      exercise: { name: 'Press banca actualizado' },
      muscleGroupId: 'mg-1',
    })
    expect(result).toEqual(fakeUpdated)
  })

  it('lanza error si la actualización falla', async () => {
    const fakeError = new Error('update failed')
    getClient.mockReturnValue(makeClientMock({
      exercises: { data: null, error: fakeError },
    }))

    await expect(
      updateExercise({ exerciseId: 'ex-1', exercise: { name: 'X' }, muscleGroupId: null })
    ).rejects.toThrow('update failed')
  })
})

// ============================================
// deleteExercise (soft delete condicional)
// ============================================

describe('deleteExercise', () => {
  it('hace soft delete cuando el ejercicio NO está en ninguna rutina', async () => {
    // Primera query (routine_exercises check): devuelve array vacío
    // Segunda query (exercises update): éxito
    let callCount = 0
    getClient.mockImplementation(() => ({
      from: (table) => {
        callCount++
        if (table === 'routine_exercises') {
          return makeQueryMock({ data: [], error: null })
        }
        if (table === 'exercises') {
          return makeQueryMock({ data: null, error: null })
        }
        return makeQueryMock({ data: null, error: null })
      },
    }))

    const result = await deleteExercise('ex-1')
    expect(result).toBe('ex-1')
  })

  it('lanza error si el ejercicio está en una rutina activa', async () => {
    getClient.mockImplementation(() => ({
      from: (table) => {
        if (table === 'routine_exercises') {
          return makeQueryMock({ data: [{ id: 're-1' }], error: null })
        }
        return makeQueryMock({ data: null, error: null })
      },
    }))

    await expect(deleteExercise('ex-1')).rejects.toThrow('rutina')
  })

  it('lanza error si la query de verificación falla', async () => {
    const fakeError = new Error('check error')
    getClient.mockImplementation(() => ({
      from: (table) => {
        if (table === 'routine_exercises') {
          return makeQueryMock({ data: null, error: fakeError })
        }
        return makeQueryMock({ data: null, error: null })
      },
    }))

    await expect(deleteExercise('ex-1')).rejects.toThrow('check error')
  })
})

// ============================================
// UNIDAD DE PESO POR (EJERCICIO, GYM)
// ============================================

describe('fetchUserExerciseGymUnit', () => {
  it('devuelve null y no toca el cliente si falta exerciseId o gymId', async () => {
    expect(await fetchUserExerciseGymUnit(null, 5)).toBeNull()
    expect(await fetchUserExerciseGymUnit(1, null)).toBeNull()
    expect(getClient).not.toHaveBeenCalled()
  })

  it('devuelve la unidad de (ejercicio, gym)', async () => {
    getClient.mockReturnValue(makeClientMock({
      user_exercise_gym_units: { data: { weight_unit: 'lb' }, error: null },
    }))
    expect(await fetchUserExerciseGymUnit(1, 5)).toBe('lb')
  })

  it('devuelve null si no hay fila (hereda la global)', async () => {
    getClient.mockReturnValue(makeClientMock({
      user_exercise_gym_units: { data: null, error: null },
    }))
    expect(await fetchUserExerciseGymUnit(1, 5)).toBeNull()
  })
})

describe('fetchExerciseUnitsByGym', () => {
  it('devuelve {} sin exerciseId, sin tocar el cliente', async () => {
    expect(await fetchExerciseUnitsByGym(null)).toEqual({})
    expect(getClient).not.toHaveBeenCalled()
  })

  it('mapea gym_id -> unidad', async () => {
    getClient.mockReturnValue(makeClientMock({
      user_exercise_gym_units: { data: [
        { gym_id: 5, weight_unit: 'lb' },
        { gym_id: 8, weight_unit: 'kg' },
      ], error: null },
    }))
    expect(await fetchExerciseUnitsByGym(1)).toEqual({ 5: 'lb', 8: 'kg' })
  })
})

describe('fetchUserExerciseWeightUnits', () => {
  it('devuelve {} sin exerciseIds o sin gymId, sin tocar el cliente', async () => {
    expect(await fetchUserExerciseWeightUnits([], 5)).toEqual({})
    expect(await fetchUserExerciseWeightUnits([1, 2], null)).toEqual({})
    expect(getClient).not.toHaveBeenCalled()
  })

  it('mapea exercise_id -> unidad para el gym dado', async () => {
    getClient.mockReturnValue(makeClientMock({
      user_exercise_gym_units: { data: [
        { exercise_id: 1, weight_unit: 'lb' },
        { exercise_id: 2, weight_unit: 'kg' },
      ], error: null },
    }))
    expect(await fetchUserExerciseWeightUnits([1, 2], 5)).toEqual({ 1: 'lb', 2: 'kg' })
  })
})

describe('fetchAllUserExerciseGymUnits', () => {
  it('devuelve todas las filas (exercise_id, gym_id, weight_unit)', async () => {
    const rows = [
      { exercise_id: 1, gym_id: 5, weight_unit: 'lb' },
      { exercise_id: 2, gym_id: 8, weight_unit: 'kg' },
    ]
    getClient.mockReturnValue(makeClientMock({ user_exercise_gym_units: { data: rows, error: null } }))
    expect(await fetchAllUserExerciseGymUnits()).toEqual(rows)
  })

  it('devuelve [] cuando data es null', async () => {
    getClient.mockReturnValue(makeClientMock({ user_exercise_gym_units: { data: null, error: null } }))
    expect(await fetchAllUserExerciseGymUnits()).toEqual([])
  })

  it('lanza si Supabase devuelve error', async () => {
    getClient.mockReturnValue(makeClientMock({ user_exercise_gym_units: { data: null, error: new Error('boom') } }))
    await expect(fetchAllUserExerciseGymUnits()).rejects.toThrow('boom')
  })
})

describe('upsertUserExerciseGymUnit', () => {
  it('borra la fila (hereda la global) cuando weightUnit es null y devuelve null', async () => {
    const q = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: vi.fn(() => q) })

    const res = await upsertUserExerciseGymUnit({ userId: 'u', exerciseId: 1, gymId: 5, weightUnit: null })

    expect(res).toBeNull()
    expect(q.delete).toHaveBeenCalled()
    expect(q.upsert).not.toHaveBeenCalled()
    expect(q.eq).toHaveBeenCalledWith('user_id', 'u')
    expect(q.eq).toHaveBeenCalledWith('exercise_id', 1)
    expect(q.eq).toHaveBeenCalledWith('gym_id', 5)
  })

  it('upsertea la unidad cuando está presente y la devuelve', async () => {
    const q = makeQueryMock({ data: { weight_unit: 'lb' }, error: null })
    getClient.mockReturnValue({ from: vi.fn(() => q) })

    const res = await upsertUserExerciseGymUnit({ userId: 'u', exerciseId: 1, gymId: 5, weightUnit: 'lb' })

    expect(res).toBe('lb')
    expect(q.delete).not.toHaveBeenCalled()
    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u', exercise_id: 1, gym_id: 5, weight_unit: 'lb' }),
      { onConflict: 'user_id,exercise_id,gym_id' },
    )
  })
})
