import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutTemplate, FileText, Upload, Bot } from 'lucide-react'
import { useUserId } from '../../hooks/useAuth.js'
import { Card, ImportOptionsModal, LoadingSpinner } from '../ui/index.js'
import { ChatbotPromptModal, AdaptRoutineModal, TemplatesModal, ImportRoutineModal } from '../Routine/index.js'
import { QUERY_KEYS, importRoutine, getNotifier } from '@gym/shared'
import { useQueryClient } from '@tanstack/react-query'
import { colors } from '../../lib/styles.js'

function NewRoutineFlow({ isOpen, onClose }) {
  const navigate = useNavigate()
  const userId = useUserId()
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
      getNotifier()?.show(`Error al importar: ${err.message}`, 'error')
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
      getNotifier()?.show(`Error al importar: ${err.message}`, 'error')
    } finally {
      setIsImporting(false)
      setImportType(null)
    }
  }

  const handleImportCancel = () => {
    setShowImportOptions(false)
    setPendingImportData(null)
  }

  const menuOption = (Icon, iconColor, title, description) => (
    <div className="flex items-center gap-3">
      <Icon size={20} style={{ color: iconColor }} />
      <div>
        <h4 className="font-medium text-sm" style={{ color: colors.textPrimary }}>{title}</h4>
        <p className="text-xs" style={{ color: colors.textSecondary }}>{description}</p>
      </div>
    </div>
  )

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={onClose}
        >
          <div
            className="w-full max-w-sm rounded-lg p-4"
            style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-4" style={{ color: colors.textPrimary }}>Nueva rutina</h3>
            <div className="space-y-2">
              <Card className="p-3" onClick={() => { onClose(); setShowTemplatesModal(true) }}>
                {menuOption(LayoutTemplate, colors.success, 'Rutinas predefinidas', 'PPL, Upper/Lower, Full Body, 5/3/1')}
              </Card>
              <Card className="p-3" onClick={() => { onClose(); navigate('/routines/new') }}>
                {menuOption(FileText, colors.accent, 'Crear manualmente', 'Configura tu rutina desde cero')}
              </Card>
              <Card className="p-3" onClick={() => { onClose(); setShowImportModal(true) }}>
                {menuOption(Upload, colors.success, 'Importar rutina', 'Desde un archivo exportado o generado con IA')}
              </Card>
              <Card className="p-3" onClick={() => { onClose(); setShowChatbotModal(true) }}>
                {menuOption(Bot, colors.accent, 'Crear con IA', 'Genera un prompt para ChatGPT/Claude')}
              </Card>
            </div>
          </div>
        </div>
      )}

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
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner />
            <span style={{ color: colors.textPrimary }}>
              {importType === 'template' ? 'Creando rutina...' : 'Importando rutina...'}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

export default NewRoutineFlow
