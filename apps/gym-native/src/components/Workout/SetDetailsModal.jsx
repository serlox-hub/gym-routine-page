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
import { getEffortOptions, getEffortInfo, tracksReps } from '@gym/shared'

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
 * superficie. RIR y tipo son CONTROLADOS (persisten al instante vía el padre). La nota es local y
 * se confirma al cerrar. El vídeo (issue #31) se dispara al elegir/quitar, YA — no espera al
 * cierre (`onSelectVideo`/`onRemoveVideo`). Paridad con web. Ver DECISIONS.
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
  isUploadingVideo = false,
  uploadProgress = 0,
  onSelectVideo,
  onRemoveVideo,
  initialNote,
  initialVideoUrl,
  rir,
  onRirChange,
  trackedFields,
  showEffortScale = true,
  setType = 'normal',
  onSetTypeChange,
  showSetType = true,
}) {
  const { t } = useTranslation()
  const canUploadVideo = useCanUploadVideo()
  const { value: showSetNotes } = usePreference('show_set_notes')
  const { value: showVideoUpload } = usePreference('show_video_upload')
  // El vídeo se puede elegir aunque la serie aún no esté completada (issue #31): el archivo solo
  // vive en estado local de esta hoja hasta que se pulsa «Completar» (ver SetRow), así que no hay
  // gate por `isCompleted` aquí.
  const showVideo = canUploadVideo && showVideoUpload

  const usesReps = tracksReps(trackedFields)
  const effortOptions = getEffortOptions(trackedFields)

  const [note, setNote] = useState('')
  const [videoUri, setVideoUri] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote ?? '')
      setVideoUri(initialVideoUrl ?? null)
      setHasChanges(false)
    }
  }, [isOpen, initialNote, initialVideoUrl])

  const handleRirSelect = (optionValue) => {
    // Reelegir el mismo valor lo deselecciona (null). Persiste en vivo vía el padre.
    onRirChange?.(rir === optionValue ? null : optionValue)
  }

  // Elegir un archivo dispara la subida YA (issue #31; ver SetRow/useSetVideoUpload) — no espera
  // a cerrar la hoja. La vista previa local (uri del asset) es instantánea, independiente de la red.
  const handleVideoSelect = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 })
    if (result.canceled) return
    const asset = result.assets[0]
    if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
      const sizeMB = Math.round(asset.fileSize / 1024 / 1024)
      Alert.alert(t('workout:set.videoTooLarge'), t('workout:set.videoTooLargeDetail', { size: sizeMB }))
      return
    }
    setVideoUri(asset.uri)
    onSelectVideo?.(asset)
  }

  const handleRemoveVideo = () => {
    setVideoUri(null)
    onRemoveVideo?.()
  }

  // Autosave al cerrar: solo la nota (RIR/tipo ya persisten en vivo, vídeo ya se maneja al elegir
  // /quitar — ver arriba). Si no hubo cambios en la nota, solo cierra.
  const handleClose = () => {
    if (hasChanges) {
      onSubmit({ notes: note.trim() || null })
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
                  const info = usesReps ? getEffortInfo(option.value, trackedFields) : null
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
                  {/* Progreso de subida (issue #31): visible sin salir de la hoja mientras el
                      botón «Completar» está bloqueado por isUploadingVideo. */}
                  {isUploadingVideo && (
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.overlay }}>
                      <View style={{ flex: 1, height: 4, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.bgTertiary }}>
                        <View style={{ height: '100%', width: `${uploadProgress}%`, borderRadius: 999, backgroundColor: colors.purple }} />
                      </View>
                      <Text style={{ color: colors.white, fontSize: 11, fontWeight: '700' }}>{uploadProgress}%</Text>
                    </View>
                  )}
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
        </View>
      </ScrollView>

      {/* Footer: «Completar» solo en sesión y solo si la serie aún no está hecha (onComplete
          presente). Anota + completa de una; deshabilitado si los datos no son válidos (mismo
          gate que el check) o mientras sube un vídeo recién elegido (issue #31: completar sin
          esperar lo dejaría huérfano, ver useSetVideoUpload) — «tras la subida, o sin ella».
          Cerrar sin pulsarlo NO completa (solo autoguarda la nota). */}
      {onComplete && (
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
          <Button variant="primary" size="lg" className="w-full" disabled={!canComplete} loading={isUploadingVideo}
            onPress={() => onComplete({ notes: note.trim() || null })}>
            {t('workout:set.complete')}
          </Button>
        </View>
      )}
    </Modal>
  )
}
