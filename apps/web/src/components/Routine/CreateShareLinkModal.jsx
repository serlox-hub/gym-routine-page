import { useTranslation } from 'react-i18next'
import { Button, ErrorMessage, Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

/**
 * "Create share link" in one modal with two steps: confirm (anyone with the link sees the routine),
 * then the link, one tap from sharing it. Sharing cannot happen right after creating: creating awaits
 * the server, and Safari iOS only allows the share sheet and clipboard writes inside a tap, so
 * `onShare` must stay synchronous. One modal and not two in a row: on iOS a native modal opened while
 * another closes may never show (same component shape in apps/gym-native). `url` null = first step.
 * `shareErrorKey` is the i18n key of a failed share, shown inline: inside a modal the answer goes in
 * the modal, not in a toast.
 */
function CreateShareLinkModal({ isOpen, url, isCreating, shareErrorKey, onCreate, onShare, onClose }) {
  const { t } = useTranslation()

  if (!url) {
    return (
      <Modal isOpen={isOpen} onClose={isCreating ? undefined : onClose} className="p-6">
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
          {t('routine:shareLink.createConfirmTitle')}
        </h3>
        <p className="text-sm mb-6" style={{ color: colors.textSecondary }}>
          {t('routine:shareLink.createConfirmMessage')}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isCreating}>{t('common:buttons.cancel')}</Button>
          <Button variant="primary" onClick={onCreate} disabled={isCreating}>
            {isCreating ? t('common:buttons.loading') : t('routine:shareLink.createConfirm')}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-6">
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
        {t('routine:shareLink.readyTitle')}
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
        {t('routine:shareLink.readyMessage')}
      </p>
      <p
        className="text-sm mb-4 px-3 py-2 rounded-lg break-all select-all"
        style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary }}
      >
        {url}
      </p>
      {shareErrorKey && <ErrorMessage message={t(shareErrorKey)} className="mb-4" />}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>{t('common:buttons.close')}</Button>
        <Button variant="primary" onClick={onShare}>{t('routine:shareLink.shareNow')}</Button>
      </div>
    </Modal>
  )
}

export default CreateShareLinkModal
