import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock the stores module
vi.mock('./_stores.js', () => {
  const mockStore = {
    sessionId: 'session-123',
    pendingSets: {},
    updateSetDbId: vi.fn(),
    removePendingSet: vi.fn(),
    completeSet: vi.fn(),
    addPendingSet: vi.fn(),
    updateSetVideo: vi.fn(),
    updateSetDetails: vi.fn(),
    uncompleteSet: vi.fn(),
  }

  const useWorkoutStore = vi.fn((selector) => selector ? selector(mockStore) : mockStore)
  useWorkoutStore._mockStore = mockStore

  const getWorkoutStore = vi.fn(() => ({
    getState: vi.fn(() => mockStore),
  }))

  return { useWorkoutStore, getWorkoutStore }
})

// Mock the workoutApi
vi.mock('../api/workoutApi.js', () => ({
  upsertCompletedSet: vi.fn().mockResolvedValue({ id: 'db-id-1' }),
  updateSetVideo: vi.fn().mockResolvedValue({}),
  updateSetDetails: vi.fn().mockResolvedValue({}),
  deleteCompletedSet: vi.fn().mockResolvedValue({}),
}))

// Mock constants
vi.mock('../lib/constants.js', () => ({
  QUERY_KEYS: {
    COMPLETED_SETS: 'completed_sets',
  },
}))

import { useSyncPendingSets } from './useCompletedSets.js'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useSyncPendingSets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a onVisibilityChange con una función de callback', () => {
    const onVisibilityChange = vi.fn().mockReturnValue(() => {})
    const onConnectivityChange = vi.fn().mockReturnValue(() => {})

    renderHook(
      () => useSyncPendingSets({ onVisibilityChange, onConnectivityChange }),
      { wrapper: createWrapper() }
    )

    expect(onVisibilityChange).toHaveBeenCalledOnce()
    expect(onVisibilityChange).toHaveBeenCalledWith(expect.any(Function))
  })

  it('llama a onConnectivityChange con una función de callback', () => {
    const onVisibilityChange = vi.fn().mockReturnValue(() => {})
    const onConnectivityChange = vi.fn().mockReturnValue(() => {})

    renderHook(
      () => useSyncPendingSets({ onVisibilityChange, onConnectivityChange }),
      { wrapper: createWrapper() }
    )

    expect(onConnectivityChange).toHaveBeenCalledOnce()
    expect(onConnectivityChange).toHaveBeenCalledWith(expect.any(Function))
  })

  it('invoca la limpieza retornada por onVisibilityChange al desmontar', () => {
    const cleanupSpy = vi.fn()
    const onVisibilityChange = vi.fn().mockReturnValue(cleanupSpy)

    const { unmount } = renderHook(
      () => useSyncPendingSets({ onVisibilityChange }),
      { wrapper: createWrapper() }
    )

    unmount()
    expect(cleanupSpy).toHaveBeenCalledOnce()
  })

  it('invoca la limpieza retornada por onConnectivityChange al desmontar', () => {
    const cleanupSpy = vi.fn()
    const onConnectivityChange = vi.fn().mockReturnValue(cleanupSpy)

    const { unmount } = renderHook(
      () => useSyncPendingSets({ onConnectivityChange }),
      { wrapper: createWrapper() }
    )

    unmount()
    expect(cleanupSpy).toHaveBeenCalledOnce()
  })

  it('no falla cuando no se proveen callbacks', () => {
    expect(() => {
      renderHook(
        () => useSyncPendingSets(),
        { wrapper: createWrapper() }
      )
    }).not.toThrow()
  })

  it('no registra listeners cuando los callbacks no se proveen', () => {
    const onVisibilityChange = vi.fn()
    const onConnectivityChange = vi.fn()

    renderHook(
      () => useSyncPendingSets(),
      { wrapper: createWrapper() }
    )

    expect(onVisibilityChange).not.toHaveBeenCalled()
    expect(onConnectivityChange).not.toHaveBeenCalled()
  })

  it('el callback de visibilidad puede invocar syncPending sin errores', async () => {
    const { upsertCompletedSet } = await import('../api/workoutApi.js')
    const { getWorkoutStore } = await import('./_stores.js')

    // Simular sets pendientes
    const pendingPayload = {
      sessionId: 'session-123',
      sessionExerciseId: 'ex-1',
      setNumber: 1,
      weight: 100,
      weightUnit: 'kg',
      repsCompleted: 5,
    }
    getWorkoutStore.mockReturnValue({
      getState: vi.fn(() => ({
        pendingSets: { 'ex-1-1': pendingPayload },
        updateSetDbId: vi.fn(),
        removePendingSet: vi.fn(),
      })),
    })

    let capturedCallback = null
    const onVisibilityChange = vi.fn().mockImplementation((cb) => {
      capturedCallback = cb
      return () => {}
    })

    renderHook(
      () => useSyncPendingSets({ onVisibilityChange }),
      { wrapper: createWrapper() }
    )

    expect(capturedCallback).not.toBeNull()

    await act(async () => {
      await capturedCallback()
    })

    expect(upsertCompletedSet).toHaveBeenCalled()
  })
})
