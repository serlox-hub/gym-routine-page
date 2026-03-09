import { useState } from 'react'
import { View, Text, TextInput, Pressable, Alert } from 'react-native'
import { FileText } from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { Modal, Button } from '../ui'
import { colors, inputStyle } from '../../lib/styles'

export default function ImportRoutineModal({ isOpen, onClose, onImport }) {
  const [mode, setMode] = useState(null)
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState('')
  const [isReading, setIsReading] = useState(false)

  const handleFilePick = async () => {
    setIsReading(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' })
      if (result.canceled) {
        setIsReading(false)
        return
      }

      const uri = result.assets[0].uri
      const content = await FileSystem.readAsStringAsync(uri)
      const data = JSON.parse(content)
      onImport(data)
      handleClose()
    } catch {
      Alert.alert('Error', 'Error al leer el archivo JSON')
    } finally {
      setIsReading(false)
    }
  }

  const handleTextImport = () => {
    setError('')
    try {
      const data = JSON.parse(jsonText)
      onImport(data)
      handleClose()
    } catch {
      setError('JSON inválido. Verifica el formato.')
    }
  }

  const handleClose = () => {
    setMode(null)
    setJsonText('')
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-0">
      <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text className="font-semibold text-primary">Importar rutina</Text>
      </View>

      <View className="p-4">
        {!mode ? (
          <View className="gap-2">
            <Pressable
              onPress={handleFilePick}
              disabled={isReading}
              className="flex-row items-center gap-3 p-3 rounded-lg"
              style={{
                backgroundColor: colors.bgTertiary,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: isReading ? 0.5 : 1,
              }}
            >
              <FileText size={20} color={colors.success} />
              <View>
                <Text className="text-sm font-medium text-primary">
                  {isReading ? 'Leyendo archivo...' : 'Desde archivo'}
                </Text>
                <Text className="text-xs text-secondary">Seleccionar archivo JSON</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setMode('text')}
              className="flex-row items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
            >
              <FileText size={20} color={colors.accent} />
              <View>
                <Text className="text-sm font-medium text-primary">Pegar texto</Text>
                <Text className="text-xs text-secondary">Pegar JSON directamente</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-sm text-secondary">Pega el JSON de la rutina:</Text>
            <TextInput
              value={jsonText}
              onChangeText={(text) => { setJsonText(text); setError('') }}
              placeholder='{"version": 4, "routine": {...}}'
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={8}
              style={[
                inputStyle,
                {
                  minHeight: 160,
                  textAlignVertical: 'top',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  borderColor: error ? colors.danger : colors.border,
                },
              ]}
              autoFocus
            />
            {error && <Text className="text-xs" style={{ color: colors.danger }}>{error}</Text>}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  variant="secondary"
                  onPress={() => { setMode(null); setJsonText(''); setError('') }}
                >
                  Atrás
                </Button>
              </View>
              <View className="flex-1">
                <Button onPress={handleTextImport} disabled={!jsonText.trim()}>
                  Importar
                </Button>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}
