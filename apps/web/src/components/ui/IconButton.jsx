import { colors } from '../../lib/styles.js'
import LoadingSpinner from './LoadingSpinner.jsx'

// Visible circle of `filled`, inside the 44px box.
const FILLED_SIZE = 32
const DIMMED_OPACITY = 0.4

/**
 * Icon-only tap control: a 44×44 box (the touch-target minimum, see CLAUDE.md) with the icon
 * centred. The visible part may be smaller (`filled` paints a 32px circle); the box is not.
 *
 * `disabled`/`loading` are transient (mutation in flight): dimmed and not clickable, `loading`
 * with a spinner instead of the icon. `blocked` is the "botón bloqueado" pattern: dimmed icon, no
 * hover, and the click still fires so the caller can say why.
 *
 * `label` is the accessible name and nothing checks it here (no PropTypes in the repo): the e2e
 * touch-target guard fails on an icon-only control with an empty name.
 */
function IconButton({
  icon: Icon,
  label,
  onClick,
  iconSize = 18,
  color = colors.textSecondary,
  filled = false,
  disabled = false,
  loading = false,
  blocked = false,
  className = '',
  ...rest
}) {
  const isTransient = disabled || loading
  const isBlocked = blocked && !isTransient
  const stateClassName = isTransient ? 'cursor-not-allowed' : isBlocked ? 'cursor-pointer' : 'hover:opacity-80'

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={isTransient}
      className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-full transition-opacity ${stateClassName} ${className}`}
      {...rest}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{
          width: FILLED_SIZE,
          height: FILLED_SIZE,
          backgroundColor: filled ? colors.bgTertiary : undefined,
          opacity: isTransient ? DIMMED_OPACITY : 1,
        }}
      >
        {loading
          ? <LoadingSpinner inline />
          : <Icon size={iconSize} color={color} style={isBlocked ? { opacity: DIMMED_OPACITY } : undefined} />}
      </span>
    </button>
  )
}

export default IconButton
