import { Pressable, Text, ActivityIndicator } from 'react-native'
import { colors, design } from '../../lib/styles'

const VARIANT_STYLES = {
  primary: { bg: colors.actionPrimary, text: colors.textDark },
  secondary: { bg: colors.bgTertiary, text: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  danger: { bg: colors.dangerBg, text: colors.danger, borderWidth: 1, borderColor: `${colors.danger}66` },
  ghost: { bg: 'transparent', text: colors.textSecondary },
}

const SIZES = {
  sm: { container: 'px-3 py-1.5', text: 'text-sm' },
  md: { container: 'px-4 py-2.5', text: 'text-base' },
  lg: { container: 'px-6 py-3.5', text: 'text-lg' },
}

// `blocked`: not available, but it still answers (the "botón bloqueado" pattern in CLAUDE.md):
// dimmed with no press feedback, and the press goes through so the caller can say why.
// `disabled`/`loading` are for transient states only. On the solid lime of `primary` only the
// label is dimmed: translucent lime turns olive.
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  textClassName = '',
  disabled,
  loading,
  blocked = false,
  onPress,
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary
  const s = SIZES[size] || SIZES.md
  const isTransient = disabled || loading
  const isBlocked = blocked && !isTransient
  const dimsLabelOnly = isBlocked && v === VARIANT_STYLES.primary

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      className={`rounded-lg items-center justify-center flex-row ${s.container} ${isTransient ? 'opacity-50' : isBlocked ? '' : 'active:opacity-70'} ${className}`}
      style={{
        backgroundColor: v.bg,
        borderWidth: v.borderWidth || 0,
        borderColor: v.borderColor || 'transparent',
        // `md` and `lg` already clear the touch-target minimum with their padding; `sm` does not.
        ...(size === 'sm' ? { minHeight: design.minTouchTarget } : null),
        // Only when set: an `opacity: undefined` would override the className's `opacity-50`.
        ...(isBlocked && !dimsLabelOnly ? { opacity: design.blockedOpacity } : null),
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : typeof children === 'string' ? (
        <Text className={`font-semibold text-center ${s.text} ${textClassName}`} style={{ color: v.text, ...(dimsLabelOnly ? { opacity: design.blockedOpacity } : null) }}>
          {children}
        </Text>
      ) : (
        <Text className={`font-semibold text-center ${s.text} ${textClassName}`} style={{ color: v.text, ...(dimsLabelOnly ? { opacity: design.blockedOpacity } : null) }}>
          {children}
        </Text>
      )}
    </Pressable>
  )
}
