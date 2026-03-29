import { useRef } from 'react'
import { View, Text, Pressable, Modal, Animated, PanResponder, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Minimize2, Maximize2 } from 'lucide-react-native'
import { useRestTimer } from '../../hooks/useWorkout'
import { formatSecondsToMMSS } from '@gym/shared'
import useWorkoutStore from '../../stores/workoutStore'
import { colors } from '../../lib/styles'

export default function RestTimer() {
  const { t } = useTranslation()
  const { isActive, timeRemaining, progress, skip, addTime } = useRestTimer()
  const insets = useSafeAreaInsets()
  const minimized = useWorkoutStore(state => state.restTimerMinimized)
  const setMinimized = useWorkoutStore(state => state.setRestTimerMinimized)

  const pan = useRef(new Animated.ValueXY()).current
  const lastOffset = useRef({ x: 0, y: 0 })
  const insetsRef = useRef(insets)
  insetsRef.current = insets

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({ x: lastOffset.current.x, y: lastOffset.current.y })
        pan.setValue({ x: 0, y: 0 })
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        const { width, height } = Dimensions.get('window')
        const rawX = lastOffset.current.x + gesture.dx
        const rawY = lastOffset.current.y + gesture.dy
        const clampX = Math.max(-width / 2 + 60, Math.min(width / 2 - 60, rawX))
        const { top, bottom } = insetsRef.current
        const clampY = Math.max(0, Math.min(height - top - bottom - 100, rawY))
        pan.flattenOffset()
        if (clampX !== rawX || clampY !== rawY) {
          lastOffset.current = { x: clampX, y: clampY }
          Animated.spring(pan, { toValue: { x: clampX, y: clampY }, useNativeDriver: false, friction: 7 }).start()
        } else {
          lastOffset.current = { x: rawX, y: rawY }
        }
      },
    })
  ).current

  if (!isActive) return null

  const timeDisplay = formatSecondsToMMSS(timeRemaining)
  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3
  const timerColor = isCritical ? colors.danger : isWarning ? colors.warning : colors.success

  if (minimized) {
    return (
      <Animated.View
        {...panResponder.panHandlers}
        className="absolute self-center z-50"
        style={{ top: insets.top + 8, transform: pan.getTranslateTransform() }}
      >
        <Pressable
          onPress={() => setMinimized(false)}
          className="flex-row items-center gap-2 px-4 py-2 rounded-full active:opacity-70"
          style={{ backgroundColor: colors.bgSecondary, borderWidth: 2, borderColor: timerColor }}
        >
          <Text
            className="text-sm font-bold"
            style={{ color: timerColor, fontVariant: ['tabular-nums'] }}
          >
            {timeDisplay}
          </Text>
          <Maximize2 size={14} color={colors.textSecondary} />
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <Modal visible transparent animationType="fade">
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(13, 17, 23, 0.95)' }}
      >
        <Pressable
          onPress={() => setMinimized(true)}
          className="absolute top-14 right-4 p-3 rounded-lg active:opacity-70"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <Minimize2 size={20} color={colors.textSecondary} />
        </Pressable>

        <Text className="text-xl font-medium mb-8" style={{ color: colors.textSecondary }}>
          {t('workout:rest.title').toUpperCase()}
        </Text>

        <Text
          className="text-7xl font-bold mb-6"
          style={{
            color: isCritical ? colors.danger : isWarning ? colors.warning : colors.textPrimary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {timeDisplay}
        </Text>

        <View
          className="w-64 h-2 rounded-full mb-8 overflow-hidden"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <View
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: timerColor }}
          />
        </View>

        <View className="flex-row gap-4">
          <Pressable
            onPress={() => addTime(-30)}
            className="px-6 py-3 rounded-lg active:opacity-70"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <Text className="text-lg font-medium" style={{ color: colors.textSecondary }}>
              -30s
            </Text>
          </Pressable>

          <Pressable
            onPress={skip}
            className="px-8 py-3 rounded-lg active:opacity-70"
            style={{ backgroundColor: colors.success }}
          >
            <Text className="text-lg font-bold" style={{ color: colors.white }}>
              {t('workout:rest.skip').toUpperCase()}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => addTime(30)}
            className="px-6 py-3 rounded-lg active:opacity-70"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <Text className="text-lg font-medium" style={{ color: colors.textSecondary }}>
              +30s
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
