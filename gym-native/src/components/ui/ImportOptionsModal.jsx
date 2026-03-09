import { useState } from 'react'
import { View, Text, Switch } from 'react-native'
import Button from './Button'
import Modal from './Modal'

export default function ImportOptionsModal({ isOpen, onConfirm, onCancel }) {
  const [updateExercises, setUpdateExercises] = useState(false)

  const handleConfirm = () => {
    onConfirm({ updateExercises })
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="p-6">
      <Text className="text-primary text-lg font-semibold mb-2">
        Opciones de importación
      </Text>
      <Text className="text-secondary text-sm mb-4">
        Configura cómo quieres importar la rutina
      </Text>

      <View className="flex-row items-center justify-between bg-surface-card p-3 rounded-lg mb-6">
        <View className="flex-1 mr-3">
          <Text className="text-primary text-sm font-medium">
            Actualizar ejercicios existentes
          </Text>
          <Text className="text-secondary text-xs mt-1">
            Si un ejercicio ya existe, actualiza sus instrucciones y grupo muscular
          </Text>
        </View>
        <Switch
          value={updateExercises}
          onValueChange={setUpdateExercises}
          trackColor={{ false: '#30363d', true: '#238636' }}
          thumbColor="#e6edf3"
        />
      </View>

      <View className="flex-row gap-3 justify-end">
        <Button variant="secondary" onPress={onCancel}>
          Cancelar
        </Button>
        <Button onPress={handleConfirm}>
          Importar
        </Button>
      </View>
    </Modal>
  )
}
