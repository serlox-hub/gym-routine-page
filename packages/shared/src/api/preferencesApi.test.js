import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPreferences, upsertPreference } from './preferencesApi.js'
import { makeQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
}))

import { getClient } from './_client.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// fetchPreferences
// ============================================

describe('fetchPreferences', () => {
  it('devuelve las preferencias del usuario', async () => {
    const fakeData = [
      { key: 'theme', value: 'dark' },
      { key: 'weight_unit', value: 'kg' },
    ]
    getClient.mockReturnValue(makeClientMock({
      user_preferences: { data: fakeData, error: null },
    }))

    const result = await fetchPreferences('user-1')
    expect(result).toEqual(fakeData)
  })

  it('lanza error si la query falla', async () => {
    const fakeError = new Error('DB error')
    getClient.mockReturnValue(makeClientMock({
      user_preferences: { data: null, error: fakeError },
    }))

    await expect(fetchPreferences('user-1')).rejects.toThrow('DB error')
  })
})

// ============================================
// upsertPreference
// ============================================

describe('upsertPreference', () => {
  it('hace upsert de una preferencia y devuelve key/value', async () => {
    getClient.mockReturnValue(makeClientMock({
      user_preferences: { data: null, error: null },
    }))

    const result = await upsertPreference({ userId: 'user-1', key: 'theme', value: 'light' })
    expect(result).toEqual({ key: 'theme', value: 'light' })
  })

  it('lanza error si el upsert falla', async () => {
    const fakeError = new Error('upsert failed')
    getClient.mockReturnValue(makeClientMock({
      user_preferences: { data: null, error: fakeError },
    }))

    await expect(
      upsertPreference({ userId: 'user-1', key: 'theme', value: 'dark' })
    ).rejects.toThrow('upsert failed')
  })
})
