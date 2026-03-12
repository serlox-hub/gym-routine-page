import { View, Text, Pressable, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Minimize2, Maximize2 } from 'lucide-react-native'
import { useRestTimer } from '../../hooks/useWorkout'
import { formatSecondsToMMSS } from '../../lib/timeUtils'
import useWorkoutStore from '../../stores/workoutStore'
import { colors } from '../../lib/styles'

export default function RestTimer() {
  const { isActive, timeRemaining, progress, skip, addTime } = useRestTimer()
  const insets = useSafeAreaInsets()
  const minimized = useWorkoutStore(state => state.restTimerMinimized)
  const setMinimized = useWorkoutStore(state => state.setRestTimerMinimized)

  if (!isActive) return null

  const timeDisplay = formatSecondsToMMSS(timeRemaining)
  const isWarning = timeRemaining <= 10 && timeRemaining > 3
  const isCritical = timeRemaining <= 3
  const timerColor = isCritical ? colors.danger : isWarning ? colors.warning : colors.success

  if (minimized) {
    return (
      <View className="absolute left-0 right-0 items-center" style={{ zIndex: 50, top: insets.top + 8 }}>
        <Pressable
          onPress={() => setMinimized(false)}
          className="flex-row items-center gap-2 px-4 py-2 rounded-full"
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
      </View>
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
          className="absolute top-14 right-4 p-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <Minimize2 size={20} color={colors.textSecondary} />
        </Pressable>

        <Text className="text-xl font-medium mb-8" style={{ color: colors.textSecondary }}>
          DESCANSO
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
            className="px-6 py-3 rounded-lg"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <Text className="text-lg font-medium" style={{ color: colors.textSecondary }}>
              -30s
            </Text>
          </Pressable>

          <Pressable
            onPress={skip}
            className="px-8 py-3 rounded-lg"
            style={{ backgroundColor: colors.success }}
          >
            <Text className="text-lg font-bold" style={{ color: '#ffffff' }}>
              SALTAR
            </Text>
          </Pressable>

          <Pressable
            onPress={() => addTime(30)}
            className="px-6 py-3 rounded-lg"
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
