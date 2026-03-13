import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import { useExercisesWithMuscleGroup, useMuscleGroups } from '../../hooks/useExercises'
import { Modal } from '../ui'
import { colors } from '../../lib/styles'
import { getNextSupersetId } from '../../lib/supersetUtils'
import { parseExerciseConfigForm } from '../../lib/routineExerciseForm'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm'
import ExerciseSearchList from './ExerciseSearchList'

const DEFAULT_FORM = {
  series: '3',
  reps: '',
  rir: '',
  rest_seconds: '',
  notes: '',
  tempo: '',
  tempo_razon: '',
  superset_group: '',
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
  const [form, setForm] = useState(DEFAULT_FORM)

  const { data: exercises, isLoading: loadingExercises } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()

  const exercise = routineExercise?.exercise

  useEffect(() => {
    if (routineExercise) {
      setForm({
        series: String(routineExercise.series || 3),
        reps: routineExercise.reps || '',
        rir: routineExercise.rir != null ? String(routineExercise.rir) : '',
        rest_seconds: routineExercise.rest_seconds ? String(routineExercise.rest_seconds) : '',
        notes: routineExercise.notes || '',
        tempo: routineExercise.tempo || '',
        tempo_razon: routineExercise.tempo_razon || '',
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
    onSubmit({ exerciseId: routineExercise.id, exercise_id: newExercise.id, ...parseExerciseConfigForm(form) })
  }

  const nextSuperset = getNextSupersetId(existingSupersets)
  const title = isReplacing ? 'Sustituir ejercicio' : 'Editar ejercicio'

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-6" position="bottom">
      <Text className="text-primary text-lg font-semibold mb-4">{title}</Text>

      {isReplacing ? (
        <>
          <Text className="text-secondary text-sm mb-3">
            Sustituyendo: <Text className="text-primary font-semibold">{exercise?.name}</Text>
          </Text>
          <ExerciseSearchList
            exercises={exercises}
            muscleGroups={muscleGroups}
            isLoading={loadingExercises}
            onSelect={handleReplace}
            initialMuscleGroup={exercise?.muscle_group?.id}
          />
        </>
      ) : (
        <>
          <ExerciseConfigForm
            exercise={exercise}
            form={form}
            setForm={setForm}
            showSupersetField
            existingSupersets={existingSupersets}
            nextSupersetId={nextSuperset}
          />
          <ExerciseConfigFormButtons
            onBack={onClose}
            onSubmit={handleSubmit}
            isPending={isPending}
            backLabel="Cancelar"
            submitLabel="Guardar"
            pendingLabel="Guardando..."
          />
        </>
      )}
    </Modal>
  )
}
