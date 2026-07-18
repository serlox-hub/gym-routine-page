import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Save, Video, X, ChevronRight, Maximize2 } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Modal } from '../ui'
import { useCanUploadVideo } from '../../hooks/useAuth'
import { usePreference } from '../../hooks/usePreferences'
import { getVideoUrl } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

function SetVideoPreview({ uri }) {
  const { t } = useTranslation()
  const viewRef = useRef(null)
  const [resolvedUri, setResolvedUri] = useState(uri)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!uri) return
    if (uri.startsWith('file://') || uri.startsWith('content://')) {
      setResolvedUri(uri); return
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
        <Text style={{ color: colors.textSecondary }}>{t('common:buttons.loading')}</Text>
      </View>
    )
  }
  if (!resolvedUri) return null

  return (
    <View>
      <VideoView ref={viewRef} player={player} style={{ width: '100%', height: 160 }} contentFit="contain" nativeControls allowsFullscreen />
      <Pressable onPress={() => viewRef.current?.enterFullscreen()}
        style={{ position: 'absolute', top: 8, left: 8, padding: 6, borderRadius: 999, backgroundColor: colors.overlay }}>
        <Maximize2 size={14} color={colors.white} />
      </Pressable>
    </View>
  )
}

/**
 * Hoja de detalles opcionales de una serie ya completada: tipo de serie (dropset),
 * notas y vídeo. El peso/reps se editan inline en la fila y el RIR con el chip inline
 * (ver EffortPicker) — por eso esta hoja ya NO los incluye. Se abre bajo demanda desde
 * el botón «⋯» de la fila, nunca al completar (issue #8).
 */
export default function SetDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  setNumber,
  allowVideo = true,
  initialNote,
  initialVideoUrl,
  initialSetType = 'normal',
}) {
  const { t } = useTranslation()
  const canUploadVideo = useCanUploadVideo()
  const { value: showSetNotes } = usePreference('show_set_notes')
  const { value: showVideoUpload } = usePreference('show_video_upload')
  // El vídeo se adjunta a una serie ya completada; antes de completar solo se avisa.
  const videoEnabled = canUploadVideo && showVideoUpload
  const showVideo = videoEnabled && allowVideo

  const [note, setNote] = useState('')
  const [videoUri, setVideoUri] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [setType, setSetType] = useState('normal')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote ?? '')
      setVideoUri(initialVideoUrl ?? null)
      setVideoFile(null)
      setSetType(initialSetType ?? 'normal')
      setHasChanges(false)
    }
  }, [isOpen, initialNote, initialVideoUrl, initialSetType])

  const handleVideoSelect = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 })
    if (result.canceled) return
    const asset = result.assets[0]
    if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
      const sizeMB = Math.round(asset.fileSize / 1024 / 1024)
      Alert.alert(t('workout:set.videoTooLarge'), t('workout:set.videoTooLargeDetail', { size: sizeMB }))
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
    onSubmit({
      notes: note.trim() || null,
      videoUrl: existingVideoUrl,
      videoFile,
      setType,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      {/* Header (fixed) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>
          {t('workout:set.detailsTitle', { number: setNumber || '' })}
        </Text>
        <Pressable onPress={onClose}
          style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgTertiary }}>
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 8 }} style={{ flexShrink: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between', gap: 20 }}>
          <View style={{ gap: 20 }}>
            {/* Set type — Normal / Dropset */}
            <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.bgTertiary }}>
              {['normal', 'dropset'].map((key) => (
                <Pressable key={key}
                  onPress={() => { setSetType(key); setHasChanges(true) }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: setType === key ? colors.success : 'transparent' }}>
                  <Text style={{ color: setType === key ? colors.bgPrimary : colors.textSecondary, fontSize: 14, fontWeight: '600' }}>
                    {t(`data:setTypes.${key}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Notes */}
            {showSetNotes && (
              <View>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                  {t('workout:set.notes')}
                </Text>
                <TextInput
                  value={note}
                  onChangeText={(v) => { setNote(v); setHasChanges(true) }}
                  placeholder={t('workout:set.notesPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline numberOfLines={3}
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 80 }} />
              </View>
            )}

            {/* Video */}
            {showVideo && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('workout:set.video')}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('workout:set.videoOptional')}</Text>
                </View>
                {videoUri ? (
                  <View style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bgTertiary }}>
                    <SetVideoPreview uri={videoUri} />
                    <Pressable onPress={handleRemoveVideo}
                      style={{ position: 'absolute', top: 8, right: 8, padding: 6, borderRadius: 999, backgroundColor: colors.overlay }}>
                      <X size={16} color={colors.white} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={handleVideoSelect}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.bgTertiary }}>
                    <View style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPrimary }}>
                      <Video size={20} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('workout:set.addVideoTitle')}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('workout:set.addVideoSubtitle')}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            )}

            {/* Aviso: el vídeo se adjunta tras completar la serie */}
            {videoEnabled && !allowVideo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: colors.bgTertiary, opacity: 0.7 }}>
                <View style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPrimary }}>
                  <Video size={20} color={colors.textMuted} />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>
                  {t('workout:set.videoAfterComplete')}
                </Text>
              </View>
            )}
          </View>

          {/* Save footer: empujado al fondo si cabe, scrollea con el contenido si no */}
          <View style={{ paddingTop: 12, gap: 12, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
            <Pressable onPress={handleSubmit} disabled={!hasChanges}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.success, opacity: !hasChanges ? 0.5 : 1 }}>
              <Save size={18} color={colors.bgPrimary} />
              <Text style={{ color: colors.bgPrimary, fontSize: 15, fontWeight: '700' }}>
                {t('common:buttons.save')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Modal>
  )
}
