import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronDown, CheckCircle2 } from 'lucide-react-native'
import { DragHandle, DropdownMenu, ExerciseName } from '../ui'
import { colors } from '../../lib/styles'
import { DEFAULT_TRACKED_FIELDS, SetField, getMuscleGroupName, getExerciseNameLinesHeight, formatEffortBadge, formatFieldValue } from '@gym/shared'

const NAME_FONT_SIZE = 15

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
  level,
  rir,
  trackedFields = DEFAULT_TRACKED_FIELDS,
  rest_seconds,
  collapsed,
  isCompleted = false,
  onToggleCollapse,
  menuItems,
  dragHandleProps = null,
  isReordering = false,
}) {
  const { t } = useTranslation()
  const { fontScale } = useWindowDimensions()
  const muscleGroupLabel = getMuscleGroupName(muscleGroup)

  const setsRepsParts = []
  if (series > 0 && reps) setsRepsParts.push(`${series} × ${reps}`)
  // Nivel prescrito por la rutina ("Nv8"): forma compacta, igual que en la fila de serie.
  if (level != null) setsRepsParts.push(formatFieldValue(SetField.LEVEL, level))
  // La escala depende del lo que mide el ejercicio (RIR con reps, RPE textual en el resto): nunca crudo.
  if (rir != null) setsRepsParts.push(formatEffortBadge(rir, trackedFields))
  const setsRepsText = setsRepsParts.join(' · ')

  return (
    <Pressable onPress={onToggleCollapse} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      {dragHandleProps ? (
        // Centred on the name's first line: the box is one line of the name tall, scaled like the
        // name with the system text size. The handle claims the touch, so it does not fold the card.
        <View style={{ height: getExerciseNameLinesHeight(NAME_FONT_SIZE, fontScale, 1), justifyContent: 'center' }}>
          <DragHandle dragHandleProps={dragHandleProps} disabled={isReordering} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <ExerciseName fontSize={NAME_FONT_SIZE} reserveLines className="mb-1.5">
          {exerciseName}
        </ExerciseName>
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
          <Pressable
            onPress={onToggleCollapse}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={t('workout:exercise.expand')}
          >
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
