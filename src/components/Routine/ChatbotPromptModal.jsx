import { useState } from 'react'
import { Copy, Check, X, ChevronLeft } from 'lucide-react'
import { Button } from '../ui/index.js'
import { buildChatbotPrompt } from '../../lib/routineIO.js'
import { colors } from '../../lib/styles.js'

const INITIAL_FORM_STATE = {
  objetivo: '',
  objetivoCustom: '',
  diasPorSemana: '',
  diasPorSemanaCustom: '',
  nivelExperiencia: '',
  nivelExperienciaCustom: '',
  duracionSesion: '',
  duracionSesionCustom: '',
  equipamiento: '',
  notas: ''
}

function ChatbotPromptModal({ onClose, onImportClick }) {
  const [step, setStep] = useState('form')
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM_STATE)

  const getFormValue = (field, customField) =>
    form[field] === 'custom' ? form[customField] : form[field]

  const generatedPrompt = buildChatbotPrompt({
    objetivo: getFormValue('objetivo', 'objetivoCustom'),
    diasPorSemana: getFormValue('diasPorSemana', 'diasPorSemanaCustom'),
    nivelExperiencia: getFormValue('nivelExperiencia', 'nivelExperienciaCustom'),
    duracionSesion: getFormValue('duracionSesion', 'duracionSesionCustom'),
    equipamiento: form.equipamiento,
    notas: form.notas
  })

  const isFormValid = () => {
    const objetivo = getFormValue('objetivo', 'objetivoCustom')
    const dias = getFormValue('diasPorSemana', 'diasPorSemanaCustom')
    return objetivo && dias
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Error al copiar')
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] rounded-lg flex flex-col"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-2">
            {step === 'prompt' && (
              <button
                onClick={() => setStep('form')}
                className="p-1 rounded hover:opacity-80"
                style={{ color: colors.textSecondary }}
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h3 className="font-semibold" style={{ color: colors.textPrimary }}>
              {step === 'form' ? 'Crear rutina con IA' : 'Tu prompt personalizado'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:opacity-80"
            style={{ color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        {step === 'form' ? (
          <>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                Completa estos datos para generar un prompt optimizado. Tus datos no se almacenan.
              </p>
              <div className="space-y-3">
                <FormField
                  label="Objetivo *"
                  value={form.objetivo}
                  onChange={value => setForm(f => ({ ...f, objetivo: value, objetivoCustom: '' }))}
                  customValue={form.objetivoCustom}
                  onCustomChange={value => setForm(f => ({ ...f, objetivoCustom: value }))}
                  options={[
                    { value: 'Hipertrofia', label: 'Hipertrofia (ganar músculo)' },
                    { value: 'Fuerza', label: 'Fuerza' },
                    { value: 'Pérdida de grasa', label: 'Pérdida de grasa' },
                    { value: 'Resistencia', label: 'Resistencia' },
                    { value: 'Mantenimiento', label: 'Mantenimiento' },
                    { value: 'Salud general', label: 'Salud general' }
                  ]}
                  customPlaceholder="Escribe tu objetivo..."
                />
                <FormField
                  label="Días por semana *"
                  value={form.diasPorSemana}
                  onChange={value => setForm(f => ({ ...f, diasPorSemana: value, diasPorSemanaCustom: '' }))}
                  customValue={form.diasPorSemanaCustom}
                  onCustomChange={value => setForm(f => ({ ...f, diasPorSemanaCustom: value }))}
                  options={[
                    { value: '1', label: '1 día' },
                    { value: '2', label: '2 días' },
                    { value: '3', label: '3 días' },
                    { value: '4', label: '4 días' },
                    { value: '5', label: '5 días' },
                    { value: '6', label: '6 días' },
                    { value: '7', label: '7 días' }
                  ]}
                  customPlaceholder="Ej: 7 días, alternando..."
                />
                <FormField
                  label="Nivel de experiencia"
                  value={form.nivelExperiencia}
                  onChange={value => setForm(f => ({ ...f, nivelExperiencia: value, nivelExperienciaCustom: '' }))}
                  customValue={form.nivelExperienciaCustom}
                  onCustomChange={value => setForm(f => ({ ...f, nivelExperienciaCustom: value }))}
                  options={[
                    { value: 'Principiante (menos de 1 año)', label: 'Principiante (menos de 1 año)' },
                    { value: 'Intermedio (1-3 años)', label: 'Intermedio (1-3 años)' },
                    { value: 'Avanzado (más de 3 años)', label: 'Avanzado (más de 3 años)' }
                  ]}
                  customPlaceholder="Describe tu nivel..."
                />
                <FormField
                  label="Duración por sesión (minutos)"
                  value={form.duracionSesion}
                  onChange={value => setForm(f => ({ ...f, duracionSesion: value, duracionSesionCustom: '' }))}
                  customValue={form.duracionSesionCustom}
                  onCustomChange={value => setForm(f => ({ ...f, duracionSesionCustom: value }))}
                  options={[
                    { value: '30', label: '30 minutos' },
                    { value: '45', label: '45 minutos' },
                    { value: '60', label: '60 minutos' },
                    { value: '75', label: '75 minutos' },
                    { value: '90', label: '90 minutos' }
                  ]}
                  customPlaceholder="Ej: 120 minutos, variable..."
                />
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Equipamiento disponible
                  </label>
                  <input
                    type="text"
                    value={form.equipamiento}
                    onChange={e => setForm(f => ({ ...f, equipamiento: e.target.value }))}
                    placeholder="Ej: gimnasio completo, solo mancuernas..."
                    className="w-full p-2 rounded-lg text-sm"
                    style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
                    Notas adicionales
                  </label>
                  <textarea
                    value={form.notas}
                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                    placeholder="Ej: evitar ejercicios de impacto, enfoque en espalda..."
                    rows={2}
                    className="w-full p-2 rounded-lg text-sm resize-none"
                    style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t" style={{ borderColor: colors.border }}>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setStep('prompt')}
                disabled={!isFormValid()}
              >
                Generar prompt
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                Copia este prompt y pégalo en ChatGPT, Claude u otro chatbot. El resultado será un JSON que puedes importar.
              </p>
              <div
                className="p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap"
                style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}
              >
                {generatedPrompt}
              </div>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: colors.border }}>
              <Button
                variant="primary"
                className="flex-1 flex items-center justify-center gap-2"
                onClick={handleCopyPrompt}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar prompt'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  handleClose()
                  onImportClick()
                }}
              >
                Importar JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, customValue, onCustomChange, options, customPlaceholder }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-2 rounded-lg text-sm"
        style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
      >
        <option value="">Seleccionar...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
        <option value="custom">Otro...</option>
      </select>
      {value === 'custom' && (
        <input
          type="text"
          value={customValue}
          onChange={e => onCustomChange(e.target.value)}
          placeholder={customPlaceholder}
          className="w-full p-2 rounded-lg text-sm mt-2"
          style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
          autoFocus
        />
      )}
    </div>
  )
}

export default ChatbotPromptModal
