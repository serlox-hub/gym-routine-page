import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Share2, Download, X } from 'lucide-react'
import { useCompletedSessionCount } from '@gym/shared'
import { colors } from '../../lib/styles.js'
import { useShareWorkoutSummary } from '../../hooks/useShareWorkoutSummary.js'
import WorkoutSummaryCard from './WorkoutSummaryCard.jsx'

function WorkoutSummaryModal({ summaryData, onClose }) {
  const { t } = useTranslation()
  const cardRef = useRef(null)
  const { generateAndShare, generateAndDownload, isGenerating } = useShareWorkoutSummary()
  const { data: sessionCount } = useCompletedSessionCount()

  if (!summaryData) return null

  const handleShare = () => {
    generateAndShare(cardRef.current, summaryData.date)
  }

  const handleDownload = () => {
    generateAndDownload(cardRef.current, summaryData.date)
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: colors.overlay }}>
      {/* Copia a tamaño real fuera de pantalla para captura */}
      <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1 }}>
        <WorkoutSummaryCard ref={cardRef} summaryData={summaryData} sessionNumber={sessionCount} />
      </div>

      <div
        className="flex flex-col items-center justify-center"
        style={{ position: 'absolute', inset: 0 }}
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <X size={20} style={{ color: colors.textSecondary }} />
        </button>

        {/* Preview (scaled down to fit viewport) */}
        <div
          className="flex-1 flex items-center justify-center w-full overflow-hidden py-16 px-4"
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            transform: 'scale(0.55)',
            transformOrigin: 'center center',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            flexShrink: 0,
          }}>
            <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="w-full max-w-sm px-4 pb-8 flex gap-3"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm"
            style={{
              backgroundColor: colors.bgTertiary,
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Download size={16} />
            {t('common:buttons.download')}
          </button>
          <button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm"
            style={{
              backgroundColor: colors.accent,
              color: colors.white,
            }}
          >
            <Share2 size={16} />
            {isGenerating ? t('common:buttons.loading') : t('common:buttons.share')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default WorkoutSummaryModal
