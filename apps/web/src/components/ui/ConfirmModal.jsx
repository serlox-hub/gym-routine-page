import Button from './Button.jsx'
import Modal from './Modal.jsx'
import { colors } from '../../lib/styles.js'

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loadingText,
  onConfirm,
  onCancel,
  variant = 'danger',
  isLoading = false,
}) {
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
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? (loadingText || 'Procesando...') : confirmText}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
