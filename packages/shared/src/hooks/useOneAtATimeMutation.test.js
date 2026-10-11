import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOneAtATimeMutation } from './useOneAtATimeMutation.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function renderGuarded(mutateAsync, fields = {}) {
  return renderHook(() => useOneAtATimeMutation({ mutateAsync, isPending: false, ...fields }))
}

describe('useOneAtATimeMutation', () => {
  it('passes the variables on and resolves with the mutation result', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 7 })
    const { result } = renderGuarded(mutateAsync)

    let created
    await act(async () => { created = await result.current.run({ name: 'PPL' }) })

    expect(mutateAsync).toHaveBeenCalledWith({ name: 'PPL' })
    expect(created).toEqual({ id: 7 })
  })

  it('drops a second call while the first is in flight, and lets the next one through after it', async () => {
    const first = deferred()
    const mutateAsync = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce({ id: 2 })
    const { result } = renderGuarded(mutateAsync)

    let dropped
    await act(async () => {
      result.current.run('a')
      dropped = await result.current.run('b')
    })
    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(dropped).toBeUndefined()

    await act(async () => { first.resolve({ id: 1 }) })
    await act(async () => { await result.current.run('c') })

    expect(mutateAsync).toHaveBeenCalledTimes(2)
    expect(mutateAsync).toHaveBeenLastCalledWith('c')
  })

  it('resolves undefined instead of rejecting when the mutation fails, and allows a retry', async () => {
    const mutateAsync = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce({ id: 1 })
    const { result } = renderGuarded(mutateAsync)

    let failed
    await act(async () => { failed = await result.current.run('a') })
    expect(failed).toBeUndefined()

    let retried
    await act(async () => { retried = await result.current.run('a') })
    expect(retried).toEqual({ id: 1 })
  })

  it('keeps the mutation state for the button and the modal', () => {
    const reset = vi.fn()
    const { result } = renderGuarded(vi.fn(), { isPending: true, isError: true, reset })

    expect(result.current.isPending).toBe(true)
    expect(result.current.isError).toBe(true)
    expect(result.current.reset).toBe(reset)
  })
})
