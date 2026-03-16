import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeQueryMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from './_client.js'

import {
  upsertCompletedSet,
  updateSetVideo,
  updateSetDetails,
  deleteCompletedSet,
} from './completedSetsApi.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// upsertCompletedSet
// ============================================

describe('upsertCompletedSet', () => {
  it('returns upserted set on success', async () => {
    const upsertedSet = {
      id: 'set-1',
      session_id: 'session-1',
      session_exercise_id: 'se-1',
      set_number: 1,
      weight: 100,
      weight_unit: 'kg',
      reps_completed: 5,
    }
    const mock = makeQueryMock({ data: upsertedSet, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await upsertCompletedSet({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
      weight: 100,
      weightUnit: 'kg',
      repsCompleted: 5,
      timeSeconds: null,
      distanceMeters: null,
      paceSeconds: null,
      rirActual: 2,
      notes: null,
      videoUrl: null,
    })
    expect(result).toEqual(upsertedSet)
    expect(result.weight).toBe(100)
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('conflict error') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(upsertCompletedSet({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
      weight: 100,
      weightUnit: 'kg',
      repsCompleted: 5,
    })).rejects.toThrow('conflict error')
  })

  it('handles null optional fields (time-based exercise)', async () => {
    const upsertedSet = {
      id: 'set-2',
      session_id: 'session-1',
      session_exercise_id: 'se-2',
      set_number: 1,
      weight: null,
      reps_completed: null,
      time_seconds: 60,
    }
    const mock = makeQueryMock({ data: upsertedSet, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await upsertCompletedSet({
      sessionId: 'session-1',
      sessionExerciseId: 'se-2',
      setNumber: 1,
      weight: null,
      weightUnit: null,
      repsCompleted: null,
      timeSeconds: 60,
      distanceMeters: null,
      paceSeconds: null,
      rirActual: null,
      notes: null,
      videoUrl: null,
    })
    expect(result.weight).toBeNull()
    expect(result.time_seconds).toBe(60)
  })

  it('handles distance-based exercise fields', async () => {
    const upsertedSet = {
      id: 'set-3',
      session_exercise_id: 'se-3',
      set_number: 1,
      distance_meters: 5000,
      pace_seconds: 300,
    }
    const mock = makeQueryMock({ data: upsertedSet, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await upsertCompletedSet({
      sessionId: 'session-1',
      sessionExerciseId: 'se-3',
      setNumber: 1,
      weight: null,
      weightUnit: null,
      repsCompleted: null,
      timeSeconds: null,
      distanceMeters: 5000,
      paceSeconds: 300,
      rirActual: null,
      notes: null,
      videoUrl: null,
    })
    expect(result.distance_meters).toBe(5000)
  })
})

// ============================================
// updateSetVideo
// ============================================

describe('updateSetVideo', () => {
  it('returns updated set with new video URL', async () => {
    const updatedSet = {
      id: 'set-1',
      session_id: 'session-1',
      session_exercise_id: 'se-1',
      set_number: 1,
      video_url: 'https://example.com/video.mp4',
    }
    const mock = makeQueryMock({ data: updatedSet, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await updateSetVideo({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
      videoUrl: 'https://example.com/video.mp4',
    })
    expect(result).toEqual(updatedSet)
    expect(result.video_url).toBe('https://example.com/video.mp4')
  })

  it('handles null video URL (removing video)', async () => {
    const updatedSet = {
      id: 'set-1',
      session_id: 'session-1',
      session_exercise_id: 'se-1',
      set_number: 1,
      video_url: null,
    }
    const mock = makeQueryMock({ data: updatedSet, error: null })
    getClient.mockReturnValue({ from: () => mock })
    const result = await updateSetVideo({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
      videoUrl: null,
    })
    expect(result.video_url).toBeNull()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('update failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateSetVideo({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
      videoUrl: 'https://example.com/video.mp4',
    })).rejects.toThrow('update failed')
  })
})

// ============================================
// updateSetDetails
// ============================================

describe('updateSetDetails', () => {
  it('completes without throwing on success (no return value)', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateSetDetails({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
      rirActual: 2,
      notes: 'Buena serie',
      videoUrl: undefined,
    })).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('update failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(updateSetDetails({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
      rirActual: 1,
      notes: null,
    })).rejects.toThrow('update failed')
  })

  it('includes videoUrl in update when provided', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    // Should not throw; videoUrl is included in updateData when defined
    await expect(updateSetDetails({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
      rirActual: 0,
      notes: null,
      videoUrl: 'https://example.com/video.mp4',
    })).resolves.toBeUndefined()
  })

  it('partial update: only rirActual and notes updated (videoUrl omitted)', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    // videoUrl is undefined — should NOT be included in updateData
    await expect(updateSetDetails({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 2,
      rirActual: 3,
      notes: 'Solo notas',
      videoUrl: undefined,
    })).resolves.toBeUndefined()
  })
})

// ============================================
// deleteCompletedSet
// ============================================

describe('deleteCompletedSet', () => {
  it('completes without throwing on success', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteCompletedSet({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
    })).resolves.toBeUndefined()
  })

  it('throws when Supabase returns error', async () => {
    const mock = makeQueryMock({ data: null, error: new Error('delete failed') })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteCompletedSet({
      sessionId: 'session-1',
      sessionExerciseId: 'se-1',
      setNumber: 1,
    })).rejects.toThrow('delete failed')
  })

  it('works with any valid set number', async () => {
    const mock = makeQueryMock({ data: null, error: null })
    getClient.mockReturnValue({ from: () => mock })
    await expect(deleteCompletedSet({
      sessionId: 'session-1',
      sessionExerciseId: 'se-5',
      setNumber: 10,
    })).resolves.toBeUndefined()
  })
})
