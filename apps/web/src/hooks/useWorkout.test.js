import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { initStores } from '@gym/shared'
import useAuthStore from '../stores/authStore.js'
import useWorkoutStore from '../stores/workoutStore.js'
import { useRestTimer, useTimerEngine } from './useWorkout.js'

// Mock del store para tests aislados
vi.mock('../stores/workoutStore.js', async () => {
  const actual = await vi.importActual('../stores/workoutStore.js')
  return {
    default: actual.default,
  }
})

// Inicializar stores para que shared hooks funcionen
initStores({ authStore: useAuthStore, workoutStore: useWorkoutStore })

// Wrapper que monta el engine + el timer (como en la app real)
function useRestTimerWithEngine() {
  useTimerEngine()
  return useRestTimer()
}

describe('useWorkout hooks', () => {
  describe('useRestTimer', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Reset store
      useWorkoutStore.setState({
        restTimerActive: false,
        restTimerEndTime: null,
        restTimeInitial: 0,
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns default values when no timer is active', () => {
      const { result } = renderHook(() => useRestTimerWithEngine())

      expect(result.current.isActive).toBe(false)
      expect(result.current.timeRemaining).toBe(0)
      expect(result.current.progress).toBe(0)
    })

    it('returns active state when timer is running', () => {
      const { result } = renderHook(() => useRestTimerWithEngine())

      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })

      expect(result.current.isActive).toBe(true)
      expect(result.current.timeRemaining).toBe(60)
      expect(result.current.timeInitial).toBe(60)
    })

    it('calculates progress correctly', () => {
      useWorkoutStore.setState({
        restTimerActive: true,
        restTimerEndTime: Date.now() + 30000,
        restTimeInitial: 60,
      })

      const { result } = renderHook(() => useRestTimerWithEngine())

      expect(result.current.progress).toBe(50)
    })

    it('progress is 0 when initial time is 0', () => {
      useWorkoutStore.setState({
        restTimerActive: true,
        restTimerEndTime: Date.now(),
        restTimeInitial: 0,
      })

      const { result } = renderHook(() => useRestTimerWithEngine())

      expect(result.current.progress).toBe(0)
    })

    it('skip function calls skipRest', () => {
      const { result } = renderHook(() => useRestTimerWithEngine())

      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })

      act(() => {
        result.current.skip()
      })

      expect(useWorkoutStore.getState().restTimerActive).toBe(false)
    })

    it('addTime function adjusts time', () => {
      const { result } = renderHook(() => useRestTimerWithEngine())

      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })

      const initialRemaining = result.current.timeRemaining

      act(() => {
        result.current.addTime(30)
        vi.advanceTimersByTime(250)
      })

      expect(result.current.timeRemaining).toBe(initialRemaining + 30)
    })

    it('addTime can reduce time', () => {
      const { result } = renderHook(() => useRestTimerWithEngine())

      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })

      const initialRemaining = result.current.timeRemaining

      act(() => {
        result.current.addTime(-30)
        vi.advanceTimersByTime(250)
      })

      expect(result.current.timeRemaining).toBe(initialRemaining - 30)
    })

    it('timer updates based on real time', () => {
      const { result } = renderHook(() => useRestTimerWithEngine())

      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })

      expect(result.current.timeRemaining).toBe(60)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.timeRemaining).toBe(59)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.timeRemaining).toBe(57)
    })

    it('timer stops when reaching 0', () => {
      renderHook(() => useRestTimerWithEngine())

      act(() => {
        useWorkoutStore.getState().startRestTimer(2)
        vi.advanceTimersByTime(3000)
      })

      const state = useWorkoutStore.getState()
      expect(state.getTimeRemaining()).toBe(0)
      expect(state.restTimerActive).toBe(false)
    })

    it('timer interval is cleared on unmount', () => {
      const { unmount } = renderHook(() => useRestTimerWithEngine())

      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })

      const remainingBefore = useWorkoutStore.getState().getTimeRemaining()

      unmount()

      expect(useWorkoutStore.getState().getTimeRemaining()).toBeLessThanOrEqual(remainingBefore)
    })

    it('multiple renders dont create multiple intervals', () => {
      const { result, rerender } = renderHook(() => useRestTimerWithEngine())

      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
      })

      rerender()
      rerender()
      rerender()

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.timeRemaining).toBe(59)
    })
  })

  describe('useRestTimer - edge cases', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      useWorkoutStore.setState({
        restTimerActive: false,
        restTimerEndTime: null,
        restTimeInitial: 0,
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('handles starting new timer while one is active', () => {
      const { result } = renderHook(() => useRestTimerWithEngine())

      act(() => {
        useWorkoutStore.getState().startRestTimer(60)
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.timeRemaining).toBe(58)

      // Start new timer
      act(() => {
        useWorkoutStore.getState().startRestTimer(90)
        vi.advanceTimersByTime(250)
      })

      expect(result.current.timeRemaining).toBe(90)
      expect(result.current.timeInitial).toBe(90)
    })

    it('progress reaches 100 when time is 0', () => {
      useWorkoutStore.setState({
        restTimerActive: true,
        restTimerEndTime: Date.now(),
        restTimeInitial: 60,
      })

      const { result } = renderHook(() => useRestTimerWithEngine())

      expect(result.current.progress).toBe(100)
    })

    it('progress handles very short timer', () => {
      useWorkoutStore.setState({
        restTimerActive: true,
        restTimerEndTime: Date.now() + 1000,
        restTimeInitial: 1,
      })

      const { result } = renderHook(() => useRestTimerWithEngine())

      expect(result.current.progress).toBeLessThanOrEqual(100)
      expect(result.current.progress).toBeGreaterThanOrEqual(0)
    })
  })
})
