import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchBodyMeasurementHistory,
  createBodyMeasurement,
  updateBodyMeasurement,
  deleteBodyMeasurement,
} from './bodyMeasurementsApi.js'
import { makeQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
}))

import { getClient } from './_client.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// fetchBodyMeasurementHistory
// ============================================

describe('fetchBodyMeasurementHistory', () => {
  it('devuelve el historial de medidas del tipo solicitado', async () => {
    const fakeData = [
      { id: 'bm-1', measurement_type: 'waist', value: 82, unit: 'cm', recorded_at: '2026-01-01' },
    ]
    getClient.mockReturnValue(makeClientMock({
      body_measurements: { data: fakeData, error: null },
    }))

    const result = await fetchBodyMeasurementHistory('user-1', 'waist')
    expect(result).toEqual(fakeData)
  })

  it('lanza error si la query falla', async () => {
    const fakeError = new Error('DB error')
    getClient.mockReturnValue(makeClientMock({
      body_measurements: { data: null, error: fakeError },
    }))

    await expect(fetchBodyMeasurementHistory('user-1', 'waist')).rejects.toThrow('DB error')
  })
})

// ============================================
// createBodyMeasurement
// ============================================

describe('createBodyMeasurement', () => {
  it('inserta una medida y la devuelve', async () => {
    const fakeCreated = { id: 'bm-new', measurement_type: 'waist', value: 80, unit: 'cm' }
    getClient.mockReturnValue(makeClientMock({
      body_measurements: { data: fakeCreated, error: null },
    }))

    const result = await createBodyMeasurement({
      userId: 'user-1',
      measurementType: 'waist',
      value: 80,
    })
    expect(result).toEqual(fakeCreated)
  })

  it('lanza error si la inserción falla', async () => {
    const fakeError = new Error('insert failed')
    getClient.mockReturnValue(makeClientMock({
      body_measurements: { data: null, error: fakeError },
    }))

    await expect(
      createBodyMeasurement({ userId: 'user-1', measurementType: 'waist', value: 80 })
    ).rejects.toThrow('insert failed')
  })
})

// ============================================
// updateBodyMeasurement
// ============================================

describe('updateBodyMeasurement', () => {
  it('actualiza una medida y la devuelve', async () => {
    const fakeUpdated = { id: 'bm-1', value: 79, unit: 'cm' }
    getClient.mockReturnValue(makeClientMock({
      body_measurements: { data: fakeUpdated, error: null },
    }))

    const result = await updateBodyMeasurement({ id: 'bm-1', value: 79 })
    expect(result).toEqual(fakeUpdated)
  })

  it('lanza error si la actualización falla', async () => {
    const fakeError = new Error('update failed')
    getClient.mockReturnValue(makeClientMock({
      body_measurements: { data: null, error: fakeError },
    }))

    await expect(updateBodyMeasurement({ id: 'bm-1', value: 79 })).rejects.toThrow('update failed')
  })
})

// ============================================
// deleteBodyMeasurement
// ============================================

describe('deleteBodyMeasurement', () => {
  it('elimina una medida sin error', async () => {
    getClient.mockReturnValue(makeClientMock({
      body_measurements: { data: null, error: null },
    }))

    await expect(deleteBodyMeasurement('bm-1')).resolves.toBeUndefined()
  })

  it('lanza error si la eliminación falla', async () => {
    const fakeError = new Error('delete failed')
    getClient.mockReturnValue(makeClientMock({
      body_measurements: { data: null, error: fakeError },
    }))

    await expect(deleteBodyMeasurement('bm-1')).rejects.toThrow('delete failed')
  })
})
