import { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { Check } from 'lucide-react-native'
import { Modal, Button } from '../ui'
import { colors } from '../../lib/styles'
import { getOrderedMeasurementTypes, getMeasurementLabel } from '../../lib/measurementConstants'

export default function MeasurementConfigModal({ isOpen, onClose, enabledMeasurements = [], onSave, isPending }) {
  const [selected, setSelected] = useState(new Set())
  const allTypes = getOrderedMeasurementTypes()

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(enabledMeasurements))
    }
  }, [isOpen, enabledMeasurements])

  const toggleMeasurement = (type) => {
    const newSelected = new Set(selected)
    if (newSelected.has(type)) {
      newSelected.delete(type)
    } else {
      newSelected.add(type)
    }
    setSelected(newSelected)
  }

  const handleSave = () => {
    onSave([...selected])
  }

  const hasChanges = () => {
    if (selected.size !== enabledMeasurements.length) return true
    return [...selected].some(type => !enabledMeasurements.includes(type))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text className="text-lg font-semibold text-primary">Configurar medidas</Text>
      </View>

      <ScrollView className="p-4" style={{ maxHeight: 350 }}>
        <Text className="text-sm text-secondary mb-4">
          Selecciona las medidas que quieres trackear
        </Text>

        <View className="gap-2">
          {allTypes.map(type => {
            const isSelected = selected.has(type)
            return (
              <Pressable
                key={type}
                onPress={() => toggleMeasurement(type)}
                className="flex-row items-center gap-3 p-3 rounded-lg"
                style={{
                  backgroundColor: isSelected ? 'rgba(63, 185, 80, 0.15)' : colors.bgTertiary,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.success : 'transparent',
                }}
              >
                <View
                  className="w-5 h-5 rounded items-center justify-center"
                  style={{
                    backgroundColor: isSelected ? colors.success : colors.bgSecondary,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  {isSelected && <Check size={14} color="#fff" />}
                </View>
                <Text className="text-sm font-medium text-primary">
                  {getMeasurementLabel(type)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <View className="p-4 flex-row gap-3" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <View className="flex-1">
          <Button variant="secondary" onPress={onClose}>Cancelar</Button>
        </View>
        <View className="flex-1">
          <Button
            onPress={handleSave}
            disabled={!hasChanges() || isPending}
            loading={isPending}
          >
            Guardar
          </Button>
        </View>
      </View>
    </Modal>
  )
}
