import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Video, X, Save, ChevronRight, Minus, Plus } from 'lucide-react'
import { Modal } from '../ui/index.js'
import VideoPlayer from './VideoPlayer.jsx'
import { colors } from '../../lib/styles.js'
import { RIR_OPTIONS, RPE_OPTIONS, formatRestTimeDisplay, getEffortLabel, MeasurementType, measurementTypeUsesReps } from '@gym/shared'
import { useCanUploadVideo } from '../../hooks/useAuth.js'
import { usePreference } from '../../hooks/usePreferences.js'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

function NumberStepper({ label, value, onChange, step = 1, suffix }) {
  const handleChange = (delta) => onChange(Math.max(0, (parseFloat(value) || 0) + delta))
  return (
    <div className="flex-1">
      <label className="block text-xs mb-1.5" style={{ color: colors.textSecondary }}>{label}</label>
      <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
        style={{ backgroundColor: colors.bgTertiary }}>
        <button onClick={() => handleChange(-step)}
          className="flex items-center justify-center rounded-full hover:opacity-80"
          style={{ width: 28, height: 28, color: colors.textSecondary }}>
          <Minus size={16} />
        </button>
        <span className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          {value || 0}{suffix ? <span className="text-sm font-normal opacity-70 ml-1">{suffix}</span> : null}
        </span>
        <button onClick={() => handleChange(step)}
          className="flex items-center justify-center rounded-full hover:opacity-80"
          style={{ width: 28, height: 28, color: colors.textSecondary }}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

function SetDetailsModal({
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
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoError, setVideoError] = useState(null)
  const [setType, setSetType] = useState('normal')
  const [localWeight, setLocalWeight] = useState('')
  const [localReps, setLocalReps] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setRir(initialRir ?? null)
      setNote(initialNote ?? '')
      setVideoUrl(initialVideoUrl ?? null)
      setVideoFile(null)
      setVideoError(null)
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

  const handleNoteChange = (e) => {
    setNote(e.target.value)
    setHasChanges(true)
  }

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_VIDEO_SIZE) {
        const sizeMB = Math.round(file.size / 1024 / 1024)
        setVideoError(`${t('workout:set.videoTooLarge')}: ${t('workout:set.videoTooLargeDetail', { size: sizeMB })}`)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      setVideoError(null)
      setVideoFile(file)
      setVideoUrl(URL.createObjectURL(file))
      setHasChanges(true)
    }
  }

  const handleRemoveVideo = () => {
    setVideoFile(null)
    setVideoUrl(null)
    setHasChanges(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
    const existingVideoUrl = (!videoFile && videoUrl) ? initialVideoUrl : null
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
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-lg" noBorder>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>
          {headerLabel}
        </span>
        <button onClick={onClose}
          className="flex items-center justify-center rounded-full hover:opacity-80"
          style={{ width: 32, height: 32, backgroundColor: colors.bgTertiary }}>
          <X size={16} style={{ color: colors.textSecondary }} />
        </button>
      </div>

      <div className="px-5 mt-3 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
        <div className="flex flex-col" style={{ minHeight: '100%' }}>
          <div className="space-y-5">
            {/* Set type — Normal / Dropset */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ backgroundColor: colors.bgTertiary }}>
              {['normal', 'dropset'].map((key) => (
                <button key={key}
                  onClick={() => { setSetType(key); setHasChanges(true) }}
                  className="py-2.5 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: setType === key ? colors.success : 'transparent',
                    color: setType === key ? colors.bgPrimary : colors.textSecondary,
                    border: setType === key ? `1px solid ${colors.success}` : 'none',
                  }}>
                  {t(`data:setTypes.${key}`)}
                </button>
              ))}
            </div>

            {/* Weight & reps */}
            {showWeightReps && (setWeight || weight !== undefined) && (setReps || reps !== undefined) && (
              <div>
                <h4 className="font-semibold mb-2" style={{ color: colors.textPrimary, fontSize: 14 }}>
                  {t('workout:set.weightAndReps')}
                </h4>
                <div className="flex gap-3">
                  <NumberStepper
                    label={`${t('workout:set.weight')} (${weightUnit})`}
                    value={localWeight}
                    onChange={handleWeightChange}
                    step={2.5}
                  />
                  <NumberStepper
                    label={t('workout:set.reps')}
                    value={localReps}
                    onChange={handleRepsChange}
                  />
                </div>
              </div>
            )}

            {/* Effort: RIR (with reps) or RPE (without reps) */}
            {showRirInput && (() => {
              const usesReps = measurementTypeUsesReps(measurementType)
              const options = usesReps ? RIR_OPTIONS : RPE_OPTIONS
              const titleLabel = usesReps ? t('workout:set.rirTitle') : `${getEffortLabel(measurementType)} (${t('common:labels.optional').toLowerCase()})`
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: colors.textSecondary, fontSize: 13 }}>{titleLabel}</span>
                    {rir != null && (
                      <span style={{ color: colors.success, fontSize: 13, fontWeight: 600 }}>
                        {t('workout:set.selected', { value: options.find(o => o.value === rir)?.label ?? rir })}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {options.map(option => (
                      <button key={option.value} onClick={() => handleRirChange(option.value)}
                        className="py-3 rounded-xl font-semibold"
                        style={{
                          backgroundColor: rir === option.value ? colors.success : colors.bgTertiary,
                          color: rir === option.value ? colors.bgPrimary : colors.textPrimary,
                          fontSize: usesReps ? 16 : 11,
                        }}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Notes */}
            {showSetNotes && (
              <div>
                <h4 className="font-semibold mb-2" style={{ color: colors.textPrimary, fontSize: 14 }}>
                  {t('workout:set.notes')}
                </h4>
                <textarea
                  value={note}
                  onChange={handleNoteChange}
                  placeholder={t('workout:set.notesPlaceholder')}
                  rows={3}
                  className="w-full rounded-xl p-3 text-sm resize-none outline-none"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none', minHeight: 80 }}
                />
              </div>
            )}

            {/* Video */}
            {showVideo && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold" style={{ color: colors.textPrimary, fontSize: 14 }}>
                    Video
                  </h4>
                  <span style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {t('workout:set.videoOptional')}
                  </span>
                </div>
                {videoUrl ? (
                  <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
                    {videoFile ? (
                      <video src={videoUrl} controls className="w-full max-h-40 object-contain" />
                    ) : (
                      <VideoPlayer videoKey={videoUrl} />
                    )}
                    <button onClick={handleRemoveVideo}
                      className="absolute top-2 right-2 p-1 rounded-full"
                      style={{ backgroundColor: colors.overlay }}>
                      <X size={16} style={{ color: colors.textPrimary }} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:opacity-80"
                      style={{ backgroundColor: colors.bgTertiary }}>
                      <div className="flex items-center justify-center rounded-lg"
                        style={{ width: 40, height: 40, backgroundColor: colors.bgPrimary }}>
                        <Video size={20} style={{ color: colors.success }} />
                      </div>
                      <div className="flex-1 text-left">
                        <div style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>
                          {t('workout:set.addVideoTitle')}
                        </div>
                        <div style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {t('workout:set.addVideoSubtitle')}
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: colors.textMuted }} />
                    </button>
                    {videoError && (
                      <p className="text-xs mt-1 text-center" style={{ color: colors.danger }}>{videoError}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Save footer: empujado al fondo si cabe, scrollea con el contenido si no */}
          <div className="pt-3 pb-5 space-y-3 mt-auto" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
            {!isEditMode && descansoSeg > 0 && (
              <p className="text-center text-xs" style={{ color: colors.textMuted }}>
                {t('workout:rest.title')}: {formatRestTimeDisplay(descansoSeg)}
              </p>
            )}
            <button onClick={handleSubmit} disabled={buttonDisabled}
              className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
              {isEditMode ? <Save size={18} /> : <Check size={18} />}
              {isEditMode ? t('common:buttons.save') : (descansoSeg > 0 ? t('workout:set.saveStartRest') : t('common:buttons.save'))}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default SetDetailsModal
