import { colors } from '../../lib/styles.js'

const VARIANTS = {
  default: {
    backgroundColor: colors.bgTertiary,
    color: colors.textSecondary
  },
  accent: {
    backgroundColor: colors.accentBg,
    color: colors.accent
  },
  purple: {
    backgroundColor: colors.purpleBg,
    color: colors.purple
  },
  success: {
    backgroundColor: colors.successBg,
    color: colors.success
  },
  warning: {
    backgroundColor: colors.warningBg,
    color: colors.warning
  },
  danger: {
    backgroundColor: colors.dangerBg,
    color: colors.danger
  },
}

function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded ${className}`}
      style={VARIANTS[variant]}
    >
      {children}
    </span>
  )
}

export default Badge
