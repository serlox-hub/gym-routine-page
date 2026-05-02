import { useTranslation } from 'react-i18next'
import { ChevronDown, CheckCircle2 } from 'lucide-react'
import { DropdownMenu } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { getMuscleGroupName } from '@gym/shared'

function MetaPill({ children }) {
  return (
    <span
      style={{
        backgroundColor: colors.bgPrimary,
        color: colors.textSecondary,
        fontSize: 11,
        padding: '3px 8px',
        borderRadius: 6,
        fontWeight: 500,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function ExerciseCardHeader({
  exerciseName,
  muscleGroup,
  series,
  reps,
  rir,
  rest_seconds,
  collapsed,
  isCompleted = false,
  onToggleCollapse,
  menuItems,
}) {
  const { t } = useTranslation()
  const muscleGroupLabel = getMuscleGroupName(muscleGroup)

  const setsRepsParts = []
  if (series > 0 && reps) setsRepsParts.push(`${series} × ${reps}`)
  if (rir != null) setsRepsParts.push(`@${rir}`)
  const setsRepsText = setsRepsParts.join(' · ')

  return (
    <div
      className="flex items-start gap-3"
      onClick={onToggleCollapse}
      style={{ cursor: 'pointer' }}
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold mb-1.5 truncate" style={{ color: colors.textPrimary, fontSize: 15 }}>
          {exerciseName}
        </h4>
        <div
          className="flex items-center gap-1.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          {!collapsed && muscleGroupLabel && <MetaPill>{muscleGroupLabel}</MetaPill>}
          {setsRepsText && <MetaPill>{setsRepsText}</MetaPill>}
          {rest_seconds > 0 && <MetaPill>{rest_seconds}s</MetaPill>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isCompleted && <CheckCircle2 size={18} color={colors.success} />}
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            aria-label={t('common:buttons.next')}
          >
            <ChevronDown size={18} color={colors.textMuted} />
          </button>
        ) : (
          menuItems && <DropdownMenu triggerSize={16} items={menuItems} />
        )}
      </div>
    </div>
  )
}

export default ExerciseCardHeader
