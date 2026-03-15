import { useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native'
import { Copy, Check, ChevronLeft } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import { Modal, Button } from '../ui'
import { buildChatbotPrompt } from '@gym/shared'
import { colors, inputStyle } from '../../lib/styles'

const OBJECTIVES = [
  { value: 'Hipertrofia', label: 'Hipertrofia (ganar músculo)' },
  { value: 'Fuerza', label: 'Fuerza' },
  { value: 'Pérdida de grasa', label: 'Pérdida de grasa' },
  { value: 'Resistencia', label: 'Resistencia' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Salud general', label: 'Salud general' },
]

const DAYS_OPTIONS = [
  { value: '2', label: '2 días' },
  { value: '3', label: '3 días' },
  { value: '4', label: '4 días' },
  { value: '5', label: '5 días' },
  { value: '6', label: '6 días' },
]

const EXPERIENCE_OPTIONS = [
  { value: 'Principiante (menos de 1 año)', label: 'Principiante' },
  { value: 'Intermedio (1-3 años)', label: 'Intermedio' },
  { value: 'Avanzado (más de 3 años)', label: 'Avanzado' },
]

const DURATION_OPTIONS = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '75', label: '75 min' },
  { value: '90', label: '90 min' },
]

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
              backgroundColor: value === opt.value ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
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
          {step === 'form' ? 'Crear rutina con IA' : 'Tu prompt personalizado'}
        </Text>
      </View>

      {step === 'form' ? (
        <>
          <ScrollView className="p-4" style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            <Text className="text-sm text-secondary mb-4">
              Completa estos datos para generar un prompt optimizado.
            </Text>

            <ChipSelector
              label="Objetivo *"
              options={OBJECTIVES}
              value={form.objetivo}
              onChange={(v) => setForm(f => ({ ...f, objetivo: v }))}
            />

            <ChipSelector
              label="Días por semana *"
              options={DAYS_OPTIONS}
              value={form.diasPorSemana}
              onChange={(v) => setForm(f => ({ ...f, diasPorSemana: v }))}
            />

            <ChipSelector
              label="Nivel de experiencia"
              options={EXPERIENCE_OPTIONS}
              value={form.nivelExperiencia}
              onChange={(v) => setForm(f => ({ ...f, nivelExperiencia: v }))}
            />

            <ChipSelector
              label="Duración por sesión"
              options={DURATION_OPTIONS}
              value={form.duracionSesion}
              onChange={(v) => setForm(f => ({ ...f, duracionSesion: v }))}
            />

            <View className="mb-3">
              <Text className="text-xs font-medium text-secondary mb-1">Equipamiento disponible</Text>
              <TextInput
                value={form.equipamiento}
                onChangeText={(text) => setForm(f => ({ ...f, equipamiento: text }))}
                placeholder="Ej: gimnasio completo, solo mancuernas..."
                placeholderTextColor={colors.textSecondary}
                style={[inputStyle, { fontSize: 13 }]}
              />
            </View>

            <View className="mb-3">
              <Text className="text-xs font-medium text-secondary mb-1">Notas adicionales</Text>
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
              Generar prompt
            </Button>
          </View>
        </>
      ) : (
        <>
          <ScrollView className="p-4" style={{ maxHeight: 350 }}>
            <Text className="text-sm text-secondary mb-4">
              Copia este prompt y pégalo en ChatGPT, Claude u otro chatbot. Luego pega el JSON generado.
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
                {copied ? 'Copiado' : 'Copiar prompt'}
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
                Pegar JSON
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  )
}
