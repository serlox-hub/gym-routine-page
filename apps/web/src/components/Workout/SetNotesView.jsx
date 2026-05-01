import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Modal } from '../ui/index.js'
import { getVideoUrl } from '../../lib/videoStorage.js'
import { colors } from '../../lib/styles.js'

function VideoPlayer({ videoKey }) {
  const { t } = useTranslation()
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
      .catch(() => setError(t('workout:set.videoLoadError')))
      .finally(() => setLoading(false))
  }, [videoKey, t])

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

function SetNotesView({ isOpen, onClose, notes, videoUrl }) {
  const { t } = useTranslation()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="rounded-xl p-4"
      noBorder
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold" style={{ color: colors.textPrimary }}>
          {t('workout:set.notes')}
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
        {notes && (
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <div className="text-xs mb-1" style={{ color: colors.textSecondary }}>
              {t('common:labels.notes')}
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
        {t('common:buttons.close')}
      </button>
    </Modal>
  )
}

export default SetNotesView
