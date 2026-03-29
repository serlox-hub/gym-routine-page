import { useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Modal, Button } from '../ui'
import { inputStyle, colors } from '../../lib/styles'
import { usePreference } from '../../hooks/usePreferences'

export default function EndSessionModal({ isOpen, onClose, onConfirm, isPending }) {
  const { t } = useTranslation()
  const { value: showSessionNotes } = usePreference('show_session_notes')
  const [notes, setNotes] = useState('')

  const handleConfirm = () => {
    onConfirm({
      overallFeeling: null,
      notes: notes.trim() || null,
    })
  }

  const handleClose = () => {
    setNotes('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} position="bottom" className="p-5">
      <Text className="text-primary text-lg font-semibold mb-4">{t('workout:session.end')}</Text>

      {showSessionNotes && (
        <View className="mb-5">
          <Text className="text-secondary text-sm font-medium mb-2">{t('common:labels.notes')} ({t('common:labels.optional')})</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('workout:session.notesPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={[inputStyle, { textAlignVertical: 'top', minHeight: 80 }]}
          />
        </View>
      )}

      <View className="flex-row gap-3">
        <Button variant="secondary" className="flex-1" onPress={handleClose}>
          {t('common:buttons.cancel')}
        </Button>
        <Button className="flex-1" onPress={handleConfirm} loading={isPending}>
          {isPending ? t('common:buttons.loading') : t('workout:session.end')}
        </Button>
      </View>
    </Modal>
  )
}
