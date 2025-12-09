import Button from './Button.jsx'
import { colors, modalOverlayStyle, modalContentStyle } from '../../lib/styles.js'

function ConfirmModal({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', loadingText, onConfirm, onCancel, variant = 'danger', isLoading = false }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={modalOverlayStyle}
      onClick={isLoading ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6"
        style={{ ...modalContentStyle, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
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
      </div>
    </div>
  )
}

export default ConfirmModal
