import { useState } from 'react'
import { View, Text, Switch } from 'react-native'
import { useTranslation } from 'react-i18next'
import Button from './Button'
import Modal from './Modal'
import { colors } from '../../lib/styles'

export default function ImportOptionsModal({ isOpen, onConfirm, onCancel }) {
  const { t } = useTranslation()
  const [updateExercises, setUpdateExercises] = useState(false)

  const handleConfirm = () => {
    onConfirm({ updateExercises })
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="p-6">
      <Text className="text-primary text-lg font-semibold mb-2">
        {t('common:import.optionsTitle')}
      </Text>
      <Text className="text-secondary text-sm mb-4">
        {t('common:import.optionsDescription')}
      </Text>

      <View className="flex-row items-center justify-between bg-surface-card p-3 rounded-lg mb-6">
        <View className="flex-1 mr-3">
          <Text className="text-primary text-sm font-medium">
            {t('common:import.updateExisting')}
          </Text>
          <Text className="text-secondary text-xs mt-1">
            {t('common:import.updateExistingDesc')}
          </Text>
        </View>
        <Switch
          value={updateExercises}
          onValueChange={setUpdateExercises}
          trackColor={{ false: colors.border, true: colors.actionPrimary }}
          thumbColor={colors.textPrimary}
        />
      </View>

      <View className="flex-row gap-3 justify-end">
        <Button variant="secondary" onPress={onCancel}>
          {t('common:buttons.cancel')}
        </Button>
        <Button onPress={handleConfirm}>
          {t('common:buttons.import')}
        </Button>
      </View>
    </Modal>
  )
}
