import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react-native'
import { colors, design } from '../../lib/styles'

// Sustituye lo que la tarjeta de racha no puede afirmar tras un fallo de red (issue #98): unas
// barras vacías o el banner de configurar objetivo se leerían como datos reales.
export default function StreakErrorState({ onRetry }) {
  const { t } = useTranslation()

  return (
    <View
      className="flex-row items-center"
      style={{ backgroundColor: colors.bgTertiary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 12 }}
    >
      <AlertCircle size={20} color={colors.danger} />
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13 }}>
        {t('common:home.streakLoadError')}
      </Text>
      {/* A 44pt box around the pill. marginVertical -8 sits inside the 12 padding, so the row keeps its
          height and the box stays inside its parent (where Android delivers touches). */}
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        className="active:opacity-70"
        style={{ minHeight: design.minTouchTarget, marginVertical: -8, justifyContent: 'center' }}
      >
        <View className="px-3 py-1.5 rounded-full" style={{ borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '500' }}>{t('common:buttons.retry')}</Text>
        </View>
      </Pressable>
    </View>
  )
}
