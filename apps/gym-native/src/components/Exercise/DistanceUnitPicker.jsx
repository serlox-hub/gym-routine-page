import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '../../lib/styles'
import { DISTANCE_UNITS } from '@gym/shared'

// La distancia se guarda SIEMPRE en metros: esto elige en qué unidad se lee y se teclea, no
// convierte nada de lo guardado. Un remo se mide en metros y una cinta en kilómetros, así que la
// escala es del ejercicio y no una preferencia global (ver migración 060).
export default function DistanceUnitPicker({ value, onChange, label }) {
  const { t } = useTranslation()

  return (
    <View>
      <Text className="text-secondary text-xs font-semibold mb-2">
        {label || t('exercise:distanceUnit')}
      </Text>
      <View className="flex-row gap-2">
        {DISTANCE_UNITS.map(unit => {
          const isActive = value === unit
          return (
            <Pressable
              key={unit}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(unit)}
              className="flex-1 py-2 rounded-lg items-center"
              style={{
                backgroundColor: isActive ? colors.successBg : colors.bgTertiary,
                borderWidth: 1,
                borderColor: isActive ? colors.success : colors.border,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: isActive ? colors.success : colors.textPrimary }}
              >
                {unit}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <Text className="text-secondary text-xs mt-2">{t('exercise:distanceUnitHelp')}</Text>
    </View>
  )
}
