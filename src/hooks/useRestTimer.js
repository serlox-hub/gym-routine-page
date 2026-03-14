import { useState, useRef, useCallback, useEffect } from 'react'
import useWorkoutStore from '../stores/workoutStore.js'

// ============================================
// REST TIMER HOOK
// ============================================

// Singleton para el intervalo del timer
let globalTimerInterval = null
let audioContext = null
// Set de funciones para notificar a los componentes suscritos
const timerUpdateCallbacks = new Set()

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

// Track del último segundo en que sonó beep para evitar repetir
let lastBeepSecond = -1

function startGlobalTimerInterval() {
  if (globalTimerInterval) return
  lastBeepSecond = -1

  globalTimerInterval = setInterval(() => {
    const wasActive = useWorkoutStore.getState().restTimerActive
    useWorkoutStore.getState().tickTimer()

    const currentState = useWorkoutStore.getState()
    const remaining = currentState.getTimeRemaining()

    // Notificar a todos los componentes suscritos
    timerUpdateCallbacks.forEach(cb => cb(remaining))

    // Beep en los últimos 2 segundos (2, 1) y al terminar (0)
    if (currentState.restTimerActive && remaining <= 2 && remaining > 0 && remaining !== lastBeepSecond) {
      lastBeepSecond = remaining
      try {
        const pref = localStorage.getItem('timer_sound_enabled')
        if (pref === null || pref === 'true') {
          playTimerBeep()
        }
      } catch {
        playTimerBeep()
      }
    }

    // Detectar cuando el timer termina naturalmente
    if (wasActive && !currentState.restTimerActive && remaining === 0) {
      try {
        const pref = localStorage.getItem('timer_sound_enabled')
        if (pref === null || pref === 'true') {
          playTimerBeep()
          vibrateDevice()
        }
      } catch {
        playTimerBeep()
        vibrateDevice()
      }
      // Limpiar el intervalo cuando termine
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
  // Detectar cambio en restTimerActive
  if (state.restTimerActive !== prevRestTimerActive) {
    prevRestTimerActive = state.restTimerActive
    if (state.restTimerActive) {
      startGlobalTimerInterval()
    }
  }

  // Detectar cambio en restTimerEndTime (nuevo timer iniciado)
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

  // Suscribirse a actualizaciones del timer global
  useEffect(() => {
    const updateCallback = (remaining) => setTimeRemaining(remaining)
    timerUpdateCallbacks.add(updateCallback)

    // Si el timer está activo, asegurar que el intervalo esté corriendo
    if (restTimerActive && !globalTimerInterval) {
      startGlobalTimerInterval()
    }

    return () => {
      timerUpdateCallbacks.delete(updateCallback)
    }
  }, [restTimerActive])

  // Sincronizar timeRemaining cuando cambia el timer (inicio o nuevo timer)
  useEffect(() => {
    if (restTimerActive) {
      setTimeRemaining(getTimeRemaining())
    } else {
      setTimeRemaining(0)
    }
  }, [restTimerActive, restTimerEndTime, getTimeRemaining])

  // Calcular progreso directamente del store para evitar desincronización
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
      // Wake lock request failed (e.g., low battery, tab not visible)
    }
  }, [isSupported])

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
      setIsActive(false)
    }
  }, [])

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSupported && !wakeLockRef.current) {
        request()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isSupported, request])

  // Request on mount, release on unmount
  useEffect(() => {
    request()
    return () => { release() }
  }, [request, release])

  return { isSupported, isActive }
}
