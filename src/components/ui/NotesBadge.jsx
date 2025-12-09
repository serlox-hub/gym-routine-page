import { FileText, Video } from 'lucide-react'

const RIR_LABELS = {
  [-1]: 'F',
  0: '0',
  1: '1',
  2: '2',
  3: '3+',
}

function NotesBadge({ rir, hasNotes, hasVideo, onClick }) {
  const hasRir = rir !== null && rir !== undefined

  if (!hasRir && !hasNotes && !hasVideo) return null

  const content = (
    <>
      {hasRir && (
        <span className="text-xs font-bold" style={{ color: '#a371f7' }}>
          {RIR_LABELS[rir] ?? rir}
        </span>
      )}
      {hasNotes && <FileText size={12} style={{ color: '#a371f7' }} />}
      {hasVideo && <Video size={12} style={{ color: '#a371f7' }} />}
    </>
  )

  if ((hasNotes || hasVideo) && onClick) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:opacity-80"
        style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)' }}
        title="Ver detalles"
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded"
      style={{ backgroundColor: 'rgba(163, 113, 247, 0.15)' }}
    >
      {content}
    </div>
  )
}

export default NotesBadge
