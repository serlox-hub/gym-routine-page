import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Badge } from '../ui'
import { getExerciseInstructions, getStructuredInstructions } from '@gym/shared'
import { useUserExerciseOverride } from '../../hooks/useExercises'
import { colors } from '../../lib/styles'

function StructuredInstructions({ instructions }) {
  const { t } = useTranslation()
  if (!instructions) return null

  return (
    <View className="gap-2">
      {instructions.setup && (
        <Text className="text-sm" style={{ color: colors.textPrimary }}>
          <Text className="font-medium" style={{ color: colors.accent }}>{t('exercise:setup')}: </Text>
          {instructions.setup}
        </Text>
      )}
      {instructions.execution && (
        <Text className="text-sm" style={{ color: colors.textPrimary }}>
          <Text className="font-medium" style={{ color: colors.accent }}>{t('exercise:execution')}: </Text>
          {instructions.execution}
        </Text>
      )}
      {instructions.cues?.length > 0 && (
        <View>
          <Text className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>{t('exercise:cues')}</Text>
          <View className="gap-0.5">
            {instructions.cues.map((cue, i) => (
              <View key={i} className="flex-row items-start gap-1.5">
                <Text style={{ color: colors.success }}>&#x2022;</Text>
                <Text className="text-xs flex-1" style={{ color: colors.textPrimary }}>{cue}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {instructions.mistakes?.length > 0 && (
        <View>
          <Text className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>{t('exercise:mistakes')}</Text>
          <View className="gap-0.5">
            {instructions.mistakes.map((mistake, i) => (
              <View key={i} className="flex-row items-start gap-1.5">
                <Text style={{ color: colors.warning }}>&#x2022;</Text>
                <Text className="text-xs flex-1" style={{ color: colors.textPrimary }}>{mistake}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

function ExerciseCardNotes({
  series,
  reps,
  rir,
  rest_seconds,
  showNotes,
  onToggleNotes,
  exercise,
  notes,
}) {
  const { t } = useTranslation()
  const structured = getStructuredInstructions(exercise)
  const legacyText = !structured ? getExerciseInstructions(exercise) : ''
  const { data: override } = useUserExerciseOverride(exercise?.id)
  const personalNotes = override?.notes
  const hasNoteContent = structured || legacyText || notes || personalNotes

  return (
    <>
      <View className="my-3 pt-3 flex-row flex-wrap items-center gap-2" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Badge variant="accent">{series}×{reps}</Badge>
        {rir !== null && <Badge variant="purple">RIR {rir}</Badge>}
        {rest_seconds > 0 && <Badge variant="default">{rest_seconds}s</Badge>}
        {hasNoteContent && (
          <Pressable
            onPress={onToggleNotes}
            className="px-2 py-1 rounded active:opacity-70"
            style={{ backgroundColor: showNotes ? 'rgba(136, 198, 190, 0.2)' : colors.bgTertiary }}
          >
            <Text className="text-xs" style={{ color: showNotes ? colors.teal : colors.textSecondary }}>
              {showNotes ? `▲ ${t('exercise:hideNotes')}` : `▼ ${t('exercise:showNotes')}`}
            </Text>
          </Pressable>
        )}
      </View>

      {showNotes && hasNoteContent && (
        <View className="mb-3 p-3 rounded gap-2" style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
          {structured && <StructuredInstructions instructions={structured} />}
          {legacyText && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.accent }}>{t('exercise:execution')}: </Text>{legacyText}
            </Text>
          )}
          {personalNotes && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.teal }}>{t('exercise:personalNotes')}: </Text>{personalNotes}
            </Text>
          )}
          {notes && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.warning }}>{t('exercise:routineComment')}: </Text>{notes}
            </Text>
          )}
        </View>
      )}
    </>
  )
}

export default ExerciseCardNotes
