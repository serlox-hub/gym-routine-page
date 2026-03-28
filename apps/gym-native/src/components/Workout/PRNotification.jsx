import { useEffect, useRef } from 'react'
import { Animated, Pressable, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../lib/styles'
import { formatPRNotificationText } from '@gym/shared'

const AUTO_DISMISS_MS = 4000

export default function PRNotification({ notification, onDismiss }) {
  const insets = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (notification) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start()

      const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
      return () => clearTimeout(timer)
    } else {
      translateY.setValue(-100)
      opacity.setValue(0)
    }
  }, [notification, onDismiss, translateY, opacity])

  if (!notification) return null

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 50,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Pressable
        onPress={onDismiss}
        className="px-4 py-3 rounded-xl"
        style={{
          backgroundColor: colors.warning,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text className="font-bold text-sm" style={{ color: colors.black }}>
          Nuevo PR
        </Text>
        <Text className="text-xs" style={{ color: colors.black }}>
          {formatPRNotificationText(notification)}
        </Text>
      </Pressable>
    </Animated.View>
  )
}
