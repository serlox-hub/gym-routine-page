import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Info, X } from 'lucide-react-native'
import { getProgressionLabel, getProgressionReason } from '@gym/shared'
import { IconButton, Modal } from '../ui'
import { colors, design } from '../../lib/styles'

// Aviso de progresión por serie (issue #13): "↗ Sube el peso" / "↗ Sube el nivel" (direccional,
// sin cifra — el salto depende del equipo) a la vista + el porqué a un tap (ⓘ → modal). Qué se
// sube lo decide el campo progresable del ejercicio (issue #28), así que el texto sale de
// `getProgressionLabel`, no de una cadena fija. Es un item de la subfila compartida (SetRowMeta),
// que ya pone el margen y el padding; ver DECISIONS #13.
export default function ProgressionHint({ previousSet, target, targetField, trackedFields, distanceUnit }) {
  const { t } = useTranslation()
  const [showWhy, setShowWhy] = useState(false)

  return (
    <>
      {/* marginVertical -8: the 44pt box takes the subrow's padding (see SetRowMeta), on this
          direct child of the subrow because Android gives no touches outside the parent. */}
      <View className="flex-row items-center" style={{ gap: 6, marginVertical: -8 }}>
        <TrendingUp size={12} color={colors.orange} />
        <Text className="text-xs" style={{ color: colors.orange, fontWeight: '600' }}>
          {getProgressionLabel(trackedFields)}
        </Text>
        {/* marginLeft -12: the box overlaps its own label, not a neighbour, so the icon stays
            next to the text. */}
        <IconButton
          icon={Info}
          iconSize={12}
          color={colors.textMuted}
          label={t('workout:progression.whyLabel')}
          onPress={() => setShowWhy(true)}
          style={{ marginLeft: -12 }}
        />
      </View>

      <Modal isOpen={showWhy} onClose={() => setShowWhy(false)} className="p-4">
        <View className="flex-row justify-between items-center" style={{ marginBottom: 12 }}>
          <Text className="font-bold" style={{ color: colors.textPrimary }}>{t('workout:progression.title')}</Text>
          <IconButton icon={X} iconSize={20} label={t('common:buttons.close')} onPress={() => setShowWhy(false)} />
        </View>
        <Text className="text-sm" style={{ color: colors.textSecondary }}>
          {getProgressionReason({ previousSet, target, trackedFields, targetField, distanceUnit })}
        </Text>
        <Pressable
          onPress={() => setShowWhy(false)}
          style={{ marginTop: 16, minHeight: design.minTouchTarget, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>{t('common:buttons.close')}</Text>
        </Pressable>
      </Modal>
    </>
  )
}
