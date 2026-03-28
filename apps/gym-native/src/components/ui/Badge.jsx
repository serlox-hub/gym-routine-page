import { Text } from 'react-native'
import { colors } from '../../lib/styles'

const VARIANTS = {
  default: { backgroundColor: colors.bgTertiary, color: colors.textSecondary },
  accent: { backgroundColor: colors.accentBg, color: colors.accent },
  purple: { backgroundColor: colors.purpleBg, color: colors.purple },
  success: { backgroundColor: colors.successBg, color: colors.success },
  warning: { backgroundColor: colors.warningBg, color: colors.warning },
  danger: { backgroundColor: colors.dangerBg, color: colors.danger },
}

export default function Badge({ children, variant = 'default', className = '' }) {
  const v = VARIANTS[variant] || VARIANTS.default

  return (
    <Text
      className={`px-2 py-0.5 text-xs font-medium rounded overflow-hidden ${className}`}
      style={v}
    >
      {children}
    </Text>
  )
}
