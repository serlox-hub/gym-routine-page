import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, X, ChevronLeft } from 'lucide-react'
import { Button, Input } from '../ui/index.js'
import { buildChatbotPrompt, getNotifier } from '@gym/shared'
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
  const { t } = useTranslation()
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
      getNotifier()?.show(t('common:errors.copyError'), 'error')
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: colors.overlay }}
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
              {step === 'form' ? t('routine:chatbot.title') : t('routine:chatbot.yourPrompt')}
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
                {t('routine:chatbot.description')}
              </p>
              <div className="space-y-3">
                <FormField
                  label={`${t('routine:chatbot.goal')} *`}
                  value={form.objetivo}
                  onChange={value => setForm(f => ({ ...f, objetivo: value, objetivoCustom: '' }))}
                  customValue={form.objetivoCustom}
                  onCustomChange={value => setForm(f => ({ ...f, objetivoCustom: value }))}
                  options={[
                    { value: 'Hipertrofia', label: t('routine:chatbot.goals.hypertrophy') },
                    { value: 'Fuerza', label: t('routine:chatbot.goals.strength') },
                    { value: 'Pérdida de grasa', label: t('routine:chatbot.goals.fatLoss') },
                    { value: 'Resistencia', label: t('routine:chatbot.goals.endurance') },
                    { value: 'Mantenimiento', label: t('routine:chatbot.goals.maintenance') },
                    { value: 'Salud general', label: t('routine:chatbot.goals.general') }
                  ]}
                  customPlaceholder={t('routine:chatbot.customGoal')}
                />
                <FormField
                  label={`${t('routine:chatbot.daysPerWeek')} *`}
                  value={form.diasPorSemana}
                  onChange={value => setForm(f => ({ ...f, diasPorSemana: value, diasPorSemanaCustom: '' }))}
                  customValue={form.diasPorSemanaCustom}
                  onCustomChange={value => setForm(f => ({ ...f, diasPorSemanaCustom: value }))}
                  options={[
                    { value: '1', label: `1 ${t('routine:chatbot.day')}` },
                    { value: '2', label: `2 ${t('routine:chatbot.days')}` },
                    { value: '3', label: `3 ${t('routine:chatbot.days')}` },
                    { value: '4', label: `4 ${t('routine:chatbot.days')}` },
                    { value: '5', label: `5 ${t('routine:chatbot.days')}` },
                    { value: '6', label: `6 ${t('routine:chatbot.days')}` },
                    { value: '7', label: `7 ${t('routine:chatbot.days')}` }
                  ]}
                  customPlaceholder={t('routine:chatbot.customDays')}
                />
                <FormField
                  label={t('routine:chatbot.experience')}
                  value={form.nivelExperiencia}
                  onChange={value => setForm(f => ({ ...f, nivelExperiencia: value, nivelExperienciaCustom: '' }))}
                  customValue={form.nivelExperienciaCustom}
                  onCustomChange={value => setForm(f => ({ ...f, nivelExperienciaCustom: value }))}
                  options={[
                    { value: 'Principiante (menos de 1 año)', label: t('routine:chatbot.levels.beginner') },
                    { value: 'Intermedio (1-3 años)', label: t('routine:chatbot.levels.intermediate') },
                    { value: 'Avanzado (más de 3 años)', label: t('routine:chatbot.levels.advanced') }
                  ]}
                  customPlaceholder={t('routine:chatbot.customLevel')}
                />
                <FormField
                  label={t('routine:chatbot.duration')}
                  value={form.duracionSesion}
                  onChange={value => setForm(f => ({ ...f, duracionSesion: value, duracionSesionCustom: '' }))}
                  customValue={form.duracionSesionCustom}
                  onCustomChange={value => setForm(f => ({ ...f, duracionSesionCustom: value }))}
                  options={[
                    { value: '30', label: `30 ${t('common:time.min')}` },
                    { value: '45', label: `45 ${t('common:time.min')}` },
                    { value: '60', label: `60 ${t('common:time.min')}` },
                    { value: '75', label: `75 ${t('common:time.min')}` },
                    { value: '90', label: `90 ${t('common:time.min')}` }
                  ]}
                  customPlaceholder={t('routine:chatbot.customDuration')}
                />
                <Input
                  label={t('routine:chatbot.equipment')}
                  value={form.equipamiento}
                  onChange={e => setForm(f => ({ ...f, equipamiento: e.target.value }))}
                  placeholder={t('routine:chatbot.equipmentPlaceholder')}
                />
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
                    {t('routine:chatbot.additionalNotes')}
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
                {t('routine:chatbot.generate')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                {t('routine:chatbot.promptInstructions')}
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
                {copied ? t('common:errors.copySuccess') : t('routine:chatbot.copyPrompt')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  handleClose()
                  onImportClick()
                }}
              >
                {t('routine:chatbot.pasteJSON')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, customValue, onCustomChange, options, customPlaceholder }) {
  const { t } = useTranslation()
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
        <option value="">{t('common:buttons.select')}...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
        <option value="custom">{t('common:labels.other')}...</option>
      </select>
      {value === 'custom' && (
        <Input
          value={customValue}
          onChange={e => onCustomChange(e.target.value)}
          placeholder={customPlaceholder}
          className="mt-2"
          autoFocus
        />
      )}
    </div>
  )
}

export default ChatbotPromptModal
