import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertTriangle } from 'lucide-react'
import { Button, Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { usePreference } from '../../hooks/usePreferences.js'
import { shouldWarnIdleSession, getLastSetEndChoice, IDLE_SESSION_WARNING_MINUTES } from '@gym/shared'

const END_CHOICE = { LAST_SET: 'lastSet', NOW: 'now' }

function EndSessionModal({ isOpen, onClose, onConfirm, isPending, setsPending = 0, lastSetAt = null, isLastSetResolved = false }) {
  const { t } = useTranslation()
  const { value: showSessionNotes } = usePreference('show_session_notes')
  const [notes, setNotes] = useState('')
  const [endChoice, setEndChoice] = useState(END_CHOICE.LAST_SET)

  const showIdleWarning = isOpen && isLastSetResolved && shouldWarnIdleSession(lastSetAt)
  const lastSetChoice = showIdleWarning ? getLastSetEndChoice(lastSetAt) : null

  const handleConfirm = () => {
    onConfirm({
      overallFeeling: null,
      notes: notes.trim() || null,
      completedAt: showIdleWarning && endChoice === END_CHOICE.LAST_SET ? lastSetAt : undefined,
    })
  }

  const handleClose = () => {
    if (isPending) return
    setNotes('')
    setEndChoice(END_CHOICE.LAST_SET)
    onClose()
  }

  const renderEndOption = (choice, label) => {
    const selected = endChoice === choice
    return (
      <button
        type="button"
        onClick={() => setEndChoice(choice)}
        disabled={isPending}
        aria-pressed={selected}
        className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium"
        style={{
          backgroundColor: selected ? colors.successBg : colors.bgTertiary,
          border: `1px solid ${selected ? colors.success : colors.border}`,
          color: selected ? colors.success : colors.textPrimary,
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} position="bottom" maxWidth="max-w-lg"
      className="p-5 pb-8 animate-slide-up" noBorder>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
          {t('workout:session.end')}
        </h3>
        <button
          onClick={handleClose}
          disabled={isPending}
          className="p-1.5 rounded hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <X size={18} style={{ color: colors.textSecondary }} />
        </button>
      </div>

      {showIdleWarning && (
        <div
          className="mb-5 p-3 rounded-lg"
          style={{ backgroundColor: colors.warningBg, border: `1px solid ${colors.warning}` }}
        >
          <div className="flex items-start gap-2.5 mb-3">
            <AlertTriangle size={18} style={{ color: colors.warning, flexShrink: 0, marginTop: 1 }} />
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              {t('workout:session.idleWarning', { minutes: IDLE_SESSION_WARNING_MINUTES })}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {renderEndOption(END_CHOICE.LAST_SET, t(lastSetChoice.key, lastSetChoice.params))}
            {renderEndOption(END_CHOICE.NOW, t('workout:session.endNow'))}
          </div>
        </div>
      )}

      {setsPending > 0 && (
        <div
          className="flex items-start gap-2.5 mb-5 p-3 rounded-lg"
          style={{ backgroundColor: colors.warningBg, border: `1px solid ${colors.warning}` }}
        >
          <AlertTriangle size={18} style={{ color: colors.warning, flexShrink: 0, marginTop: 1 }} />
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {t('workout:session.pendingSetsWarning', { count: setsPending })}
          </p>
        </div>
      )}

      {showSessionNotes && (
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
            {t('common:labels.notes')} ({t('common:labels.optional')})
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('workout:session.notesPlaceholder')}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={{
              backgroundColor: colors.bgTertiary,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
            }}
          />
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={isPending}>
          {t('common:buttons.cancel')}
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleConfirm}
          disabled={isPending}
        >
          {isPending ? t('common:buttons.loading') : t('common:buttons.done')}
        </Button>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </Modal>
  )
}

export default EndSessionModal
