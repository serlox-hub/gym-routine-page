import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Share2, Download, Home, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCompletedSessionCount } from '@gym/shared'
import { colors } from '../lib/styles.js'
import { useShareWorkoutSummary } from '../hooks/useShareWorkoutSummary.js'
import WorkoutSummaryCard, { SUMMARY_CARD_ASPECT } from '../components/Workout/WorkoutSummaryCard.jsx'
import PRCard, { PR_CARD_ASPECT } from '../components/Workout/PRCard.jsx'

// El preview se acota al menor entre el ancho disponible y un máximo razonable
const MAX_PREVIEW_W = 360

export default function WorkoutSummary() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { generateAndShare, generateAndDownload, isGenerating } = useShareWorkoutSummary()
  const { data: sessionCount } = useCompletedSessionCount()

  const summaryData = location.state?.summaryData
  const fromHistory = location.state?.fromHistory

  // Slides: tarjeta resumen + 1 PR card por cada rep-PR detectado.
  const slides = useMemo(() => {
    if (!summaryData) return []
    const result = [{ kind: 'summary' }]
    for (const pr of summaryData.prs || []) {
      for (const detail of pr.details || []) {
        if (detail.type === 'repPR') {
          result.push({ kind: 'pr', exerciseName: pr.exerciseName, record: detail })
        }
      }
    }
    return result
  }, [summaryData])

  // Refs a las tarjetas full-size (off-screen) para captura
  const cardRefs = useRef([])
  cardRefs.current = slides.map((_, i) => cardRefs.current[i] || { current: null })

  const scrollerRef = useRef(null)
  const carouselAreaRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [containerW, setContainerW] = useState(0)
  const [containerH, setContainerH] = useState(0)

  // Calculamos previewW respetando ancho y alto del contenedor.
  // El summary card es el más alto (aspect menor); su altura limita.
  const tallestAspect = Math.min(SUMMARY_CARD_ASPECT, PR_CARD_ASPECT)
  const previewW = (() => {
    const maxByW = Math.min(containerW || MAX_PREVIEW_W, MAX_PREVIEW_W)
    if (!containerH) return maxByW
    const availH = containerH - 60 // dots + breathing room
    const maxByH = availH * tallestAspect
    return Math.max(120, Math.min(maxByW, maxByH))
  })()
  const summaryPreviewH = previewW / SUMMARY_CARD_ASPECT
  const prPreviewH = previewW / PR_CARD_ASPECT
  const slideH = Math.max(summaryPreviewH, prPreviewH)

  useEffect(() => {
    if (!summaryData) navigate('/', { replace: true })
  }, [summaryData, navigate])

  // Medimos el contenedor padre (no el scroller) para evitar feedback loop:
  // si midiéramos el scroller, su altura depende de slideH que depende de
  // containerH y las cards se encogen progresivamente.
  useEffect(() => {
    const el = carouselAreaRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width)
      setContainerH(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const slideStep = previewW + 16
    const idx = Math.round(el.scrollLeft / slideStep)
    if (idx !== currentIndex && idx >= 0 && idx < slides.length) {
      setCurrentIndex(idx)
    }
  }, [currentIndex, slides.length, previewW])

  const goToSlide = useCallback((idx) => {
    const el = scrollerRef.current
    if (!el) return
    const slideStep = previewW + 16
    el.scrollTo({ left: idx * slideStep, behavior: 'smooth' })
  }, [previewW])

  if (!summaryData) return <Navigate to="/" replace />

  const handleShare = () => generateAndShare(cardRefs.current[currentIndex]?.current, summaryData.date)
  const handleDownload = () => generateAndDownload(cardRefs.current[currentIndex]?.current, summaryData.date)
  const handleDismiss = () => {
    if (fromHistory) navigate(-1)
    else navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.bgPrimary }}>
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
                exerciseName={slide.exerciseName}
                record={slide.record}
                date={summaryData.date}
              />
            )}
          </div>
        ))}
      </div>

      <header className="px-4 pt-6 pb-2 text-center">
        <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          {t('workout:summary.title')}
        </h1>
      </header>

      {/* Carrusel scrolleable horizontal */}
      <div ref={carouselAreaRef} className="flex-1 flex flex-col items-center justify-center overflow-hidden py-4">
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
            paddingInline: `calc(50% - ${previewW / 2}px)`,
            width: '100%',
            flexShrink: 0,
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: previewW,
                height: slideH,
                scrollSnapAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {slide.kind === 'summary' ? (
                <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} width={previewW} />
              ) : (
                <PRCard exerciseName={slide.exerciseName} record={slide.record} date={summaryData.date} width={previewW} />
              )}
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
        className="w-full max-w-md mx-auto px-4 pt-3 pb-6 flex flex-col gap-3"
        style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary }}
      >
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm disabled:opacity-50"
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
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm disabled:opacity-50"
            style={{ backgroundColor: colors.success, color: colors.textDark }}
          >
            <Share2 size={16} />
            {isGenerating ? t('common:buttons.loading') : t('common:buttons.share')}
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm"
          style={{
            backgroundColor: colors.bgTertiary,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
          }}
        >
          {fromHistory ? <X size={16} /> : <Home size={16} />}
          {fromHistory ? t('common:buttons.close') : t('common:nav.home')}
        </button>
      </div>
    </div>
  )
}
