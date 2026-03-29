import { useState, useEffect } from 'react'
import { View, Text, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Modal, Button } from '../ui'
import { colors, inputStyle } from '../../lib/styles'
import { getMeasurementLabel, parseDecimal } from '@gym/shared'

export default function MeasurementModal({ isOpen, onClose, onSubmit, measurementType, unit = 'cm', record = null, isPending }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ value: '', notes: '' })
  const isEditing = !!record

  useEffect(() => {
    if (isOpen) {
      if (record) {
        setForm({
          value: record.value?.toString() || '',
          notes: record.notes || '',
        })
      } else {
        setForm({ value: '', notes: '' })
      }
    }
  }, [isOpen, record])

  const handleSubmit = () => {
    const value = parseDecimal(form.value)
    if (!value || value <= 0) return

    onSubmit({
      id: record?.id,
      measurementType,
      value,
      unit,
      notes: form.notes.trim() || null,
    })
  }

  const handleClose = () => {
    setForm({ value: '', notes: '' })
    onClose()
  }

  const label = getMeasurementLabel(measurementType) || 'medida'

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-5">
      <Text className="text-lg font-semibold text-primary mb-4">
        {isEditing ? `${t('common:buttons.edit')} ${label.toLowerCase()}` : `${t('body:measurements.record')} ${label.toLowerCase()}`}
      </Text>

      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-secondary mb-1">{label} ({unit}) *</Text>
          <TextInput
            value={form.value}
            onChangeText={(text) => setForm(prev => ({ ...prev, value: text }))}
            placeholder={`Ej: ${unit === 'cm' ? '85.5' : '33.5'}`}
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            style={inputStyle}
            autoFocus
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-secondary mb-1">{t('common:labels.notes')} ({t('common:labels.optional')})</Text>
          <TextInput
            value={form.notes}
            onChangeText={(text) => setForm(prev => ({ ...prev, notes: text }))}
            placeholder="Ej: En ayunas"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={2}
            style={[inputStyle, { minHeight: 60, textAlignVertical: 'top' }]}
          />
        </View>

        <View className="flex-row gap-3 justify-end pt-2">
          <Button variant="secondary" onPress={handleClose}>{t('common:buttons.cancel')}</Button>
          <Button
            onPress={handleSubmit}
            disabled={!form.value || parseDecimal(form.value) <= 0 || isPending}
            loading={isPending}
          >
            {isEditing ? t('common:buttons.save') : t('body:measurements.record')}
          </Button>
        </View>
      </View>
    </Modal>
  )
}
