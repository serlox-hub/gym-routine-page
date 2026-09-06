import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react-native'
import { useChangeWeightUnit, useSelectedGym, useUserExerciseGymUnit, getGymDisplayName, buildExerciseOverrideForm } from '@gym/shared'
import { useExercise, useUserExerciseOverride, useUpsertUserExerciseOverride } from '../../hooks/useExercises'
import { usePreference } from '../../hooks/usePreferences'

import { WeightUnitChangeModal } from '../Preferences'
import DistanceUnitPicker from './DistanceUnitPicker'
import { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm'
import { colors, inputStyle } from '../../lib/styles'

export default function SystemExerciseDetailsPanel({ exerciseId, onClose }) {
  const { t } = useTranslation()
  const { gymId, gyms, hasMultiple } = useSelectedGym()
  const { data: exercise } = useExercise(exerciseId)
  const { data: override } = useUserExerciseOverride(exerciseId)
  const { data: gymUnit } = useUserExerciseGymUnit(exerciseId, gymId)
  const upsertOverride = useUpsertUserExerciseOverride()
  const changeWeightUnit = useChangeWeightUnit()
  const { value: globalWeightUnit } = usePreference('weight_unit')

  const [notes, setNotes] = useState('')
  const [weightUnit, setWeightUnit] = useState('')
  const [distanceUnit, setDistanceUnit] = useState(null)
  const [showConvertModal, setShowConvertModal] = useState(false)

  useEffect(() => {
    if (override) setNotes(override.notes || '')
  }, [override])

  // null = hereda la del ejercicio. Se guarda null cuando la elegida coincide con la del catálogo,
  // para no congelar una preferencia que ya es la correcta.
  useEffect(() => {
    setDistanceUnit(override?.distance_unit ?? null)
  }, [override])

  const { effectiveDistanceUnit, showDistanceUnit, payload: overridePayload } = buildExerciseOverrideForm({
    exercise, exerciseId, notes, distanceUnit,
  })

  // La unidad es por (ejercicio, gym): reinicia al cambiar de gym activo.
  useEffect(() => {
    setWeightUnit(gymUnit || '')
  }, [gymUnit, gymId])

  const previousEffectiveUnit = gymUnit || globalWeightUnit || 'kg'
  const newEffectiveUnit = weightUnit || globalWeightUnit || 'kg'
  const unitChanged = previousEffectiveUnit !== newEffectiveUnit
  const activeGymName = hasMultiple
    ? getGymDisplayName(gyms.find(g => String(g.id) === String(gymId)), t('common:gym.defaultName'))
    : null

  const handleSave = () => {
    if (unitChanged) {
      setShowConvertModal(true)
      return
    }
    upsertOverride.mutate(overridePayload, {
      onSuccess: () => onClose?.(),
    })
  }

  const applyUnitChange = (convertHistorical) => {
    // Notas y unidad son escrituras independientes (tablas distintas).
    upsertOverride.mutate(overridePayload)
    changeWeightUnit.mutate(
      {
        scope: 'exercise',
        exerciseId,
        gymId,
        fromUnit: previousEffectiveUnit,
        toUnit: newEffectiveUnit,
        convertHistorical,
        overrideValue: weightUnit || null,
      },
      {
        onSuccess: () => {
          setShowConvertModal(false)
          onClose?.()
        },
      },
    )
  }

  return (
    <>
      <ScrollView className="p-4" style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-start px-3 py-2 rounded-lg mb-4" style={{ borderWidth: 1, borderColor: colors.border, gap: 8 }}>
          <Info size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>{t('exercise:systemExerciseInfo')}</Text>
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
          {activeGymName && (
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
              {t('exercise:weightUnitGymScope', { gym: activeGymName })}
            </Text>
          )}
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
                    backgroundColor: isActive ? colors.success : colors.bgTertiary,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isActive ? colors.bgPrimary : colors.textSecondary }}>
                    {unit}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {showDistanceUnit && (
          <View style={{ marginTop: 16 }}>
            <DistanceUnitPicker
              value={effectiveDistanceUnit}
              onChange={setDistanceUnit}
              label={t('exercise:distanceUnitOverride')}
            />
          </View>
        )}
      </ScrollView>

      <ExerciseConfigFormButtons
        onBack={onClose}
        onSubmit={handleSave}
        isPending={upsertOverride.isPending || changeWeightUnit.isPending}
        submitLabel={t('common:buttons.save')}
      />

      <WeightUnitChangeModal
        isOpen={showConvertModal}
        scope="exercise"
        fromUnit={previousEffectiveUnit}
        toUnit={newEffectiveUnit}
        isPending={changeWeightUnit.isPending}
        onConvert={() => applyUnitChange(true)}
        onUnitOnly={() => applyUnitChange(false)}
        onCancel={() => setShowConvertModal(false)}
      />
    </>
  )
}
