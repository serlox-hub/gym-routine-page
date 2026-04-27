import { useTranslation } from 'react-i18next'
import Modal from '../ui/Modal.jsx'
import { colors } from '../../lib/styles.js'

function OptionButton({ label, description, onClick, disabled, variant = 'primary' }) {
  const isPrimary = variant === 'primary'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left rounded-lg p-3 transition-colors"
      style={{
        backgroundColor: isPrimary ? colors.actionPrimary : colors.bgTertiary,
        color: isPrimary ? colors.textDark : colors.textPrimary,
        border: isPrimary ? 'none' : `1px solid ${colors.border}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>{description}</div>
    </button>
  )
}

export default function WeightUnitChangeModal({
  isOpen,
  scope,
  fromUnit,
  toUnit,
  onConvert,
  onUnitOnly,
  onCancel,
  isPending = false,
}) {
  const { t } = useTranslation()

  const messageKey = scope === 'global' ? 'common:weightUnitChange.messageGlobal' : 'common:weightUnitChange.messageExercise'

  return (
    <Modal isOpen={isOpen} onClose={isPending ? undefined : onCancel} className="p-6">
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
        {t('common:weightUnitChange.title')}
      </h3>
      <p className="text-sm mb-5" style={{ color: colors.textSecondary }}>
        {t(messageKey, { from: fromUnit, to: toUnit })}
      </p>

      <div className="flex flex-col gap-2">
        <OptionButton
          label={t('common:weightUnitChange.convert')}
          description={t('common:weightUnitChange.convertDescription')}
          onClick={onConvert}
          disabled={isPending}
          variant="primary"
        />
        <OptionButton
          label={t('common:weightUnitChange.unitOnly')}
          description={t('common:weightUnitChange.unitOnlyDescription', { to: toUnit })}
          onClick={onUnitOnly}
          disabled={isPending}
          variant="secondary"
        />
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="text-sm px-3 py-2 rounded-lg"
          style={{ color: colors.textMuted, opacity: isPending ? 0.5 : 1 }}
        >
          {isPending ? t('common:weightUnitChange.applying') : t('common:buttons.cancel')}
        </button>
      </div>
    </Modal>
  )
}
