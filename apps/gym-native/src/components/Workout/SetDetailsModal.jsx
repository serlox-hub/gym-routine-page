import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check, Save, Video, X, ChevronRight, Maximize2, Minus, Plus } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Modal } from '../ui'
import { useCanUploadVideo } from '../../hooks/useAuth'
import { usePreference } from '../../hooks/usePreferences'
import { getVideoUrl } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'
import { RIR_OPTIONS, RPE_OPTIONS, formatRestTimeDisplay, getEffortLabel, MeasurementType, measurementTypeUsesReps } from '@gym/shared'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

function SetVideoPreview({ uri }) {
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
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
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

function NumberStepper({ label, value, onChange, step = 1, suffix }) {
  const handleChange = (delta) => onChange(Math.max(0, (parseFloat(value) || 0) + delta))
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgTertiary }}>
        <Pressable onPress={() => handleChange(-step)} hitSlop={8}
          style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Minus size={16} color={colors.textSecondary} />
        </Pressable>
        <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700' }}>
          {value || 0}{suffix ? <Text style={{ fontSize: 14, fontWeight: '400', opacity: 0.7 }}>  {suffix}</Text> : null}
        </Text>
        <Pressable onPress={() => handleChange(step)} hitSlop={8}
          style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  )
}

export default function SetDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  mode = 'complete',
  setNumber,
  initialRir,
  initialNote,
  initialVideoUrl,
  initialSetType = 'normal',
  descansoSeg = 0,
  measurementType,
  weight, setWeight, reps, setReps,
  weightUnit = 'kg',
}) {
  const { t } = useTranslation()
  const canUploadVideo = useCanUploadVideo()
  const { value: showRirInput } = usePreference('show_rir_input')
  const { value: showSetNotes } = usePreference('show_set_notes')
  const { value: showVideoUpload } = usePreference('show_video_upload')
  const showVideo = canUploadVideo && showVideoUpload
  const showWeightReps = measurementType === MeasurementType.WEIGHT_REPS

  const [rir, setRir] = useState(null)
  const [note, setNote] = useState('')
  const [videoUri, setVideoUri] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [setType, setSetType] = useState('normal')
  const [localWeight, setLocalWeight] = useState('')
  const [localReps, setLocalReps] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRir(initialRir ?? null)
      setNote(initialNote ?? '')
      setVideoUri(initialVideoUrl ?? null)
      setVideoFile(null)
      setSetType(initialSetType ?? 'normal')
      setLocalWeight(weight ?? '')
      setLocalReps(reps ?? '')
      setHasChanges(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialRir, initialNote, initialVideoUrl, initialSetType])

  const handleRirChange = (value) => {
    setRir(rir === value ? null : value)
    setHasChanges(true)
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

  const handleWeightChange = (v) => {
    setLocalWeight(v)
    setWeight?.(v)
    setHasChanges(true)
  }

  const handleRepsChange = (v) => {
    setLocalReps(v)
    setReps?.(v)
    setHasChanges(true)
  }

  const handleSubmit = () => {
    const existingVideoUrl = (!videoFile && videoUri) ? initialVideoUrl : null
    onSubmit({
      rir,
      notes: note.trim() || null,
      videoUrl: existingVideoUrl,
      videoFile,
      setType,
      weight: localWeight,
      reps: localReps,
    })
  }

  const isEditMode = mode === 'edit'
  const buttonDisabled = isEditMode && !hasChanges
  const headerLabel = isEditMode
    ? t('workout:set.edit').toUpperCase()
    : t('workout:set.logSet', { number: setNumber || '' })

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      {/* Header (fixed) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>
          {headerLabel}
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

            {/* Weight & reps */}
            {showWeightReps && (setWeight || weight !== undefined) && (setReps || reps !== undefined) && (
              <View>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                  {t('workout:set.weightAndReps')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <NumberStepper label={`${t('workout:set.weight')} (${weightUnit})`}
                    value={localWeight} onChange={handleWeightChange} step={2.5} />
                  <NumberStepper label={t('workout:set.reps')}
                    value={localReps} onChange={handleRepsChange} />
                </View>
              </View>
            )}

            {/* Effort: RIR (with reps) or RPE (without reps) */}
            {showRirInput && (() => {
              const usesReps = measurementTypeUsesReps(measurementType)
              const options = usesReps ? RIR_OPTIONS : RPE_OPTIONS
              const titleLabel = usesReps ? t('workout:set.rirTitle') : `${getEffortLabel(measurementType)} (${t('common:labels.optional').toLowerCase()})`
              return (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{titleLabel}</Text>
                    {rir != null && (
                      <Text style={{ color: colors.success, fontSize: 13, fontWeight: '600' }}>
                        {t('workout:set.selected', { value: options.find(o => o.value === rir)?.label ?? rir })}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {options.map(option => (
                      <Pressable key={option.value} onPress={() => handleRirChange(option.value)}
                        style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: rir === option.value ? colors.success : colors.bgTertiary }}>
                        <Text numberOfLines={1} style={{ color: rir === option.value ? colors.bgPrimary : colors.textPrimary, fontSize: usesReps ? 16 : 11, fontWeight: '600' }}>
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )
            })()}

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
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>Video</Text>
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
          </View>

          {/* Save footer: empujado al fondo si cabe, scrollea con el contenido si no */}
          <View style={{ paddingTop: 12, gap: 12, borderTopWidth: 1, borderTopColor: colors.borderSubtle }}>
            {!isEditMode && descansoSeg > 0 && (
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
                {t('workout:rest.title')}: {formatRestTimeDisplay(descansoSeg)}
              </Text>
            )}
            <Pressable onPress={handleSubmit} disabled={buttonDisabled}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.success, opacity: buttonDisabled ? 0.5 : 1 }}>
              {isEditMode ? <Save size={18} color={colors.bgPrimary} /> : <Check size={18} color={colors.bgPrimary} />}
              <Text style={{ color: colors.bgPrimary, fontSize: 15, fontWeight: '700' }}>
                {isEditMode ? t('common:buttons.save') : (descansoSeg > 0 ? t('workout:set.saveStartRest') : t('common:buttons.save'))}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Modal>
  )
}
