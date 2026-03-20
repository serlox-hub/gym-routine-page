import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { getVideoUrl } from '../../lib/videoStorage.js'

function VideoPlayer({ videoKey }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!videoKey) return

    if (videoKey.startsWith('http') || videoKey.startsWith('blob:')) {
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
    <video
      src={url}
      controls
      className="w-full max-h-40 object-contain"
    />
  )
}

export default VideoPlayer
