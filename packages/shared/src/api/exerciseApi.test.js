import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchExercisesWithMuscleGroup,
  fetchMuscleGroups,
  fetchExerciseStats,
  fetchExerciseUsageDetail,
  fetchExercise,
  createExercise,
  updateExercise,
  deleteExercise,
} from './exerciseApi.js'
import { makeQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
}))

import { getClient } from './_client.js'

beforeEach(() => {
  vi.clearAllMocks()
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
// fetchExerciseStats (Promise.all con dos tablas)
// ============================================

describe('fetchExerciseStats', () => {
  it('devuelve sessionCounts y routineCounts agregados correctamente', async () => {
    const sessionData = [
      { exercise_id: 'ex-1' },
      { exercise_id: 'ex-1' },
      { exercise_id: 'ex-2' },
    ]
    const routineData = [
      { exercise_id: 'ex-1', routine_block: { routine_day: { routine_id: 'r-1' } } },
      // Duplicado — misma rutina + ejercicio, no debe contar doble
      { exercise_id: 'ex-1', routine_block: { routine_day: { routine_id: 'r-1' } } },
      { exercise_id: 'ex-1', routine_block: { routine_day: { routine_id: 'r-2' } } },
    ]

    getClient.mockReturnValue(makeClientMock({
      session_exercises: { data: sessionData, error: null },
      routine_exercises: { data: routineData, error: null },
    }))

    const result = await fetchExerciseStats()
    expect(result.sessionCounts['ex-1']).toBe(2)
    expect(result.sessionCounts['ex-2']).toBe(1)
    // ex-1 en r-1 (deduplicado) + r-2 = 2
    expect(result.routineCounts['ex-1']).toBe(2)
  })

  it('lanza error si falla la query de session_exercises', async () => {
    const fakeError = new Error('session error')
    getClient.mockReturnValue(makeClientMock({
      session_exercises: { data: null, error: fakeError },
      routine_exercises: { data: [], error: null },
    }))

    await expect(fetchExerciseStats()).rejects.toThrow('session error')
  })

  it('lanza error si falla la query de routine_exercises', async () => {
    const fakeError = new Error('routine error')
    getClient.mockReturnValue(makeClientMock({
      session_exercises: { data: [], error: null },
      routine_exercises: { data: null, error: fakeError },
    }))

    await expect(fetchExerciseStats()).rejects.toThrow('routine error')
  })
})

// ============================================
// fetchExerciseUsageDetail (Promise.all con dos tablas)
// ============================================

describe('fetchExerciseUsageDetail', () => {
  it('devuelve rutinas y sesiones únicas del ejercicio', async () => {
    const routineData = [
      {
        id: 're-1',
        routine_block: {
          routine_day: {
            name: 'Día 1',
            routine: { id: 'r-1', name: 'Rutina A' },
          },
        },
      },
      // Duplicado — misma rutina+día, no debe aparecer dos veces
      {
        id: 're-2',
        routine_block: {
          routine_day: {
            name: 'Día 1',
            routine: { id: 'r-1', name: 'Rutina A' },
          },
        },
      },
    ]
    const sessionData = [
      {
        id: 'se-1',
        workout_session: { id: 'ws-1', started_at: '2026-01-01T00:00:00Z', routine_name: 'Rutina A' },
      },
    ]

    getClient.mockReturnValue(makeClientMock({
      routine_exercises: { data: routineData, error: null },
      session_exercises: { data: sessionData, error: null },
    }))

    const result = await fetchExerciseUsageDetail('ex-1')
    expect(result.routines).toHaveLength(1)
    expect(result.routines[0]).toMatchObject({ routineId: 'r-1', routineName: 'Rutina A', dayName: 'Día 1' })
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0]).toMatchObject({ sessionId: 'ws-1' })
  })

  it('lanza error si falla la query de routine_exercises', async () => {
    const fakeError = new Error('routine detail error')
    getClient.mockReturnValue(makeClientMock({
      routine_exercises: { data: null, error: fakeError },
      session_exercises: { data: [], error: null },
    }))

    await expect(fetchExerciseUsageDetail('ex-1')).rejects.toThrow('routine detail error')
  })

  it('lanza error si falla la query de session_exercises', async () => {
    const fakeError = new Error('session detail error')
    getClient.mockReturnValue(makeClientMock({
      routine_exercises: { data: [], error: null },
      session_exercises: { data: null, error: fakeError },
    }))

    await expect(fetchExerciseUsageDetail('ex-1')).rejects.toThrow('session detail error')
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
    const fakeCreated = { id: 'ex-new', name: 'Curl bíceps', measurement_type: 'weight_reps' }
    getClient.mockReturnValue(makeClientMock({
      exercises: { data: fakeCreated, error: null },
    }))

    const result = await createExercise({
      userId: 'user-1',
      exercise: { name: 'Curl bíceps', measurement_type: 'weight_reps' },
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
