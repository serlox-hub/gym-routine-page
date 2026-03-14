import { useState, useEffect } from 'react'
import { Vibration } from 'react-native'
import * as Haptics from 'expo-haptics'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import AsyncStorage from '@react-native-async-storage/async-storage'
import useWorkoutStore from '../stores/workoutStore.js'

// ============================================
// REST TIMER HOOK
// ============================================

// Singleton para el intervalo del timer
let globalTimerInterval = null
// Set de funciones para notificar a los componentes suscritos
const timerUpdateCallbacks = new Set()

// Cache de preferencia de sonido para evitar lecturas async en el intervalo
let timerSoundEnabled = true

AsyncStorage.getItem('timer_sound_enabled').then(val => {
  timerSoundEnabled = val === null || val === 'true'
})

function playTimerBeep() {
  if (!timerSoundEnabled) return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
}

function vibrateDevice() {
  if (!timerSoundEnabled) return
  Vibration.vibrate([0, 200, 100, 200])
}

// Track del último segundo en que sonó beep para evitar repetir
let lastBeepSecond = -1

function startGlobalTimerInterval() {
  if (globalTimerInterval) return
  lastBeepSecond = -1

  // Refrescar preferencia al iniciar timer
  AsyncStorage.getItem('timer_sound_enabled').then(val => {
    timerSoundEnabled = val === null || val === 'true'
  })

  globalTimerInterval = setInterval(() => {
    const wasActive = useWorkoutStore.getState().restTimerActive
    useWorkoutStore.getState().tickTimer()

    const currentState = useWorkoutStore.getState()
    const remaining = currentState.getTimeRemaining()

    // Notificar a todos los componentes suscritos
    timerUpdateCallbacks.forEach(cb => cb(remaining))

    // Beep en los últimos 2 segundos (2, 1)
    if (currentState.restTimerActive && remaining <= 2 && remaining > 0 && remaining !== lastBeepSecond) {
      lastBeepSecond = remaining
      playTimerBeep()
    }

    // Detectar cuando el timer termina naturalmente
    if (wasActive && !currentState.restTimerActive && remaining === 0) {
      playTimerBeep()
      vibrateDevice()
      clearInterval(globalTimerInterval)
      globalTimerInterval = null
      lastBeepSecond = -1
    }
  }, 250)
}

function stopGlobalTimerInterval() {
  if (globalTimerInterval) {
    clearInterval(globalTimerInterval)
    globalTimerInterval = null
  }
}

// Suscribirse a cambios del store para iniciar/detener el intervalo automáticamente
let prevRestTimerActive = useWorkoutStore.getState().restTimerActive
let prevRestTimerEndTime = useWorkoutStore.getState().restTimerEndTime

useWorkoutStore.subscribe((state) => {
  if (state.restTimerActive !== prevRestTimerActive) {
    prevRestTimerActive = state.restTimerActive
    if (state.restTimerActive) {
      startGlobalTimerInterval()
    }
  }

  if (state.restTimerEndTime !== prevRestTimerEndTime) {
    prevRestTimerEndTime = state.restTimerEndTime
    if (state.restTimerEndTime && state.restTimerActive) {
      stopGlobalTimerInterval()
      startGlobalTimerInterval()
    }
  }
})

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

    if (restTimerActive && !globalTimerInterval) {
      startGlobalTimerInterval()
    }

    return () => {
      timerUpdateCallbacks.delete(updateCallback)
    }
  }, [restTimerActive])

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
