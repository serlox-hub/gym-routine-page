import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Video, X, ChevronRight } from 'lucide-react'
import { Modal, Button } from '../ui/index.js'
import VideoPlayer from './VideoPlayer.jsx'
import { colors } from '../../lib/styles.js'
import { useCanUploadVideo } from '../../hooks/useAuth.js'
import { usePreference } from '../../hooks/usePreferences.js'
import { getEffortOptions, getEffortInfo, tracksReps } from '@gym/shared'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * Hoja ÚNICA de anotación de una serie: esfuerzo (RIR/RPE), tipo (dropset), nota y vídeo, todo
 * en una sola superficie. Se abre tocando el chip de la columna «Notas» (ver EffortPicker); el
 * peso/reps se editan inline en la fila (no aquí). No hay botón Guardar: la anotación se
 * autoguarda al cerrar.
 *
 * Modelo de interacción unificado (a petición del usuario): TODO se edita dentro de la hoja,
 * nada abre otra superficie, y cerrar = guardado. RIR y tipo son CONTROLADOS (viven en el
 * padre vía onRirChange/onSetTypeChange → persisten al instante, patrón de #8); nota y vídeo
 * son locales y se confirman al cerrar (autosave). El usuario no percibe esa diferencia: para
 * él todo ocurre en la hoja y el cierre confirma. Ver DECISIONS.
 *
 * Botón «Completar» (opt-in aditivo): si el padre pasa `onComplete` (solo en sesión y solo si la
 * serie NO está completada), la hoja muestra un botón que anota + completa la serie de una, para
 * quien rellena RIR/nota en cada serie y le sobra tener que cerrar y luego buscar el check. Cerrar
 * SIN pulsarlo NO completa (solo autoguarda la nota) → «cancelar» gratis, sin completar por
 * accidente. El check de la fila sigue intacto como toggle. El historial no pasa onComplete → sin
 * botón. Ver DECISIONS.
 */
function SetDetailsModal({
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
  // El vídeo se adjunta a una serie ya completada; antes de completar solo se avisa.
  const videoEnabled = canUploadVideo && showVideoUpload
  const showVideo = videoEnabled && allowVideo

  const usesReps = tracksReps(trackedFields)
  const effortOptions = getEffortOptions(trackedFields)

  const [note, setNote] = useState('')
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoError, setVideoError] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote ?? '')
      setVideoUrl(initialVideoUrl ?? null)
      setVideoFile(null)
      setVideoError(null)
      setHasChanges(false)
    }
  }, [isOpen, initialNote, initialVideoUrl])

  const handleNoteChange = (e) => {
    setNote(e.target.value)
    setHasChanges(true)
  }

  const handleRirSelect = (optionValue) => {
    // Reelegir el mismo valor lo deselecciona (null). Persiste en vivo vía el padre.
    onRirChange?.(rir === optionValue ? null : optionValue)
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

  // Autosave al cerrar: solo la nota y el vídeo (RIR/tipo ya persisten en vivo). Si no hubo
  // cambios en nota/vídeo, solo cierra.
  const handleClose = () => {
    if (hasChanges) {
      const existingVideoUrl = (!videoFile && videoUrl) ? initialVideoUrl : null
      onSubmit({ notes: note.trim() || null, videoUrl: existingVideoUrl, videoFile })
    } else {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} position="bottom" maxWidth="max-w-lg" noBorder>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>
          {t('workout:set.detailsTitle', { number: setNumber || '' })}
        </span>
        <button onClick={handleClose}
          className="flex items-center justify-center rounded-full hover:opacity-80"
          style={{ width: 32, height: 32, backgroundColor: colors.bgTertiary }}>
          <X size={16} style={{ color: colors.textSecondary }} />
        </button>
      </div>

      <div className="px-5 mt-3 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
        <div className="flex flex-col" style={{ minHeight: '100%' }}>
          <div className="space-y-5">
            {/* Esfuerzo (RIR/RPE) */}
            {showEffortScale && (
              <div>
                <h4 className="font-semibold" style={{ color: colors.textPrimary, fontSize: 14 }}>
                  {t('workout:set.rirTitle')}
                </h4>
                {usesReps && (
                  <p style={{ color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: 8 }}>{t('workout:set.rirHelp')}</p>
                )}
                <div className={usesReps ? 'mt-2 space-y-2' : 'mt-2 grid grid-cols-2 gap-2'}>
                  {effortOptions.map(option => {
                    const selected = rir === option.value
                    // RIR: código · palabra (autoexplicable, #10). RPE: la palabra directa.
                    const info = usesReps ? getEffortInfo(option.value, trackedFields) : null
                    return (
                      <button key={option.value}
                        onClick={() => handleRirSelect(option.value)}
                        aria-pressed={selected}
                        aria-label={usesReps ? `${info.label} ${info.description}` : undefined}
                        className="flex items-center gap-2.5 rounded-lg text-left"
                        style={{
                          backgroundColor: selected ? colors.success : colors.bgTertiary,
                          color: selected ? colors.bgPrimary : colors.textPrimary,
                          padding: '10px 12px',
                        }}>
                        {usesReps ? (
                          <>
                            <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{info.label}</span>
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{info.description}</span>
                          </>
                        ) : (
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{option.label}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tipo de serie — Normal / Dropset */}
            {showSetType && (
              <div>
                <h4 className="font-semibold mb-2" style={{ color: colors.textPrimary, fontSize: 14 }}>
                  {t('workout:set.type.label')}
                </h4>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ backgroundColor: colors.bgTertiary }}>
                  {['normal', 'dropset'].map((key) => (
                    <button key={key}
                      onClick={() => onSetTypeChange?.(key)}
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
              </div>
            )}

            {/* Nota */}
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

            {/* Vídeo */}
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
          <div className="pb-5" />
        </div>
      </div>

      {/* Footer: «Completar» solo en sesión y solo si la serie aún no está hecha (onComplete
          presente). Anota + completa de una; deshabilitado si los datos no son válidos (mismo
          gate que el check). Cerrar sin pulsarlo NO completa (solo autoguarda). */}
      {onComplete && (
        <div className="px-5 pt-3 pb-5 shrink-0" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!canComplete}
            onClick={() => onComplete({ notes: note.trim() || null })}
          >
            {t('workout:set.complete')}
          </Button>
        </div>
      )}
    </Modal>
  )
}

export default SetDetailsModal
