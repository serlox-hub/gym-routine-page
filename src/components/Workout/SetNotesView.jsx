const RIR_LABELS = {
  [-1]: { label: 'F', description: 'Fallo' },
  0: { label: '0', description: 'Última rep' },
  1: { label: '1', description: 'Muy cerca' },
  2: { label: '2', description: 'Controlado' },
  3: { label: '3+', description: 'Cómodo' },
}

function SetNotesView({ isOpen, onClose, rir, notas }) {
  if (!isOpen) return null

  const rirInfo = rir !== null && rir !== undefined ? RIR_LABELS[rir] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-4"
        style={{ backgroundColor: '#161b22' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold" style={{ color: '#e6edf3' }}>
            Notas de la serie
          </h3>
          <button
            onClick={onClose}
            className="text-xl"
            style={{ color: '#8b949e' }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {rirInfo && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: '#21262d' }}
            >
              <span
                className="w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold"
                style={{ backgroundColor: '#a371f7', color: '#0d1117' }}
              >
                {rirInfo.label}
              </span>
              <div>
                <div className="text-sm font-medium" style={{ color: '#e6edf3' }}>
                  RIR {rirInfo.label}
                </div>
                <div className="text-xs" style={{ color: '#8b949e' }}>
                  {rirInfo.description}
                </div>
              </div>
            </div>
          )}

          {notas && (
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#21262d' }}
            >
              <div className="text-xs mb-1" style={{ color: '#8b949e' }}>
                Nota
              </div>
              <div className="text-sm" style={{ color: '#e6edf3' }}>
                {notas}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#21262d', color: '#8b949e' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default SetNotesView
