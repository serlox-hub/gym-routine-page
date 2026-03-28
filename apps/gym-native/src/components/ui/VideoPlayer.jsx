import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Maximize2 } from 'lucide-react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import LoadingSpinner from './LoadingSpinner'
import { getVideoUrl } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'

export default function VideoPlayer({ videoKey }) {
  const viewRef = useRef(null)
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
        ref={viewRef}
        player={player}
        style={{ width: '100%', height: 200 }}
        contentFit="contain"
        nativeControls
        allowsFullscreen
      />
      <Pressable
        onPress={() => viewRef.current?.enterFullscreen()}
        className="absolute top-2 left-2 p-1.5 rounded-full"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      >
        <Maximize2 size={14} color="#ffffff" />
      </Pressable>
    </View>
  )
}
