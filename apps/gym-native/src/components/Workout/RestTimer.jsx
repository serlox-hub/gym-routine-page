import { useRef } from 'react'
import { View, Text, Pressable, Modal, Animated, PanResponder, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Maximize2, Timer } from 'lucide-react-native'
import Svg, { Circle } from 'react-native-svg'
import { useRestTimer } from '../../hooks/useWorkout'
import { formatSecondsToMMSS } from '@gym/shared'
import useWorkoutStore from '../../stores/workoutStore'
import { colors } from '../../lib/styles'

const CIRCLE_SIZE = 220
const STROKE_WIDTH = 6
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function RestTimer() {
  const { t } = useTranslation()
  const { isActive, timeRemaining, timeInitial, progress, context, skip, addTime } = useRestTimer()
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
  const totalDisplay = formatSecondsToMMSS(timeInitial)
  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3
  const timerColor = isCritical ? colors.danger : isWarning ? colors.warning : colors.success
  const dashOffset = CIRCUMFERENCE * (1 - progress / 100)

  if (minimized) {
    return (
      <Animated.View {...panResponder.panHandlers}
        className="absolute self-center z-50"
        style={{ top: insets.top + 8, transform: pan.getTranslateTransform() }}>
        <Pressable onPress={() => setMinimized(false)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.bgSecondary, borderWidth: 2, borderColor: timerColor }}
          className="active:opacity-70">
          <Text style={{ color: timerColor, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{timeDisplay}</Text>
          <Maximize2 size={14} color={colors.textSecondary} />
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setMinimized(true)}>
      <Pressable onPress={() => setMinimized(true)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
        <Pressable onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: colors.bgSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 24 }}>
          {/* Drag handle */}
          <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Timer size={16} color={colors.success} />
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
                {t('workout:rest.title').toUpperCase()}
              </Text>
            </View>
            <Pressable onPress={() => setMinimized(true)}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center' }}
              className="active:opacity-70">
              <ChevronDown size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Circular timer */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, justifyContent: 'center', alignItems: 'center' }}>
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                  stroke={colors.textMuted} strokeWidth={STROKE_WIDTH} fill="none" />
                <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                  stroke={timerColor} strokeWidth={STROKE_WIDTH} fill="none"
                  strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
                  strokeLinecap="round" />
              </Svg>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textPrimary, fontSize: 52, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 }}>
                  {timeDisplay}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>
                  {t('workout:rest.of', { time: totalDisplay })}
                </Text>
              </View>
            </View>
          </View>

          {/* Adjust pills */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            <Pressable onPress={() => addTime(-15)}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.bgTertiary }}
              className="active:opacity-70">
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>− 15s</Text>
            </Pressable>
            <Pressable onPress={() => addTime(15)}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.bgTertiary }}
              className="active:opacity-70">
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>+ 15s</Text>
            </Pressable>
          </View>

          {/* Set progress */}
          {context.totalSets > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
                  {t('workout:rest.setsDone', { done: context.setNumber, total: context.totalSets })}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {t('workout:rest.setsLeft', { count: context.totalSets - context.setNumber })}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {Array.from({ length: context.totalSets }, (_, i) => (
                  <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < context.setNumber ? colors.success : colors.textMuted }} />
                ))}
              </View>
            </View>
          )}

          {/* Big skip button */}
          <Pressable onPress={skip}
            style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center' }}
            className="active:opacity-80">
            <Text style={{ color: colors.bgPrimary, fontSize: 16, fontWeight: '600' }}>
              {t('workout:rest.skipRest')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
