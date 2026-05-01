import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { useChangeWeightUnit } from '@gym/shared'
import { useUserExerciseOverride, useUpsertUserExerciseOverride } from '../../hooks/useExercises.js'
import { usePreference } from '../../hooks/usePreferences.js'

import { WeightUnitChangeModal } from '../Preferences/index.js'
import { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm.jsx'
import { colors, inputStyle } from '../../lib/styles.js'

export default function SystemExerciseDetailsPanel({ exerciseId, onClose }) {
  const { t } = useTranslation()
  const { data: override } = useUserExerciseOverride(exerciseId)
  const upsertOverride = useUpsertUserExerciseOverride()
  const changeWeightUnit = useChangeWeightUnit()
  const { value: globalWeightUnit } = usePreference('weight_unit')

  const [notes, setNotes] = useState('')
  const [weightUnit, setWeightUnit] = useState('')
  const [showConvertModal, setShowConvertModal] = useState(false)

  useEffect(() => {
    if (override) {
      setNotes(override.notes || '')
      setWeightUnit(override.weight_unit || '')
    }
  }, [override])

  const previousEffectiveUnit = (override?.weight_unit) || globalWeightUnit || 'kg'
  const newEffectiveUnit = weightUnit || globalWeightUnit || 'kg'
  const unitChanged = previousEffectiveUnit !== newEffectiveUnit

  const handleSave = () => {
    if (unitChanged) {
      setShowConvertModal(true)
      return
    }
    upsertOverride.mutate({ exerciseId, notes, weightUnit: weightUnit || null }, {
      onSuccess: () => onClose?.(),
    })
  }

  const applyUnitChange = (convertHistorical) => {
    changeWeightUnit.mutate(
      {
        scope: 'exercise',
        exerciseId,
        fromUnit: previousEffectiveUnit,
        toUnit: newEffectiveUnit,
        convertHistorical,
        overrideValue: weightUnit || null,
        overrideNotes: notes,
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
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
        <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg" style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}>
          <Info size={14} className="shrink-0 mt-0.5" />
          <p className="text-xs">{t('exercise:systemExerciseInfo')}</p>
        </div>

        {/* Personal notes */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
            {t('exercise:personalNotes')}
          </h4>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('exercise:personalNotesPlaceholder')}
            rows={3}
            className="w-full p-3 rounded-lg text-sm resize-none"
            style={inputStyle}
          />
        </div>

        {/* Weight unit override */}
        <div>
          <h4 className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
            {t('exercise:weightUnitOverride')}
          </h4>
          <div className="flex gap-2">
            {['kg', 'lb'].map((unit) => {
              const effectiveUnit = weightUnit || globalWeightUnit || 'kg'
              const isActive = effectiveUnit === unit
              return (
                <button
                  key={unit}
                  onClick={() => setWeightUnit(effectiveUnit === unit ? '' : unit)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: isActive ? colors.success : colors.bgTertiary,
                    color: isActive ? colors.bgPrimary : colors.textSecondary,
                  }}
                >
                  {unit}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <ExerciseConfigFormButtons
          onBack={onClose}
          onSubmit={handleSave}
          isPending={upsertOverride.isPending || changeWeightUnit.isPending}
          submitLabel={t('common:buttons.save')}
        />
      </div>

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
