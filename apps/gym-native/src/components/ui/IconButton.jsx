import { Pressable, View, StyleSheet } from 'react-native'
import { colors, design } from '../../lib/styles'
import LoadingSpinner from './LoadingSpinner'

// Visible circle of `filled`, inside the 44pt box.
const FILLED_SIZE = 32
const DIMMED_OPACITY = 0.4

/**
 * Icon-only tap control: a `design.minTouchTarget` square (see CLAUDE.md) with the icon centred.
 * The visible part may be smaller (`filled` paints a 32pt circle); the box is not. A real box and
 * no `hitSlop`: a `hitSlop` outside the parent gets no touches on Android.
 *
 * `disabled`/`loading` are transient (mutation in flight): dimmed and not pressable, `loading`
 * with a spinner instead of the icon. `blocked` is the "botón bloqueado" pattern: dimmed icon, no
 * press feedback, and the press still fires so the caller can say why.
 */
export default function IconButton({
  icon: Icon,
  label,
  onPress,
  iconSize = 18,
  color = colors.textSecondary,
  filled = false,
  disabled = false,
  loading = false,
  blocked = false,
  className = '',
  style,
  ...rest
}) {
  const isTransient = disabled || loading
  const isBlocked = blocked && !isTransient

  return (
    <Pressable
      onPress={onPress}
      disabled={isTransient}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isTransient }}
      className={`items-center justify-center ${isTransient || isBlocked ? '' : 'active:opacity-70'} ${className}`}
      style={{ width: design.minTouchTarget, height: design.minTouchTarget, ...StyleSheet.flatten(style) }}
      {...rest}
    >
      <View
        style={{
          width: FILLED_SIZE,
          height: FILLED_SIZE,
          borderRadius: FILLED_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: filled ? colors.bgTertiary : 'transparent',
          opacity: isTransient ? DIMMED_OPACITY : 1,
        }}
      >
        {loading
          ? <LoadingSpinner inline />
          : (
            <View style={isBlocked ? { opacity: DIMMED_OPACITY } : null}>
              <Icon size={iconSize} color={color} />
            </View>
          )}
      </View>
    </Pressable>
  )
}
