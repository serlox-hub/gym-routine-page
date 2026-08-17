import { useState, useEffect, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Play, X } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { formatDuration, formatElapsedSeconds } from '@gym/shared'
import { colors } from '../../lib/styles'

// Cuenta atrás de la duración de la serie. Vive como SUBFILA de la serie activa (igual que
// ProgressionHint), no dentro de la fila: en la fila no cabía (robaba ancho a los inputs en
// móvil) y al arrancar cambiaba de tamaño, descuadrando las columnas. Ver docs/DECISIONS.md.
export default function ExecutionTimer({ seconds }) {
  const { t } = useTranslation()
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

  const isCritical = remaining <= 3 && remaining > 0
  const isDone = remaining === 0 && !isRunning

  const target = formatDuration(seconds)

  if (!isRunning && remaining === seconds) {
    return (
      <View className="mt-1 pl-1 flex-row">
        <Pressable
          onPress={handleStart}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('workout:set.startTimer', { time: target })}
          className="flex-row items-center rounded-lg active:opacity-70"
          style={{ backgroundColor: colors.bgTertiary, paddingHorizontal: 10, paddingVertical: 6, gap: 6 }}
        >
          <Play size={12} color={colors.success} fill={colors.success} />
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
            {t('workout:set.startTimer', { time: target })}
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="mt-1 pl-1 flex-row items-center" style={{ gap: 8 }}>
      <Text
        className="font-bold"
        style={{
          color: isDone ? colors.success : isCritical ? colors.danger : colors.textPrimary,
          fontSize: 15,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatElapsedSeconds(remaining)}
      </Text>

      <Pressable onPress={handleStop} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button" accessibilityLabel={t('workout:set.stopTimer')} className="active:opacity-70">
        <X size={14} color={colors.textSecondary} />
      </Pressable>
    </View>
  )
}
