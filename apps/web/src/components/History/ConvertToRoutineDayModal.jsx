import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useConvertSessionToRoutineDayForm } from '@gym/shared'
import { Modal, Button, Input, LoadingSpinner } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

// Mounted only while open: the form hook starts from the defaults on every opening.
function ConvertToRoutineDayModal({ session, onClose, onConverted }) {
  const { t } = useTranslation()
  const form = useConvertSessionToRoutineDayForm({ session, onSuccess: onConverted })

  const options = [
    { key: 'new', label: t('workout:history.convertToDay.newRoutine'), isNew: true, selected: form.isNewRoutine, onSelect: form.selectNewRoutine },
    ...form.routines.map(routine => ({
      key: routine.id,
      label: routine.name,
      isNew: false,
      selected: form.selectedRoutineId === String(routine.id),
      onSelect: () => form.selectRoutine(routine.id),
    })),
  ]

  const handleSubmit = (event) => {
    event.preventDefault()
    form.submit()
  }

  return (
    <Modal isOpen onClose={form.isPending ? undefined : onClose}>
      <form onSubmit={handleSubmit} className="p-5 flex flex-col min-h-0" style={{ gap: 16 }}>
        <div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: colors.textPrimary }}>
            {t('workout:history.convertToDay.title')}
          </h3>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {t('workout:history.convertToDay.description')}
          </p>
        </div>

        <div className="min-h-0 flex flex-col">
          <span className="text-sm text-secondary mb-1 block">{t('workout:history.convertToDay.routine')}</span>
          <div role="radiogroup" className="space-y-2 overflow-y-auto" style={{ maxHeight: 220 }}>
            {options.map(option => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={option.selected}
                onClick={option.onSelect}
                className="w-full text-left p-3 rounded-lg transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: option.selected ? colors.successBg : colors.bgTertiary,
                  border: `1px solid ${option.selected ? colors.success : 'transparent'}`,
                  color: option.selected ? colors.success : colors.textPrimary,
                }}
              >
                {option.isNew && <Plus size={16} />}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
            {form.isLoadingRoutines && <LoadingSpinner inline className="py-2" />}
          </div>
          {/* Without it, "couldn't load them" reads as "you have none" and invites a duplicate routine. */}
          {form.isRoutinesError && (
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="text-sm" style={{ color: colors.danger }}>
                {t('workout:history.convertToDay.routinesLoadError')}
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={form.retryRoutines}>
                {t('common:buttons.retry')}
              </Button>
            </div>
          )}
        </div>

        {form.isNewRoutine && (
          <Input
            label={t('workout:history.convertToDay.routineName')}
            value={form.newRoutineName}
            onChange={e => form.setNewRoutineName(e.target.value)}
            autoFocus
          />
        )}

        <Input
          label={t('workout:history.convertToDay.dayName')}
          value={form.dayName}
          onChange={e => form.setDayName(e.target.value)}
        />

        {/* Always mounted (and never display:none, which drops it from the accessibility tree):
            a live region born together with its text is not announced. */}
        <p role="status" aria-live="polite" className="sr-only">{form.notice?.text ?? ''}</p>
        {form.notice && (
          <p
            aria-hidden="true"
            className="text-sm"
            style={{ color: form.notice.type === 'error' ? colors.danger : colors.textSecondary }}
          >
            {form.notice.text}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={form.isPending}>
            {t('common:buttons.cancel')}
          </Button>
          <Button type="submit" disabled={form.isPending} blocked={form.isBlocked}>
            {form.isPending ? <LoadingSpinner inline /> : t('workout:history.convertToDay.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ConvertToRoutineDayModal
