import { useTranslation } from 'react-i18next'
import UnitChangeModal from './UnitChangeModal.jsx'

export default function MeasurementUnitChangeModal({ fromUnit, toUnit, ...props }) {
  const { t } = useTranslation()

  return (
    <UnitChangeModal
      title={t('common:measurementUnitChange.title')}
      message={t('common:measurementUnitChange.message', { from: fromUnit, to: toUnit })}
      convertLabel={t('common:measurementUnitChange.convert')}
      convertDescription={t('common:measurementUnitChange.convertDescription')}
      unitOnlyLabel={t('common:measurementUnitChange.unitOnly')}
      unitOnlyDescription={t('common:measurementUnitChange.unitOnlyDescription', { to: toUnit })}
      applyingLabel={t('common:measurementUnitChange.applying')}
      {...props}
    />
  )
}
