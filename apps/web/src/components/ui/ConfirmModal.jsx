import { useTranslation } from 'react-i18next'
import Button from './Button.jsx'
import Modal from './Modal.jsx'
import SaveStatus from './SaveStatus.jsx'
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
  // Tocar el fondo y atrás de Android. Por defecto = cancelar; se separa cuando cancelar es una
  // opción más ("Solo hoy") y cerrar debe abortar sin elegir ninguna.
  onDismiss,
  variant = 'danger',
  isLoading = false,
  // Which button shows the pending look while `isLoading`: 'cancel' when cancel is a choice that
  // also saves ("Solo hoy"). Both stay disabled either way.
  loadingButton = 'confirm',
  // A status line above the buttons: slow-connection notice while loading, `error` once it fails.
  saveStatus = false,
  error = null,
  // Lets the user walk away from a slow action instead of being trapped until it answers.
  dismissibleWhileLoading = false,
}) {
  const { t } = useTranslation()
  const _confirmText = confirmText || t('common:buttons.confirm')
  const _cancelText = cancelText || t('common:buttons.cancel')
  const _loadingText = loadingText || t('common:buttons.loading')
  const isCancelLoading = isLoading && loadingButton === 'cancel'
  const isConfirmLoading = isLoading && loadingButton === 'confirm'

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading && !dismissibleWhileLoading ? undefined : (onDismiss ?? onCancel)}
      className="p-6"
    >
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
        {title}
      </h3>
      <p className="text-sm mb-6" style={{ color: colors.textSecondary }}>
        {message}
      </p>
      {saveStatus && <SaveStatus isPending={isLoading} error={error} className="mb-4" />}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          {isCancelLoading ? _loadingText : _cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
          {isConfirmLoading ? _loadingText : _confirmText}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
