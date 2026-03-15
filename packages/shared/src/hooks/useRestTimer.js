import { useState, useRef, useCallback, useEffect } from 'react'
import { useWorkoutStore, getWorkoutStore } from './_stores.js'

// ============================================
// TIMER ENGINE HOOK (montar una sola vez)
// ============================================

const timerUpdateCallbacks = new Set()

export function useTimerEngine({ playSound, vibrateDevice, onTimerStart, onTimerEnd, isSoundEnabled } = {}) {
  const intervalRef = useRef(null)
  const lastBeepRef = useRef(-1)

  const startInterval = useCallback(() => {
    if (intervalRef.current) return
    lastBeepRef.current = -1

    intervalRef.current = setInterval(() => {
      const store = getWorkoutStore()
      const wasActive = store.getState().restTimerActive
      store.getState().tickTimer()

      const currentState = store.getState()
      const remaining = currentState.getTimeRemaining()

      timerUpdateCallbacks.forEach(cb => cb(remaining))

      if (currentState.restTimerActive && remaining <= 2 && remaining > 0 && remaining !== lastBeepRef.current) {
        lastBeepRef.current = remaining
        if (isSoundEnabled?.() !== false) playSound?.()
      }

      if (wasActive && !currentState.restTimerActive && remaining === 0) {
        if (isSoundEnabled?.() !== false) {
          playSound?.()
          vibrateDevice?.()
        }
        clearInterval(intervalRef.current)
        intervalRef.current = null
        lastBeepRef.current = -1
      }
    }, 250)
  }, [playSound, vibrateDevice, isSoundEnabled])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    const store = getWorkoutStore()
    const unsubscribe = store.subscribe((state, prevState) => {
      if (state.restTimerActive && !prevState.restTimerActive) {
        onTimerStart?.()
        startInterval()
      } else if (!state.restTimerActive && prevState.restTimerActive) {
        onTimerEnd?.()
        stopInterval()
      }

      if (state.restTimerEndTime !== prevState.restTimerEndTime &&
          state.restTimerEndTime && state.restTimerActive) {
        stopInterval()
        startInterval()
      }
    })

    return () => {
      unsubscribe()
      stopInterval()
    }
  }, [startInterval, stopInterval, onTimerStart, onTimerEnd])
}

// ============================================
// REST TIMER HOOK (consumir desde componentes)
// ============================================

export function useRestTimer() {
  const restTimerActive = useWorkoutStore(state => state.restTimerActive)
  const restTimerEndTime = useWorkoutStore(state => state.restTimerEndTime)
  const restTimeInitial = useWorkoutStore(state => state.restTimeInitial)
  const getTimeRemaining = useWorkoutStore(state => state.getTimeRemaining)
  const skipRest = useWorkoutStore(state => state.skipRest)
  const adjustRestTime = useWorkoutStore(state => state.adjustRestTime)

  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining())

  useEffect(() => {
    const updateCallback = (remaining) => setTimeRemaining(remaining)
    timerUpdateCallbacks.add(updateCallback)

    return () => {
      timerUpdateCallbacks.delete(updateCallback)
    }
  }, [])

  useEffect(() => {
    if (restTimerActive) {
      setTimeRemaining(getTimeRemaining())
    } else {
      setTimeRemaining(0)
    }
  }, [restTimerActive, restTimerEndTime, getTimeRemaining])

  const currentRemaining = restTimerActive ? getTimeRemaining() : 0
  const progress = restTimeInitial > 0 && restTimerActive
    ? Math.max(0, Math.min(100, ((restTimeInitial - currentRemaining) / restTimeInitial) * 100))
    : 0

  return {
    isActive: restTimerActive,
    timeRemaining,
    timeInitial: restTimeInitial,
    progress,
    skip: skipRest,
    addTime: (delta) => adjustRestTime(delta),
  }
}
