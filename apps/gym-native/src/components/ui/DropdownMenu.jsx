import { useState } from 'react'
import { View, Text, Pressable, Modal } from 'react-native'
import { MoreVertical } from 'lucide-react-native'
import { colors } from '../../lib/styles'

export default function DropdownMenu({ items, triggerSize = 18 }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClose = () => setIsOpen(false)

  const filteredItems = items.filter(Boolean)

  return (
    <View>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="p-1.5 rounded-lg active:opacity-70"
      >
        <MoreVertical size={triggerSize} color={colors.textPrimary} />
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
                    ;(item.onPress || item.onClick)?.()
                    handleClose()
                  }}
                  disabled={item.disabled}
                  className={`flex-row items-center gap-3 px-5 py-3 ${item.disabled ? 'opacity-30' : 'active:bg-surface-card'}`}
                >
                  {item.icon && (
                    <item.icon
                      size={18}
                      color={item.danger ? colors.danger : item.accent ? colors.success : colors.textSecondary}
                    />
                  )}
                  <Text
                    className="text-base"
                    style={{ color: item.danger ? colors.danger : item.accent ? colors.success : colors.textPrimary }}
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
