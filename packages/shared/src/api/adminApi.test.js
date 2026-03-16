import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAllUsers, fetchUserSettings, updateUserSetting } from './adminApi.js'
import { makeQueryMock, makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
}))

import { getClient } from './_client.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// fetchAllUsers
// ============================================

describe('fetchAllUsers', () => {
  it('combina usuarios con sus settings', async () => {
    const fakeUsers = [
      { id: 'user-1', email: 'a@b.com' },
      { id: 'user-2', email: 'c@d.com' },
    ]
    const fakeSettings = [
      { user_id: 'user-1', key: 'theme', value: 'dark' },
    ]

    getClient.mockImplementation(() => ({
      rpc: vi.fn().mockResolvedValue({ data: fakeUsers, error: null }),
      from: (table) => {
        if (table === 'user_settings') {
          return makeQueryMock({ data: fakeSettings, error: null })
        }
        return makeQueryMock({ data: null, error: null })
      },
    }))

    const result = await fetchAllUsers()
    expect(result).toHaveLength(2)
    expect(result[0].settings).toEqual({ theme: 'dark' })
    expect(result[1].settings).toEqual({})
  })

  it('lanza error si falla el RPC de usuarios', async () => {
    const fakeError = new Error('rpc error')
    getClient.mockImplementation(() => ({
      rpc: vi.fn().mockResolvedValue({ data: null, error: fakeError }),
      from: () => makeQueryMock({ data: [], error: null }),
    }))

    await expect(fetchAllUsers()).rejects.toThrow('rpc error')
  })

  it('lanza error si falla la query de user_settings', async () => {
    const fakeError = new Error('settings error')
    getClient.mockImplementation(() => ({
      rpc: vi.fn().mockResolvedValue({ data: [{ id: 'user-1' }], error: null }),
      from: () => makeQueryMock({ data: null, error: fakeError }),
    }))

    await expect(fetchAllUsers()).rejects.toThrow('settings error')
  })
})

// ============================================
// fetchUserSettings
// ============================================

describe('fetchUserSettings', () => {
  it('devuelve settings del usuario como objeto key/value', async () => {
    const fakeData = [
      { key: 'theme', value: 'dark' },
      { key: 'language', value: 'es' },
    ]
    getClient.mockReturnValue(makeClientMock({
      user_settings: { data: fakeData, error: null },
    }))

    const result = await fetchUserSettings('user-1')
    expect(result).toEqual({ theme: 'dark', language: 'es' })
  })

  it('devuelve objeto vacío si no hay settings', async () => {
    getClient.mockReturnValue(makeClientMock({
      user_settings: { data: [], error: null },
    }))

    const result = await fetchUserSettings('user-1')
    expect(result).toEqual({})
  })

  it('lanza error si la query falla', async () => {
    const fakeError = new Error('DB error')
    getClient.mockReturnValue(makeClientMock({
      user_settings: { data: null, error: fakeError },
    }))

    await expect(fetchUserSettings('user-1')).rejects.toThrow('DB error')
  })
})

// ============================================
// updateUserSetting
// ============================================

describe('updateUserSetting', () => {
  it('hace upsert cuando value no es null', async () => {
    getClient.mockReturnValue(makeClientMock({
      user_settings: { data: null, error: null },
    }))

    await expect(
      updateUserSetting({ userId: 'user-1', key: 'theme', value: 'light' })
    ).resolves.toBeUndefined()
  })

  it('hace delete cuando value es null', async () => {
    getClient.mockReturnValue(makeClientMock({
      user_settings: { data: null, error: null },
    }))

    await expect(
      updateUserSetting({ userId: 'user-1', key: 'theme', value: null })
    ).resolves.toBeUndefined()
  })

  it('lanza error si el upsert falla', async () => {
    const fakeError = new Error('upsert failed')
    getClient.mockReturnValue(makeClientMock({
      user_settings: { data: null, error: fakeError },
    }))

    await expect(
      updateUserSetting({ userId: 'user-1', key: 'theme', value: 'dark' })
    ).rejects.toThrow('upsert failed')
  })

  it('lanza error si el delete falla', async () => {
    const fakeError = new Error('delete failed')
    getClient.mockReturnValue(makeClientMock({
      user_settings: { data: null, error: fakeError },
    }))

    await expect(
      updateUserSetting({ userId: 'user-1', key: 'theme', value: null })
    ).rejects.toThrow('delete failed')
  })
})
