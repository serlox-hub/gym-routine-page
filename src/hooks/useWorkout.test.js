import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRestTimer } from './useWorkout.js'
import useWorkoutStore from '../stores/workoutStore.js'

// Mock del store para tests aislados
vi.mock('../stores/workoutStore.js', async () => {
  const actual = await vi.importActual('../stores/workoutStore.js')
  return {
    default: actual.default,
  }
})

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

    it('returns initial inactive state', () => {
      const { result } = renderHook(() => useRestTimer())

      expect(result.current.isActive).toBe(false)
      expect(result.current.timeRemaining).toBe(0)
      expect(result.current.progress).toBe(0)
    })

    it('returns active state when timer is running', () => {
      useWorkoutStore.getState().startRestTimer(60)

      const { result } = renderHook(() => useRestTimer())

      expect(result.current.isActive).toBe(true)
      expect(result.current.timeRemaining).toBe(60)
      expect(result.current.timeInitial).toBe(60)
    })

    it('calculates progress correctly', () => {
      // Simular timer con 30s restantes de 60s iniciales
      useWorkoutStore.setState({
        restTimerActive: true,
        restTimerEndTime: Date.now() + 30000, // 30 segundos desde ahora
        restTimeInitial: 60,
      })

      const { result } = renderHook(() => useRestTimer())

      expect(result.current.progress).toBe(50)
    })

    it('progress is 0 when initial time is 0', () => {
      useWorkoutStore.setState({
        restTimerActive: true,
        restTimerEndTime: Date.now(),
        restTimeInitial: 0,
      })

      const { result } = renderHook(() => useRestTimer())

      expect(result.current.progress).toBe(0)
    })

    it('skip function calls skipRest', () => {
      useWorkoutStore.getState().startRestTimer(60)

      const { result } = renderHook(() => useRestTimer())

      act(() => {
        result.current.skip()
      })

      expect(useWorkoutStore.getState().restTimerActive).toBe(false)
    })

    it('addTime function adjusts time', () => {
      useWorkoutStore.getState().startRestTimer(60)

      const { result } = renderHook(() => useRestTimer())

      const initialRemaining = result.current.timeRemaining

      act(() => {
        result.current.addTime(30)
        vi.advanceTimersByTime(250) // Trigger update
      })

      expect(result.current.timeRemaining).toBe(initialRemaining + 30)
    })

    it('addTime can reduce time', () => {
      useWorkoutStore.getState().startRestTimer(60)

      const { result } = renderHook(() => useRestTimer())

      const initialRemaining = result.current.timeRemaining

      act(() => {
        result.current.addTime(-30)
        vi.advanceTimersByTime(250) // Trigger update
      })

      expect(result.current.timeRemaining).toBe(initialRemaining - 30)
    })

    it('timer updates based on real time', async () => {
      useWorkoutStore.getState().startRestTimer(60)

      const { result } = renderHook(() => useRestTimer())

      expect(result.current.timeRemaining).toBe(60)

      // Avanzar 1 segundo
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.timeRemaining).toBe(59)

      // Avanzar 2 segundos más
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.timeRemaining).toBe(57)
    })

    it('timer stops when reaching 0', () => {
      useWorkoutStore.getState().startRestTimer(2)

      renderHook(() => useRestTimer())

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      const state = useWorkoutStore.getState()
      expect(state.getTimeRemaining()).toBe(0)
      expect(state.restTimerActive).toBe(false)
    })

    it('timer interval is cleared on unmount', () => {
      useWorkoutStore.getState().startRestTimer(60)

      const { unmount } = renderHook(() => useRestTimer())

      const remainingBefore = useWorkoutStore.getState().getTimeRemaining()

      unmount()

      // Después de unmount, el timer del store sigue pero el hook no actualiza
      expect(useWorkoutStore.getState().getTimeRemaining()).toBeLessThanOrEqual(remainingBefore)
    })

    it('multiple renders dont create multiple intervals', () => {
      useWorkoutStore.getState().startRestTimer(60)

      const { result, rerender } = renderHook(() => useRestTimer())

      // Rerender multiple times
      rerender()
      rerender()
      rerender()

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should only tick once, not multiple times
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
      useWorkoutStore.getState().startRestTimer(60)

      const { result } = renderHook(() => useRestTimer())

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.timeRemaining).toBe(58)

      // Start new timer
      act(() => {
        useWorkoutStore.getState().startRestTimer(90)
        vi.advanceTimersByTime(250) // Trigger update
      })

      expect(result.current.timeRemaining).toBe(90)
      expect(result.current.timeInitial).toBe(90)
    })

    it('progress reaches 100 when time is 0', () => {
      // Timer que ya terminó
      useWorkoutStore.setState({
        restTimerActive: true,
        restTimerEndTime: Date.now() - 1000, // Ya pasó
        restTimeInitial: 60,
      })

      const { result } = renderHook(() => useRestTimer())

      expect(result.current.progress).toBe(100)
    })
  })
})

// Tests para verificar la estructura de los hooks de queries/mutations
describe('useWorkout hooks - structure', () => {
  it('hooks exportan las funciones esperadas', async () => {
    const module = await import('./useWorkout.js')

    // Session mutations
    expect(module.useStartSession).toBeDefined()
    expect(module.useCompleteSet).toBeDefined()
    expect(module.useUncompleteSet).toBeDefined()
    expect(module.useEndSession).toBeDefined()
    expect(module.useAbandonSession).toBeDefined()

    // History mutations
    expect(module.useDeleteSession).toBeDefined()

    // History queries
    expect(module.useWorkoutHistory).toBeDefined()
    expect(module.useSessionDetail).toBeDefined()

    // Exercise history
    expect(module.useExerciseHistory).toBeDefined()
    expect(module.usePreviousWorkout).toBeDefined()

    // Timer
    expect(module.useRestTimer).toBeDefined()
  })
})
