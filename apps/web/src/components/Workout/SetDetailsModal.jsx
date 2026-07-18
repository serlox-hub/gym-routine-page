import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Video, X, Save, ChevronRight } from 'lucide-react'
import { Modal } from '../ui/index.js'
import VideoPlayer from './VideoPlayer.jsx'
import { colors } from '../../lib/styles.js'
import { useCanUploadVideo } from '../../hooks/useAuth.js'
import { usePreference } from '../../hooks/usePreferences.js'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * Hoja de detalles opcionales de una serie ya completada: tipo de serie (dropset),
 * notas y vídeo. El peso/reps se editan inline en la fila y el RIR con el chip inline
 * (ver EffortPicker) — por eso esta hoja ya NO los incluye. Se abre bajo demanda desde
 * el botón «⋯» de la fila, nunca al completar (issue #8).
 */
function SetDetailsModal({
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
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoError, setVideoError] = useState(null)
  const [setType, setSetType] = useState('normal')
  const [hasChanges, setHasChanges] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote ?? '')
      setVideoUrl(initialVideoUrl ?? null)
      setVideoFile(null)
      setVideoError(null)
      setSetType(initialSetType ?? 'normal')
      setHasChanges(false)
    }
  }, [isOpen, initialNote, initialVideoUrl, initialSetType])

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

  const handleSubmit = () => {
    const existingVideoUrl = (!videoFile && videoUrl) ? initialVideoUrl : null
    onSubmit({
      notes: note.trim() || null,
      videoUrl: existingVideoUrl,
      videoFile,
      setType,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-lg" noBorder>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>
          {t('workout:set.detailsTitle', { number: setNumber || '' })}
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
                    {t('workout:set.video')}
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

            {/* Aviso: el vídeo se adjunta tras completar la serie */}
            {videoEnabled && !allowVideo && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: colors.bgTertiary, opacity: 0.7 }}>
                <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, backgroundColor: colors.bgPrimary }}>
                  <Video size={20} style={{ color: colors.textMuted }} />
                </div>
                <div style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {t('workout:set.videoAfterComplete')}
                </div>
              </div>
            )}
          </div>

          {/* Save footer: empujado al fondo si cabe, scrollea con el contenido si no */}
          <div className="pt-3 pb-5 space-y-3 mt-auto" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
            <button onClick={handleSubmit} disabled={!hasChanges}
              className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
              <Save size={18} />
              {t('common:buttons.save')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default SetDetailsModal
