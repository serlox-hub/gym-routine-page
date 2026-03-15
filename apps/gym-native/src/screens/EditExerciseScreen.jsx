import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useExercise, useUpdateExercise } from '../hooks/useExercises'
import { LoadingSpinner, ErrorMessage, PageHeader } from '../components/ui'
import { ExerciseForm } from '../components/Exercise'

export default function EditExerciseScreen({ route, navigation }) {
  const { exerciseId } = route.params
  const { data: exercise, isLoading, error } = useExercise(exerciseId)
  const updateExercise = useUpdateExercise()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const handleSubmit = async (formData, muscleGroupId) => {
    try {
      await updateExercise.mutateAsync({ exerciseId, exercise: formData, muscleGroupId })
      navigation.goBack()
    } catch { /* handled by TanStack Query */ }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title="Editar ejercicio" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <ExerciseForm
            initialData={{
              name: exercise.name,
              measurement_type: exercise.measurement_type,
              weight_unit: exercise.weight_unit,
              time_unit: exercise.time_unit,
              distance_unit: exercise.distance_unit,
              instructions: exercise.instructions,
              muscle_group_id: exercise.muscle_group_id,
            }}
            onSubmit={handleSubmit}
            isSubmitting={updateExercise.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
