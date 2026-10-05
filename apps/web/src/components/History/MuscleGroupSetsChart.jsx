import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { countSessionSetsByMuscleGroup, getMuscleGroupColor, getMuscleGroupName } from '@gym/shared'
import { colors } from '../../lib/styles.js'

function MuscleGroupSetsChart({ exercises }) {
  const { t } = useTranslation()
  // Expanded by default, unlike VolumeSummary: it replaces muscle-group chips that were always
  // visible, so starting collapsed would hide what the header used to show.
  const [isExpanded, setIsExpanded] = useState(true)
  const rows = useMemo(() => countSessionSetsByMuscleGroup(exercises), [exercises])

  if (rows.length === 0) return null

  return (
    // No top margin and no gap under the toggle: its 44px box already puts 12px around the title.
    <section>
      <button
        className="flex items-center gap-2 w-full min-h-11"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <h3 className="text-sm font-medium" style={{ color: colors.textSecondary }}>
          {t('workout:session.setsByMuscleGroup')}
        </h3>
        <ChevronDown
          size={14}
          color={colors.textSecondary}
          className="transition-transform"
          style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>
      {isExpanded && (
        <div className="space-y-2.5">
          {rows.map(({ muscleGroup, sets, ratio }) => {
            const color = getMuscleGroupColor(muscleGroup.name)
            return (
              <div key={muscleGroup.id} className="flex items-center gap-3">
                <div className="w-28 flex-shrink-0">
                  <span className="text-xs font-medium" style={{ color }}>{getMuscleGroupName(muscleGroup)}</span>
                </div>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
                  <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: color }} />
                </div>
                <div className="w-16 flex-shrink-0 text-right">
                  <span className="text-xs font-bold whitespace-nowrap" style={{ color: colors.textPrimary }}>{t('common:home.nSets', { count: sets })}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default MuscleGroupSetsChart
