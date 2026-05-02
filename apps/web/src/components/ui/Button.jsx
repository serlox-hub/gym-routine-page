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
    border: '1px solid rgba(248, 81, 73, 0.4)',
  },
}

const SIZES = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
}

function Button({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }) {
  return (
    <button
      className={`font-medium rounded-lg transition-opacity ${SIZES[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
      style={VARIANTS[variant]}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
