import { useState, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Modal } from '../ui'
import { getNextSupersetId, parseExerciseConfigForm } from '@gym/shared'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm'
import ExercisePickerModal from './ExercisePickerModal'
import { ExerciseFormPanel } from '../Exercise'
import { colors } from '../../lib/styles'

function ViewToggle({ view, onChangeView, labels }) {
  return (
    <View className="flex-row rounded-lg overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
      {labels.map(({ key, label }) => (
        <Pressable
          key={key}
          onPress={() => onChangeView(key)}
          className="flex-1 py-2 items-center"
          style={view === key ? { backgroundColor: colors.accent } : undefined}
        >
          <Text className="text-xs font-semibold" style={{ color: view === key ? colors.white : colors.textSecondary }}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const DEFAULT_FORM = {
  series: '3', reps: '', rir: '', rest_seconds: '', notes: '', superset_group: '',
}

export default function EditRoutineExerciseModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  routineExercise,
  existingSupersets = [],
  isReplacing = false,
}) {
  const { t } = useTranslation()
  const [view, setView] = useState('config')
  const [form, setForm] = useState(DEFAULT_FORM)

  const exercise = routineExercise?.exercise

  useEffect(() => {
    if (routineExercise) {
      setView('config')
      setForm({
        series: String(routineExercise.series || 3),
        reps: routineExercise.reps || '',
        rir: routineExercise.rir != null ? String(routineExercise.rir) : '',
        rest_seconds: routineExercise.rest_seconds ? String(routineExercise.rest_seconds) : '',
        notes: routineExercise.notes || '',
        superset_group: routineExercise.superset_group != null
          ? String(routineExercise.superset_group)
          : '',
      })
    }
  }, [routineExercise])

  if (!routineExercise) return null

  const handleSubmit = () => {
    onSubmit({ exerciseId: routineExercise.id, ...parseExerciseConfigForm(form) })
  }

  const handleReplace = (newExercise) => {
    const replaceForm = { ...form, rir: '', notes: '' }
    onSubmit({ exerciseId: routineExercise.id, exercise_id: newExercise.id, ...parseExerciseConfigForm(replaceForm) })
  }

  const nextSuperset = getNextSupersetId(existingSupersets)

  if (isReplacing) {
    return (
      <ExercisePickerModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleReplace}
        title={t('routine:exercise.replace')}
        subtitle={`${t('routine:exercise.replacing')}: ${exercise?.name}`}
        initialMuscleGroup={exercise?.muscle_group?.id}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      <View className="p-4 gap-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {exercise?.name || t('exercise:title')}
        </Text>
        <ViewToggle
          view={view}
          onChangeView={setView}
          labels={[{ key: 'config', label: t('routine:exercise.config') }, { key: 'exercise', label: t('exercise:details') }]}
        />
      </View>

      {view === 'config' ? (
        <>
          <View className="p-4" style={{ flexShrink: 1 }}>
            <ExerciseConfigForm
              exercise={exercise}
              form={form}
              setForm={setForm}
              showSupersetField
              hideExerciseName
              existingSupersets={existingSupersets}
              nextSupersetId={nextSuperset}
            />
          </View>
          <ExerciseConfigFormButtons
            onBack={onClose}
            onSubmit={handleSubmit}
            isPending={isPending}
            backLabel={t('common:buttons.cancel')}
            submitLabel={t('common:buttons.save')}
            pendingLabel={t('common:buttons.loading')}
          />
        </>
      ) : (
        <ExerciseFormPanel
          exerciseId={exercise?.id}
          isSystem={exercise?.is_system}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}
