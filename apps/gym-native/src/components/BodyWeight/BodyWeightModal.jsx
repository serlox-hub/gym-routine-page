import { useState, useEffect } from 'react'
import { View, Text, TextInput } from 'react-native'
import { Modal, Button } from '../ui'
import { colors, inputStyle } from '../../lib/styles'
import { parseDecimal } from '@gym/shared'

export default function BodyWeightModal({ isOpen, onClose, onSubmit, record = null, isPending }) {
  const [form, setForm] = useState({ weight: '', notes: '' })
  const isEditing = !!record

  useEffect(() => {
    if (isOpen) {
      if (record) {
        setForm({
          weight: record.weight?.toString() || '',
          notes: record.notes || '',
        })
      } else {
        setForm({ weight: '', notes: '' })
      }
    }
  }, [isOpen, record])

  const handleSubmit = () => {
    const weight = parseDecimal(form.weight)
    if (!weight || weight <= 0) return

    onSubmit({
      id: record?.id,
      weight,
      notes: form.notes.trim() || null,
    })
  }

  const handleClose = () => {
    setForm({ weight: '', notes: '' })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-5">
      <Text className="text-lg font-semibold text-primary mb-4">
        {isEditing ? 'Editar peso' : 'Registrar peso'}
      </Text>

      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-secondary mb-1">Peso (kg) *</Text>
          <TextInput
            value={form.weight}
            onChangeText={(text) => setForm(prev => ({ ...prev, weight: text }))}
            placeholder="Ej: 75.5"
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
            placeholder="Ej: Después de desayunar"
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
            disabled={!form.weight || parseDecimal(form.weight) <= 0 || isPending}
            loading={isPending}
          >
            {isEditing ? 'Guardar' : 'Registrar'}
          </Button>
        </View>
      </View>
    </Modal>
  )
}
