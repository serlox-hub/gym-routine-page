import {
  useRestoreActiveSession as _useRestoreActiveSession,
  useSyncPendingGymChange as _useSyncPendingGymChange,
  useStartSession,
  useEndSession,
  useAbandonSession,
} from '@gym/shared'

export { useStartSession, useEndSession, useAbandonSession }

export function useRestoreActiveSession() {
  return _useRestoreActiveSession({
    onVisibilityChange: (cb) => {
      const handler = () => { if (document.visibilityState === 'visible') cb() }
      document.addEventListener('visibilitychange', handler)
      return () => document.removeEventListener('visibilitychange', handler)
    },
  })
}

export function useSyncPendingGymChange() {
  return _useSyncPendingGymChange({
    onVisibilityChange: (cb) => {
      const handler = () => { if (document.visibilityState === 'visible') cb() }
      document.addEventListener('visibilitychange', handler)
      return () => document.removeEventListener('visibilitychange', handler)
    },
    onConnectivityChange: (cb) => {
      window.addEventListener('online', cb)
      return () => window.removeEventListener('online', cb)
    },
  })
}
