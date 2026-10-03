import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, ErrorMessage, Modal } from '../ui'

/**
 * "Create share link" in one modal with two steps: confirm, then the link one tap from sharing it.
 * One modal and not two in a row: on iOS a modal presented while another is being dismissed may
 * never show. Same steps as the web (apps/web/.../CreateShareLinkModal.jsx), where the second tap is
 * required because Safari only opens the share sheet inside a tap. `url` null = first step.
 * `shareErrorKey` shows a failed share inline: a toast would paint under this modal.
 */
export default function CreateShareLinkModal({ isOpen, url, isCreating, shareErrorKey, onCreate, onShare, onClose }) {
  const { t } = useTranslation()

  if (!url) {
    return (
      <Modal isOpen={isOpen} onClose={isCreating ? undefined : onClose} className="p-6">
        <Text className="text-primary text-lg font-semibold mb-2">{t('routine:shareLink.createConfirmTitle')}</Text>
        <Text className="text-secondary text-sm mb-6">{t('routine:shareLink.createConfirmMessage')}</Text>
        <View className="flex-row gap-3 justify-end">
          <Button variant="secondary" onPress={onClose} disabled={isCreating}>{t('common:buttons.cancel')}</Button>
          <Button variant="primary" onPress={onCreate} disabled={isCreating} loading={isCreating}>
            {isCreating ? t('common:buttons.loading') : t('routine:shareLink.createConfirm')}
          </Button>
        </View>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-6">
      <Text className="text-primary text-lg font-semibold mb-2">{t('routine:shareLink.readyTitle')}</Text>
      <Text className="text-secondary text-sm mb-4">{t('routine:shareLink.readyMessage')}</Text>
      <Text selectable className="text-primary text-sm mb-4 px-3 py-2 rounded-lg bg-surface-block">{url}</Text>
      {shareErrorKey && <ErrorMessage message={t(shareErrorKey)} className="mb-4" />}
      <View className="flex-row gap-3 justify-end">
        <Button variant="secondary" onPress={onClose}>{t('common:buttons.close')}</Button>
        <Button variant="primary" onPress={onShare}>{t('routine:shareLink.shareNow')}</Button>
      </View>
    </Modal>
  )
}
