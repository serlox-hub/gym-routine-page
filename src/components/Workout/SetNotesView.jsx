import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '../ui/index.js'
import { getVideoUrl } from '../../lib/videoStorage.js'
import { RIR_LABELS } from '../../lib/constants.js'
import { colors } from '../../lib/styles.js'

function VideoPlayer({ videoKey }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!videoKey) return

    if (videoKey.startsWith('http')) {
      setUrl(videoKey)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    getVideoUrl(videoKey)
      .then(setUrl)
      .catch(() => setError('Error al cargar video'))
      .finally(() => setLoading(false))
  }, [videoKey])

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-8 rounded-lg"
        style={{ backgroundColor: colors.bgTertiary }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: colors.textSecondary }} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-3 rounded-lg text-center text-sm"
        style={{ backgroundColor: colors.bgTertiary, color: colors.danger }}
      >
        {error}
      </div>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: colors.bgTertiary }}
    >
      <video
        src={url}
        controls
        className="w-full"
      />
    </div>
  )
}

function SetNotesView({ isOpen, onClose, rir, notes, videoUrl }) {
  const rirInfo = rir !== null && rir !== undefined ? RIR_LABELS[rir] : null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="rounded-xl p-4"
      noBorder
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold" style={{ color: colors.textPrimary }}>
          Notas de la serie
        </h3>
        <button
          onClick={onClose}
          className="text-xl"
          style={{ color: colors.textSecondary }}
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {rirInfo && (
          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <span
              className="w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold"
              style={{ backgroundColor: colors.purple, color: colors.bgPrimary }}
            >
              {rirInfo.label}
            </span>
            <div>
              <div className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                RIR {rirInfo.label}
              </div>
              <div className="text-xs" style={{ color: colors.textSecondary }}>
                {rirInfo.description}
              </div>
            </div>
          </div>
        )}

        {notes && (
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <div className="text-xs mb-1" style={{ color: colors.textSecondary }}>
              Nota
            </div>
            <div className="text-sm" style={{ color: colors.textPrimary }}>
              {notes}
            </div>
          </div>
        )}

        {videoUrl && (
          <VideoPlayer videoKey={videoUrl} />
        )}
      </div>

      <button
        onClick={onClose}
        className="w-full mt-4 py-2 rounded-lg text-sm font-medium"
        style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
      >
        Cerrar
      </button>
    </Modal>
  )
}

export default SetNotesView
