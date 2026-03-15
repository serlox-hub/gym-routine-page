import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, Alert } from 'react-native'
import { Check, Save, Video, X } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Modal } from '../ui'
import { useCanUploadVideo } from '../../hooks/useAuth'
import { getVideoUrl } from '../../lib/videoStorage'
import { colors, inputStyle } from '../../lib/styles'
import { formatRestTimeDisplay } from '../../lib/timeUtils'
import { RIR_OPTIONS } from '../../lib/constants'

function SetVideoPreview({ uri }) {
  const [resolvedUri, setResolvedUri] = useState(uri)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!uri) return
    if (uri.startsWith('file://') || uri.startsWith('content://')) {
      setResolvedUri(uri)
      return
    }
    setLoading(true)
    getVideoUrl(uri)
      .then(setResolvedUri)
      .catch(() => setResolvedUri(null))
      .finally(() => setLoading(false))
  }, [uri])

  const player = useVideoPlayer(resolvedUri, (p) => { p.loop = false })

  if (loading) {
    return (
      <View style={{ width: '100%', height: 160, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgTertiary }}>
        <Text style={{ color: colors.textSecondary }}>Cargando video...</Text>
      </View>
    )
  }

  if (!resolvedUri) return null

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 160 }}
      contentFit="contain"
      nativeControls
    />
  )
}
import { usePreference } from '../../hooks/usePreferences'
import { getEffortLabel } from '../../lib/measurementTypes'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

export default function SetDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  mode = 'complete',
  initialRir,
  initialNote,
  initialVideoUrl,
  descansoSeg = 0,
  measurementType,
}) {
  const canUploadVideo = useCanUploadVideo()
  const { value: showRirInput } = usePreference('show_rir_input')
  const { value: showSetNotes } = usePreference('show_set_notes')
  const { value: showVideoUpload } = usePreference('show_video_upload')
  const showVideo = canUploadVideo && showVideoUpload

  const [rir, setRir] = useState(null)
  const [note, setNote] = useState('')
  const [videoUri, setVideoUri] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRir(initialRir ?? null)
      setNote(initialNote ?? '')
      setVideoUri(initialVideoUrl ?? null)
      setVideoFile(null)
      setHasChanges(false)
    }
  }, [isOpen, initialRir, initialNote, initialVideoUrl])

  const handleRirChange = (value) => {
    setRir(rir === value ? null : value)
    setHasChanges(true)
  }

  const handleVideoSelect = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    })

    if (result.canceled) return

    const asset = result.assets[0]
    if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
      const sizeMB = Math.round(asset.fileSize / 1024 / 1024)
      Alert.alert('Video demasiado grande', `El video pesa ${sizeMB}MB. Máximo permitido: 100MB`)
      return
    }

    setVideoFile(asset)
    setVideoUri(asset.uri)
    setHasChanges(true)
  }

  const handleRemoveVideo = () => {
    setVideoFile(null)
    setVideoUri(null)
    setHasChanges(true)
  }

  const handleSubmit = () => {
    const existingVideoUrl = (!videoFile && videoUri) ? initialVideoUrl : null
    onSubmit(rir, note.trim() || null, existingVideoUrl, videoFile)
    resetState()
  }

  const resetState = () => {
    setRir(null)
    setNote('')
    setVideoUri(null)
    setVideoFile(null)
    setHasChanges(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const isEditMode = mode === 'edit'
  const title = isEditMode ? 'Editar serie' : 'Completar serie'
  const buttonDisabled = isEditMode && !hasChanges
  const buttonColor = buttonDisabled ? colors.bgTertiary : (isEditMode ? colors.purple : colors.success)
  const buttonTextColor = buttonDisabled ? colors.textSecondary : '#ffffff'

  return (
    <Modal isOpen={isOpen} onClose={handleClose} position="bottom">
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
            {title}
          </Text>
          <Pressable onPress={handleClose}>
            <Text className="text-xl" style={{ color: colors.textSecondary }}>✕</Text>
          </Pressable>
        </View>
      </View>

      <View className="p-4 gap-5">
        {showRirInput && (
          <View>
            <Text className="text-sm mb-3" style={{ color: colors.textSecondary }}>
              {getEffortLabel(measurementType)} (opcional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {RIR_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => handleRirChange(option.value)}
                  className="flex-1 p-2 rounded-lg items-center"
                  style={{
                    backgroundColor: rir === option.value ? colors.purple : colors.bgTertiary,
                    minWidth: '18%',
                  }}
                >
                  <Text
                    className="text-lg font-bold"
                    style={{ color: rir === option.value ? colors.bgPrimary : colors.textPrimary }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    className="text-xs"
                    numberOfLines={1}
                    style={{
                      color: rir === option.value ? colors.bgPrimary : colors.textSecondary,
                      opacity: 0.75,
                    }}
                  >
                    {option.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {showSetNotes && (
          <View>
            <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
              Nota (opcional)
            </Text>
            <TextInput
              value={note}
              onChangeText={(v) => { setNote(v); setHasChanges(true) }}
              placeholder="Ej: Buen pump, molestia en codo..."
              placeholderTextColor="#6e7681"
              multiline
              style={[inputStyle, { textAlignVertical: 'top', minHeight: 56 }]}
            />
          </View>
        )}

        {showVideo && (
          <View>
            <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
              Video (opcional)
            </Text>
            {videoUri ? (
              <View className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
                <SetVideoPreview uri={videoUri} />
                <Pressable
                  onPress={handleRemoveVideo}
                  className="absolute top-2 right-2 p-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                >
                  <X size={16} color="#ffffff" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleVideoSelect}
                className="py-3 rounded-lg flex-row items-center justify-center gap-2"
                style={{ backgroundColor: colors.bgTertiary }}
              >
                <Video size={18} color={colors.textSecondary} />
                <Text className="text-sm" style={{ color: colors.textSecondary }}>
                  Añadir video
                </Text>
              </Pressable>
            )}
            <Text className="text-xs mt-1 text-center" style={{ color: colors.textSecondary }}>
              Máx. 100MB
            </Text>
          </View>
        )}

        {!isEditMode && descansoSeg > 0 && (
          <View className="py-2 rounded-lg items-center" style={{ backgroundColor: colors.bgTertiary }}>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              Descanso: <Text style={{ color: colors.accent }}>{formatRestTimeDisplay(descansoSeg)}</Text>
            </Text>
          </View>
        )}
      </View>

      <View className="p-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Pressable
          onPress={handleSubmit}
          disabled={buttonDisabled}
          className="py-3 rounded-lg flex-row items-center justify-center gap-2"
          style={{
            backgroundColor: buttonColor,
            opacity: buttonDisabled ? 0.5 : 1,
          }}
        >
          {isEditMode ? (
            <Save size={20} color={buttonTextColor} />
          ) : (
            <Check size={20} color={buttonTextColor} />
          )}
          <Text className="font-bold" style={{ color: buttonTextColor }}>
            {isEditMode ? 'Guardar cambios' : 'Completar'}
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}
