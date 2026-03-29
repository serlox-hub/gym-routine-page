import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Modal, Button } from '../ui'
import { colors } from '../../lib/styles'

export default function MoveToDayModal({ isOpen, onClose, onSubmit, days, currentDayId, exerciseName, isPending }) {
  const { t } = useTranslation()
  const [selectedDayId, setSelectedDayId] = useState(null)

  const availableDays = days?.filter(d => d.id !== currentDayId) || []

  const handleSubmit = () => {
    if (selectedDayId) onSubmit(selectedDayId)
  }

  const handleClose = () => {
    setSelectedDayId(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-5">
      <Text className="text-primary text-lg font-semibold mb-2">{t('routine:exercise.moveToDay')}</Text>
      <Text className="text-secondary text-sm mb-4">
        {t('routine:exercise.moveToDayDesc')} <Text className="text-primary font-semibold">{exerciseName}</Text>
      </Text>

      {availableDays.length === 0 ? (
        <Text className="text-secondary text-sm text-center py-4">
          {t('routine:exercise.noOtherDays')}
        </Text>
      ) : (
        <View className="gap-2 mb-4">
          {availableDays.map(day => (
            <Pressable
              key={day.id}
              onPress={() => setSelectedDayId(day.id)}
              className="p-3 rounded-lg"
              style={{
                backgroundColor: selectedDayId === day.id ? colors.accentBg : colors.bgTertiary,
                borderWidth: 1,
                borderColor: selectedDayId === day.id ? colors.accent : 'transparent',
              }}
            >
              <Text className="text-primary">{day.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View className="flex-row gap-3 justify-end">
        <Button variant="secondary" onPress={handleClose}>{t('common:buttons.cancel')}</Button>
        <Button onPress={handleSubmit} disabled={!selectedDayId || isPending} loading={isPending}>
          {t('routine:exercise.moveToDay')}
        </Button>
      </View>
    </Modal>
  )
}
