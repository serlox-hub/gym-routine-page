import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useUserExerciseOverride, useUpsertUserExerciseOverride } from '../../hooks/useExercises'
import { usePreference } from '../../hooks/usePreferences'


import { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm'
import { colors, inputStyle } from '../../lib/styles'

export default function SystemExerciseDetailsPanel({ exerciseId, onClose }) {
  const { t } = useTranslation()
  const { data: override } = useUserExerciseOverride(exerciseId)
  const upsertOverride = useUpsertUserExerciseOverride()
  const { value: globalWeightUnit } = usePreference('weight_unit')

  const [notes, setNotes] = useState('')
  const [weightUnit, setWeightUnit] = useState('')

  useEffect(() => {
    if (override) {
      setNotes(override.notes || '')
      setWeightUnit(override.weight_unit || '')
    }
  }, [override])

  const handleSave = () => {
    upsertOverride.mutate({ exerciseId, notes, weightUnit: weightUnit || null }, {
      onSuccess: () => onClose?.(),
    })
  }

  return (
    <>
      <ScrollView className="p-4" style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
        <View className="px-3 py-2 rounded-lg mb-4" style={{ backgroundColor: colors.accentBgSubtle }}>
          <Text style={{ fontSize: 12, color: colors.accent }}>{t('exercise:systemExerciseInfo')}</Text>
        </View>

        {/* Personal notes */}
        <View className="mb-4">
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
            {t('exercise:personalNotes')}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('exercise:personalNotesPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={[inputStyle, { minHeight: 80, textAlignVertical: 'top', fontSize: 14 }]}
          />
        </View>

        {/* Weight unit override */}
        <View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
            {t('exercise:weightUnitOverride')}
          </Text>
          <View className="flex-row gap-2">
            {['kg', 'lb'].map((unit) => {
              const effectiveUnit = weightUnit || globalWeightUnit || 'kg'
              const isActive = effectiveUnit === unit
              return (
                <Pressable
                  key={unit}
                  onPress={() => setWeightUnit(effectiveUnit === unit ? '' : unit)}
                  className="flex-1 py-2 rounded-lg items-center"
                  style={{
                    backgroundColor: isActive ? colors.accent : colors.bgTertiary,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isActive ? colors.white : colors.textSecondary }}>
                    {unit}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </ScrollView>

      <ExerciseConfigFormButtons
        onBack={onClose}
        onSubmit={handleSave}
        isPending={upsertOverride.isPending}
        submitLabel={t('common:buttons.save')}
      />
    </>
  )
}
