import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { usePreviousWorkout } from '../../hooks/useWorkout'
import { NotesBadge } from '../ui'
import SetNotesView from './SetNotesView'
import { MeasurementType, formatRelativeDate, formatSetValueByType } from '@gym/shared'
import { colors } from '../../lib/styles'

export default function PreviousWorkout({ exerciseId, measurementType = MeasurementType.WEIGHT_REPS, weightUnit = 'kg', timeUnit = 's', distanceUnit = 'm' }) {
  const { t } = useTranslation()
  const { data: previous, isLoading } = usePreviousWorkout(exerciseId)
  const [selectedSet, setSelectedSet] = useState(null)

  if (isLoading) {
    return (
      <View className="rounded-lg p-2" style={{ backgroundColor: colors.bgSecondary }}>
        <View className="h-3 rounded w-20 mb-2" style={{ backgroundColor: colors.bgTertiary }} />
        <View className="h-5 rounded w-full" style={{ backgroundColor: colors.bgTertiary }} />
      </View>
    )
  }

  if (!previous) {
    return (
      <View className="rounded-lg p-2" style={{ backgroundColor: colors.bgSecondary }}>
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          {t('workout:set.firstTime')}
        </Text>
      </View>
    )
  }

  return (
    <View
      className="rounded-lg p-2"
      style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xs" style={{ color: colors.textSecondary }}>{t('workout:set.lastTime')}</Text>
        <Text className="text-xs" style={{ color: colors.textMuted }}>
          {formatRelativeDate(previous.date)}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {previous.sets.map((set, index) => {
            const hasNotes = !!set.notes
            return (
              <View key={index} className="rounded px-2 py-1" style={{ backgroundColor: colors.bgTertiary }}>
                <View className="flex-row items-center justify-between gap-2 mb-0.5">
                  <Text className="text-xs" style={{ color: set.setType === 'dropset' ? colors.orange : colors.textSecondary }}>
                    {set.setType === 'dropset' ? 'D' : `S${set.setNumber}`}
                  </Text>
                  <NotesBadge
                    rir={set.rir}
                    hasNotes={hasNotes}
                    onPress={hasNotes ? () => setSelectedSet(set) : null}
                  />
                </View>
                <Text className="text-sm font-medium text-center" style={{ color: colors.textPrimary }}>
                  {formatSetValueByType({ ...set, weightUnit }, measurementType, { timeUnit, distanceUnit })}
                </Text>
              </View>
            )
          })}
        </View>
      </ScrollView>

      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        rir={selectedSet?.rir}
        notes={selectedSet?.notes}
      />
    </View>
  )
}
