import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import { Timer } from 'lucide-react-native'
import useWorkoutStore from '../../stores/workoutStore'
import { colors } from '../../lib/styles'

export default function SessionTimer() {
  const startedAt = useWorkoutStore(state => state.startedAt)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return

    const startTime = new Date(startedAt).getTime()

    const updateElapsed = () => {
      const now = Date.now()
      setElapsed(Math.floor((now - startTime) / 1000))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  const formatTime = () => {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <View
      className="flex-row items-center justify-center gap-1.5 px-3 py-1 rounded-full"
      style={{ backgroundColor: colors.bgTertiary }}
    >
      <Timer size={14} color={colors.textSecondary} />
      <Text
        className="text-sm font-medium"
        style={{ color: colors.textPrimary, fontVariant: ['tabular-nums'] }}
      >
        {formatTime()}
      </Text>
    </View>
  )
}
