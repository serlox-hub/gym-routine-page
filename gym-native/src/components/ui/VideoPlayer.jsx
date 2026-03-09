import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Video, ResizeMode } from 'expo-av'
import { Play, Pause } from 'lucide-react-native'
import { LoadingSpinner } from './index'
import { getVideoUrl } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'

export default function VideoPlayer({ videoKey }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef(null)

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

  const togglePlayback = async () => {
    if (!videoRef.current) return
    const status = await videoRef.current.getStatusAsync()
    if (status.isPlaying) {
      await videoRef.current.pauseAsync()
    } else {
      await videoRef.current.playAsync()
    }
  }

  if (loading) {
    return (
      <View
        className="items-center justify-center py-8 rounded-lg"
        style={{ backgroundColor: colors.bgTertiary }}
      >
        <LoadingSpinner />
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
      <Video
        ref={videoRef}
        source={{ uri: url }}
        style={{ width: '100%', height: 200 }}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        onPlaybackStatusUpdate={(status) => {
          setIsPlaying(status.isPlaying)
        }}
      />
    </View>
  )
}
