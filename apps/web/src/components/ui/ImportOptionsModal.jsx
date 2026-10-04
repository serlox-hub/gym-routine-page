import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from './Button.jsx'
import Modal from './Modal.jsx'
import Switch from './Switch.jsx'
import { colors } from '../../lib/styles.js'

function ImportOptionsModal({ isOpen, onConfirm, onCancel }) {
  const { t } = useTranslation()
  const [updateExercises, setUpdateExercises] = useState(false)

  const handleConfirm = () => {
    onConfirm({ updateExercises })
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="p-6">
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
        {t('common:import.optionsTitle')}
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
        {t('common:import.configDescription')}
      </p>

      <div
        className="flex items-center justify-between gap-3 p-3 rounded-lg mb-6"
        style={{ backgroundColor: colors.bgSecondary }}
      >
        <div>
          <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
            {t('common:import.updateExisting')}
          </span>
          <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
            {t('common:import.updateExistingDesc')}
          </p>
        </div>
        <Switch
          checked={updateExercises}
          onChange={setUpdateExercises}
          accessibilityLabel={t('common:import.updateExisting')}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel}>
          {t('common:buttons.cancel')}
        </Button>
        <Button variant="primary" onClick={handleConfirm}>
          {t('common:buttons.import')}
        </Button>
      </div>
    </Modal>
  )
}

export default ImportOptionsModal
