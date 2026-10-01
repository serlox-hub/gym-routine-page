import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import Button from './Button'
import Modal from './Modal'
import SaveStatus from './SaveStatus'

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
  // Which button shows the pending look while `isLoading`: 'cancel' when cancel is a choice that
  // also saves ("Solo hoy"). Both stay disabled either way.
  loadingButton = 'confirm',
  // A status line above the buttons: slow-connection notice while loading, `error` once it fails.
  saveStatus = false,
  error = null,
  // Lets the user walk away from a slow action instead of being trapped until it answers.
  dismissibleWhileLoading = false,
}) {
  const { t } = useTranslation()
  confirmText = confirmText || t('common:buttons.confirm')
  cancelText = cancelText || t('common:buttons.cancel')
  const isCancelLoading = isLoading && loadingButton === 'cancel'
  const isConfirmLoading = isLoading && loadingButton === 'confirm'

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading && !dismissibleWhileLoading ? undefined : (onDismiss ?? onCancel)}
      className="p-6"
    >
      <Text className="text-primary text-lg font-semibold mb-2">{title}</Text>
      <Text className="text-secondary text-sm mb-6">{message}</Text>
      {saveStatus && <SaveStatus isPending={isLoading} error={error} className="mb-4" />}
      <View className="flex-row gap-3 justify-end">
        <Button variant="secondary" onPress={onCancel} disabled={isLoading} loading={isCancelLoading}>
          {cancelText}
        </Button>
        <Button variant={variant} onPress={onConfirm} disabled={isLoading} loading={isConfirmLoading}>
          {isConfirmLoading ? (loadingText || t('common:buttons.loading')) : confirmText}
        </Button>
      </View>
    </Modal>
  )
}
