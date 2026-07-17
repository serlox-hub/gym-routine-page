import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles.js'

function ExerciseProgressBar({ setsCompleted, setsTotal, segments = [], elapsedTime, gymSlot = null }) {
  const { t } = useTranslation()
  if (setsTotal <= 0) return null
  return (
    <div style={{ paddingTop: 8, paddingBottom: 12 }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="truncate" style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>
          {t('workout:session.setProgress', { current: setsCompleted, total: setsTotal })}
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
      {/* Un tramo por ejercicio; ancho ∝ nº de series para que el relleno global siga siendo % de series */}
      <div className="flex w-full" style={{ height: 6, gap: 2 }}>
        {segments.map((seg, i) => (
          <div
            key={seg.sessionExerciseId ?? i}
            className="rounded-full overflow-hidden"
            style={{ flexGrow: seg.setsTotal, flexBasis: 0, backgroundColor: colors.bgTertiary }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${seg.fillPct}%`,
                backgroundColor: colors.success,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExerciseProgressBar
