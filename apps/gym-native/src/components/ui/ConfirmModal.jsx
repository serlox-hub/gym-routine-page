import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import Button from './Button'
import Modal from './Modal'

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  loadingText,
  onConfirm,
  onCancel,
  variant = 'danger',
  isLoading = false,
}) {
  const { t } = useTranslation()
  confirmText = confirmText || t('common:buttons.confirm')
  cancelText = cancelText || t('common:buttons.cancel')

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? undefined : onCancel}
      className="p-6"
    >
      <Text className="text-primary text-lg font-semibold mb-2">{title}</Text>
      <Text className="text-secondary text-sm mb-6">{message}</Text>
      <View className="flex-row gap-3 justify-end">
        <Button variant="secondary" onPress={onCancel} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button variant={variant} onPress={onConfirm} loading={isLoading}>
          {isLoading ? (loadingText || t('common:buttons.loading')) : confirmText}
        </Button>
      </View>
    </Modal>
  )
}
