import { useTranslation } from 'react-i18next'
import UnitChangeModal from './UnitChangeModal.jsx'

export default function WeightUnitChangeModal({ scope, fromUnit, toUnit, ...props }) {
  const { t } = useTranslation()
  const messageKey = scope === 'global' ? 'common:weightUnitChange.messageGlobal' : 'common:weightUnitChange.messageExercise'

  return (
    <UnitChangeModal
      title={t('common:weightUnitChange.title')}
      message={t(messageKey, { from: fromUnit, to: toUnit })}
      convertLabel={t('common:weightUnitChange.convert')}
      convertDescription={t('common:weightUnitChange.convertDescription')}
      unitOnlyLabel={t('common:weightUnitChange.unitOnly')}
      unitOnlyDescription={t('common:weightUnitChange.unitOnlyDescription', { to: toUnit })}
      applyingLabel={t('common:weightUnitChange.applying')}
      {...props}
    />
  )
}
