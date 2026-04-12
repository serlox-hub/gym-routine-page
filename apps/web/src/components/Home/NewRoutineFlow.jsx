import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, Scissors, LayoutGrid, Upload, ChevronRight, Lock } from 'lucide-react'
import { useUserId, useIsPremium } from '../../hooks/useAuth.js'
import { ImportOptionsModal, LoadingSpinner, Modal } from '../ui/index.js'
import { ChatbotPromptModal, AdaptRoutineModal, TemplatesModal, ImportRoutineModal } from '../Routine/index.js'
import { QUERY_KEYS, importRoutine, getNotifier } from '@gym/shared'
import { useQueryClient } from '@tanstack/react-query'
import { colors } from '../../lib/styles.js'

function NewRoutineFlow({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const userId = useUserId()
  const isPremium = useIsPremium()
  const queryClient = useQueryClient()
  const [showChatbotModal, setShowChatbotModal] = useState(false)
  const [showAdaptModal, setShowAdaptModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importDefaultMode, setImportDefaultMode] = useState(null)
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [pendingImportData, setPendingImportData] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importType, setImportType] = useState(null)

  const handleImportData = (data) => {
    setPendingImportData(data)
    setShowImportModal(false)
    setShowImportOptions(true)
  }

  const handleImportConfirm = async (options) => {
    if (!pendingImportData) return
    setImportType('json')
    setIsImporting(true)
    setShowImportOptions(false)

    try {
      await importRoutine(pendingImportData, userId, options)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    } catch (err) {
      getNotifier()?.show(t('common:import.importError'), 'error')
    } finally {
      setIsImporting(false)
      setImportType(null)
      setPendingImportData(null)
    }
  }

  const handleTemplateImport = async (templateData) => {
    setImportType('template')
    setIsImporting(true)
    setShowTemplatesModal(false)
    try {
      await importRoutine(templateData, userId, { updateExercises: false })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
    } catch (err) {
      getNotifier()?.show(t('common:import.importError'), 'error')
    } finally {
      setIsImporting(false)
      setImportType(null)
    }
  }

  const handleImportCancel = () => {
    setShowImportOptions(false)
    setPendingImportData(null)
  }

  const handleAIClick = () => {
    if (!isPremium) return
    onClose()
    setShowChatbotModal(true)
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-sm" noBorder>
        <div style={{ padding: 20 }}>
          <h3 style={{ color: colors.textPrimary, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
            {t('routine:new')}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Create with AI — highlighted if premium, locked if not */}
            <button
              onClick={handleAIClick}
              className="flex items-center gap-3 rounded-xl transition-opacity"
              style={{
                padding: '14px 16px',
                backgroundColor: isPremium ? colors.success : colors.bgSecondary,
                border: `1px solid ${isPremium ? colors.success : colors.border}`,
                opacity: isPremium ? 1 : 0.7,
              }}
            >
              <Sparkles size={20} color={isPremium ? colors.bgPrimary : colors.success} />
              <div className="flex-1 text-left">
                <span style={{ color: isPremium ? colors.bgPrimary : colors.textPrimary, fontSize: 14, fontWeight: 600, display: 'block' }}>
                  {t('routine:newFlow.createWithAI')}
                </span>
                <span style={{ color: isPremium ? colors.bgPrimary : colors.textMuted, fontSize: 12, opacity: 0.8 }}>
                  {t('routine:newFlow.createWithAIDesc')}
                </span>
              </div>
              {!isPremium && (
                <span className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.successBg, color: colors.success, fontSize: 11, fontWeight: 600 }}>
                  <Lock size={10} /> Premium
                </span>
              )}
              <ChevronRight size={18} color={isPremium ? colors.bgPrimary : colors.textMuted} className="shrink-0" />
            </button>

            {/* Create manually */}
            <button
              onClick={() => { onClose(); navigate('/routines/new') }}
              className="flex items-center gap-3 rounded-xl hover:opacity-80 transition-opacity"
              style={{ padding: '14px 16px', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
            >
              <Scissors size={20} color={colors.success} />
              <div className="flex-1 text-left">
                <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, display: 'block' }}>
                  {t('routine:newFlow.createManually')}
                </span>
                <span style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('routine:newFlow.createManuallyDesc')}
                </span>
              </div>
              <ChevronRight size={18} color={colors.textMuted} className="shrink-0" />
            </button>

            {/* From templates */}
            <button
              onClick={() => { onClose(); setShowTemplatesModal(true) }}
              className="flex items-center gap-3 rounded-xl hover:opacity-80 transition-opacity"
              style={{ padding: '14px 16px', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
            >
              <LayoutGrid size={20} color={colors.success} />
              <div className="flex-1 text-left">
                <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, display: 'block' }}>
                  {t('routine:newFlow.predefined')}
                </span>
                <span style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('routine:newFlow.predefinedDesc')}
                </span>
              </div>
              <ChevronRight size={18} color={colors.textMuted} className="shrink-0" />
            </button>
          </div>

          {/* Import from file — link style */}
          <button
            onClick={() => { onClose(); setShowImportModal(true) }}
            className="flex items-center justify-center gap-2 w-full mt-4 py-2 hover:opacity-80 transition-opacity"
            style={{ color: colors.textMuted, fontSize: 13 }}
          >
            <Upload size={14} />
            {t('routine:newFlow.import')}
          </button>
        </div>
      </Modal>

      {showChatbotModal && (
        <ChatbotPromptModal
          onClose={() => setShowChatbotModal(false)}
          onImportClick={() => {
            setShowChatbotModal(false)
            setShowImportModal(true)
          }}
        />
      )}

      {showTemplatesModal && (
        <TemplatesModal
          onClose={() => setShowTemplatesModal(false)}
          onSelect={handleTemplateImport}
        />
      )}

      <ImportRoutineModal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setImportDefaultMode(null) }}
        onImport={handleImportData}
        onAdaptClick={() => setShowAdaptModal(true)}
        defaultMode={importDefaultMode}
      />

      {showAdaptModal && (
        <AdaptRoutineModal
          onClose={() => setShowAdaptModal(false)}
          onImportClick={() => {
            setShowAdaptModal(false)
            setImportDefaultMode('text')
            setShowImportModal(true)
          }}
        />
      )}

      <ImportOptionsModal
        isOpen={showImportOptions}
        onConfirm={handleImportConfirm}
        onCancel={handleImportCancel}
      />

      {isImporting && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: colors.overlay }}
        >
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner />
            <span style={{ color: colors.textPrimary }}>
              {importType === 'template' ? t('routine:creating') : t('common:import.importing')}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

export default NewRoutineFlow
