import { FileText, Video, AlertCircle } from 'lucide-react'
import { colors } from '../../lib/styles.js'

const RIR_LABELS = {
  [-1]: 'F',
  0: '0',
  1: '1',
  2: '2',
  3: '3+',
}

function NotesBadge({ rir, hasNotes, hasVideo, isUploadingVideo, uploadProgress = 0, videoUploadError, onRetryUpload, onClick }) {
  const hasRir = rir !== null && rir !== undefined

  if (!hasRir && !hasNotes && !hasVideo && !isUploadingVideo && !videoUploadError) return null

  // Icono de video: error > subiendo > video existente
  const renderVideoIcon = () => {
    if (videoUploadError) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRetryUpload?.()
          }}
          className="flex items-center hover:opacity-80"
          title="Error al subir. Toca para reintentar"
        >
          <AlertCircle size={12} style={{ color: colors.danger }} />
        </button>
      )
    }
    if (isUploadingVideo) {
      return (
        <span className="text-xs font-medium" style={{ color: colors.purple }}>
          {uploadProgress}%
        </span>
      )
    }
    if (hasVideo) {
      return <Video size={12} style={{ color: colors.purple }} />
    }
    return null
  }

  const content = (
    <>
      {hasRir && (
        <span className="text-xs font-bold" style={{ color: colors.purple }}>
          {RIR_LABELS[rir] ?? rir}
        </span>
      )}
      {hasNotes && <FileText size={12} style={{ color: colors.purple }} />}
      {renderVideoIcon()}
    </>
  )

  const bgColor = videoUploadError
    ? 'rgba(248, 81, 73, 0.15)'
    : colors.purpleBg

  if ((hasRir || hasNotes || hasVideo) && onClick) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:opacity-80"
        style={{ backgroundColor: bgColor }}
        title="Ver detalles"
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded"
      style={{ backgroundColor: bgColor }}
    >
      {content}
    </div>
  )
}

export default NotesBadge
