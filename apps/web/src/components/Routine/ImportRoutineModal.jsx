import { useState, useEffect, useRef } from 'react'
import { X, Upload, FileText, RefreshCw } from 'lucide-react'
import { Button } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { readJsonFile } from '../../lib/routineIO.js'

function ImportRoutineModal({ isOpen, onClose, onImport, onAdaptClick, defaultMode = null }) {
  const [mode, setMode] = useState(null)
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState('')
  const [isReading, setIsReading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen && defaultMode) setMode(defaultMode)
  }, [isOpen, defaultMode])

  if (!isOpen) return null

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsReading(true)
    try {
      const data = await readJsonFile(file)
      onImport(data)
      handleClose()
    } catch {
      setError('Error al leer el archivo')
    } finally {
      setIsReading(false)
    }

    e.target.value = ''
  }

  const handleTextImport = () => {
    setError('')
    try {
      const data = JSON.parse(jsonText)
      onImport(data)
      handleClose()
    } catch {
      setError('Formato inválido. Verifica el contenido.')
    }
  }

  const handleClose = () => {
    setMode(null)
    setJsonText('')
    setError('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
          <h3 className="font-semibold" style={{ color: colors.textPrimary }}>
            Importar rutina
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:opacity-80"
            style={{ color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {!mode ? (
            <div className="space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-3 rounded-lg flex items-center gap-3 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
                disabled={isReading}
              >
                <Upload size={20} style={{ color: colors.success }} />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                    {isReading ? 'Leyendo archivo...' : 'Desde archivo'}
                  </p>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>Seleccionar archivo de rutina</p>
                </div>
              </button>
              <button
                onClick={() => setMode('text')}
                className="w-full p-3 rounded-lg flex items-center gap-3 transition-opacity hover:opacity-80"
                style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
              >
                <FileText size={20} style={{ color: colors.accent }} />
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>Pegar texto</p>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>Pegar contenido directamente</p>
                </div>
              </button>
              {onAdaptClick && (
                <button
                  onClick={() => { handleClose(); onAdaptClick() }}
                  className="w-full p-3 rounded-lg flex items-center gap-3 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
                >
                  <RefreshCw size={20} style={{ color: '#f0883e' }} />
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>Desde herramienta externa</p>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>Convierte tu rutina de Excel, PDF u otra app con IA</p>
                  </div>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Pega el contenido de la rutina:
              </p>
              <textarea
                value={jsonText}
                onChange={e => { setJsonText(e.target.value); setError('') }}
                placeholder='{"version": 4, "routine": {...}}'
                rows={8}
                className="w-full p-3 rounded-lg text-sm font-mono resize-none"
                style={{
                  backgroundColor: colors.bgPrimary,
                  color: colors.textPrimary,
                  border: `1px solid ${error ? colors.error : colors.border}`
                }}
                autoFocus
              />
              {error && (
                <p className="text-xs" style={{ color: colors.error }}>{error}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => { setMode(null); setJsonText(''); setError('') }}
                >
                  Atrás
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleTextImport}
                  disabled={!jsonText.trim()}
                >
                  Importar
                </Button>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}

export default ImportRoutineModal
