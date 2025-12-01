import { useEffect, useRef, useCallback } from 'react'
import useWorkoutStore from '../stores/workoutStore.js'

export function useRestTimer() {
  const restTimerActive = useWorkoutStore(state => state.restTimerActive)
  const restTimeRemaining = useWorkoutStore(state => state.restTimeRemaining)
  const restTimeInitial = useWorkoutStore(state => state.restTimeInitial)
  const tickTimer = useWorkoutStore(state => state.tickTimer)
  const skipRest = useWorkoutStore(state => state.skipRest)
  const adjustRestTime = useWorkoutStore(state => state.adjustRestTime)

  const intervalRef = useRef(null)
  const audioContextRef = useRef(null)

  // Timer interval - solo depende de restTimerActive para evitar múltiples intervalos
  useEffect(() => {
    if (restTimerActive) {
      // Limpiar cualquier intervalo previo antes de crear uno nuevo
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      intervalRef.current = setInterval(() => {
        tickTimer()
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [restTimerActive, tickTimer])

  // Alerta sonora cuando quedan 3 segundos
  useEffect(() => {
    if (restTimerActive && restTimeRemaining <= 3 && restTimeRemaining > 0) {
      playBeep()
    }
  }, [restTimeRemaining, restTimerActive])

  // Alerta cuando termina
  useEffect(() => {
    if (restTimerActive && restTimeRemaining === 0) {
      playBeep()
      // Vibración si está disponible
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }, [restTimerActive, restTimeRemaining])

  const playBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = 880 // A5 note
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.15)
    } catch {
      // Ignorar errores de audio
    }
  }, [])

  const progress = restTimeInitial > 0
    ? ((restTimeInitial - restTimeRemaining) / restTimeInitial) * 100
    : 0

  return {
    isActive: restTimerActive,
    timeRemaining: restTimeRemaining,
    timeInitial: restTimeInitial,
    progress,
    skip: skipRest,
    addTime: (delta) => adjustRestTime(delta),
  }
}
