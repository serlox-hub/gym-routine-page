import { useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { FileText, Video, Clock } from 'lucide-react-native'
import { usePreviousWorkout } from '../../hooks/useWorkout'
import SetNotesView from './SetNotesView'
import { MeasurementType, formatRelativeDate, formatPreviousSetValue, formatEffortBadge } from '@gym/shared'
import { colors } from '../../lib/styles'

export default function PreviousWorkout({ exerciseId, measurementType = MeasurementType.WEIGHT_REPS, weightUnit = 'kg', timeUnit = 's', distanceUnit = 'm' }) {
  const { t } = useTranslation()
  const { data: previous, isLoading } = usePreviousWorkout(exerciseId)
  const [selectedSet, setSelectedSet] = useState(null)

  if (isLoading) {
    return (
      <View className="rounded-lg p-3" style={{ backgroundColor: colors.bgSecondary }}>
        <View className="h-3 rounded w-32 mb-2" style={{ backgroundColor: colors.bgTertiary }} />
        <View className="h-10 rounded w-full" style={{ backgroundColor: colors.bgTertiary }} />
      </View>
    )
  }

  if (!previous) {
    return (
      <View className="rounded-lg p-3" style={{ backgroundColor: colors.bgSecondary }}>
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          {t('workout:set.firstTime')}
        </Text>
      </View>
    )
  }

  return (
    <View className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt }}>
      <View className="flex-row items-center mb-3" style={{ gap: 6 }}>
        <Clock size={12} color={colors.textSecondary} />
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          {t('workout:set.lastSession', { when: formatRelativeDate(previous.date) })}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row" style={{ gap: 8 }}>
          {previous.sets.map((set, index) => {
            const hasNotes = !!set.notes
            const hasVideo = !!set.videoUrl
            const interactive = hasNotes || hasVideo
            const isDropset = set.setType === 'dropset'
            const valueText = formatPreviousSetValue(set, measurementType, { weightUnit, timeUnit, distanceUnit })

            return (
              <Pressable
                key={index}
                onPress={interactive ? () => setSelectedSet(set) : undefined}
                disabled={!interactive}
                style={{
                  backgroundColor: colors.border,
                  borderWidth: isDropset ? 1 : 0,
                  borderColor: isDropset ? colors.orange : 'transparent',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  minWidth: 76,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                  {valueText}
                </Text>
                <View className="flex-row items-center" style={{ gap: 4, marginTop: 2, minHeight: 14 }}>
                  {set.rir != null && (
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>
                      {formatEffortBadge(set.rir, measurementType)}
                    </Text>
                  )}
                  {hasNotes && <FileText size={11} color={colors.textMuted} />}
                  {hasVideo && <Video size={11} color={colors.textMuted} />}
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        notes={selectedSet?.notes}
        videoUrl={selectedSet?.videoUrl}
      />
    </View>
  )
}
