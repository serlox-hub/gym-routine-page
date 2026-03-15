import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'
import { formatSecondsToMMSS } from '../../lib/timeUtils'
import { colors } from '../../lib/styles'

export default function ExecutionTimer({ seconds }) {
  const [isRunning, setIsRunning] = useState(false)
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!isRunning) {
      setRemaining(seconds)
    }
  }, [seconds, isRunning])

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, remaining])

  useEffect(() => {
    if (isRunning && remaining <= 3 && remaining > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    if (remaining === 0 && !isRunning) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }, [remaining, isRunning])

  const handleStart = () => {
    if (seconds > 0) {
      setRemaining(seconds)
      setIsRunning(true)
    }
  }

  const handleStop = () => {
    setIsRunning(false)
    setRemaining(seconds)
  }

  const progress = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0
  const isCritical = remaining <= 3 && remaining > 0
  const isDone = remaining === 0 && !isRunning

  if (!isRunning && remaining === seconds) {
    return (
      <Pressable
        onPress={handleStart}
        disabled={seconds === 0}
        className="px-3 py-1 rounded active:scale-95"
        style={{
          backgroundColor: colors.success,
          opacity: seconds === 0 ? 0.5 : 1,
        }}
      >
        <Text className="text-sm font-medium" style={{ color: '#ffffff' }}>▶</Text>
      </Pressable>
    )
  }

  return (
    <View
      className="flex-row items-center gap-2 px-2 py-1 rounded"
      style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
    >
      <Text
        className="font-bold"
        style={{
          color: isDone ? colors.success : isCritical ? colors.danger : colors.textPrimary,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatSecondsToMMSS(remaining)}
      </Text>

      <View
        className="w-12 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: colors.border }}
      >
        <View
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: isDone ? colors.success : isCritical ? colors.danger : colors.accent,
          }}
        />
      </View>

      <Pressable onPress={handleStop} className="active:opacity-70">
        <Text className="text-xs" style={{ color: colors.textSecondary }}>✕</Text>
      </Pressable>
    </View>
  )
}
