import { useRef, useState, useEffect } from 'react'
import { View, Text, Pressable, Animated, PanResponder, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react-native'
import useWorkoutStore from '../../stores/workoutStore'
import { formatSecondsToMMSS } from '@gym/shared'
import { colors } from '../../lib/styles'

export default function ActiveSessionBanner() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const workoutVisible = useWorkoutStore(state => state.workoutVisible)
  const restTimerActive = useWorkoutStore(state => state.restTimerActive)
  const getTimeRemaining = useWorkoutStore(state => state.getTimeRemaining)

  const [, tick] = useState(0)
  useEffect(() => {
    if (!restTimerActive) return
    const id = setInterval(() => tick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [restTimerActive])

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
        const clampY = Math.max(0, Math.min(height - top - bottom - 120, rawY))
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

  if (!sessionId || workoutVisible) return null

  const timeRemaining = restTimerActive ? getTimeRemaining() : 0

  const handleContinue = () => {
    useWorkoutStore.getState().showWorkout()
  }

  const isCritical = timeRemaining <= 3
  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const timerColor = isCritical ? colors.danger : isWarning ? colors.warning : colors.success

  return (
    <Animated.View
      {...panResponder.panHandlers}
      className="absolute self-center z-50"
      style={{
        top: insets.top + 12,
        transform: pan.getTranslateTransform(),
      }}
    >
      <Pressable
        onPress={handleContinue}
        className="flex-row items-center active:opacity-90"
        style={{
          backgroundColor: colors.bgSecondary,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          borderRadius: 999,
          paddingLeft: 16,
          paddingRight: 6,
          paddingVertical: 6,
          gap: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {t('workout:session.active')}
          </Text>
          {restTimerActive && timeRemaining > 0 && (
            <Text style={{ color: timerColor, fontSize: 14, fontWeight: '700' }}>
              {formatSecondsToMMSS(timeRemaining)}
            </Text>
          )}
        </View>
        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success }}>
          <Play size={14} color={colors.bgPrimary} fill={colors.bgPrimary} />
        </View>
      </Pressable>
    </Animated.View>
  )
}
