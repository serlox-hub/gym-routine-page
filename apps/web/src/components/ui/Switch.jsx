import { colors } from '../../lib/styles.js'

const THUMB_OFFSET_OFF = 4
const THUMB_OFFSET_ON = 24

/**
 * On/off switch with the app's own look (same on native). The track is 28px tall, the button
 * around it 44 (h-11, the smallest tap target), so it can be tapped without the track growing.
 *
 * @param {boolean} checked
 * @param {function} onChange - Called with the new value
 * @param {boolean} [disabled]
 * @param {string} [accessibilityLabel] - Accessible name when no visible label is tied to it
 */
function Switch({ checked, onChange, disabled = false, accessibilityLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={accessibilityLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="shrink-0 h-11 flex items-center"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <span
        className="block w-12 h-7 rounded-full relative transition-colors"
        style={{ backgroundColor: checked ? colors.success : colors.border }}
      >
        <span
          className="block w-5 h-5 rounded-full absolute top-1 transition-all"
          style={{ backgroundColor: colors.bgPrimary, left: checked ? THUMB_OFFSET_ON : THUMB_OFFSET_OFF }}
        />
      </span>
    </button>
  )
}

export default Switch
