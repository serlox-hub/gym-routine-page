import { useState, useEffect } from 'react'
import { View, Text, TextInput } from 'react-native'
import { Modal, Button } from '../ui'
import { colors, inputStyle } from '../../lib/styles'
import { getMeasurementLabel } from '../../lib/measurementConstants'

export default function MeasurementModal({ isOpen, onClose, onSubmit, measurementType, unit = 'cm', record = null, isPending }) {
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
    const value = parseFloat(form.value)
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
        {isEditing ? `Editar ${label.toLowerCase()}` : `Registrar ${label.toLowerCase()}`}
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
          <Text className="text-sm font-medium text-secondary mb-1">Notas (opcional)</Text>
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
          <Button variant="secondary" onPress={handleClose}>Cancelar</Button>
          <Button
            onPress={handleSubmit}
            disabled={!form.value || parseFloat(form.value) <= 0 || isPending}
            loading={isPending}
          >
            {isEditing ? 'Guardar' : 'Registrar'}
          </Button>
        </View>
      </View>
    </Modal>
  )
}
