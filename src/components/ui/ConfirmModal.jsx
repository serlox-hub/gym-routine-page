import Button from './Button.jsx'

function ConfirmModal({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, variant = 'danger' }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6"
        style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#e6edf3' }}>
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: '#8b949e' }}>
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
