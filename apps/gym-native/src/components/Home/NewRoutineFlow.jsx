import { useState } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Sparkles, Scissors, LayoutGrid, Upload, ChevronRight, Lock } from 'lucide-react-native'
import { useUserId, useIsPremium } from '../../hooks/useAuth'
import { ImportOptionsModal, LoadingSpinner, Modal } from '../ui'
import {
  TemplatesModal, ImportRoutineModal, ChatbotPromptModal, AdaptRoutineModal,
} from '../Routine'
import { QUERY_KEYS, importRoutine } from '@gym/shared'
import { useQueryClient } from '@tanstack/react-query'
import { colors } from '../../lib/styles'

function NewRoutineFlow({ isOpen, onClose, navigation }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const isPremium = useIsPremium()
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
    } catch {
      Alert.alert('Error', t('common:import.importError'))
    } finally {
      setIsImporting(false)
      setPendingImportData(null)
    }
  }

  const handleAIClick = () => {
    if (!isPremium) return
    onClose()
    setShowChatbot(true)
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} position="bottom">
        <View style={{ padding: 20 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>
            {t('routine:new')}
          </Text>

          <View style={{ gap: 10 }}>
            {/* Create with AI */}
            <Pressable
              onPress={handleAIClick}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 12,
                backgroundColor: isPremium ? colors.success : colors.bgSecondary,
                borderWidth: 1, borderColor: isPremium ? colors.success : colors.border,
                opacity: isPremium ? 1 : 0.7,
              }}
            >
              <Sparkles size={20} color={isPremium ? colors.bgPrimary : colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: isPremium ? colors.bgPrimary : colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                  {t('routine:newFlow.createWithAI')}
                </Text>
                <Text style={{ color: isPremium ? colors.bgPrimary : colors.textMuted, fontSize: 12, opacity: 0.8 }}>
                  {t('routine:newFlow.createWithAIDesc')}
                </Text>
              </View>
              {!isPremium && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successBg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Lock size={10} color={colors.success} />
                  <Text style={{ color: colors.success, fontSize: 11, fontWeight: '600' }}>Premium</Text>
                </View>
              )}
              <ChevronRight size={18} color={isPremium ? colors.bgPrimary : colors.textMuted} />
            </Pressable>

            {/* Create manually */}
            <Pressable
              onPress={() => { onClose(); navigation.navigate('NewRoutine') }}
              className="active:opacity-70"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 12,
                backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Scissors size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                  {t('routine:newFlow.createManually')}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('routine:newFlow.createManuallyDesc')}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>

            {/* From templates */}
            <Pressable
              onPress={() => { onClose(); setShowTemplates(true) }}
              className="active:opacity-70"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 12,
                backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
              }}
            >
              <LayoutGrid size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                  {t('routine:newFlow.predefined')}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('routine:newFlow.predefinedDesc')}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Import from file — link style */}
          <Pressable
            onPress={() => { onClose(); setShowImportRoutine(true) }}
            className="active:opacity-70"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 8 }}
          >
            <Upload size={14} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('routine:newFlow.import')}</Text>
          </Pressable>
        </View>
      </Modal>

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
