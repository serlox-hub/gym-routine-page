import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createFeedback,
  fetchAllFeedback,
  setFeedbackResolved,
  deleteFeedback,
} from './feedbackApi.js'
import { makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({
  getClient: vi.fn(),
}))

import { getClient } from './_client.js'

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// createFeedback
// ============================================

describe('createFeedback', () => {
  it('inserta un reporte con todos los campos', async () => {
    const client = makeClientMock({ user_feedback: { data: null, error: null } })
    getClient.mockReturnValue(client)

    await createFeedback({
      userId: 'user-1',
      type: 'bug',
      message: 'No funciona',
      appVersion: '1.0.0',
      platform: 'web',
    })

    expect(client.from).toHaveBeenCalledWith('user_feedback')
    const insertMock = client.from.mock.results[0].value.insert
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      type: 'bug',
      message: 'No funciona',
      app_version: '1.0.0',
      platform: 'web',
    })
  })

  it('usa null para appVersion y platform si no se pasan', async () => {
    const client = makeClientMock({ user_feedback: { data: null, error: null } })
    getClient.mockReturnValue(client)

    await createFeedback({ userId: 'user-1', type: 'suggestion', message: 'Mejora' })

    const insertMock = client.from.mock.results[0].value.insert
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      app_version: null,
      platform: null,
    }))
  })

  it('lanza error si la insercion falla', async () => {
    const fakeError = new Error('insert failed')
    getClient.mockReturnValue(makeClientMock({
      user_feedback: { data: null, error: fakeError },
    }))

    await expect(
      createFeedback({ userId: 'user-1', type: 'bug', message: 'x' })
    ).rejects.toThrow('insert failed')
  })
})

// ============================================
// fetchAllFeedback
// ============================================

describe('fetchAllFeedback', () => {
  it('llama a la RPC get_all_feedback y devuelve la lista', async () => {
    const fakeData = [
      { id: 1, type: 'bug', message: 'a', resolved_at: null },
      { id: 2, type: 'suggestion', message: 'b', resolved_at: '2026-01-01' },
    ]
    const client = makeClientMock()
    client.rpc = vi.fn().mockResolvedValue({ data: fakeData, error: null })
    getClient.mockReturnValue(client)

    const result = await fetchAllFeedback()
    expect(client.rpc).toHaveBeenCalledWith('get_all_feedback')
    expect(result).toEqual(fakeData)
  })

  it('devuelve array vacio si la RPC devuelve null', async () => {
    const client = makeClientMock()
    client.rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    getClient.mockReturnValue(client)

    expect(await fetchAllFeedback()).toEqual([])
  })

  it('lanza error si la RPC falla', async () => {
    const client = makeClientMock()
    client.rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('rpc failed') })
    getClient.mockReturnValue(client)

    await expect(fetchAllFeedback()).rejects.toThrow('rpc failed')
  })
})

// ============================================
// setFeedbackResolved
// ============================================

describe('setFeedbackResolved', () => {
  it('marca como resuelto con timestamp y adminId', async () => {
    const client = makeClientMock({ user_feedback: { data: null, error: null } })
    getClient.mockReturnValue(client)

    await setFeedbackResolved({ id: 5, resolved: true, adminId: 'admin-1' })

    const updateMock = client.from.mock.results[0].value.update
    const args = updateMock.mock.calls[0][0]
    expect(args.resolved_by).toBe('admin-1')
    expect(typeof args.resolved_at).toBe('string')
    expect(args.resolved_at).not.toBeNull()
  })

  it('reabre poniendo resolved_at y resolved_by a null', async () => {
    const client = makeClientMock({ user_feedback: { data: null, error: null } })
    getClient.mockReturnValue(client)

    await setFeedbackResolved({ id: 5, resolved: false, adminId: 'admin-1' })

    const updateMock = client.from.mock.results[0].value.update
    expect(updateMock).toHaveBeenCalledWith({ resolved_at: null, resolved_by: null })
  })

  it('lanza error si el update falla', async () => {
    const fakeError = new Error('update failed')
    getClient.mockReturnValue(makeClientMock({
      user_feedback: { data: null, error: fakeError },
    }))

    await expect(
      setFeedbackResolved({ id: 1, resolved: true, adminId: 'a' })
    ).rejects.toThrow('update failed')
  })
})

// ============================================
// deleteFeedback
// ============================================

describe('deleteFeedback', () => {
  it('borra el reporte por id', async () => {
    const client = makeClientMock({ user_feedback: { data: null, error: null } })
    getClient.mockReturnValue(client)

    await deleteFeedback(7)

    expect(client.from).toHaveBeenCalledWith('user_feedback')
    const deleteMock = client.from.mock.results[0].value.delete
    const eqMock = client.from.mock.results[0].value.eq
    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', 7)
  })

  it('lanza error si el delete falla', async () => {
    const fakeError = new Error('delete failed')
    getClient.mockReturnValue(makeClientMock({
      user_feedback: { data: null, error: fakeError },
    }))

    await expect(deleteFeedback(7)).rejects.toThrow('delete failed')
  })
})
