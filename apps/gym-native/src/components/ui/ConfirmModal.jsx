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
  // Tocar el fondo y atrás de Android. Por defecto = cancelar; se separa cuando cancelar es una
  // opción más ("Solo hoy") y cerrar debe abortar sin elegir ninguna.
  onDismiss,
  variant = 'danger',
  isLoading = false,
}) {
  const { t } = useTranslation()
  confirmText = confirmText || t('common:buttons.confirm')
  cancelText = cancelText || t('common:buttons.cancel')

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? undefined : (onDismiss ?? onCancel)}
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
