import { useState } from 'react'
import { Text, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ErrorMessage, Card, PageHeader, Button } from '../components/ui'
import { useCreateRoutine } from '../hooks/useRoutines'
import { inputStyle, colors } from '../lib/styles'
import { prepareRoutineData, validateRoutineForm } from '@gym/shared'

export default function NewRoutineScreen({ navigation }) {
  const { t } = useTranslation()
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
      <PageHeader title={t('routine:new')} />
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
            <Text className="text-primary text-sm font-medium mb-2">{t('routine:name')} *</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => handleChange('name', v)}
              placeholder={t('routine:namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
          </Card>

          <Card className="p-4 mb-4">
            <Text className="text-primary text-sm font-medium mb-2">{t('routine:description')} ({t('common:labels.optional')})</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => handleChange('description', v)}
              placeholder={t('routine:descriptionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              style={[inputStyle, { textAlignVertical: 'top', minHeight: 60 }]}
            />
          </Card>

          <Card className="p-4 mb-6">
            <Text className="text-primary text-sm font-medium mb-2">{t('routine:goal')} ({t('common:labels.optional')})</Text>
            <TextInput
              value={form.goal}
              onChangeText={(v) => handleChange('goal', v)}
              placeholder={t('routine:goalPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
          </Card>

          <Button
            onPress={handleSubmit}
            loading={createRoutine.isPending}
            className="w-full py-4"
            size="lg"
          >
            {t('routine:create')}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
