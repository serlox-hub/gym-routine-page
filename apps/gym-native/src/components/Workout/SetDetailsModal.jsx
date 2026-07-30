import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Video, X, ChevronRight, Maximize2 } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Modal, Button } from '../ui'
import { useCanUploadVideo } from '../../hooks/useAuth'
import { usePreference } from '../../hooks/usePreferences'
import { getVideoUrl } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'
import { getEffortOptions, getEffortInfo, measurementTypeUsesReps } from '@gym/shared'

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
 * Hoja ÚNICA de anotación de una serie: esfuerzo (RIR/RPE), tipo (dropset), nota y vídeo, todo
 * en una sola superficie. Se abre tocando el chip de la columna «Notas» (ver EffortPicker); el
 * peso/reps se editan inline en la fila (no aquí). Sin botón Guardar.
 *
 * Modelo unificado (a petición del usuario): TODO se edita dentro de la hoja, nada abre otra
 * superficie, cerrar = guardado. RIR y tipo son CONTROLADOS (persisten al instante vía el padre);
 * nota y vídeo son locales y se confirman al cerrar. Paridad con web. Ver DECISIONS.
 *
 * Botón «Completar» (opt-in aditivo): si el padre pasa `onComplete` (solo en sesión y solo si la
 * serie NO está completada), anota + completa de una. Cerrar sin pulsarlo NO completa (solo
 * autoguarda). El historial no pasa onComplete → sin botón. Paridad con web. Ver DECISIONS.
 */
export default function SetDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  onComplete,
  canComplete = true,
  setNumber,
  allowVideo = true,
  initialNote,
  initialVideoUrl,
  rir,
  onRirChange,
  measurementType,
  showEffortScale = true,
  setType = 'normal',
  onSetTypeChange,
  showSetType = true,
}) {
  const { t } = useTranslation()
  const canUploadVideo = useCanUploadVideo()
  const { value: showSetNotes } = usePreference('show_set_notes')
  const { value: showVideoUpload } = usePreference('show_video_upload')
  // El vídeo se adjunta a una serie ya completada; antes de completar solo se avisa.
  const videoEnabled = canUploadVideo && showVideoUpload
  const showVideo = videoEnabled && allowVideo

  const usesReps = measurementTypeUsesReps(measurementType)
  const effortOptions = getEffortOptions(measurementType)

  const [note, setNote] = useState('')
  const [videoUri, setVideoUri] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote ?? '')
      setVideoUri(initialVideoUrl ?? null)
      setVideoFile(null)
      setHasChanges(false)
    }
  }, [isOpen, initialNote, initialVideoUrl])

  const handleRirSelect = (optionValue) => {
    // Reelegir el mismo valor lo deselecciona (null). Persiste en vivo vía el padre.
    onRirChange?.(rir === optionValue ? null : optionValue)
  }

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

  // Autosave al cerrar: solo la nota y el vídeo (RIR/tipo ya persisten en vivo).
  const handleClose = () => {
    if (hasChanges) {
      const existingVideoUrl = (!videoFile && videoUri) ? initialVideoUrl : null
      onSubmit({ notes: note.trim() || null, videoUrl: existingVideoUrl, videoFile })
    } else {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} position="bottom">
      {/* Header (fixed) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>
          {t('workout:set.detailsTitle', { number: setNumber || '' })}
        </Text>
        <Pressable onPress={handleClose}
          style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgTertiary }}>
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 8 }} style={{ flexShrink: 1 }}>
        <View style={{ gap: 20 }}>
          {/* Esfuerzo (RIR/RPE) */}
          {showEffortScale && (
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('workout:set.rirTitle')}</Text>
              {usesReps && (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{t('workout:set.rirHelp')}</Text>
              )}
              <View style={usesReps ? { marginTop: 8, gap: 8 } : { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {effortOptions.map(option => {
                  const selected = rir === option.value
                  // RIR: código · palabra (autoexplicable, #10). RPE: la palabra directa.
                  const info = usesReps ? getEffortInfo(option.value, measurementType) : null
                  const rowColor = selected ? colors.bgPrimary : colors.textPrimary
                  return (
                    <Pressable key={option.value}
                      onPress={() => handleRirSelect(option.value)}
                      accessibilityRole="button"
                      accessibilityLabel={usesReps ? `${info.label} ${info.description}` : option.label}
                      accessibilityState={{ selected }}
                      style={{
                        backgroundColor: selected ? colors.success : colors.bgTertiary,
                        borderRadius: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                      {usesReps ? (
                        <>
                          <Text style={{ minWidth: 26, textAlign: 'center', color: rowColor, fontWeight: '700', fontSize: 15 }}>{info.label}</Text>
                          <Text style={{ color: rowColor, fontWeight: '500', fontSize: 13 }}>{info.description}</Text>
                        </>
                      ) : (
                        <Text style={{ color: rowColor, fontWeight: '600', fontSize: 13 }}>{option.label}</Text>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )}

          {/* Tipo de serie — Normal / Dropset */}
          {showSetType && (
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{t('workout:set.type.label')}</Text>
              <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.bgTertiary }}>
                {['normal', 'dropset'].map((key) => (
                  <Pressable key={key}
                    onPress={() => onSetTypeChange?.(key)}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: setType === key ? colors.success : 'transparent' }}>
                    <Text style={{ color: setType === key ? colors.bgPrimary : colors.textSecondary, fontSize: 14, fontWeight: '600' }}>
                      {t(`data:setTypes.${key}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Nota */}
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

          {/* Vídeo */}
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
      </ScrollView>

      {/* Footer: «Completar» solo en sesión y solo si la serie aún no está hecha (onComplete
          presente). Anota + completa de una; deshabilitado si los datos no son válidos (mismo
          gate que el check). Cerrar sin pulsarlo NO completa (solo autoguarda). */}
      {onComplete && (
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
          <Button variant="primary" size="lg" className="w-full" disabled={!canComplete}
            onPress={() => onComplete({ notes: note.trim() || null })}>
            {t('workout:set.complete')}
          </Button>
        </View>
      )}
    </Modal>
  )
}
