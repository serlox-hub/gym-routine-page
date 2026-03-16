import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchBodyWeightHistory,
  fetchLatestBodyWeight,
  createBodyWeight,
  updateBodyWeight,
  deleteBodyWeight,
} from './bodyWeightApi.js'
import { makeQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
}))

import { getClient } from './_client.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// fetchBodyWeightHistory
// ============================================

describe('fetchBodyWeightHistory', () => {
  it('devuelve el historial de peso del usuario', async () => {
    const fakeData = [
      { id: 'bw-1', weight: 75, weight_unit: 'kg', recorded_at: '2026-01-01', notes: null },
    ]
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: fakeData, error: null },
    }))

    const result = await fetchBodyWeightHistory('user-1')
    expect(result).toEqual(fakeData)
  })

  it('lanza error si la query falla', async () => {
    const fakeError = new Error('DB error')
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: null, error: fakeError },
    }))

    await expect(fetchBodyWeightHistory('user-1')).rejects.toThrow('DB error')
  })
})

// ============================================
// fetchLatestBodyWeight
// ============================================

describe('fetchLatestBodyWeight', () => {
  it('devuelve el registro más reciente', async () => {
    const fakeRecord = { id: 'bw-1', weight: 75, weight_unit: 'kg', recorded_at: '2026-01-15' }
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: fakeRecord, error: null },
    }))

    const result = await fetchLatestBodyWeight('user-1')
    expect(result).toEqual(fakeRecord)
  })

  it('lanza error si la query falla', async () => {
    const fakeError = new Error('latest error')
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: null, error: fakeError },
    }))

    await expect(fetchLatestBodyWeight('user-1')).rejects.toThrow('latest error')
  })
})

// ============================================
// createBodyWeight
// ============================================

describe('createBodyWeight', () => {
  it('inserta un registro y lo devuelve', async () => {
    const fakeCreated = { id: 'bw-new', weight: 74.5, weight_unit: 'kg' }
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: fakeCreated, error: null },
    }))

    const result = await createBodyWeight({ userId: 'user-1', weight: 74.5 })
    expect(result).toEqual(fakeCreated)
  })

  it('lanza error si la inserción falla', async () => {
    const fakeError = new Error('insert failed')
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: null, error: fakeError },
    }))

    await expect(createBodyWeight({ userId: 'user-1', weight: 74.5 })).rejects.toThrow('insert failed')
  })
})

// ============================================
// updateBodyWeight
// ============================================

describe('updateBodyWeight', () => {
  it('actualiza un registro y lo devuelve', async () => {
    const fakeUpdated = { id: 'bw-1', weight: 73, weight_unit: 'kg' }
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: fakeUpdated, error: null },
    }))

    const result = await updateBodyWeight({ id: 'bw-1', weight: 73 })
    expect(result).toEqual(fakeUpdated)
  })

  it('lanza error si la actualización falla', async () => {
    const fakeError = new Error('update failed')
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: null, error: fakeError },
    }))

    await expect(updateBodyWeight({ id: 'bw-1', weight: 73 })).rejects.toThrow('update failed')
  })
})

// ============================================
// deleteBodyWeight
// ============================================

describe('deleteBodyWeight', () => {
  it('elimina un registro sin error', async () => {
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: null, error: null },
    }))

    await expect(deleteBodyWeight('bw-1')).resolves.toBeUndefined()
  })

  it('lanza error si la eliminación falla', async () => {
    const fakeError = new Error('delete failed')
    getClient.mockReturnValue(makeClientMock({
      body_weight_records: { data: null, error: fakeError },
    }))

    await expect(deleteBodyWeight('bw-1')).rejects.toThrow('delete failed')
  })
})
