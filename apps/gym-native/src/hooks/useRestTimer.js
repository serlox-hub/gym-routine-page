import { useEffect } from 'react'
import { Vibration } from 'react-native'
import * as Haptics from 'expo-haptics'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTimerEngine as sharedTimerEngine, useRestTimer } from '@gym/shared'
import { scheduleRestEndNotification, cancelRestEndNotification } from '../lib/restTimerNotifications'

// Re-export useRestTimer from shared (reads store state, no platform code)
export { useRestTimer }

// ============================================
// RN PLATFORM CALLBACKS
// ============================================

let timerSoundEnabled = true

export function playSound() {
  if (!timerSoundEnabled) return
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
}

export function vibrateDevice() {
  if (!timerSoundEnabled) return
  Vibration.vibrate([0, 200, 100, 200])
}

export function isSoundEnabled() {
  return timerSoundEnabled
}

// Refresca `timerSoundEnabled` desde AsyncStorage. Se llama al arrancar
// cualquier timer (descanso o ejecución de serie) porque la lectura es
// async y no hay forma de comprobar la preferencia de forma síncrona.
export function refreshSoundPreference() {
  AsyncStorage.getItem('timer_sound_enabled').then(val => {
    timerSoundEnabled = val === null || val === 'true'
  })
}

function onTimerStart(endTime) {
  refreshSoundPreference()
  activateKeepAwakeAsync()
  scheduleRestEndNotification(endTime)
}

function onTimerEnd() {
  deactivateKeepAwake()
  cancelRestEndNotification()
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
