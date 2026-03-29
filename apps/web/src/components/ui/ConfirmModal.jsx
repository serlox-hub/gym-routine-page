import { useTranslation } from 'react-i18next'
import Button from './Button.jsx'
import Modal from './Modal.jsx'
import { colors } from '../../lib/styles.js'

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  loadingText,
  onConfirm,
  onCancel,
  variant = 'danger',
  isLoading = false,
}) {
  const { t } = useTranslation()
  const _confirmText = confirmText || t('common:buttons.confirm')
  const _cancelText = cancelText || t('common:buttons.cancel')

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? undefined : onCancel}
      className="p-6"
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
        {title}
      </h3>
      <p className="text-sm mb-6" style={{ color: colors.textSecondary }}>
        {message}
      </p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          {_cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? (loadingText || t('common:buttons.loading')) : _confirmText}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
