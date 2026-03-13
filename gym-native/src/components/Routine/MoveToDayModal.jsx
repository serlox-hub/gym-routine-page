import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Modal, Button } from '../ui'
import { colors } from '../../lib/styles'

export default function MoveToDayModal({ isOpen, onClose, onSubmit, days, currentDayId, exerciseName, isPending }) {
  const [selectedDayId, setSelectedDayId] = useState(null)

  const availableDays = days?.filter(d => d.id !== currentDayId) || []

  const handleSubmit = () => {
    if (selectedDayId) onSubmit(selectedDayId)
  }

  const handleClose = () => {
    setSelectedDayId(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-5">
      <Text className="text-primary text-lg font-semibold mb-2">Mover ejercicio</Text>
      <Text className="text-secondary text-sm mb-4">
        Selecciona el día destino para <Text className="text-primary font-semibold">{exerciseName}</Text>
      </Text>

      {availableDays.length === 0 ? (
        <Text className="text-secondary text-sm text-center py-4">
          No hay otros días disponibles
        </Text>
      ) : (
        <View className="gap-2 mb-4">
          {availableDays.map(day => (
            <Pressable
              key={day.id}
              onPress={() => setSelectedDayId(day.id)}
              className="p-3 rounded-lg"
              style={{
                backgroundColor: selectedDayId === day.id ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
                borderWidth: 1,
                borderColor: selectedDayId === day.id ? colors.accent : 'transparent',
              }}
            >
              <Text className="text-primary">{day.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View className="flex-row gap-3 justify-end">
        <Button variant="secondary" onPress={handleClose}>Cancelar</Button>
        <Button onPress={handleSubmit} disabled={!selectedDayId || isPending} loading={isPending}>
          Mover
        </Button>
      </View>
    </Modal>
  )
}
