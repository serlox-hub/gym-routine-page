import { useState, useRef, useCallback, useEffect } from 'react'
import { TIMER_BEEP_WINDOW_SECONDS } from './useRestTimer.js'

/**
 * Cuenta atrás para la ejecución de una serie por tiempo (p. ej. una plancha).
 * Avisa con beep+vibración igual que el rest timer: un beep en cada uno de
 * los últimos TIMER_BEEP_WINDOW_SECONDS segundos y beep+vibración al llegar
 * a 0, respetando la preferencia de sonido (`isSoundEnabled`). No usa el
 * store del workout (ese engine es para el ÚNICO descanso activo global);
 * esta es una cuenta atrás local por serie, así que corre en un intervalo
 * propio de 1s.
 *
 * `remaining` se recalcula cada tick desde un end-time (`endAtRef`), no
 * decrementando un contador — igual que el rest timer (`getTimeRemaining()`
 * sobre `restTimerEndTime`). Un `setInterval` que se limita a restar 1 por
 * tick deriva del NÚMERO DE TICKS, no del tiempo real: si el navegador/RN
 * throttlea el intervalo (pestaña en segundo plano, app suspendida), el
 * conteo se queda congelado y no se autocorrige al volver. Anclado a
 * `Date.now()`, el primer tick tras reanudar salta directo al valor correcto.
 */
export function useExecutionTimer(seconds, { playSound, vibrateDevice, isSoundEnabled, onStart } = {}) {
  const [isRunning, setIsRunning] = useState(false)
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef(null)
  const lastBeepRef = useRef(-1)
  const endAtRef = useRef(null)
  const isRunningRef = useRef(isRunning)
  isRunningRef.current = isRunning

  // Solo re-sincroniza si CAMBIA el objetivo externo (seconds) estando parado.
  // Depender también de isRunning (como hacía la versión original) reabre el
  // efecto cuando isRunning pasa a false por HABER TERMINADO la cuenta atrás,
  // y pisa el remaining=0 recién puesto con el seconds de siempre — el estado
  // "terminado" nunca llegaba a pintarse. stop() ya pone remaining=seconds
  // por su cuenta, así que este efecto no necesita mirar isRunning.
  useEffect(() => {
    if (!isRunningRef.current) setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        const secondsLeft = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
        setRemaining(secondsLeft)
        if (secondsLeft === 0) setIsRunning(false)
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, remaining])

  useEffect(() => {
    if (isRunning && remaining <= TIMER_BEEP_WINDOW_SECONDS && remaining > 0 && remaining !== lastBeepRef.current) {
      lastBeepRef.current = remaining
      if (isSoundEnabled?.() !== false) playSound?.()
    }
    if (remaining === 0 && !isRunning && lastBeepRef.current !== 0) {
      lastBeepRef.current = 0
      if (isSoundEnabled?.() !== false) {
        playSound?.()
        vibrateDevice?.()
      }
    }
  }, [remaining, isRunning, playSound, vibrateDevice, isSoundEnabled])

  const start = useCallback(() => {
    if (seconds > 0) {
      onStart?.()
      lastBeepRef.current = -1
      endAtRef.current = Date.now() + seconds * 1000
      setRemaining(seconds)
      setIsRunning(true)
    }
  }, [seconds, onStart])

  const stop = useCallback(() => {
    setIsRunning(false)
    setRemaining(seconds)
    lastBeepRef.current = -1
  }, [seconds])

  return { isRunning, remaining, start, stop }
}
