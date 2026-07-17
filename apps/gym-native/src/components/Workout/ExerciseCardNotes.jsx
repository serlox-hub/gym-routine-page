import { useState } from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { getExerciseInstructions, getStructuredInstructions, getExerciseName } from '@gym/shared'
import { useUserExerciseOverride } from '../../hooks/useExercises'
import { colors } from '../../lib/styles'
import ExerciseGif from './ExerciseGif'
import ExerciseGifViewer from './ExerciseGifViewer'

function StructuredInstructions({ instructions }) {
  const { t } = useTranslation()
  if (!instructions) return null

  return (
    <View className="gap-2">
      {instructions.setup && (
        <Text className="text-sm" style={{ color: colors.textPrimary }}>
          <Text className="font-medium" style={{ color: colors.textSecondary }}>{t('exercise:setup')}: </Text>
          {instructions.setup}
        </Text>
      )}
      {instructions.execution && (
        <Text className="text-sm" style={{ color: colors.textPrimary }}>
          <Text className="font-medium" style={{ color: colors.textSecondary }}>{t('exercise:execution')}: </Text>
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

function ExerciseCardNotes({ exercise, notes }) {
  const { t } = useTranslation()
  const [showGif, setShowGif] = useState(false)
  const structured = getStructuredInstructions(exercise)
  const legacyText = !structured ? getExerciseInstructions(exercise) : ''
  const { data: override } = useUserExerciseOverride(exercise?.id)
  const personalNotes = override?.notes
  const gifKey = exercise?.gif_key
  const hasInstructions = Boolean(structured || legacyText)

  if (!structured && !legacyText && !notes && !personalNotes && !gifKey) return null

  const exerciseName = getExerciseName(exercise)

  return (
    <View
      className="mt-2 p-3 rounded gap-2"
      style={{ backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.borderSubtle }}
    >
      {gifKey && (
        <View className="items-center">
          <ExerciseGif
            gifKey={gifKey}
            size="sm"
            dimension={128}
            alt={t('exercise:gifAlt', { name: exerciseName })}
            onExpand={() => setShowGif(true)}
          />
        </View>
      )}
      {hasInstructions && (
        <View className="gap-2">
          {structured && <StructuredInstructions instructions={structured} />}
          {legacyText && (
            <Text className="text-sm" style={{ color: colors.textPrimary }}>
              <Text style={{ color: colors.textSecondary }}>{t('exercise:execution')}: </Text>{legacyText}
            </Text>
          )}
        </View>
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
      {gifKey && (
        <ExerciseGifViewer
          isOpen={showGif}
          onClose={() => setShowGif(false)}
          gifKey={gifKey}
          exerciseName={exerciseName}
        />
      )}
    </View>
  )
}

export default ExerciseCardNotes
