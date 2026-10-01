import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSlowPending, SLOW_PENDING_MS } from './useSlowPending.js'

describe('useSlowPending', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderSlowPending(isPending, thresholdMs) {
    return renderHook(({ pending, ms }) => useSlowPending(pending, ms), {
      initialProps: { pending: isPending, ms: thresholdMs },
    })
  }

  it('is false while not pending, however long it waits', () => {
    const { result } = renderSlowPending(false)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS * 2) })
    expect(result.current).toBe(false)
  })

  it('is false before the threshold', () => {
    const { result } = renderSlowPending(true)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS - 1) })
    expect(result.current).toBe(false)
  })

  it('is true at the threshold', () => {
    const { result } = renderSlowPending(true)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS) })
    expect(result.current).toBe(true)
  })

  it('takes a custom threshold', () => {
    const { result } = renderSlowPending(true, 100)
    act(() => { vi.advanceTimersByTime(99) })
    expect(result.current).toBe(false)
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe(true)
  })

  it('is false at once when pending ends', () => {
    const { result, rerender } = renderSlowPending(true)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS) })
    expect(result.current).toBe(true)

    rerender({ pending: false })
    expect(result.current).toBe(false)
  })

  it('a second pending period starts from zero', () => {
    const { result, rerender } = renderSlowPending(true)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS) })
    rerender({ pending: false })

    rerender({ pending: true })
    expect(result.current).toBe(false)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS - 1) })
    expect(result.current).toBe(false)
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe(true)
  })

  it('a pending period cut short does not carry its elapsed time into the next one', () => {
    const { result, rerender } = renderSlowPending(true)
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS - 1) })
    rerender({ pending: false })
    rerender({ pending: true })

    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe(false)
  })

  it('leaves no timer behind after unmount', () => {
    const { unmount } = renderSlowPending(true)
    expect(vi.getTimerCount()).toBe(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
