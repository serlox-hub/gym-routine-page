import { useState } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LayoutTemplate, FileText, Upload, Bot } from 'lucide-react-native'
import { useUserId } from '../../hooks/useAuth'
import { Card, ImportOptionsModal, LoadingSpinner } from '../ui'
import {
  TemplatesModal, ImportRoutineModal, ChatbotPromptModal, AdaptRoutineModal,
} from '../Routine'
import { QUERY_KEYS, importRoutine } from '@gym/shared'
import { useQueryClient } from '@tanstack/react-query'
import { colors } from '../../lib/styles'

function NewRoutineFlow({ isOpen, onClose, navigation }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const queryClient = useQueryClient()
  const [showTemplates, setShowTemplates] = useState(false)
  const [showImportRoutine, setShowImportRoutine] = useState(false)
  const [importDefaultMode, setImportDefaultMode] = useState(null)
  const [showChatbot, setShowChatbot] = useState(false)
  const [showAdaptRoutine, setShowAdaptRoutine] = useState(false)
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [pendingImportData, setPendingImportData] = useState(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleTemplateImport = (templateData) => {
    setPendingImportData(templateData)
    setShowImportOptions(true)
  }

  const handleImportData = (data) => {
    setPendingImportData(data)
    setShowImportOptions(true)
  }

  const handleImportConfirm = async (options) => {
    if (!pendingImportData) return
    setIsImporting(true)
    setShowImportOptions(false)

    try {
      await importRoutine(pendingImportData, userId, options)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    } catch (err) {
      Alert.alert('Error', `${t('common:import.importError')}: ${err.message}`)
    } finally {
      setIsImporting(false)
      setPendingImportData(null)
    }
  }

  const newRoutineOptions = [
    {
      icon: LayoutTemplate,
      iconColor: colors.success,
      label: t('routine:newFlow.predefined'),
      description: 'PPL, Upper/Lower, Full Body, 5/3/1',
      onPress: () => { onClose(); setShowTemplates(true) },
    },
    {
      icon: FileText,
      iconColor: colors.accent,
      label: t('routine:newFlow.createManually'),
      description: t('routine:newFlow.createManuallyDesc'),
      onPress: () => { onClose(); navigation.navigate('NewRoutine') },
    },
    {
      icon: Upload,
      iconColor: colors.success,
      label: t('routine:newFlow.import'),
      description: t('routine:newFlow.importDesc'),
      onPress: () => { onClose(); setShowImportRoutine(true) },
    },
    {
      icon: Bot,
      iconColor: colors.accent,
      label: t('routine:newFlow.createWithAI'),
      description: t('routine:newFlow.createWithAIDesc'),
      onPress: () => { onClose(); setShowChatbot(true) },
    },
  ]

  return (
    <>
      {isOpen && (
        <Pressable
          onPress={onClose}
          className="absolute inset-0 z-50 justify-center items-center p-4"
          style={{ backgroundColor: colors.overlay }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full bg-surface-card border border-border rounded-lg p-4"
            style={{ maxWidth: 400 }}
          >
            <Text className="text-primary font-semibold mb-4">{t('routine:newFlow.title')}</Text>
            {newRoutineOptions.map((opt, i) => (
              <Card key={i} className="p-3 mb-2" onPress={opt.onPress}>
                <View className="flex-row items-center gap-3">
                  <opt.icon size={20} color={opt.iconColor} />
                  <View>
                    <Text className="text-primary font-medium text-sm">{opt.label}</Text>
                    <Text className="text-secondary text-xs">{opt.description}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </Pressable>
        </Pressable>
      )}

      {isImporting && (
        <View
          className="absolute inset-0 z-50 items-center justify-center"
          style={{ backgroundColor: colors.overlay }}
        >
          <LoadingSpinner fullScreen={false} />
          <Text className="text-primary mt-2">{t('common:import.importing')}</Text>
        </View>
      )}

      <ImportOptionsModal
        isOpen={showImportOptions}
        onConfirm={handleImportConfirm}
        onCancel={() => {
          setShowImportOptions(false)
          setPendingImportData(null)
        }}
      />

      <TemplatesModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleTemplateImport}
      />

      <ImportRoutineModal
        isOpen={showImportRoutine}
        onClose={() => { setShowImportRoutine(false); setImportDefaultMode(null) }}
        onImport={handleImportData}
        onAdaptClick={() => setShowAdaptRoutine(true)}
        defaultMode={importDefaultMode}
      />

      <ChatbotPromptModal
        isOpen={showChatbot}
        onClose={() => setShowChatbot(false)}
        onImportClick={() => setShowImportRoutine(true)}
      />

      <AdaptRoutineModal
        isOpen={showAdaptRoutine}
        onClose={() => setShowAdaptRoutine(false)}
        onImportClick={() => {
          setShowAdaptRoutine(false)
          setImportDefaultMode('text')
          setShowImportRoutine(true)
        }}
      />
    </>
  )
}

export default NewRoutineFlow
