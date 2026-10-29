import { CloudOff, AlertCircle } from 'lucide-react-native'
import { SET_SYNC_STATUS } from '@gym/shared'
import { colors } from '../../lib/styles'

/**
 * Icon of a set's sync state (issue #210): a grey cloud while it is not saved yet, a red alert once
 * the server rejected it. Nothing while it saves normally. Decorative: whoever shows it names it.
 */
export default function SetSyncIcon({ status, size }) {
  if (status === SET_SYNC_STATUS.SLOW) return <CloudOff size={size} color={colors.textSecondary} />
  if (status === SET_SYNC_STATUS.REJECTED) return <AlertCircle size={size} color={colors.danger} />
  return null
}
