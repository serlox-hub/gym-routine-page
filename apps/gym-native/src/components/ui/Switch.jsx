import { View, Pressable } from 'react-native'
import { colors, design } from '../../lib/styles'

const TRACK_WIDTH = 48
const TRACK_HEIGHT = 28
const THUMB_SIZE = 20
const THUMB_OFFSET_OFF = 4
const THUMB_OFFSET_ON = 24

/**
 * On/off switch with the app's own look (same on web), not React Native's OS-styled Switch.
 * The track is 28 tall, the pressable around it design.minTouchTarget, so it can be tapped
 * without the track growing.
 *
 * @param {boolean} checked
 * @param {function} onChange - Called with the new value
 * @param {boolean} [disabled]
 * @param {string} [accessibilityLabel] - Accessible name when no visible label is tied to it
 */
export default function Switch({ checked, onChange, disabled = false, accessibilityLabel }) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={{ height: design.minTouchTarget, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{
        width: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2,
        backgroundColor: checked ? colors.success : colors.border,
      }}>
        <View style={{
          width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
          backgroundColor: colors.bgPrimary,
          position: 'absolute', top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
          left: checked ? THUMB_OFFSET_ON : THUMB_OFFSET_OFF,
        }} />
      </View>
    </Pressable>
  )
}
