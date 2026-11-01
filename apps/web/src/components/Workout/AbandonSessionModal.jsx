import { useTranslation } from 'react-i18next'
import { ConfirmModal } from '../ui/index.js'

// `abandon` is `useAbandonSessionFlow()`. Stays open while the delete is pending and shows its
// failure inline: there is no toast for it.
function AbandonSessionModal({ abandon }) {
  const { t } = useTranslation()

  return (
    <ConfirmModal
      isOpen={abandon.isOpen}
      title={t('workout:session.abandonConfirm')}
      message={t('workout:session.abandonMessage')}
      confirmText={t('workout:session.abandon')}
      cancelText={t('common:buttons.continue')}
      onConfirm={abandon.confirm}
      onCancel={abandon.close}
      isLoading={abandon.isPending}
      saveStatus
      error={abandon.isFailed ? t('workout:session.abandonFailed') : null}
    />
  )
}

export default AbandonSessionModal
