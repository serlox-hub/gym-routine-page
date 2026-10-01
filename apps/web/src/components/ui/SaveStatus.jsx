import { useTranslation } from 'react-i18next'
import { useSlowPending } from '@gym/shared'
import ErrorMessage from './ErrorMessage.jsx'
import { colors } from '../../lib/styles.js'

/**
 * Status line of an action the user waits for inside a modal: a slow-connection notice once it has
 * been pending for a while, or its failure. Inline and not a toast, so it shows where the user is
 * looking (issue #121). `className` only applies while there is something to say, so its margin
 * takes no room otherwise.
 */
function SaveStatus({ isPending, error, className = '' }) {
  const { t } = useTranslation()
  const isSlow = useSlowPending(isPending)
  const isFailed = !isPending && !!error

  // Always mounted, only its content changes: a live region born together with its text is not
  // announced (see Toast). The inline failure replaces the toast that used to announce it.
  return (
    <div role="status" aria-live="polite" className={isSlow || isFailed ? className : undefined}>
      {isSlow && (
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          {t('common:network.slowRetrying')}
        </p>
      )}
      {isFailed && <ErrorMessage message={error} />}
    </div>
  )
}

export default SaveStatus
