import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('../api/routineApi.js', () => {
  class SharedRoutineNotFoundError extends Error {}
  return {
    SharedRoutineNotFoundError,
    enableRoutineShare: vi.fn(),
    disableRoutineShare: vi.fn(),
    fetchSharedRoutine: vi.fn(),
    importSharedRoutine: vi.fn(),
  }
})

vi.mock('./useAuth.js', () => ({
  useUserId: vi.fn(() => 'user-123'),
}))

const notify = vi.fn()
vi.mock('../notifications.js', () => ({
  getNotifier: vi.fn(() => ({ show: notify })),
}))

import {
  SharedRoutineNotFoundError,
  enableRoutineShare,
  disableRoutineShare,
  fetchSharedRoutine,
  importSharedRoutine,
} from '../api/routineApi.js'
import { QUERY_KEYS } from '../lib/constants.js'
import { useSharedRoutine, useEnableRoutineShare, useDisableRoutineShare, useImportSharedRoutine } from './useRoutineShare.js'

function setup(hook) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
  const { result } = renderHook(hook, { wrapper })
  return { result, invalidate }
}

const invalidatedKeys = (invalidate) => invalidate.mock.calls.map(([arg]) => arg.queryKey)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSharedRoutine', () => {
  it('fetches by token under the shared-routine key', async () => {
    fetchSharedRoutine.mockResolvedValue({ routine: { name: 'R' } })
    const { result } = setup(() => useSharedRoutine('tok'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchSharedRoutine).toHaveBeenCalledWith('tok')
    expect(result.current.data).toEqual({ routine: { name: 'R' } })
  })

  it('does not fetch without a token', () => {
    setup(() => useSharedRoutine(undefined))
    expect(fetchSharedRoutine).not.toHaveBeenCalled()
  })
})

describe('useEnableRoutineShare / useDisableRoutineShare', () => {
  it('enable invalidates the routine detail (as a string id) and the list', async () => {
    enableRoutineShare.mockResolvedValue('token')
    const { result, invalidate } = setup(() => useEnableRoutineShare())
    await act(() => result.current.mutateAsync({ routineId: 7 }))
    expect(enableRoutineShare).toHaveBeenCalledWith(7)
    expect(invalidatedKeys(invalidate)).toEqual([[QUERY_KEYS.ROUTINE, '7'], [QUERY_KEYS.ROUTINES]])
  })

  it('disable invalidates the routine detail and the list, and says so', async () => {
    disableRoutineShare.mockResolvedValue()
    const { result, invalidate } = setup(() => useDisableRoutineShare())
    await act(() => result.current.mutateAsync({ routineId: '7' }))
    expect(invalidatedKeys(invalidate)).toEqual([[QUERY_KEYS.ROUTINE, '7'], [QUERY_KEYS.ROUTINES]])
    expect(notify).toHaveBeenCalledWith(expect.any(String), 'success')
  })

  it('stays pending until the routine detail is refetched', async () => {
    enableRoutineShare.mockResolvedValue('token')
    const pendingRefetches = []
    const { result, invalidate } = setup(() => useEnableRoutineShare())
    invalidate.mockImplementation(() => new Promise(resolve => { pendingRefetches.push(resolve) }))
    let settled = false
    act(() => { result.current.mutateAsync({ routineId: 7 }).then(() => { settled = true }) })
    await waitFor(() => expect(invalidate).toHaveBeenCalled())
    expect(settled).toBe(false)
    await act(async () => { pendingRefetches.forEach(resolve => resolve()) })
    await waitFor(() => expect(settled).toBe(true))
  })

  it('enable notifies an error and invalidates nothing when it fails', async () => {
    enableRoutineShare.mockRejectedValue(new Error('42501'))
    const { result, invalidate } = setup(() => useEnableRoutineShare())
    await act(() => result.current.mutateAsync({ routineId: 7 }).catch(() => {}))
    expect(invalidate).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(expect.any(String), 'error')
  })
})

describe('useImportSharedRoutine', () => {
  it('imports for the current user and invalidates the routines list', async () => {
    importSharedRoutine.mockResolvedValue({ id: 99 })
    const { result, invalidate } = setup(() => useImportSharedRoutine())
    await act(() => result.current.mutateAsync({ token: 'tok' }))
    expect(importSharedRoutine).toHaveBeenCalledWith('tok', 'user-123')
    expect(invalidatedKeys(invalidate)).toEqual([[QUERY_KEYS.ROUTINES]])
  })

  it('on a dead link refetches the shared routine instead of a generic error', async () => {
    importSharedRoutine.mockRejectedValue(new SharedRoutineNotFoundError())
    const { result, invalidate } = setup(() => useImportSharedRoutine())
    await act(() => result.current.mutateAsync({ token: 'tok' }).catch(() => {}))
    expect(invalidatedKeys(invalidate)).toEqual([[QUERY_KEYS.SHARED_ROUTINE, 'tok']])
    expect(notify).not.toHaveBeenCalled()
  })

  it('notifies any other error', async () => {
    importSharedRoutine.mockRejectedValue(new Error('network'))
    const { result } = setup(() => useImportSharedRoutine())
    await act(() => result.current.mutateAsync({ token: 'tok' }).catch(() => {}))
    expect(notify).toHaveBeenCalledWith(expect.any(String), 'error')
  })
})
