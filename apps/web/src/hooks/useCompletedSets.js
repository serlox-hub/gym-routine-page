import {
  useSyncPendingSets as _useSyncPendingSets,
  useCompleteSet,
  useUpdateSetVideo,
  useUpdateSetDetails,
  useUncompleteSet,
} from '@gym/shared'

export { useCompleteSet, useUpdateSetVideo, useUpdateSetDetails, useUncompleteSet }

export function useSyncPendingSets() {
  return _useSyncPendingSets({
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
