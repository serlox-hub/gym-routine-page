import { Pressable, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react-native'
import { colors } from '../../lib/styles'

// Fila punteada de "añadir ejercicio". La usan tanto `BlockSection` (al final de un bloque con
// ejercicios) como `DayCard` (sola, en lugar de una sección vacía).
export default function AddExerciseButton({ isWarmup = false, onPress }) {
  const { t } = useTranslation()
  const accentColor = isWarmup ? colors.warning : colors.purple

  return (
    <Pressable
      onPress={onPress}
      className="w-full py-3 rounded-xl flex-row items-center justify-center gap-2 active:opacity-70"
      style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}
    >
      <Plus size={14} color={accentColor} />
      <Text style={{ color: accentColor, fontSize: 13 }}>
        {isWarmup ? t('routine:block.addToWarmup') : t('routine:block.addExercise')}
      </Text>
    </Pressable>
  )
}
