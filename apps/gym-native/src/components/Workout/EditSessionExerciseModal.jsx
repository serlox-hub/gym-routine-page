import { useState, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, diffSessionExerciseFields } from '@gym/shared'
import { Modal } from '../ui'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from '../Routine/ExerciseConfigForm'
import { ExerciseFormPanel } from '../Exercise'
import { colors } from '../../lib/styles'
import useWorkoutStore from '../../stores/workoutStore'

function ViewToggle({ view, onChangeView }) {
  const { t } = useTranslation()
  return (
    <View className="flex-row rounded-lg overflow-hidden" style={{ backgroundColor: colors.bgTertiary }}>
      <Pressable
        onPress={() => onChangeView('session')}
        className="flex-1 py-2 items-center"
        style={view === 'session' ? { backgroundColor: colors.accent } : undefined}
      >
        <Text className="text-xs font-semibold" style={{ color: view === 'session' ? colors.white : colors.textSecondary }}>
          {t('workout:session.inSession')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChangeView('exercise')}
        className="flex-1 py-2 items-center"
        style={view === 'exercise' ? { backgroundColor: colors.accent } : undefined}
      >
        <Text className="text-xs font-semibold" style={{ color: view === 'exercise' ? colors.white : colors.textSecondary }}>
          {t('exercise:details')}
        </Text>
      </Pressable>
    </View>
  )
}

const DEFAULT_FORM = {
  series: '3', reps: '', rir: '', rest_seconds: '', notes: '', superset_group: '',
}

export default function EditSessionExerciseModal({
  isOpen,
  onClose,
  onSave,
  sessionExercise,
  existingSupersets = [],
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const sessionId = useWorkoutStore(state => state.sessionId)
  const [view, setView] = useState('session')
  const [form, setForm] = useState(DEFAULT_FORM)

  const exerciseId = sessionExercise?.exercise?.id || sessionExercise?.exercise_id

  useEffect(() => {
    if (isOpen && sessionExercise) {
      setView('session')
      setForm({
        series: String(sessionExercise.series ?? 3),
        reps: sessionExercise.reps ?? '',
        rir: sessionExercise.rir != null ? String(sessionExercise.rir) : '',
        rest_seconds: sessionExercise.rest_seconds ? String(sessionExercise.rest_seconds) : '',
        notes: sessionExercise.notes ?? '',
        superset_group: sessionExercise.superset_group != null ? String(sessionExercise.superset_group) : '',
      })
    }
  }, [isOpen, sessionExercise])

  const handleSave = () => {
    const { fields, newSeries } = diffSessionExerciseFields(
      { series: form.series, reps: form.reps, rir: form.rir, restSeconds: form.rest_seconds, notes: form.notes, supersetGroup: form.superset_group },
      sessionExercise,
    )
    if (Object.keys(fields).length > 0) {
      onSave(sessionExercise.sessionExerciseId || sessionExercise.id, fields, newSeries)
    }
    onClose()
  }

  const handleExerciseSaved = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SESSION_EXERCISES, sessionId] })
  }

  if (!sessionExercise) return null

  const exerciseName = sessionExercise.exercise?.name || t('exercise:title')
  const exerciseObj = sessionExercise.exercise || {}

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom">
      <View className="p-4 gap-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {exerciseName}
        </Text>
        <ViewToggle view={view} onChangeView={setView} />
      </View>

      {view === 'session' ? (
        <>
          <View className="p-4" style={{ flexShrink: 1 }}>
            <ExerciseConfigForm
              exercise={exerciseObj}
              form={form}
              setForm={setForm}
              isSessionMode
              hideExerciseName
              showSupersetField={existingSupersets.length > 0}
              existingSupersets={existingSupersets}
            />
          </View>
          <ExerciseConfigFormButtons
            onBack={onClose}
            onSubmit={handleSave}
            backLabel={t('common:buttons.cancel')}
            submitLabel={t('common:buttons.save')}
            pendingLabel={t('common:buttons.loading')}
          />
        </>
      ) : (
        <ExerciseFormPanel
          exerciseId={exerciseId}
          onClose={onClose}
          onSaveSuccess={handleExerciseSaved}
        />
      )}
    </Modal>
  )
}
