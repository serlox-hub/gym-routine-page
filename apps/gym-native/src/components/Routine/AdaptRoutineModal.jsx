import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Linking } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Modal, Button } from '../ui'
import { buildAdaptRoutinePrompt } from '@gym/shared'
import { colors } from '../../lib/styles'

const TOTAL_STEPS = 4

export default function AdaptRoutineModal({ isOpen, onClose, onImportClick }) {
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState(false)
  const adaptPrompt = buildAdaptRoutinePrompt()

  const handleCopy = async () => {
    await Clipboard.setStringAsync(adaptPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setStep(1)
    setCopied(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text className="font-semibold text-primary">Adaptar rutina existente</Text>
      </View>

      <ScrollView className="p-4" style={{ maxHeight: 420 }}>
        {/* Progress dots */}
        <View className="flex-row items-center justify-center gap-2 mb-4">
          {[1, 2, 3, 4].map(i => (
            <View
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: i === step ? colors.accent : colors.border }}
            />
          ))}
        </View>

        {step === 1 && (
          <View className="gap-3">
            <Text className="font-medium text-primary">Paso 1: Prepara tu rutina</Text>
            <Text className="text-sm text-secondary">
              Copia tu rutina actual en formato texto. Puede ser desde:
            </Text>
            <View className="gap-1 ml-2">
              <Text className="text-sm text-secondary">• Una hoja de cálculo (Excel, Google Sheets)</Text>
              <Text className="text-sm text-secondary">• Un PDF o documento</Text>
              <Text className="text-sm text-secondary">• Notas de tu móvil</Text>
              <Text className="text-sm text-secondary">• Una app de entrenamiento</Text>
              <Text className="text-sm text-secondary">• Un mensaje de tu entrenador</Text>
            </View>
            <View className="p-3 rounded-lg" style={{ backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border }}>
              <Text className="font-medium text-primary text-sm mb-2">Ejemplo de formato:</Text>
              <Text className="text-xs text-secondary" style={{ fontFamily: 'monospace' }}>
                {`Día 1 - Push\n- Press banca: 4x8-10, RIR 2\n- Press inclinado: 3x10-12\n- Aperturas: 3x12-15\n...`}
              </Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View className="gap-3">
            <Text className="font-medium text-primary">Paso 2: Copia el prompt</Text>
            <Text className="text-sm text-secondary">
              Este prompt le dice a la IA cómo convertir tu rutina al formato correcto:
            </Text>
            <View
              className="p-3 rounded-lg"
              style={{ backgroundColor: colors.bgPrimary, maxHeight: 120, overflow: 'hidden' }}
            >
              <Text className="text-xs text-secondary" style={{ fontFamily: 'monospace' }}>
                {adaptPrompt.slice(0, 400)}...
              </Text>
            </View>
            <Button onPress={handleCopy}>
              {copied ? 'Copiado' : 'Copiar prompt completo'}
            </Button>
            <View
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(136, 87, 229, 0.1)', borderWidth: 1, borderColor: '#8957e5' }}
            >
              <Text className="text-sm" style={{ color: '#8957e5' }}>
                El prompt termina con "MI RUTINA A CONVERTIR:" — ahí es donde pegarás tu rutina
              </Text>
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="gap-3">
            <Text className="font-medium text-primary">Paso 3: Pega prompt + rutina en la IA</Text>
            <Text className="text-sm text-secondary">Abre tu chatbot favorito y pega:</Text>
            <View className="gap-1 ml-2">
              <Text className="text-sm text-secondary">1. Primero el <Text className="text-primary font-medium">prompt</Text> que copiaste</Text>
              <Text className="text-sm text-secondary">2. Después <Text className="text-primary font-medium">tu rutina</Text> (del paso 1)</Text>
            </View>
            <View className="flex-row gap-2">
              {[
                { label: 'ChatGPT', url: 'https://chat.openai.com' },
                { label: 'Claude', url: 'https://claude.ai' },
                { label: 'Gemini', url: 'https://gemini.google.com' },
              ].map(link => (
                <Pressable
                  key={link.label}
                  onPress={() => Linking.openURL(link.url)}
                  className="flex-1 p-3 rounded-lg items-center"
                  style={{ backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text className="text-sm text-primary">{link.label}</Text>
                </Pressable>
              ))}
            </View>
            <View
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(46, 160, 67, 0.1)', borderWidth: 1, borderColor: colors.success }}
            >
              <Text className="text-sm" style={{ color: colors.success }}>
                La IA te devolverá un JSON. Cópialo para pegarlo en el siguiente paso.
              </Text>
            </View>
          </View>
        )}

        {step === 4 && (
          <View className="gap-3">
            <Text className="font-medium text-primary">Paso 4: Pega el resultado</Text>
            <Text className="text-sm text-secondary">Una vez tengas el JSON generado por la IA:</Text>
            <View className="gap-1 ml-2">
              <Text className="text-sm text-secondary">1. Copia el JSON que te devolvió la IA</Text>
              <Text className="text-sm text-secondary">2. Pulsa el botón de abajo</Text>
              <Text className="text-sm text-secondary">3. Pega el JSON en el campo de texto</Text>
            </View>
            <Button
              onPress={() => {
                handleClose()
                onImportClick()
              }}
            >
              Pegar JSON
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View className="p-4 flex-row justify-between" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button
          variant="secondary"
          onPress={() => setStep(s => s - 1)}
          disabled={step === 1}
        >
          Anterior
        </Button>
        {step < TOTAL_STEPS ? (
          <Button onPress={() => setStep(s => s + 1)}>
            Siguiente
          </Button>
        ) : (
          <Button variant="secondary" onPress={handleClose}>
            Cerrar
          </Button>
        )}
      </View>
    </Modal>
  )
}
