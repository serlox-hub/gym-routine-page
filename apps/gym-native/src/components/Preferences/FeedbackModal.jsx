import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useCreateFeedback, getNotifier } from '@gym/shared'
import { Modal, Button } from '../ui'
import { colors, inputStyle } from '../../lib/styles'
const appVersion = require('../../../app.json').expo.version

const TYPES = ['bug', 'suggestion']

function TypePill({ label, active, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: active ? colors.success : colors.bgTertiary,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? colors.bgPrimary : colors.textMuted }}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function FeedbackModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const createFeedback = useCreateFeedback()
  const [type, setType] = useState('bug')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setType('bug')
      setMessage('')
    }
  }, [isOpen])

  const handleSubmit = () => {
    const trimmed = message.trim()
    if (!trimmed) return

    createFeedback.mutate(
      {
        type,
        message: trimmed,
        appVersion,
        platform: 'native',
      },
      {
        onSuccess: () => {
          getNotifier()?.show(t('common:feedback.successToast'), 'success')
          onClose()
        },
        onError: () => {
          getNotifier()?.show(t('common:feedback.errorToast'), 'error')
        },
      },
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-5">
      <Text className="text-lg font-semibold text-primary mb-4">
        {t('common:feedback.modalTitle')}
      </Text>

      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-secondary mb-2">
            {t('common:feedback.typeLabel')}
          </Text>
          <View className="flex-row gap-2">
            {TYPES.map((opt) => (
              <TypePill
                key={opt}
                label={t(`common:feedback.type${opt[0].toUpperCase() + opt.slice(1)}`)}
                active={type === opt}
                onPress={() => setType(opt)}
                disabled={createFeedback.isPending}
              />
            ))}
          </View>
        </View>

        <View>
          <Text className="text-sm font-medium text-secondary mb-1">
            {t('common:feedback.messageLabel')}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('common:feedback.messagePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={4000}
            style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]}
            editable={!createFeedback.isPending}
          />
        </View>

        <View className="flex-row gap-3 justify-end pt-2">
          <Button variant="secondary" onPress={onClose} disabled={createFeedback.isPending}>
            {t('common:buttons.cancel')}
          </Button>
          <Button
            onPress={handleSubmit}
            disabled={!message.trim() || createFeedback.isPending}
            loading={createFeedback.isPending}
          >
            {t('common:feedback.submit')}
          </Button>
        </View>
      </View>
    </Modal>
  )
}
