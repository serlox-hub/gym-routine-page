import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles'
import {
  FIELD_ORDER,
  MAX_TRACKED_FIELDS,
  formatTrackedFieldsLabel,
  getFieldName,
  toggleTrackedField,
} from '@gym/shared'

// Qué mide un ejercicio: chips de campo en el orden canónico de columnas (FIELD_ORDER), con la
// etiqueta resultante ("Nivel × Distancia × Tiempo") derivada de lo marcado. Sustituye al
// desplegable de 12 combinaciones fijas, que no cubría casos de tres métricas como la bici.
// Al llegar al máximo los no marcados se deshabilitan, en vez de dejar pulsar y no pasar nada.
export default function TrackedFieldsPicker({ value, onChange, required = true }) {
  const { t } = useTranslation()
  const selected = value || []
  const atMax = selected.length >= MAX_TRACKED_FIELDS

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
          const isDisabled = !isSelected && atMax
          return (
            <Pressable
              key={field}
              disabled={isDisabled}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              onPress={() => onChange(toggleTrackedField(selected, field))}
              className="px-3 py-2 rounded-lg"
              style={{
                backgroundColor: isSelected ? colors.successBg : colors.bgTertiary,
                borderWidth: 1,
                borderColor: isSelected ? colors.success : colors.border,
                opacity: isDisabled ? 0.4 : 1,
              }}
            >
              <Text className="text-sm" style={{ color: isSelected ? colors.success : colors.textPrimary }}>
                {getFieldName(field)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <Text className="text-secondary text-xs mt-2">{t('exercise:trackedFieldsHelp')}</Text>
    </View>
  )
}
