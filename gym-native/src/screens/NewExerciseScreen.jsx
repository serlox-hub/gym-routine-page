import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCreateExercise } from '../hooks/useExercises'
import { PageHeader } from '../components/ui'
import { ExerciseForm } from '../components/Exercise'

export default function NewExerciseScreen({ route, navigation }) {
  const initialName = route.params?.name
  const createExercise = useCreateExercise()

  const handleSubmit = async (formData, muscleGroupId) => {
    try {
      await createExercise.mutateAsync({ exercise: formData, muscleGroupId })
      navigation.goBack()
    } catch { /* handled by TanStack Query */ }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title="Nuevo ejercicio" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <ExerciseForm
            initialData={initialName ? { name: initialName } : null}
            onSubmit={handleSubmit}
            isSubmitting={createExercise.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
