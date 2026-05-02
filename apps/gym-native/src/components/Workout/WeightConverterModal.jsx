import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeft, X } from 'lucide-react-native'
import { Modal } from '../ui'
import { colors } from '../../lib/styles'
import { convertWeight, getWeightUnits, toggleWeightMode } from '@gym/shared'

const RATIO_TEXTS = {
  'kg-to-lb': '1 kg = 2.205 lb',
  'lb-to-kg': '1 lb = 0.454 kg',
}

export default function WeightConverterModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [mode, setMode] = useState('kg-to-lb')

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
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
            {t('workout:set.weightConverter')}
          </Text>
          <Pressable
            onPress={onClose}
            style={{ backgroundColor: colors.bgTertiary, borderRadius: 999, padding: 4 }}
          >
            <X size={14} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' }}>
              {fromUnit}
            </Text>
            <View style={{ width: '100%', backgroundColor: colors.bgTertiary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 2, borderColor: colors.success }}>
              <TextInput
                autoFocus
                value={value}
                onChangeText={handleChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', padding: 0 }}
              />
            </View>
          </View>

          <Pressable
            onPress={handleToggle}
            style={{ backgroundColor: colors.bgTertiary, borderRadius: 999, padding: 6, marginBottom: 6 }}
          >
            <ArrowRightLeft size={14} color={colors.success} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' }}>
              {toUnit}
            </Text>
            <View style={{ width: '100%', backgroundColor: colors.bgTertiary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
              <Text style={{ color: hasValue ? colors.textSecondary : colors.textMuted, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
                {hasValue ? converted : '—'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12 }}>
          {RATIO_TEXTS[mode]}
        </Text>
      </View>
    </Modal>
  )
}
