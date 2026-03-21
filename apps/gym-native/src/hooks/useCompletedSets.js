import { AppState } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
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
    onConnectivityChange: (cb) => {
      const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected) cb()
      })
      return unsubscribe
    },
  })
}
