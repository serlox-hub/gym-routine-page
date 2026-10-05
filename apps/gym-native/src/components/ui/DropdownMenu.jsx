import { useState } from 'react'
import { View, Text, Pressable, Modal } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MoreVertical } from 'lucide-react-native'
import { colors } from '../../lib/styles'
import IconButton from './IconButton'

// `triggerSize` sizes the icon only: the trigger is always the 44pt IconButton box.
export default function DropdownMenu({ items, triggerSize = 18 }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const handleClose = () => setIsOpen(false)

  const filteredItems = items.filter(Boolean)

  return (
    <View>
      <IconButton
        icon={MoreVertical}
        iconSize={triggerSize}
        color={colors.textPrimary}
        label={t('common:buttons.moreOptions')}
        onPress={() => setIsOpen(true)}
      />

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable
          onPress={handleClose}
          className="flex-1 justify-end"
          style={{ backgroundColor: colors.overlaySoft }}
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
                      color={item.danger ? colors.danger : colors.textSecondary}
                    />
                  )}
                  <Text
                    className="text-base"
                    style={{ color: item.danger ? colors.danger : colors.textPrimary }}
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
