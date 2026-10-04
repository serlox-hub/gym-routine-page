import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Play, X } from 'lucide-react-native'
import { formatDuration, formatElapsedSeconds, TIMER_BEEP_WINDOW_SECONDS } from '@gym/shared'
import { colors, design } from '../../lib/styles'
import { IconButton } from '../ui'
import { useExecutionTimer } from '../../hooks/useExecutionTimer'

// Cuenta atrás de la duración de la serie. Es un item de la SUBFILA compartida (SetRowMeta,
// junto a la referencia anterior y al aviso de progresión), no de la fila: dentro robaba ancho a
// los inputs en móvil y al arrancar cambiaba de tamaño, descuadrando las columnas. Ver DECISIONS.
export default function ExecutionTimer({ seconds }) {
  const { t } = useTranslation()
  const { isRunning, remaining, start, stop } = useExecutionTimer(seconds)

  const isCritical = remaining <= TIMER_BEEP_WINDOW_SECONDS && remaining > 0
  const isDone = remaining === 0 && !isRunning

  const target = formatDuration(seconds)

  if (!isRunning && remaining === seconds) {
    // The Pressable is the 44pt box; the pill inside keeps its size. The negative margin goes on
    // the subrow's direct child (see SetRowMeta): Android gives no touches outside the parent.
    return (
      <View className="flex-row" style={{ marginVertical: -8 }}>
        <Pressable
          onPress={start}
          accessibilityRole="button"
          accessibilityLabel={t('workout:set.startTimer', { time: target })}
          className="justify-center active:opacity-70"
          style={{ minHeight: design.minTouchTarget }}
        >
          <View
            className="flex-row items-center rounded-lg"
            style={{ backgroundColor: colors.bgTertiary, paddingHorizontal: 10, paddingVertical: 6, gap: 6 }}
          >
            <Play size={12} color={colors.success} fill={colors.success} />
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {t('workout:set.startTimer', { time: target })}
            </Text>
          </View>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-row items-center" style={{ gap: 8, marginVertical: -8 }}>
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

      <IconButton icon={X} iconSize={14} label={t('workout:set.stopTimer')} onPress={stop} />
    </View>
  )
}
