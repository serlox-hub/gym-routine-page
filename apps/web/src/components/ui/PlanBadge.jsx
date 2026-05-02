import { colors } from '../../lib/styles.js'

function PlanBadge({ isPremium }) {
  if (isPremium) {
    return (
      <span
        className="px-2 py-0.5 text-xs font-medium rounded-full"
        style={{ backgroundColor: colors.successBg, color: colors.success }}
      >
        Premium
      </span>
    )
  }

  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded-full"
      style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
    >
      Standard
    </span>
  )
}

export default PlanBadge
