import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'

function ExerciseProgressBar({ completed, total, elapsedTime, pct, gymSlot = null }) {
  const { t } = useTranslation()
  if (total <= 0) return null
  const fillPct = pct ?? Math.round((completed / total) * 100)
  return (
    <div style={{ paddingTop: 8, paddingBottom: 12 }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="truncate" style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>
          {t('workout:session.exerciseProgress', { current: completed, total })}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {gymSlot}
          {elapsedTime && (
            <span style={{ color: colors.textSecondary, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              {elapsedTime}
            </span>
          )}
        </div>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 6, backgroundColor: colors.bgTertiary }}>
        <div className="h-full rounded-full" style={{ width: `${fillPct}%`, backgroundColor: colors.success, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}

export default ExerciseProgressBar
