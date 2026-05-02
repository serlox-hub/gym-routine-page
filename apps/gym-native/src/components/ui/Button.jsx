import { Pressable, Text, ActivityIndicator } from 'react-native'
import { colors } from '../../lib/styles'

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

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  textClassName = '',
  disabled,
  loading,
  onPress,
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.primary
  const s = SIZES[size] || SIZES.md

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-lg items-center justify-center flex-row ${s.container} ${disabled || loading ? 'opacity-50' : 'active:opacity-70'} ${className}`}
      style={{
        backgroundColor: v.bg,
        borderWidth: v.borderWidth || 0,
        borderColor: v.borderColor || 'transparent',
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : typeof children === 'string' ? (
        <Text className={`font-semibold text-center ${s.text} ${textClassName}`} style={{ color: v.text }}>
          {children}
        </Text>
      ) : (
        <Text className={`font-semibold text-center ${s.text} ${textClassName}`} style={{ color: v.text }}>
          {children}
        </Text>
      )}
    </Pressable>
  )
}
