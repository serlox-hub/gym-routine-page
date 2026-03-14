import { useState, useRef, useCallback, useEffect } from 'react'
import useWorkoutStore from '../stores/workoutStore.js'

// ============================================
// AUDIO & VIBRATION
// ============================================

let audioContext = null

function playTimerBeep() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = audioContext
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3

    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.15)
  } catch {
    // Ignorar errores de audio
  }
}

function vibrateDevice() {
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200])
  }
}

function isSoundEnabled() {
  try {
    const pref = localStorage.getItem('timer_sound_enabled')
    return pref === null || pref === 'true'
  } catch {
    return true
  }
}

// ============================================
// TIMER ENGINE HOOK (montar una sola vez)
// ============================================

const timerUpdateCallbacks = new Set()

export function useTimerEngine() {
  const intervalRef = useRef(null)
  const lastBeepRef = useRef(-1)

  const startInterval = useCallback(() => {
    if (intervalRef.current) return
    lastBeepRef.current = -1

    intervalRef.current = setInterval(() => {
      const wasActive = useWorkoutStore.getState().restTimerActive
      useWorkoutStore.getState().tickTimer()

      const currentState = useWorkoutStore.getState()
      const remaining = currentState.getTimeRemaining()

      timerUpdateCallbacks.forEach(cb => cb(remaining))

      if (currentState.restTimerActive && remaining <= 2 && remaining > 0 && remaining !== lastBeepRef.current) {
        lastBeepRef.current = remaining
        if (isSoundEnabled()) playTimerBeep()
      }

      if (wasActive && !currentState.restTimerActive && remaining === 0) {
        if (isSoundEnabled()) {
          playTimerBeep()
          vibrateDevice()
        }
        clearInterval(intervalRef.current)
        intervalRef.current = null
        lastBeepRef.current = -1
      }
    }, 250)
  }, [])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    const unsubscribe = useWorkoutStore.subscribe((state, prevState) => {
      if (state.restTimerActive && !prevState.restTimerActive) {
        startInterval()
      } else if (!state.restTimerActive && prevState.restTimerActive) {
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
  }, [startInterval, stopInterval])
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

// ============================================
// WAKE LOCK HOOK
// ============================================

export function useWakeLock() {
  const [isSupported] = useState(() => 'wakeLock' in navigator)
  const [isActive, setIsActive] = useState(false)
  const wakeLockRef = useRef(null)

  const request = useCallback(async () => {
    if (!isSupported || wakeLockRef.current) return

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      setIsActive(true)

      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false)
        wakeLockRef.current = null
      })
    } catch {
      // Wake lock request failed
    }
  }, [isSupported])

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
      setIsActive(false)
    }
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSupported && !wakeLockRef.current) {
        request()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isSupported, request])

  useEffect(() => {
    request()
    return () => { release() }
  }, [request, release])

  return { isSupported, isActive }
}
