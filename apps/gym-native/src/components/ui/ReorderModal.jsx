import { Text, Pressable, Modal, ScrollView } from 'react-native'
import { colors } from '../../lib/styles'

export default function ReorderModal({ visible, onClose, totalItems, currentIndex, positionLabels = [], onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable onPress={e => e.stopPropagation()} className="bg-surface-block border border-border rounded-t-2xl py-2 pb-8" style={{ maxHeight: '60%' }}>
          <Text className="text-base font-semibold text-primary px-5 py-3">Mover a posición</Text>
          <ScrollView>
            {Array.from({ length: totalItems }, (_, i) => {
              const isCurrent = i === currentIndex
              const label = positionLabels[i]

              return (
                <Pressable
                  key={i}
                  onPress={() => onSelect(i)}
                  disabled={isCurrent}
                  className={`px-5 py-3 ${isCurrent ? 'opacity-30' : 'active:bg-surface-card'}`}
                >
                  <Text style={{ color: isCurrent ? colors.textSecondary : colors.textPrimary }} className="text-base">
                    {i + 1}. {label || `Posición ${i + 1}`}{isCurrent ? ' (actual)' : ''}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
