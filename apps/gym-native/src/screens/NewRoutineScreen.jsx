import { useState } from 'react'
import { Text, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ErrorMessage, Card, PageHeader, Button } from '../components/ui'
import { useCreateRoutine } from '../hooks/useRoutines'
import { inputStyle } from '../lib/styles'
import { prepareRoutineData, validateRoutineForm } from '@gym/shared'

export default function NewRoutineScreen({ navigation }) {
  const createRoutine = useCreateRoutine()

  const [form, setForm] = useState({
    name: '',
    description: '',
    goal: '',
  })
  const [error, setError] = useState(null)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setError(null)

    const validation = validateRoutineForm(form)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    try {
      const data = prepareRoutineData(form)
      const newRoutine = await createRoutine.mutateAsync(data)
      navigation.replace('RoutineDetail', { routineId: newRoutine.id })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <PageHeader title="Nueva rutina" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {error && <ErrorMessage message={error} className="mb-4" />}

          <Card className="p-4 mb-4">
            <Text className="text-primary text-sm font-medium mb-2">Nombre *</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => handleChange('name', v)}
              placeholder="Ej: Push Pull Legs"
              placeholderTextColor="#6e7681"
              style={inputStyle}
            />
          </Card>

          <Card className="p-4 mb-4">
            <Text className="text-primary text-sm font-medium mb-2">Descripción (opcional)</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => handleChange('description', v)}
              placeholder="Descripción de la rutina..."
              placeholderTextColor="#6e7681"
              multiline
              numberOfLines={2}
              style={[inputStyle, { textAlignVertical: 'top', minHeight: 60 }]}
            />
          </Card>

          <Card className="p-4 mb-6">
            <Text className="text-primary text-sm font-medium mb-2">Objetivo (opcional)</Text>
            <TextInput
              value={form.goal}
              onChangeText={(v) => handleChange('goal', v)}
              placeholder="Ej: Hipertrofia, Fuerza, Recomposición..."
              placeholderTextColor="#6e7681"
              style={inputStyle}
            />
          </Card>

          <Button
            onPress={handleSubmit}
            loading={createRoutine.isPending}
            className="w-full py-4"
            size="lg"
          >
            Crear rutina
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
