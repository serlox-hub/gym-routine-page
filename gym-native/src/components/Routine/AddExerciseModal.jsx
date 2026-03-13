import { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { Plus } from 'lucide-react-native'
import { useExercisesWithMuscleGroup, useMuscleGroups, useCreateExercise } from '../../hooks/useExercises'
import { Modal, Button } from '../ui'
import { colors } from '../../lib/styles'
import { getDefaultReps } from '../../lib/measurementTypes'
import { getNextSupersetId } from '../../lib/supersetUtils'
import { parseExerciseConfigForm } from '../../lib/routineExerciseForm'
import ExerciseForm from '../Exercise/ExerciseForm'
import ExerciseSearchList from './ExerciseSearchList'
import ExerciseConfigForm, { ExerciseConfigFormButtons } from './ExerciseConfigForm'

const DEFAULT_FORM = {
  series: '3',
  reps: '',
  notes: '',
  tempo: '',
  tempo_razon: '',
  rir: '',
  rest_seconds: '',
  superset_group: '',
}

export default function AddExerciseModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  isWarmup = false,
  mode = 'routine',
  existingSupersets = [],
  existingExercises = [],
}) {
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [searchTerm, setSearchTerm] = useState('')

  const isSessionMode = mode === 'session'
  const { data: exercises, isLoading } = useExercisesWithMuscleGroup()
  const { data: muscleGroups } = useMuscleGroups()
  const createExercise = useCreateExercise()

  useEffect(() => {
    if (isOpen) {
      setSelectedExercise(null)
      setIsCreatingNew(false)
      setForm(DEFAULT_FORM)
      setSearchTerm('')
    }
  }, [isOpen])

  const handleSelectExercise = (exercise) => {
    setSelectedExercise(exercise)
    setForm({ ...DEFAULT_FORM, reps: getDefaultReps(exercise.measurement_type) })
  }

  const handleSubmit = () => {
    if (!selectedExercise) return
    const defaultReps = getDefaultReps(selectedExercise.measurement_type)
    onSubmit({
      exerciseId: selectedExercise.id,
      exercise: selectedExercise,
      ...parseExerciseConfigForm(form, { defaultReps }),
    })
  }

  const handleCreateExercise = async (exerciseData, muscleGroupId) => {
    const newExercise = await createExercise.mutateAsync({ exercise: exerciseData, muscleGroupId })
    setSelectedExercise({ id: newExercise.id, name: newExercise.name, measurement_type: newExercise.measurement_type })
    setForm({ ...DEFAULT_FORM, reps: getDefaultReps(newExercise.measurement_type) })
    setIsCreatingNew(false)
  }

  const title = isCreatingNew ? 'Nuevo ejercicio' : isWarmup ? 'Añadir calentamiento' : 'Añadir ejercicio'
  const nextSuperset = getNextSupersetId(existingSupersets)
  const showSupersetField = !isWarmup

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="p-6" position="bottom">
      <Text className="text-primary text-lg font-semibold mb-4">{title}</Text>

      {isCreatingNew ? (
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
      ) : !selectedExercise ? (
        <>
          <ExerciseSearchList
            exercises={exercises}
            muscleGroups={muscleGroups}
            isLoading={isLoading}
            onSelect={handleSelectExercise}
            existingExerciseIds={new Set(existingExercises.map(e => e.exercise_id))}
            search={searchTerm}
            onSearchChange={setSearchTerm}
          />
          <View className="flex-row gap-2 pt-3 mt-3 border-t border-border">
            <Button onPress={() => setIsCreatingNew(true)} className="flex-1">
              Crear nuevo
            </Button>
            <Button variant="secondary" onPress={onClose}>Cancelar</Button>
          </View>
        </>
      ) : (
        <>
          <ExerciseConfigForm
            exercise={selectedExercise}
            form={form}
            setForm={setForm}
            isSessionMode={isSessionMode}
            showSupersetField={showSupersetField}
            existingSupersets={existingSupersets}
            nextSupersetId={nextSuperset}
          />
          <ExerciseConfigFormButtons
            onBack={() => setSelectedExercise(null)}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </>
      )}
    </Modal>
  )
}
