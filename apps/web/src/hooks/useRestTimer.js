import { useState, useRef, useCallback, useEffect } from 'react'
import { useTimerEngine as sharedTimerEngine, useRestTimer } from '@gym/shared'

// Re-export useRestTimer from shared (reads store state, no platform code)
export { useRestTimer }

// ============================================
// WEB PLATFORM CALLBACKS
// ============================================

let audioContext = null

function playSound() {
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

// Wrap shared engine with web callbacks
export function useTimerEngine() {
  return sharedTimerEngine({ playSound, vibrateDevice, isSoundEnabled })
}

// ============================================
// WAKE LOCK HOOK (web-only, stays here)
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
