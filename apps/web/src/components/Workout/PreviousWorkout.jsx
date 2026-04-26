import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Video, Clock } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { usePreviousWorkout } from '../../hooks/useWorkout.js'
import SetNotesView from './SetNotesView.jsx'
import { MeasurementType, formatRelativeDate, formatSetValueByType } from '@gym/shared'

function formatPreviousSetValue(set, measurementType, weightUnit, timeUnit, distanceUnit) {
  if (measurementType === MeasurementType.WEIGHT_REPS && set.weight != null && set.reps != null) {
    return `${set.weight} × ${set.reps}`
  }
  return formatSetValueByType({ ...set, weightUnit }, measurementType, { timeUnit, distanceUnit })
}

function PreviousWorkout({ exerciseId, measurementType = MeasurementType.WEIGHT_REPS, weightUnit = 'kg', timeUnit = 's', distanceUnit = 'm' }) {
  const { t } = useTranslation()
  const { data: previous, isLoading } = usePreviousWorkout(exerciseId)
  const [selectedSet, setSelectedSet] = useState(null)

  if (isLoading) {
    return (
      <div className="rounded-lg p-3 animate-pulse" style={{ backgroundColor: colors.bgSecondary }}>
        <div className="h-3 rounded w-32 mb-2" style={{ backgroundColor: colors.bgTertiary }} />
        <div className="h-10 rounded w-full" style={{ backgroundColor: colors.bgTertiary }} />
      </div>
    )
  }

  if (!previous) {
    return (
      <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: colors.bgSecondary, color: colors.textSecondary }}>
        {t('workout:set.firstTime')}
      </div>
    )
  }

  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt }}>
      <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: colors.textSecondary }}>
        <Clock size={12} />
        <span>{t('workout:set.lastSession', { when: formatRelativeDate(previous.date) })}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {previous.sets.map((set, index) => {
          const hasNotes = !!set.notes
          const hasVideo = !!set.videoUrl
          const interactive = hasNotes || hasVideo
          const isDropset = set.setType === 'dropset'
          const valueText = formatPreviousSetValue(set, measurementType, weightUnit, timeUnit, distanceUnit)

          return (
            <button
              key={index}
              onClick={interactive ? () => setSelectedSet(set) : undefined}
              disabled={!interactive}
              className="shrink-0 rounded-lg px-3 py-2 text-center disabled:cursor-default"
              style={{
                backgroundColor: colors.border,
                border: isDropset ? `1px solid ${colors.orange}` : 'none',
                minWidth: 76,
              }}
            >
              <div className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                {valueText}
              </div>
              <div className="flex items-center justify-center gap-1 mt-0.5" style={{ minHeight: 14 }}>
                {set.rir != null && (
                  <span className="text-[11px] font-medium" style={{ color: colors.textMuted }}>
                    @{set.rir}
                  </span>
                )}
                {hasNotes && <FileText size={11} color={colors.textMuted} />}
                {hasVideo && <Video size={11} color={colors.textMuted} />}
              </div>
            </button>
          )
        })}
      </div>

      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        rir={selectedSet?.rir}
        measurementType={measurementType}
        notes={selectedSet?.notes}
      />
    </div>
  )
}

export default PreviousWorkout
