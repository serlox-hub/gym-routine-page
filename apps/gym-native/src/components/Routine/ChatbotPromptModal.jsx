import { useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import { Modal, Button } from '../ui'
import { buildChatbotPrompt } from '@gym/shared'
import { colors, inputStyle } from '../../lib/styles'

function ChipSelector({ options, value, onChange, label }) {
  return (
    <View className="mb-3">
      <Text className="text-xs font-medium text-secondary mb-2">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map(opt => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: value === opt.value ? colors.accentBg : colors.bgTertiary,
              borderWidth: 1,
              borderColor: value === opt.value ? colors.accent : colors.border,
            }}
          >
            <Text
              className="text-xs"
              style={{ color: value === opt.value ? colors.accent : colors.textPrimary }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export default function ChatbotPromptModal({ isOpen, onClose, onImportClick }) {
  const { t } = useTranslation()

  const OBJECTIVES = [
    { value: 'Hipertrofia', label: t('routine:chatbot.goals.hypertrophy') },
    { value: 'Fuerza', label: t('routine:chatbot.goals.strength') },
    { value: 'Pérdida de grasa', label: t('routine:chatbot.goals.fatLoss') },
    { value: 'Resistencia', label: t('routine:chatbot.goals.endurance') },
    { value: 'Mantenimiento', label: t('routine:chatbot.goals.general') },
  ]

  const DAYS_OPTIONS = [
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
  ]

  const EXPERIENCE_OPTIONS = [
    { value: 'Principiante (menos de 1 año)', label: t('routine:chatbot.levels.beginner') },
    { value: 'Intermedio (1-3 años)', label: t('routine:chatbot.levels.intermediate') },
    { value: 'Avanzado (más de 3 años)', label: t('routine:chatbot.levels.advanced') },
  ]

  const DURATION_OPTIONS = [
    { value: '30', label: '30 min' },
    { value: '45', label: '45 min' },
    { value: '60', label: '60 min' },
    { value: '75', label: '75 min' },
    { value: '90', label: '90 min' },
  ]

  const [step, setStep] = useState('form')
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    objetivo: '',
    diasPorSemana: '',
    nivelExperiencia: '',
    duracionSesion: '',
    equipamiento: '',
    notas: '',
  })

  const generatedPrompt = buildChatbotPrompt({
    objetivo: form.objetivo,
    diasPorSemana: form.diasPorSemana,
    nivelExperiencia: form.nivelExperiencia,
    duracionSesion: form.duracionSesion,
    equipamiento: form.equipamiento,
    notas: form.notas,
  })

  const isFormValid = form.objetivo && form.diasPorSemana

  const handleCopyPrompt = async () => {
    await Clipboard.setStringAsync(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setStep('form')
    setForm({ objetivo: '', diasPorSemana: '', nivelExperiencia: '', duracionSesion: '', equipamiento: '', notas: '' })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* Header */}
      <View className="p-4 flex-row items-center gap-2" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {step === 'prompt' && (
          <Pressable onPress={() => setStep('form')} className="p-1">
            <ChevronLeft size={20} color={colors.textSecondary} />
          </Pressable>
        )}
        <Text className="font-semibold text-primary flex-1">
          {step === 'form' ? t('routine:chatbot.title') : t('routine:chatbot.yourPrompt')}
        </Text>
      </View>

      {step === 'form' ? (
        <>
          <ScrollView className="p-4" style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            <Text className="text-sm text-secondary mb-4">
              {t('routine:chatbot.description')}
            </Text>

            <ChipSelector
              label={`${t('routine:chatbot.goal')} *`}
              options={OBJECTIVES}
              value={form.objetivo}
              onChange={(v) => setForm(f => ({ ...f, objetivo: v }))}
            />

            <ChipSelector
              label={`${t('routine:chatbot.daysPerWeek')} *`}
              options={DAYS_OPTIONS}
              value={form.diasPorSemana}
              onChange={(v) => setForm(f => ({ ...f, diasPorSemana: v }))}
            />

            <ChipSelector
              label={t('routine:chatbot.experience')}
              options={EXPERIENCE_OPTIONS}
              value={form.nivelExperiencia}
              onChange={(v) => setForm(f => ({ ...f, nivelExperiencia: v }))}
            />

            <ChipSelector
              label={t('routine:chatbot.duration')}
              options={DURATION_OPTIONS}
              value={form.duracionSesion}
              onChange={(v) => setForm(f => ({ ...f, duracionSesion: v }))}
            />

            <View className="mb-3">
              <Text className="text-xs font-medium text-secondary mb-1">{t('routine:chatbot.equipment')}</Text>
              <TextInput
                value={form.equipamiento}
                onChangeText={(text) => setForm(f => ({ ...f, equipamiento: text }))}
                placeholder="Ej: gimnasio completo, solo mancuernas..."
                placeholderTextColor={colors.textSecondary}
                style={[inputStyle, { fontSize: 13 }]}
              />
            </View>

            <View className="mb-3">
              <Text className="text-xs font-medium text-secondary mb-1">{t('routine:chatbot.additionalNotes')}</Text>
              <TextInput
                value={form.notas}
                onChangeText={(text) => setForm(f => ({ ...f, notas: text }))}
                placeholder="Ej: evitar ejercicios de impacto..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                style={[inputStyle, { fontSize: 13, minHeight: 50, textAlignVertical: 'top' }]}
              />
            </View>
          </ScrollView>

          <View className="p-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <Button onPress={() => setStep('prompt')} disabled={!isFormValid}>
              {t('routine:chatbot.generate')}
            </Button>
          </View>
        </>
      ) : (
        <>
          <ScrollView className="p-4" style={{ maxHeight: 350 }}>
            <Text className="text-sm text-secondary mb-4">
              {t('routine:chatbot.copyInstructions')}
            </Text>
            <View
              className="p-3 rounded-lg"
              style={{ backgroundColor: colors.bgPrimary }}
            >
              <Text className="text-xs text-secondary" style={{ fontFamily: 'monospace' }}>
                {generatedPrompt}
              </Text>
            </View>
          </ScrollView>

          <View className="p-4 flex-row gap-2" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <View className="flex-1">
              <Button onPress={handleCopyPrompt}>
                {copied ? t('common:errors.copySuccess') : t('routine:chatbot.copyPrompt')}
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="secondary"
                onPress={() => {
                  handleClose()
                  onImportClick()
                }}
              >
                {t('routine:chatbot.pasteJSON')}
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  )
}
