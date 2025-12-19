import { FileText, Video, Loader2, AlertCircle } from 'lucide-react'

const RIR_LABELS = {
  [-1]: 'F',
  0: '0',
  1: '1',
  2: '2',
  3: '3+',
}

function NotesBadge({ rir, hasNotes, hasVideo, isUploadingVideo, videoUploadError, onRetryUpload, onClick }) {
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
          <AlertCircle size={12} style={{ color: '#f85149' }} />
        </button>
      )
    }
    if (isUploadingVideo) {
      return <Loader2 size={12} className="animate-spin" style={{ color: '#a371f7' }} />
    }
    if (hasVideo) {
      return <Video size={12} style={{ color: '#a371f7' }} />
    }
    return null
  }

  const content = (
    <>
      {hasRir && (
        <span className="text-xs font-bold" style={{ color: '#a371f7' }}>
          {RIR_LABELS[rir] ?? rir}
        </span>
      )}
      {hasNotes && <FileText size={12} style={{ color: '#a371f7' }} />}
      {renderVideoIcon()}
    </>
  )

  const bgColor = videoUploadError
    ? 'rgba(248, 81, 73, 0.15)'
    : 'rgba(163, 113, 247, 0.15)'

  if ((hasNotes || hasVideo) && onClick) {
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
