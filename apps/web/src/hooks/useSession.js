import {
  useRestoreActiveSession as _useRestoreActiveSession,
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
