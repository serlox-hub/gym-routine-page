import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Share2, Download, Home } from 'lucide-react'
import { useCompletedSessionCount } from '@gym/shared'
import { colors } from '../lib/styles.js'
import { useShareWorkoutSummary } from '../hooks/useShareWorkoutSummary.js'
import WorkoutSummaryCard from '../components/Workout/WorkoutSummaryCard.jsx'

export default function WorkoutSummary() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const cardRef = useRef(null)
  const { generateAndShare, generateAndDownload, isGenerating } = useShareWorkoutSummary()
  const { data: sessionCount } = useCompletedSessionCount()

  const summaryData = location.state?.summaryData

  useEffect(() => {
    if (!summaryData) navigate('/', { replace: true })
  }, [summaryData, navigate])

  if (!summaryData) return <Navigate to="/" replace />

  const handleShare = () => generateAndShare(cardRef.current, summaryData.date)
  const handleDownload = () => generateAndDownload(cardRef.current, summaryData.date)
  const handleHome = () => navigate('/', { replace: true })

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.bgPrimary }}>
      {/* Card a tamaño real fuera de pantalla para captura */}
      <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1 }}>
        <WorkoutSummaryCard ref={cardRef} summaryData={summaryData} sessionNumber={sessionCount} />
      </div>

      <header className="px-4 pt-6 pb-2 text-center">
        <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
          {t('workout:summary.title')}
        </h1>
      </header>

      <div className="flex-1 flex items-center justify-center overflow-hidden py-4 px-4">
        <div style={{
          transform: 'scale(0.55)',
          transformOrigin: 'center center',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: `0 20px 60px ${colors.overlaySoft}`,
          flexShrink: 0,
        }}>
          <WorkoutSummaryCard summaryData={summaryData} sessionNumber={sessionCount} />
        </div>
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
          onClick={handleHome}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm"
          style={{
            backgroundColor: colors.bgTertiary,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
          }}
        >
          <Home size={16} />
          {t('common:nav.home')}
        </button>
      </div>
    </div>
  )
}
