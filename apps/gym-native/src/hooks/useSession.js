import { AppState } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import {
  useRestoreActiveSession as _useRestoreActiveSession,
  useSyncPendingGymChange as _useSyncPendingGymChange,
  useStartSession as _useStartSession,
  useEndSession,
  useAbandonSession,
} from '@gym/shared'
import useWorkoutStore from '../stores/workoutStore.js'

export { useEndSession, useAbandonSession }

export function useRestoreActiveSession() {
  return _useRestoreActiveSession({
    onVisibilityChange: (cb) => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') cb()
      })
      return () => sub.remove()
    },
  })
}

export function useSyncPendingGymChange() {
  return _useSyncPendingGymChange({
    onVisibilityChange: (cb) => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') cb()
      })
      return () => sub.remove()
    },
    onConnectivityChange: (cb) => {
      const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected) cb()
      })
      return unsubscribe
    },
  })
}

export function useStartSession() {
  return _useStartSession({
    onStartError: () => useWorkoutStore.getState().hideWorkout(),
  })
}
