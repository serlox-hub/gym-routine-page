import { useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { Modal, Button } from '../ui'
import { colors, inputStyle } from '../../lib/styles'
import { usePreference } from '../../hooks/usePreferences'

export default function EndSessionModal({ isOpen, onClose, onConfirm, isPending }) {
  const { value: showSessionNotes } = usePreference('show_session_notes')
  const [notes, setNotes] = useState('')

  const handleConfirm = () => {
    onConfirm({
      overallFeeling: null,
      notes: notes.trim() || null,
    })
  }

  const handleClose = () => {
    setNotes('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} position="bottom" className="p-5">
      <Text className="text-primary text-lg font-semibold mb-4">Finalizar entrenamiento</Text>

      {showSessionNotes && (
        <View className="mb-5">
          <Text className="text-secondary text-sm font-medium mb-2">Notas (opcional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="¿Algo que quieras recordar de esta sesión?"
            placeholderTextColor="#6e7681"
            multiline
            numberOfLines={3}
            style={[inputStyle, { textAlignVertical: 'top', minHeight: 80 }]}
          />
        </View>
      )}

      <View className="flex-row gap-3">
        <Button variant="secondary" className="flex-1" onPress={handleClose}>
          Cancelar
        </Button>
        <Button className="flex-1" onPress={handleConfirm} loading={isPending}>
          {isPending ? 'Guardando...' : 'Finalizar'}
        </Button>
      </View>
    </Modal>
  )
}
