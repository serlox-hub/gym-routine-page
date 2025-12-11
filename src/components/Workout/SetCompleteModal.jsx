import { useState, useEffect, useRef } from 'react'
import { Check, Video, X, Loader2 } from 'lucide-react'
import { colors, inputStyle, modalOverlayStyle, modalContentStyle } from '../../lib/styles.js'
import { formatRestTimeDisplay } from '../../lib/timeUtils.js'
import { uploadVideo } from '../../lib/videoStorage.js'
import { useCanUploadVideo } from '../../hooks/useAuth.js'
import { RIR_OPTIONS } from '../../lib/constants.js'
import { usePreference } from '../../hooks/usePreferences.js'
import { getEffortLabel } from '../../lib/measurementTypes.js'

function SetCompleteModal({ isOpen, onClose, onComplete, descansoSeg, initialRir, initialNote, initialVideoUrl, measurementType }) {
  const canUploadVideo = useCanUploadVideo()
  const { value: showRirInput } = usePreference('show_rir_input')
  const { value: showSetNotes } = usePreference('show_set_notes')
  const { value: showVideoUpload } = usePreference('show_video_upload')
  const showVideo = canUploadVideo && showVideoUpload
  const [rir, setRir] = useState(null)
  const [note, setNote] = useState('')
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  // Cargar valores iniciales cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setRir(initialRir ?? null)
      setNote(initialNote ?? '')
      setVideoUrl(initialVideoUrl ?? null)
      setVideoFile(null)
      setUploadError(null)
    }
  }, [isOpen, initialRir, initialNote, initialVideoUrl])

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      setVideoUrl(URL.createObjectURL(file))
      setUploadError(null)
    }
  }

  const handleRemoveVideo = () => {
    setVideoFile(null)
    setVideoUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleComplete = async () => {
    let finalVideoUrl = initialVideoUrl

    if (videoFile) {
      setIsUploading(true)
      setUploadError(null)
      try {
        finalVideoUrl = await uploadVideo(videoFile)
      } catch {
        setUploadError('Error al subir el video')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    } else if (!videoUrl && initialVideoUrl) {
      finalVideoUrl = null
    }

    onComplete(rir, note.trim() || null, finalVideoUrl)
    setRir(null)
    setNote('')
    setVideoUrl(null)
    setVideoFile(null)
  }

  const handleClose = () => {
    setRir(null)
    setNote('')
    setVideoUrl(null)
    setVideoFile(null)
    setUploadError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={modalOverlayStyle}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl"
        style={modalContentStyle}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 flex justify-between items-center"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <h3 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
            Completar serie
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
                    onClick={() => setRir(rir === option.value ? null : option.value)}
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
                onChange={(e) => setNote(e.target.value)}
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
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-h-40 object-contain"
                  />
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
                    MP4, WebM o MOV. Máx 100MB
                  </p>
                </>
              )}
              {uploadError && (
                <p className="text-xs mt-1" style={{ color: colors.error }}>
                  {uploadError}
                </p>
              )}
            </div>
          )}

          {/* Info descanso */}
          {descansoSeg > 0 && (
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
            onClick={handleComplete}
            disabled={isUploading}
            className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: colors.success, color: '#ffffff' }}
          >
            {isUploading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Subiendo video...
              </>
            ) : (
              <>
                <Check size={20} />
                Completar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SetCompleteModal
