import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeft } from 'lucide-react-native'
import { Modal } from '../ui'
import { colors, inputStyle } from '../../lib/styles'
import { convertWeight, getWeightUnits, toggleWeightMode } from '@gym/shared'

export default function WeightConverterModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [mode, setMode] = useState('lb-to-kg')

  useEffect(() => {
    if (isOpen) setValue('')
  }, [isOpen])

  const handleChange = (raw) => {
    if (raw === '') { setValue(''); return }
    const normalized = raw.replace(',', '.')
    if (!isNaN(Number(normalized)) && Number(normalized) >= 0) setValue(normalized)
  }

  const converted = convertWeight(value, mode)
  const hasValue = converted !== null
  const { from: fromUnit, to: toUnit } = getWeightUnits(mode)

  const handleToggle = () => {
    setMode(m => toggleWeightMode(m))
    setValue('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <View className="p-4">
        <Text className="text-base font-semibold mb-4" style={{ color: colors.textPrimary }}>
          {t('workout:set.weightConverter')}
        </Text>

        <View className="flex-row items-end gap-2 mb-4">
          <View className="flex-1">
            <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
              Valor ({fromUnit})
            </Text>
            <TextInput
              autoFocus
              value={value}
              onChangeText={handleChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              style={[inputStyle, { fontSize: 14, paddingVertical: 8 }]}
            />
          </View>
          <Pressable
            onPress={handleToggle}
            className="p-2 rounded-lg mb-px"
            style={{ backgroundColor: colors.bgTertiary }}
          >
            <ArrowRightLeft size={20} color={colors.accent} />
          </Pressable>
        </View>

        <View
          className="items-center py-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <Text>
            <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              {hasValue ? converted : '—'}
            </Text>
            {hasValue && (
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                {' '}{toUnit}
              </Text>
            )}
          </Text>
        </View>
      </View>
    </Modal>
  )
}
