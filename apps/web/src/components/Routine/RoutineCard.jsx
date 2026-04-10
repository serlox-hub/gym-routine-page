import { useTranslation } from 'react-i18next'
import { ChevronRight, Repeat, Layers } from 'lucide-react'
import { colors } from '../../lib/styles.js'

const CARD_RADIUS = 16
const CARD_PADDING = 16
const CARD_GAP = 14

function StatBadge({ icon: Icon, text }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        backgroundColor: colors.bgAlt,
        borderRadius: 8,
        padding: '5px 10px',
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      <Icon size={12} />
      {text}
    </span>
  )
}

function RoutineCard({ routine, isPinned, onClick }) {
  const { t } = useTranslation()

  return (
    <div
      className="cursor-pointer transition-colors"
      style={{
        backgroundColor: colors.bgSecondary,
        borderRadius: CARD_RADIUS,
        padding: CARD_PADDING,
        border: `1px solid ${isPinned ? colors.success : colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: CARD_GAP,
      }}
      onClick={onClick}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bgAlt}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bgSecondary}
    >
      {/* Top: Name + Chevron */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold" style={{ color: colors.textPrimary, fontSize: 16 }}>
            {routine.name}
          </h3>
        </div>
        <ChevronRight size={18} style={{ color: colors.textMuted, flexShrink: 0 }} />
      </div>

      {/* Description */}
      {routine.description && (
        <p
          className="text-xs line-clamp-2"
          style={{ color: colors.textSecondary, lineHeight: 1.35 }}
        >
          {routine.description}
        </p>
      )}

      {/* Stats badges */}
      <div className="flex gap-2">
        <StatBadge icon={Repeat} text={t('common:home.nDays', { count: routine.days_count || 0 })} />
        <StatBadge icon={Layers} text={t('common:home.nExercises', { count: routine.exercises_count || 0 })} />
      </div>
    </div>
  )
}

export default RoutineCard
