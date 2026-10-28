import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, design } from '../../lib/styles'
import {
  FIELD_ORDER,
  MAX_TRACKED_FIELDS,
  formatTrackedFieldConflict,
  formatTrackedFieldsLabel,
  getBlockingTrackedField,
  getFieldName,
  toggleTrackedField,
} from '@gym/shared'

// Qué mide un ejercicio: chips de campo en el orden canónico de columnas (FIELD_ORDER), con la
// etiqueta resultante ("Nivel × Distancia × Tiempo") derivada de lo marcado. Sustituye al
// desplegable de 12 combinaciones fijas, que no cubría casos de tres métricas como la bici.
// Al llegar al máximo los no marcados se deshabilitan, en vez de dejar pulsar y no pasar nada.
// Weight and assistance exclude each other: the other's chip is BLOCKED (dimmed but it answers) and
// says why when pressed, inline (a toast would paint under a React Native Modal).
export default function TrackedFieldsPicker({ value, onChange, required = true }) {
  const { t } = useTranslation()
  const [conflictNotice, setConflictNotice] = useState(null)
  const selected = value || []
  const atMax = selected.length >= MAX_TRACKED_FIELDS

  const handlePress = (field, blocker) => {
    if (blocker) {
      setConflictNotice(formatTrackedFieldConflict(field, blocker))
      return
    }
    setConflictNotice(null)
    onChange(toggleTrackedField(selected, field))
  }

  return (
    <View>
      <Text className="text-primary text-sm font-medium">
        {t('exercise:trackedFields')}{required && <Text style={{ color: colors.danger }}> *</Text>}
      </Text>

      {/* Altura reservada aunque no haya nada marcado: si apareciera y desapareciera, los chips
          saltarían al desmarcar el último. */}
      <Text className="text-sm font-semibold mb-2" style={{ color: colors.success, minHeight: 20 }}>
        {formatTrackedFieldsLabel(selected)}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {FIELD_ORDER.map(field => {
          const isSelected = selected.includes(field)
          const blocker = getBlockingTrackedField(selected, field)
          const isDisabled = !isSelected && !blocker && atMax
          return (
            <Pressable
              key={field}
              disabled={isDisabled}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isDisabled || !!blocker }}
              onPress={() => handlePress(field, blocker)}
              className="px-3 py-2 rounded-lg justify-center"
              style={{
                minHeight: design.minTouchTarget,
                backgroundColor: isSelected ? colors.successBg : colors.bgTertiary,
                borderWidth: 1,
                borderColor: isSelected ? colors.success : colors.border,
                opacity: isDisabled ? 0.4 : blocker ? design.blockedOpacity : 1,
              }}
            >
              <Text className="text-sm" style={{ color: isSelected ? colors.success : colors.textPrimary }}>
                {getFieldName(field)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {conflictNotice && (
        <Text accessibilityLiveRegion="polite" className="text-xs mt-2" style={{ color: colors.warning }}>
          {conflictNotice}
        </Text>
      )}

      <Text className="text-secondary text-xs mt-2">{t('exercise:trackedFieldsHelp')}</Text>
    </View>
  )
}
