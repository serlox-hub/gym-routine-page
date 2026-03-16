import { AppState } from 'react-native'
import {
  useRestoreActiveSession as _useRestoreActiveSession,
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

export function useStartSession() {
  return _useStartSession({
    onStartError: () => useWorkoutStore.getState().hideWorkout(),
  })
}
