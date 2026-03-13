import { Pressable, Text, ActivityIndicator } from 'react-native'

const VARIANTS = {
  primary: {
    bg: 'bg-[#238636]',
    text: 'text-white',
    border: '',
  },
  secondary: {
    bg: 'bg-surface-block',
    text: 'text-primary',
    border: 'border border-border',
  },
  danger: {
    bg: 'bg-danger-bg',
    text: 'text-danger',
    border: 'border border-danger/40',
  },
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
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-lg items-center justify-center flex-row ${v.bg} ${v.border} ${s.container} ${disabled || loading ? 'opacity-50' : 'active:opacity-70'} ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#ffffff' : '#e6edf3'} />
      ) : (
        <Text className={`font-semibold text-center ${v.text} ${s.text} ${textClassName}`}>
          {children}
        </Text>
      )}
    </Pressable>
  )
}
