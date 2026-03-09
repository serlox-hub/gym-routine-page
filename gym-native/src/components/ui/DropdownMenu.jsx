import { useState } from 'react'
import { View, Text, Pressable, Modal } from 'react-native'
import { MoreVertical } from 'lucide-react-native'

export default function DropdownMenu({ items, triggerSize = 18 }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClose = () => setIsOpen(false)

  const filteredItems = items.filter(Boolean)

  return (
    <View>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="p-1.5 rounded-lg bg-surface-block"
      >
        <MoreVertical size={triggerSize} color="#8b949e" />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable
          onPress={handleClose}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface-block border border-border rounded-t-2xl py-2 pb-8"
          >
            {filteredItems.map((item, index) =>
              item.type === 'separator' ? (
                <View key={index} className="border-t border-border my-1" />
              ) : (
                <Pressable
                  key={index}
                  onPress={() => {
                    item.onClick?.()
                    handleClose()
                  }}
                  disabled={item.disabled}
                  className={`flex-row items-center gap-3 px-5 py-3 ${item.disabled ? 'opacity-30' : ''}`}
                >
                  {item.icon && (
                    <item.icon
                      size={18}
                      color={item.danger ? '#f85149' : '#8b949e'}
                    />
                  )}
                  <Text
                    className="text-base"
                    style={{ color: item.danger ? '#f85149' : '#e6edf3' }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
