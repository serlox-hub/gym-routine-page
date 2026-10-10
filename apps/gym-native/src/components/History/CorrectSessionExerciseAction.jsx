import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Repeat2 } from 'lucide-react-native'
import { getExerciseName, resolveTrackedFields, sameTrackedFields } from '@gym/shared'
import { useCorrectSessionExercise } from '../../hooks/useWorkout'
import { ConfirmModal, IconButton } from '../ui'
import ExercisePickerModal from '../Routine/ExercisePickerModal'
import { colors } from '../../lib/styles'

// Corrects the exercise of a past session row (logged the wrong one), keeping its sets. Only to an
// exercise that measures the same fields, so the sets fit as they are (issue #168).
function CorrectSessionExerciseAction({ sessionId, sessionExerciseId, exercise, gymId, style }) {
  const { t } = useTranslation()
  const [showPicker, setShowPicker] = useState(false)
  // The origin is kept from the pick: after a failed recalculation the refetch already shows the new
  // exercise as `exercise`, and the retry modal would name it twice.
  const [pending, setPending] = useState(null)
  const correctExercise = useCorrectSessionExercise()
  const trackedFields = useMemo(() => resolveTrackedFields(exercise), [exercise])
  const exerciseName = getExerciseName(exercise)

  const isExerciseAllowed = useCallback(
    (candidate) => candidate.id !== exercise.id && sameTrackedFields(resolveTrackedFields(candidate), trackedFields),
    [exercise.id, trackedFields],
  )
  const newExerciseDefaults = useMemo(() => ({ tracked_fields: trackedFields }), [trackedFields])

  const handlePick = (newExercise) => {
    setShowPicker(false)
    // The mutation is shared by every opening: without the reset an earlier failure would show here.
    correctExercise.reset()
    setPending({ from: exercise, to: newExercise })
  }

  const handleConfirm = () => {
    correctExercise.mutate(
      { sessionId, sessionExerciseId, oldExerciseId: pending.from.id, newExerciseId: pending.to.id, gymId },
      { onSuccess: () => setPending(null) },
    )
  }

  return (
    <>
      <IconButton
        icon={Repeat2}
        iconSize={16}
        color={colors.textSecondary}
        label={t('workout:exercise.correct')}
        onPress={() => setShowPicker(true)}
        style={style}
      />
      <ExercisePickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handlePick}
        title={t('workout:exercise.correct')}
        subtitle={t('workout:exercise.correctPickerSubtitle', { name: exerciseName })}
        initialMuscleGroup={exercise.muscle_group?.id}
        isExerciseAllowed={isExerciseAllowed}
        newExerciseDefaults={newExerciseDefaults}
        notAllowedMessage={t('workout:exercise.correctFieldsMismatch', { name: exerciseName })}
      />
      <ConfirmModal
        isOpen={!!pending}
        title={t('workout:exercise.correctConfirmTitle')}
        message={pending ? t('workout:exercise.correctConfirmMessage', { oldName: getExerciseName(pending.from), newName: getExerciseName(pending.to) }) : ''}
        confirmText={t('workout:exercise.correctConfirm')}
        variant="primary"
        isLoading={correctExercise.isPending}
        saveStatus
        error={correctExercise.isError ? t('workout:exercise.correctFailed') : null}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </>
  )
}

export default CorrectSessionExerciseAction
