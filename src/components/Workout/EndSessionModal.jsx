import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function EndSessionModal({ isOpen, onClose, onConfirm, isPending }) {
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm({
      overallFeeling: null,
      notes: notes.trim() || null,
    })
  }

  const handleClose = () => {
    setNotes('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl p-5 pb-8 animate-slide-up"
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            Finalizar entrenamiento
          </h3>
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <X size={18} style={{ color: colors.textSecondary }} />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="¿Algo que quieras recordar de esta sesión?"
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={{
              backgroundColor: colors.bgTertiary,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Guardando...' : 'Finalizar'}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}

export default EndSessionModal
