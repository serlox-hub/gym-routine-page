import { useRef, useState, useEffect } from 'react'
import { View, Text, Pressable, Animated, PanResponder, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Play } from 'lucide-react-native'
import useWorkoutStore from '../../stores/workoutStore'
import { formatSecondsToMMSS } from '@gym/shared'

export default function ActiveSessionBanner() {
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
  const timerColor = isCritical ? '#f85149' : isWarning ? '#d29922' : '#ffffff'

  return (
    <Animated.View
      {...panResponder.panHandlers}
      className="absolute self-center z-50"
      style={{
        top: insets.top + 8,
        transform: pan.getTranslateTransform(),
      }}
    >
      <View
        className="items-center gap-1 px-4 py-2 rounded-lg"
        style={{ backgroundColor: '#161b22', borderWidth: 2, borderColor: '#58a6ff' }}
      >
        <Text className="text-xs font-medium" style={{ color: '#58a6ff' }}>
          Entrenamiento en curso
        </Text>
        {restTimerActive && timeRemaining > 0 && (
          <Text className="font-mono font-bold text-lg" style={{ color: timerColor }}>
            {formatSecondsToMMSS(timeRemaining)}
          </Text>
        )}
        <Pressable
          onPress={handleContinue}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-md active:opacity-70"
          style={{ backgroundColor: 'rgba(35, 134, 54, 0.95)' }}
        >
          <Play size={14} color="#ffffff" fill="#ffffff" />
          <Text className="text-white text-sm font-medium">Volver</Text>
        </Pressable>
      </View>
    </Animated.View>
  )
}
