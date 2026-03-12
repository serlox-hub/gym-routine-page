import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import LoadingSpinner from './LoadingSpinner'
import { getVideoUrl } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'

export default function VideoPlayer({ videoKey }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!videoKey) return

    if (videoKey.startsWith('http') || videoKey.startsWith('file://')) {
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

  const player = useVideoPlayer(url, (p) => {
    p.loop = false
  })

  if (loading) {
    return (
      <View
        className="items-center justify-center py-8 rounded-lg"
        style={{ backgroundColor: colors.bgTertiary }}
      >
        <LoadingSpinner fullScreen={false} />
      </View>
    )
  }

  if (error) {
    return (
      <View
        className="p-3 rounded-lg items-center"
        style={{ backgroundColor: colors.bgTertiary }}
      >
        <Text className="text-sm" style={{ color: colors.danger }}>{error}</Text>
      </View>
    )
  }

  return (
    <View className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
      <VideoView
        player={player}
        style={{ width: '100%', height: 200 }}
        contentFit="contain"
        nativeControls
      />
    </View>
  )
}
