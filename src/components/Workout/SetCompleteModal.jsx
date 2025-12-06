import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { colors, inputStyle, modalOverlayStyle, modalContentStyle } from '../../lib/styles.js'
import { formatRestTimeDisplay } from '../../lib/timeUtils.js'

const RIR_OPTIONS = [
  { value: -1, label: 'F', description: 'Fallo' },
  { value: 0, label: '0', description: 'Última rep' },
  { value: 1, label: '1', description: 'Muy cerca' },
  { value: 2, label: '2', description: 'Controlado' },
  { value: 3, label: '3+', description: 'Cómodo' },
]

function SetCompleteModal({ isOpen, onClose, onComplete, descansoSeg, initialRir, initialNote }) {
  const [rir, setRir] = useState(null)
  const [note, setNote] = useState('')

  // Cargar valores iniciales cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setRir(initialRir ?? null)
      setNote(initialNote ?? '')
    }
  }, [isOpen, initialRir, initialNote])

  const handleComplete = () => {
    onComplete(rir, note.trim() || null)
    setRir(null)
    setNote('')
  }

  const handleClose = () => {
    setRir(null)
    setNote('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={modalOverlayStyle}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl"
        style={modalContentStyle}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 flex justify-between items-center"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <h3 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
            Completar serie
          </h3>
          <button
            onClick={handleClose}
            className="text-xl"
            style={{ color: colors.textSecondary }}
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* RIR */}
          <div>
            <label className="block text-sm mb-3" style={{ color: colors.textSecondary }}>
              RIR (opcional)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {RIR_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setRir(rir === option.value ? null : option.value)}
                  className="p-2 rounded-lg text-center transition-colors"
                  style={{
                    backgroundColor: rir === option.value ? colors.purple : colors.bgTertiary,
                    color: rir === option.value ? colors.bgPrimary : colors.textPrimary,
                  }}
                >
                  <div className="text-lg font-bold">{option.label}</div>
                  <div className="text-xs opacity-75">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Buen pump, molestia en codo..."
              className="w-full rounded-lg p-3 text-sm resize-none h-16"
              style={inputStyle}
            />
          </div>

          {/* Info descanso */}
          {descansoSeg > 0 && (
            <div
              className="text-center py-2 rounded-lg"
              style={{ backgroundColor: colors.bgTertiary }}
            >
              <span className="text-sm" style={{ color: colors.textSecondary }}>
                Descanso: <span style={{ color: colors.accent }}>{formatRestTimeDisplay(descansoSeg)}</span>
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: `1px solid ${colors.border}` }}>
          <button
            onClick={handleComplete}
            className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: colors.success, color: '#ffffff' }}
          >
            <Check size={20} />
            Completar
          </button>
        </div>
      </div>
    </div>
  )
}

export default SetCompleteModal
