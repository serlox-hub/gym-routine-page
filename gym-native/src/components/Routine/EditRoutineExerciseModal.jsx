import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useExercisesWithMuscleGroup, useMuscleGroups, useCreateExercise } from '../../hooks/useExercises'
import { Modal, Button } from '../ui'
import { colors } from '../../lib/styles'
import { getNextSupersetId } from '../../lib/supersetUtils'
import { parseExerciseConfigForm } from '../../lib/routineExerciseForm'
import ExerciseForm from '../Exercise/ExerciseForm'
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

  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { data: exercises, isLoading: loadingExercises } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const createExercise = useCreateExercise()

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
      setIsCreatingNew(false)
      setSearchTerm('')
    }
  }, [routineExercise])

  if (!routineExercise) return null

  const handleSubmit = () => {
    onSubmit({ exerciseId: routineExercise.id, ...parseExerciseConfigForm(form) })
  }

  const handleReplace = (newExercise) => {
    onSubmit({ exerciseId: routineExercise.id, exercise_id: newExercise.id, ...parseExerciseConfigForm(form) })
  }

  const handleCreateExercise = async (exerciseData, muscleGroupId) => {
    const newExercise = await createExercise.mutateAsync({ exercise: exerciseData, muscleGroupId })
    handleReplace(newExercise)
  }

  const nextSuperset = getNextSupersetId(existingSupersets)
  const title = isCreatingNew ? 'Nuevo ejercicio' : isReplacing ? 'Sustituir ejercicio' : 'Editar ejercicio'

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-6" position="bottom">
      <Text className="text-primary text-lg font-semibold mb-4">{title}</Text>

      {isReplacing && isCreatingNew ? (
        <>
          <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
            <ExerciseForm
              onSubmit={handleCreateExercise}
              isSubmitting={createExercise.isPending}
              initialData={searchTerm.trim() ? { name: searchTerm.trim() } : null}
              compact
              hideSubmitButton
            />
          </ScrollView>
          <View className="flex-row gap-2 pt-3 mt-3 border-t border-border">
            <Button variant="secondary" onPress={() => setIsCreatingNew(false)}>Cancelar</Button>
            <Button
              onPress={() => ExerciseForm._submit?.()}
              loading={createExercise.isPending}
              className="flex-1"
            >
              Crear ejercicio
            </Button>
          </View>
        </>
      ) : isReplacing ? (
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
            search={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <View className="flex-row gap-2 pt-3 mt-3 border-t border-border">
            <Button onPress={() => setIsCreatingNew(true)} className="flex-1">Crear nuevo</Button>
            <Button variant="secondary" onPress={onClose}>Cancelar</Button>
          </View>
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
