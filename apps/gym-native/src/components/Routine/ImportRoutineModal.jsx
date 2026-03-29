import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { FileText, RefreshCw } from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { Modal, Button } from '../ui'
import { colors, inputStyle } from '../../lib/styles'

export default function ImportRoutineModal({ isOpen, onClose, onImport, onAdaptClick, defaultMode = null }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState(null)

  useEffect(() => {
    if (isOpen && defaultMode) setMode(defaultMode)
  }, [isOpen, defaultMode])
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
      const file = new File(uri)
      const content = await file.text()
      const data = JSON.parse(content)
      onImport(data)
      handleClose()
    } catch {
      Alert.alert('Error', t('common:import.importError'))
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
      setError(t('common:import.invalidFormat'))
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
        <Text className="font-semibold text-primary">{t('routine:newFlow.import')}</Text>
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
                  {isReading ? t('common:buttons.loading') : t('common:import.fromFile')}
                </Text>
                <Text className="text-xs text-secondary">{t('common:import.selectFile')}</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setMode('text')}
              className="flex-row items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
            >
              <FileText size={20} color={colors.accent} />
              <View>
                <Text className="text-sm font-medium text-primary">{t('common:import.pasteText')}</Text>
                <Text className="text-xs text-secondary">{t('common:import.pasteTextDesc')}</Text>
              </View>
            </Pressable>

            {onAdaptClick && (
              <Pressable
                onPress={() => { handleClose(); onAdaptClick() }}
                className="flex-row items-center gap-3 p-3 rounded-lg"
                style={{ backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}
              >
                <RefreshCw size={20} color={colors.orange} />
                <View>
                  <Text className="text-sm font-medium text-primary">{t('common:import.fromExternal')}</Text>
                  <Text className="text-xs text-secondary">{t('common:import.fromExternalDesc')}</Text>
                </View>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-sm text-secondary">{t('common:import.pasteContent')}</Text>
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
                  {t('common:buttons.back')}
                </Button>
              </View>
              <View className="flex-1">
                <Button onPress={handleTextImport} disabled={!jsonText.trim()}>
                  {t('common:buttons.import')}
                </Button>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}
