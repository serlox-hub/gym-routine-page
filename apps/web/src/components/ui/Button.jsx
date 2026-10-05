import { colors } from '../../lib/styles.js'

const VARIANTS = {
  primary: {
    backgroundColor: colors.actionPrimary,
    color: colors.textDark,
  },
  secondary: {
    backgroundColor: colors.bgTertiary,
    color: colors.textLight,
    border: `1px solid ${colors.border}`,
  },
  danger: {
    backgroundColor: colors.dangerBg,
    color: colors.danger,
    border: `1px solid ${colors.danger}66`,
  },
}

// min-h-11: 44px, the touch-target minimum (CLAUDE.md). `lg` already clears it.
const SIZES = {
  sm: 'min-h-11 px-3 py-1 text-sm',
  md: 'min-h-11 px-4 py-2',
  lg: 'px-6 py-3 text-lg',
}

const BLOCKED_OPACITY = 0.5

// `blocked`: not available, but it still answers (the "botón bloqueado" pattern in CLAUDE.md):
// dimmed with no hover, and the click goes through so the caller can say why. `disabled` is for
// transient states only. On the solid lime of `primary` only the content is dimmed: translucent
// lime turns olive.
function Button({ children, variant = 'primary', size = 'md', className = '', disabled, blocked = false, ...props }) {
  const isBlocked = blocked && !disabled
  const dimsContentOnly = isBlocked && variant === 'primary'
  const stateClassName = disabled
    ? 'opacity-50 cursor-not-allowed'
    : isBlocked ? 'cursor-pointer' : 'hover:opacity-80'
  const style = isBlocked && !dimsContentOnly
    ? { ...VARIANTS[variant], opacity: BLOCKED_OPACITY }
    : VARIANTS[variant]

  return (
    <button
      className={`font-medium rounded-lg transition-opacity ${SIZES[size]} ${className} ${stateClassName}`}
      style={style}
      disabled={disabled}
      {...props}
    >
      {dimsContentOnly ? <span style={{ opacity: BLOCKED_OPACITY }}>{children}</span> : children}
    </button>
  )
}

export default Button
