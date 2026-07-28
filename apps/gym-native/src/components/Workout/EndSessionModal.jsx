import { useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react-native'
import { Modal, Button } from '../ui'
import { inputStyle, colors } from '../../lib/styles'
import { usePreference } from '../../hooks/usePreferences'

export default function EndSessionModal({ isOpen, onClose, onConfirm, isPending, setsPending = 0 }) {
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
    if (isPending) return
    setNotes('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} position="bottom" className="p-5">
      <Text className="text-primary text-lg font-semibold mb-4">{t('workout:session.end')}</Text>

      {setsPending > 0 && (
        <View
          className="flex-row items-start mb-5 p-3 rounded-lg"
          style={{ gap: 10, backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warning }}
        >
          <AlertTriangle size={18} color={colors.warning} style={{ flexShrink: 0, marginTop: 1 }} />
          <Text className="text-secondary text-sm" style={{ flex: 1 }}>
            {t('workout:session.pendingSetsWarning', { count: setsPending })}
          </Text>
        </View>
      )}

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
        <Button variant="secondary" className="flex-1" onPress={handleClose} disabled={isPending}>
          {t('common:buttons.cancel')}
        </Button>
        <Button className="flex-1" onPress={handleConfirm} loading={isPending}>
          {t('workout:session.end')}
        </Button>
      </View>
    </Modal>
  )
}
