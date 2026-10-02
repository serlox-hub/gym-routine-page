import { useState, useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { countSessionSetsByMuscleGroup, getMuscleGroupColor, getMuscleGroupName } from '@gym/shared'
import { colors } from '../../lib/styles'

function MuscleGroupSetsChart({ exercises }) {
  const { t } = useTranslation()
  // Expanded by default, unlike VolumeSummary: it replaces muscle-group chips that were always
  // visible, so starting collapsed would hide what the header used to show.
  const [isExpanded, setIsExpanded] = useState(true)
  const rows = useMemo(() => countSessionSetsByMuscleGroup(exercises), [exercises])

  if (rows.length === 0) return null

  return (
    <View style={{ marginTop: 8 }}>
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        hitSlop={{ top: 10, bottom: 10 }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>
          {t('workout:session.setsByMuscleGroup')}
        </Text>
        {isExpanded
          ? <ChevronDown size={14} color={colors.textSecondary} />
          : <ChevronRight size={14} color={colors.textSecondary} />
        }
      </Pressable>
      {isExpanded && (
        <View className="mt-3 gap-2.5">
          {rows.map(({ muscleGroup, sets, ratio }) => {
            const color = getMuscleGroupColor(muscleGroup.name)
            return (
              <View key={muscleGroup.id} className="flex-row items-center gap-3">
                <View className="w-28">
                  <Text className="text-xs font-medium" style={{ color }}>{getMuscleGroupName(muscleGroup)}</Text>
                </View>
                <View className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
                  <View className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: color }} />
                </View>
                <View className="w-8 items-end">
                  <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>{sets}</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

export default MuscleGroupSetsChart
