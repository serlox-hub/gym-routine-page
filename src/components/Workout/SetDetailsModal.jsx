import { useState, useEffect, useRef } from 'react'
import { Check, Video, X, Save, Loader2 } from 'lucide-react'
import { Modal } from '../ui/index.js'
import { colors, inputStyle } from '../../lib/styles.js'
import { formatRestTimeDisplay } from '../../lib/timeUtils.js'
import { useCanUploadVideo } from '../../hooks/useAuth.js'
import { RIR_OPTIONS } from '../../lib/constants.js'
import { usePreference } from '../../hooks/usePreferences.js'
import { getEffortLabel } from '../../lib/measurementTypes.js'
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

function SetDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  mode = 'complete', // 'complete' | 'edit'
  initialRir,
  initialNote,
  initialVideoUrl,
  descansoSeg = 0,
  measurementType
}) {
  const canUploadVideo = useCanUploadVideo()
  const { value: showRirInput } = usePreference('show_rir_input')
  const { value: showSetNotes } = usePreference('show_set_notes')
  const { value: showVideoUpload } = usePreference('show_video_upload')
  const showVideo = canUploadVideo && showVideoUpload

  const [rir, setRir] = useState(null)
  const [note, setNote] = useState('')
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setRir(initialRir ?? null)
      setNote(initialNote ?? '')
      setVideoUrl(initialVideoUrl ?? null)
      setVideoFile(null)
      setHasChanges(false)
    }
  }, [isOpen, initialRir, initialNote, initialVideoUrl])

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
      setVideoFile(file)
      setVideoUrl(URL.createObjectURL(file))
      setHasChanges(true)
    }
  }

  const handleRemoveVideo = () => {
    setVideoFile(null)
    setVideoUrl(null)
    setHasChanges(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = () => {
    const existingVideoUrl = (!videoFile && videoUrl) ? initialVideoUrl : null
    onSubmit(rir, note.trim() || null, existingVideoUrl, videoFile)
    resetState()
  }

  const resetState = () => {
    setRir(null)
    setNote('')
    setVideoUrl(null)
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      position="bottom"
      maxWidth="max-w-lg"
      noBorder
    >
      {/* Header */}
      <div
        className="p-4 flex justify-between items-center"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <h3 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {title}
        </h3>
        <button
          onClick={handleClose}
          className="text-xl"
          style={{ color: colors.textSecondary }}
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* RIR / Esfuerzo */}
        {showRirInput && (
          <div>
            <label className="block text-sm mb-3" style={{ color: colors.textSecondary }}>
              {getEffortLabel(measurementType)} (opcional)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {RIR_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleRirChange(option.value)}
                  className="p-2 rounded-lg text-center transition-colors"
                  style={{
                    backgroundColor: rir === option.value ? colors.purple : colors.bgTertiary,
                    color: rir === option.value ? colors.bgPrimary : colors.textPrimary,
                  }}
                >
                  <div className="text-lg font-bold">{option.label}</div>
                  <div className="text-xs opacity-75">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nota */}
        {showSetNotes && (
          <div>
            <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={handleNoteChange}
              placeholder="Ej: Buen pump, molestia en codo..."
              className="w-full rounded-lg p-3 text-sm resize-none h-16"
              style={inputStyle}
            />
          </div>
        )}

        {/* Video */}
        {showVideo && (
          <div>
            <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
              Video (opcional)
            </label>
            {videoUrl ? (
              <div className="relative rounded-lg overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
                {videoFile ? (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-h-40 object-contain"
                  />
                ) : (
                  <VideoPlayer videoKey={videoUrl} />
                )}
                <button
                  onClick={handleRemoveVideo}
                  className="absolute top-2 right-2 p-1 rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                >
                  <X size={16} style={{ color: colors.textPrimary }} />
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
                >
                  <Video size={18} />
                  Añadir video
                </button>
                <p className="text-xs mt-1 text-center" style={{ color: colors.textSecondary }}>
                  MP4, WebM o MOV. Máx 200MB
                </p>
              </>
            )}
          </div>
        )}

        {/* Info descanso (solo en modo complete) */}
        {!isEditMode && descansoSeg > 0 && (
          <div
            className="text-center py-2 rounded-lg"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              Descanso: <span style={{ color: colors.accent }}>{formatRestTimeDisplay(descansoSeg)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: `1px solid ${colors.border}` }}>
        <button
          onClick={handleSubmit}
          disabled={buttonDisabled}
          className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{
            backgroundColor: buttonColor,
            color: buttonTextColor,
            cursor: buttonDisabled ? 'default' : 'pointer',
          }}
        >
          {isEditMode ? <Save size={20} /> : <Check size={20} />}
          {isEditMode ? 'Guardar cambios' : 'Completar'}
        </button>
      </div>
    </Modal>
  )
}

export default SetDetailsModal
