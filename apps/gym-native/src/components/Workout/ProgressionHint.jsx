import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Info, X } from 'lucide-react-native'
import { Modal } from '../ui'
import { colors } from '../../lib/styles'

// Subfila de progresión por serie (issue #13): "↗ Sube el peso" (direccional, sin cifra —
// el salto depende del equipo) a la vista + el porqué a un tap (ⓘ → modal). Una línea para
// no cargar la fila; ver DECISIONS #13.
export default function ProgressionHint({ prevReps, repsTarget }) {
  const { t } = useTranslation()
  const [showWhy, setShowWhy] = useState(false)

  return (
    <>
      <View className="flex-row items-center" style={{ gap: 6, marginTop: 4, paddingLeft: 4 }}>
        <TrendingUp size={12} color={colors.orange} />
        <Text className="text-xs" style={{ color: colors.orange, fontWeight: '600' }}>
          {t('workout:progression.increase')}
        </Text>
        <Pressable
          onPress={() => setShowWhy(true)}
          accessibilityRole="button"
          accessibilityLabel={t('workout:progression.whyLabel')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Info size={12} color={colors.textMuted} />
        </Pressable>
      </View>

      <Modal isOpen={showWhy} onClose={() => setShowWhy(false)} className="p-4">
        <View className="flex-row justify-between items-center" style={{ marginBottom: 12 }}>
          <Text className="font-bold" style={{ color: colors.textPrimary }}>{t('workout:progression.title')}</Text>
          <Pressable onPress={() => setShowWhy(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common:buttons.close')}>
            <X size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Text className="text-sm" style={{ color: colors.textSecondary }}>
          {t('workout:progression.why', { reps: prevReps, range: repsTarget })}
        </Text>
        <Pressable
          onPress={() => setShowWhy(false)}
          style={{ marginTop: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bgTertiary, alignItems: 'center' }}
        >
          <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>{t('common:buttons.close')}</Text>
        </Pressable>
      </Modal>
    </>
  )
}
