import { useState, useRef, useCallback, useEffect } from 'react'
import { Vibration } from 'react-native'
import * as Haptics from 'expo-haptics'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import AsyncStorage from '@react-native-async-storage/async-storage'
import useWorkoutStore from '../stores/workoutStore.js'

// ============================================
// AUDIO & VIBRATION
// ============================================

let timerSoundEnabled = true

function playTimerBeep() {
  if (!timerSoundEnabled) return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
}

function vibrateDevice() {
  if (!timerSoundEnabled) return
  Vibration.vibrate([0, 200, 100, 200])
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

    // Refrescar preferencia al iniciar timer
    AsyncStorage.getItem('timer_sound_enabled').then(val => {
      timerSoundEnabled = val === null || val === 'true'
    })

    intervalRef.current = setInterval(() => {
      const wasActive = useWorkoutStore.getState().restTimerActive
      useWorkoutStore.getState().tickTimer()

      const currentState = useWorkoutStore.getState()
      const remaining = currentState.getTimeRemaining()

      timerUpdateCallbacks.forEach(cb => cb(remaining))

      if (currentState.restTimerActive && remaining <= 2 && remaining > 0 && remaining !== lastBeepRef.current) {
        lastBeepRef.current = remaining
        playTimerBeep()
      }

      if (wasActive && !currentState.restTimerActive && remaining === 0) {
        playTimerBeep()
        vibrateDevice()
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
  useEffect(() => {
    activateKeepAwakeAsync()
    return () => { deactivateKeepAwake() }
  }, [])

  return { isSupported: true, isActive: true }
}
