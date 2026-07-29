import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeClientMock } from './_testUtils.js'

vi.mock('./_client.js', () => ({ getClient: vi.fn() }))
import { getClient } from './_client.js'

import {
  fetchGyms,
  createGym,
  ensureDefaultGym,
  reassignSessionGym,
  changeSessionGym,
} from './gymsApi.js'

beforeEach(() => {
  vi.clearAllMocks()
})

const USER_ID = 'user-1'

describe('fetchGyms', () => {
  it('devuelve la lista de gyms', async () => {
    const gyms = [
      { id: 1, name: null, is_default: true, created_at: '2026-01-01' },
      { id: 2, name: 'Otro', is_default: false, created_at: '2026-02-01' },
    ]
    getClient.mockReturnValue(makeClientMock({ gyms: { data: gyms, error: null } }))

    const result = await fetchGyms()
    expect(result).toEqual(gyms)
  })
})

describe('createGym', () => {
  it('inserta con user_id y devuelve la fila', async () => {
    const created = { id: 3, name: 'Nuevo', is_default: false, created_at: '2026-03-01' }
    const client = makeClientMock({ gyms: { data: created, error: null } })
    getClient.mockReturnValue(client)

    const result = await createGym({ userId: USER_ID, name: 'Nuevo' })

    expect(result).toEqual(created)
    const chain = client.from.mock.results[0].value
    expect(chain.insert).toHaveBeenCalledWith({ user_id: USER_ID, name: 'Nuevo', is_default: false })
  })
})

describe('ensureDefaultGym', () => {
  it('devuelve el gym por defecto existente sin crear nada', async () => {
    const gyms = [
      { id: 2, name: 'Otro', is_default: false, created_at: '2026-02-01' },
      { id: 1, name: null, is_default: true, created_at: '2026-01-01' },
    ]
    const client = makeClientMock({ gyms: { data: gyms, error: null } })
    getClient.mockReturnValue(client)

    const result = await ensureDefaultGym(USER_ID)

    expect(result.id).toBe(1)
    // No debe haber insertado
    const insertCalls = client.from.mock.results
      .map(r => r.value.insert.mock.calls.length)
      .reduce((a, b) => a + b, 0)
    expect(insertCalls).toBe(0)
  })

  it('crea un gym por defecto cuando el usuario no tiene ninguno', async () => {
    const created = { id: 5, name: null, is_default: true, created_at: '2026-04-01' }
    // fetchGyms devuelve [] (data array vacío); createGym usa .single() → devuelve el objeto
    const client = {
      from: vi.fn()
        .mockReturnValueOnce(makeClientMock({ gyms: { data: [], error: null } }).from('gyms'))
        .mockReturnValueOnce(makeClientMock({ gyms: { data: created, error: null } }).from('gyms')),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    getClient.mockReturnValue(client)

    const result = await ensureDefaultGym(USER_ID)

    expect(result).toEqual(created)
    const insertChain = client.from.mock.results[1].value
    expect(insertChain.insert).toHaveBeenCalledWith({ user_id: USER_ID, name: null, is_default: true })
  })
})

describe('changeSessionGym', () => {
  it('llama al RPC change_session_gym mapeando los pesos a snake_case', async () => {
    const client = makeClientMock()
    getClient.mockReturnValue(client)

    await changeSessionGym({
      sessionId: 'sess-1',
      gymId: 7,
      weights: [{ sessionExerciseId: 10, setNumber: 1, weight: 86.18 }],
    })

    expect(client.rpc).toHaveBeenCalledWith('change_session_gym', {
      p_session_id: 'sess-1',
      p_gym_id: 7,
      p_weights: [{ session_exercise_id: 10, set_number: 1, weight: 86.18 }],
    })
  })

  it('pasa p_weights vacío cuando no hay conversión', async () => {
    const client = makeClientMock()
    getClient.mockReturnValue(client)

    await changeSessionGym({ sessionId: 'sess-1', gymId: 7 })

    expect(client.rpc).toHaveBeenCalledWith('change_session_gym', {
      p_session_id: 'sess-1',
      p_gym_id: 7,
      p_weights: [],
    })
  })

  it('lanza si el RPC devuelve error', async () => {
    const client = makeClientMock()
    client.rpc = vi.fn().mockResolvedValue({ error: new Error('rpc boom') })
    getClient.mockReturnValue(client)

    await expect(changeSessionGym({ sessionId: 'sess-1', gymId: 7 })).rejects.toThrow('rpc boom')
  })
})

describe('reassignSessionGym', () => {
  it('no hace nada si el gym destino es el mismo', async () => {
    const client = makeClientMock({
      workout_sessions: { data: { gym_id: 1, started_at: '2026-05-01' }, error: null },
    })
    getClient.mockReturnValue(client)

    const result = await reassignSessionGym({ sessionId: 's1', newGymId: 1 })
    expect(result).toBeUndefined()
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('mueve la sesión y recalcula PRs en el gym origen y el destino', async () => {
    const client = makeClientMock({
      workout_sessions: { data: { gym_id: 1, started_at: '2026-05-01' }, error: null },
      exercise_session_stats: { data: [{ exercise_id: 100 }, { exercise_id: 100 }, { exercise_id: 200 }], error: null },
    })
    getClient.mockReturnValue(client)

    const result = await reassignSessionGym({ sessionId: 's1', newGymId: 2 })

    expect(result.affectedExerciseIds.sort()).toEqual([100, 200])
    expect(result.oldGymId).toBe(1)
    expect(result.newGymId).toBe(2)

    // 2 ejercicios × 2 gyms = 4 recálculos
    expect(client.rpc).toHaveBeenCalledTimes(4)
    const gymArgs = client.rpc.mock.calls.map(c => c[1].p_gym_id).sort()
    expect(gymArgs).toEqual([1, 1, 2, 2])
  })
})
