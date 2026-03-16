import { AppState } from 'react-native'
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
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') cb()
      })
      return () => sub.remove()
    },
  })
}
