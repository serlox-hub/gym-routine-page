import { useTranslation } from 'react-i18next'
import { Button, ErrorMessage, PageHeader } from '../ui/index.js'
import AbandonSessionModal from './AbandonSessionModal.jsx'

// The session screen when its exercises failed to load and nothing loaded is left to show (issue
// #228). Retry leads: the session is usually fine and the network is not. Abandon stays, behind its
// confirmation, for a session that really is broken. No retrying state: a retry with no data puts
// the query back to pending, and the layout swaps this screen for its spinner.
function SessionLoadError({ title, fallbackRoute, onRetry, abandon }) {
  const { t } = useTranslation()

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <PageHeader title={title} fallbackTo={fallbackRoute} />
      <ErrorMessage message={t('workout:session.loadFailed')} className="mb-4" />
      <div className="flex flex-col gap-3">
        <Button onClick={onRetry}>{t('common:buttons.retry')}</Button>
        <Button variant="secondary" onClick={abandon.open}>{t('workout:session.abandon')}</Button>
      </div>
      <AbandonSessionModal abandon={abandon} />
    </div>
  )
}

export default SessionLoadError
