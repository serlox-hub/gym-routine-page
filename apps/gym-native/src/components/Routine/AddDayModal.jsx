import { useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { Button, Modal } from '../ui'
import { inputStyle } from '../../lib/styles'

export default function AddDayModal({ isOpen, onClose, onSubmit, nextDayNumber, isPending }) {
  const [form, setForm] = useState({ name: '', estimated_duration_min: '' })

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSubmit({
      name: form.name.trim(),
      estimated_duration_min: form.estimated_duration_min ? parseInt(form.estimated_duration_min) : null,
      sort_order: nextDayNumber,
    })
    setForm({ name: '', estimated_duration_min: '' })
  }

  const handleClose = () => {
    setForm({ name: '', estimated_duration_min: '' })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-6">
      <Text className="text-primary text-lg font-semibold mb-4">
        Añadir día {nextDayNumber}
      </Text>

      <View className="gap-4">
        <View>
          <Text className="text-secondary text-sm font-medium mb-1">Nombre *</Text>
          <TextInput
            value={form.name}
            onChangeText={(v) => setForm(prev => ({ ...prev, name: v }))}
            placeholder="Ej: Pecho y tríceps"
            placeholderTextColor="#6e7681"
            autoFocus
            style={inputStyle}
          />
        </View>

        <View>
          <Text className="text-secondary text-sm font-medium mb-1">
            Duración estimada en minutos (opcional)
          </Text>
          <TextInput
            value={form.estimated_duration_min}
            onChangeText={(v) => setForm(prev => ({ ...prev, estimated_duration_min: v }))}
            placeholder="Ej: 60"
            placeholderTextColor="#6e7681"
            keyboardType="numeric"
            style={inputStyle}
          />
        </View>

        <View className="flex-row gap-3 justify-end pt-2">
          <Button variant="secondary" onPress={handleClose}>
            Cancelar
          </Button>
          <Button
            onPress={handleSubmit}
            disabled={!form.name.trim() || isPending}
            loading={isPending}
          >
            Añadir
          </Button>
        </View>
      </View>
    </Modal>
  )
}
