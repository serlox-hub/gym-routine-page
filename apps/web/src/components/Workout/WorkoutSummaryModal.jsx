import { useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Share2, Download, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCompletedSessionCount } from '@gym/shared'
import { colors } from '../../lib/styles.js'
import { useShareWorkoutSummary } from '../../hooks/useShareWorkoutSummary.js'
import WorkoutSummaryCard from './WorkoutSummaryCard.jsx'
import PRCard from './PRCard.jsx'

const CARD_W = 540
const CARD_H = 960
const SCALE = 0.55
const SCALED_W = CARD_W * SCALE
const SCALED_H = CARD_H * SCALE

function WorkoutSummaryModal({ summaryData, onClose }) {
  const { t } = useTranslation()
  const { generateAndShare, generateAndDownload, isGenerating } = useShareWorkoutSummary()
  const { data: sessionCount } = useCompletedSessionCount()

  const slides = useMemo(() => {
    if (!summaryData) return []
    const result = [{ kind: 'summary' }]
    for (const pr of summaryData.prs || []) {
      result.push({ kind: 'pr', pr })
    }
    return result
  }, [summaryData])

  const cardRefs = useRef([])
  cardRefs.current = slides.map((_, i) => cardRefs.current[i] || { current: null })

  const scrollerRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const slideStep = SCALED_W + 16
    const idx = Math.round(el.scrollLeft / slideStep)
    if (idx !== currentIndex && idx >= 0 && idx < slides.length) {
      setCurrentIndex(idx)
    }
  }, [currentIndex, slides.length])

  const goToSlide = useCallback((idx) => {
    const el = scrollerRef.current
    if (!el) return
    const slideStep = SCALED_W + 16
    el.scrollTo({ left: idx * slideStep, behavior: 'smooth' })
  }, [])

  if (!summaryData) return null

  const handleShare = () => generateAndShare(cardRefs.current[currentIndex]?.current, summaryData.date)
  const handleDownload = () => generateAndDownload(cardRefs.current[currentIndex]?.current, summaryData.date)

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: colors.overlay }}>
      {/* Cards a tamaño real fuera de pantalla para captura */}
      <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1 }}>
        {slides.map((slide, i) => (
          <div key={i}>
            {slide.kind === 'summary' ? (
              <WorkoutSummaryCard
                ref={cardRefs.current[i]}
                summaryData={summaryData}
                sessionNumber={sessionCount}
              />
            ) : (
              <PRCard
                ref={cardRefs.current[i]}
                pr={slide.pr}
                date={summaryData.date}
              />
            )}
          </div>
        ))}
      </div>

      <div
        className="flex flex-col items-center justify-center"
        style={{ position: 'absolute', inset: 0 }}
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <X size={20} style={{ color: colors.textSecondary }} />
        </button>

        <div
          className="flex-1 flex flex-col items-center justify-center w-full overflow-hidden py-12 px-4"
          onClick={e => e.stopPropagation()}
        >
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              paddingInline: `calc(50% - ${SCALED_W / 2}px)`,
              width: '100%',
            }}
          >
            {slides.map((slide, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  width: SCALED_W,
                  height: SCALED_H,
                  scrollSnapAlign: 'center',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
                  {slide.kind === 'summary' ? (
                    <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
                  ) : (
                    <PRCard pr={slide.pr} date={summaryData.date} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {slides.length > 1 && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => goToSlide(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="p-2 rounded-full disabled:opacity-30"
                style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary }}
                aria-label="Previous"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: i === currentIndex ? colors.success : colors.bgTertiary,
                      transition: 'background-color 0.2s',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => goToSlide(Math.min(slides.length - 1, currentIndex + 1))}
                disabled={currentIndex === slides.length - 1}
                className="p-2 rounded-full disabled:opacity-30"
                style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary }}
                aria-label="Next"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

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
              backgroundColor: colors.success,
              color: colors.textDark,
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
