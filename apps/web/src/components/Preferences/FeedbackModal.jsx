import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateFeedback, getNotifier } from '@gym/shared'
import { Modal, Button, Textarea } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

const TYPES = ['bug', 'suggestion']

function TypePill({ label, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
      style={{
        backgroundColor: active ? colors.success : colors.bgTertiary,
        color: active ? colors.bgPrimary : colors.textMuted,
      }}
    >
      {label}
    </button>
  )
}

function FeedbackModal({ isOpen, onClose }) {
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

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return

    createFeedback.mutate(
      {
        type,
        message: trimmed,
        appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null,
        platform: 'web',
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
    <Modal isOpen={isOpen} onClose={onClose} className="p-6" maxWidth="max-w-md">
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        {t('common:feedback.modalTitle')}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm mb-2 block" style={{ color: colors.textSecondary }}>
            {t('common:feedback.typeLabel')}
          </label>
          <div className="flex gap-2">
            {TYPES.map((opt) => (
              <TypePill
                key={opt}
                label={t(`common:feedback.type${opt[0].toUpperCase() + opt.slice(1)}`)}
                active={type === opt}
                onClick={() => setType(opt)}
                disabled={createFeedback.isPending}
              />
            ))}
          </div>
        </div>

        <Textarea
          label={t('common:feedback.messageLabel')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('common:feedback.messagePlaceholder')}
          rows={5}
          maxLength={4000}
          autoFocus
          disabled={createFeedback.isPending}
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={createFeedback.isPending}>
            {t('common:buttons.cancel')}
          </Button>
          <Button type="submit" disabled={!message.trim() || createFeedback.isPending}>
            {createFeedback.isPending ? t('common:feedback.submitting') : t('common:feedback.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default FeedbackModal
