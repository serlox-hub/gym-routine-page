import { useState } from 'react'
import { Check } from 'lucide-react'

const RIR_OPTIONS = [
  { value: -1, label: 'F', description: 'Fallo' },
  { value: 0, label: '0', description: 'Última rep' },
  { value: 1, label: '1', description: 'Muy cerca' },
  { value: 2, label: '2', description: 'Controlado' },
  { value: 3, label: '3+', description: 'Cómodo' },
]

function SetCompleteModal({ isOpen, onClose, onComplete, descansoSeg }) {
  const [rir, setRir] = useState(null)
  const [note, setNote] = useState('')

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return secs === 0 ? `${mins}min` : `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl"
        style={{ backgroundColor: '#161b22' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 flex justify-between items-center"
          style={{ borderBottom: '1px solid #30363d' }}
        >
          <h3 className="text-lg font-bold" style={{ color: '#e6edf3' }}>
            Completar serie
          </h3>
          <button
            onClick={handleClose}
            className="text-xl"
            style={{ color: '#8b949e' }}
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* RIR */}
          <div>
            <label className="block text-sm mb-3" style={{ color: '#8b949e' }}>
              RIR (opcional)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {RIR_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setRir(rir === option.value ? null : option.value)}
                  className="p-2 rounded-lg text-center transition-colors"
                  style={{
                    backgroundColor: rir === option.value ? '#a371f7' : '#21262d',
                    color: rir === option.value ? '#0d1117' : '#e6edf3',
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
            <label className="block text-sm mb-2" style={{ color: '#8b949e' }}>
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Buen pump, molestia en codo..."
              className="w-full rounded-lg p-3 text-sm resize-none h-16"
              style={{
                backgroundColor: '#21262d',
                border: '1px solid #30363d',
                color: '#e6edf3',
              }}
            />
          </div>

          {/* Info descanso */}
          {descansoSeg > 0 && (
            <div
              className="text-center py-2 rounded-lg"
              style={{ backgroundColor: '#21262d' }}
            >
              <span className="text-sm" style={{ color: '#8b949e' }}>
                Descanso: <span style={{ color: '#58a6ff' }}>{formatTime(descansoSeg)}</span>
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: '1px solid #30363d' }}>
          <button
            onClick={handleComplete}
            className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#238636', color: '#ffffff' }}
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
