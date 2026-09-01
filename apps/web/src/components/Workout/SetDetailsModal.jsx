import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Video, X, ChevronRight } from 'lucide-react'
import { Modal, Button, LoadingSpinner } from '../ui/index.js'
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
 * nada abre otra superficie. RIR y tipo son CONTROLADOS (viven en el padre vía
 * onRirChange/onSetTypeChange → persisten al instante, patrón de #8). La nota es local y se
 * confirma al cerrar (autosave). El vídeo (issue #31) se dispara al elegir/quitar, YA — no
 * espera al cierre (`onSelectVideo`/`onRemoveVideo`): así puede subir mientras el usuario sigue
 * en la hoja, complete o no la serie todavía. Ver DECISIONS.
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

  // Elegir un archivo dispara la subida YA (issue #31; ver SetRow/useSetVideoUpload) — no espera
  // a cerrar la hoja. La vista previa local (blob) es instantánea, independiente de la red.
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
      onSelectVideo?.(file)
    }
  }

  const handleRemoveVideo = () => {
    setVideoFile(null)
    setVideoUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
                    {/* Progreso de subida (issue #31): visible sin salir de la hoja mientras el
                        botón «Completar» está bloqueado por isUploadingVideo. */}
                    {isUploadingVideo && (
                      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-2"
                        style={{ backgroundColor: colors.overlay }}>
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, backgroundColor: colors.bgTertiary }}>
                          <div className="h-full rounded-full" style={{ width: `${uploadProgress}%`, backgroundColor: colors.purple, transition: 'width 150ms linear' }} />
                        </div>
                        <span style={{ color: colors.white, fontSize: 11, fontWeight: 700 }}>{uploadProgress}%</span>
                      </div>
                    )}
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
          <div className="pb-5" />
        </div>
      </div>

      {/* Footer: «Completar» solo en sesión y solo si la serie aún no está hecha (onComplete
          presente). Anota + completa de una; deshabilitado si los datos no son válidos (mismo
          gate que el check) o mientras sube un vídeo recién elegido (issue #31: completar sin
          esperar lo dejaría huérfano, ver useSetVideoUpload) — «tras la subida, o sin ella».
          Cerrar sin pulsarlo NO completa (solo autoguarda la nota). */}
      {onComplete && (
        <div className="px-5 pt-3 pb-5 shrink-0" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!canComplete || isUploadingVideo}
            onClick={() => onComplete({ notes: note.trim() || null })}
          >
            {isUploadingVideo ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner inline />
                {t('workout:set.videoUploading')}
              </span>
            ) : t('workout:set.complete')}
          </Button>
        </div>
      )}
    </Modal>
  )
}

export default SetDetailsModal
