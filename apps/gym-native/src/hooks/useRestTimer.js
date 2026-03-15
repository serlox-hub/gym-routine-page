import { useEffect } from 'react'
import { Vibration } from 'react-native'
import * as Haptics from 'expo-haptics'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTimerEngine as sharedTimerEngine, useRestTimer } from '@gym/shared'

// Re-export useRestTimer from shared (reads store state, no platform code)
export { useRestTimer }

// ============================================
// RN PLATFORM CALLBACKS
// ============================================

let timerSoundEnabled = true

function playSound() {
  if (!timerSoundEnabled) return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
}

function vibrateDevice() {
  if (!timerSoundEnabled) return
  Vibration.vibrate([0, 200, 100, 200])
}

function isSoundEnabled() {
  return timerSoundEnabled
}

function onTimerStart() {
  // Refresh sound preference on timer start
  AsyncStorage.getItem('timer_sound_enabled').then(val => {
    timerSoundEnabled = val === null || val === 'true'
  })
  activateKeepAwakeAsync()
}

function onTimerEnd() {
  deactivateKeepAwake()
}

// Wrap shared engine with RN callbacks
export function useTimerEngine() {
  return sharedTimerEngine({ playSound, vibrateDevice, onTimerStart, onTimerEnd, isSoundEnabled })
}

// ============================================
// WAKE LOCK HOOK (RN version - KeepAwake)
// ============================================

export function useWakeLock() {
  useEffect(() => {
    activateKeepAwakeAsync()
    return () => { deactivateKeepAwake() }
  }, [])
  return { isSupported: true, isActive: true }
}
