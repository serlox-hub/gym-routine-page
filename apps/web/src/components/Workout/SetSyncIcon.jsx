import { CloudOff, AlertCircle } from 'lucide-react'
import { SET_SYNC_STATUS } from '@gym/shared'
import { colors } from '../../lib/styles.js'

/**
 * Icon of a set's sync state (issue #210): a grey cloud while it is not saved yet, a red alert once
 * the server rejected it. Nothing while it saves normally. Decorative: whoever shows it names it.
 */
function SetSyncIcon({ status, size }) {
  if (status === SET_SYNC_STATUS.SLOW) return <CloudOff size={size} color={colors.textSecondary} className="shrink-0" />
  if (status === SET_SYNC_STATUS.REJECTED) return <AlertCircle size={size} color={colors.danger} className="shrink-0" />
  return null
}

export default SetSyncIcon
