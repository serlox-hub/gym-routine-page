import { View, Text, Pressable, ScrollView } from 'react-native'
import { ChevronDown, CheckCircle2 } from 'lucide-react-native'
import { DropdownMenu } from '../ui'
import { colors } from '../../lib/styles'
import { getMuscleGroupName } from '@gym/shared'

function MetaPill({ children }) {
  return (
    <View style={{ backgroundColor: colors.bgPrimary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '500' }}>{children}</Text>
    </View>
  )
}

function ExerciseCardHeader({
  exerciseName,
  muscleGroup,
  series,
  reps,
  rir,
  rest_seconds,
  collapsed,
  isCompleted = false,
  onToggleCollapse,
  menuItems,
}) {
  const muscleGroupLabel = getMuscleGroupName(muscleGroup)

  const setsRepsParts = []
  if (series > 0 && reps) setsRepsParts.push(`${series} × ${reps}`)
  if (rir != null) setsRepsParts.push(`@${rir}`)
  const setsRepsText = setsRepsParts.join(' · ')

  return (
    <Pressable onPress={onToggleCollapse} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 6 }} numberOfLines={1}>
          {exerciseName}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          {!collapsed && muscleGroupLabel ? <MetaPill>{muscleGroupLabel}</MetaPill> : null}
          {setsRepsText ? <MetaPill>{setsRepsText}</MetaPill> : null}
          {rest_seconds > 0 && <MetaPill>{`${rest_seconds}s`}</MetaPill>}
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {isCompleted ? <CheckCircle2 size={18} color={colors.success} /> : null}
        {collapsed ? (
          <Pressable onPress={onToggleCollapse} hitSlop={8}>
            <ChevronDown size={18} color={colors.textMuted} />
          </Pressable>
        ) : (
          menuItems && <DropdownMenu triggerSize={16} items={menuItems} />
        )}
      </View>
    </Pressable>
  )
}

export default ExerciseCardHeader
