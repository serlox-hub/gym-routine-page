import { View, Text } from 'react-native'
import Button from './Button'
import Modal from './Modal'

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loadingText,
  onConfirm,
  onCancel,
  variant = 'danger',
  isLoading = false,
}) {
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
          {isLoading ? (loadingText || 'Procesando...') : confirmText}
        </Button>
      </View>
    </Modal>
  )
}
