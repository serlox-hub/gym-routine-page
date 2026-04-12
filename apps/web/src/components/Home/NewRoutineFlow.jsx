import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, Pencil, LayoutGrid, Upload, ChevronRight, ChevronLeft, Lock, Check, Copy, FileText } from 'lucide-react'
import { useUserId, useIsPremium } from '../../hooks/useAuth.js'
import { ImportOptionsModal, LoadingSpinner, Modal } from '../ui/index.js'
import { QUERY_KEYS, ROUTINE_TEMPLATES, importRoutine, getNotifier, buildChatbotPrompt, buildAdaptRoutinePrompt } from '@gym/shared'
import { useQueryClient } from '@tanstack/react-query'
import { readJsonFile } from '../../lib/routineIO.js'
import { colors } from '../../lib/styles.js'

// ============================================
// MENU VIEW
// ============================================

function MenuView({ onNavigate, isPremium, t }) {
  const navigate = useNavigate()

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ color: colors.textPrimary, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        {t('routine:new')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Create with AI */}
        <button
          onClick={() => isPremium && onNavigate('chatbot')}
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
          onClick={() => { onNavigate('close'); navigate('/routines/new') }}
          className="flex items-center gap-3 rounded-xl hover:opacity-80 transition-opacity"
          style={{ padding: '14px 16px', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        >
          <Pencil size={20} color={colors.success} />
          <div className="flex-1 text-left">
            <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, display: 'block' }}>{t('routine:newFlow.createManually')}</span>
            <span style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:newFlow.createManuallyDesc')}</span>
          </div>
          <ChevronRight size={18} color={colors.textMuted} className="shrink-0" />
        </button>

        {/* From templates */}
        <button
          onClick={() => onNavigate('templates')}
          className="flex items-center gap-3 rounded-xl hover:opacity-80 transition-opacity"
          style={{ padding: '14px 16px', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        >
          <LayoutGrid size={20} color={colors.success} />
          <div className="flex-1 text-left">
            <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, display: 'block' }}>{t('routine:newFlow.predefined')}</span>
            <span style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:newFlow.predefinedDesc')}</span>
          </div>
          <ChevronRight size={18} color={colors.textMuted} className="shrink-0" />
        </button>
      </div>

      {/* Import from file */}
      <button
        onClick={() => onNavigate('import')}
        className="flex items-center justify-center gap-2 w-full mt-4 py-2 hover:opacity-80 transition-opacity"
        style={{ color: colors.textMuted, fontSize: 13 }}
      >
        <Upload size={14} />
        {t('routine:newFlow.import')}
      </button>
    </div>
  )
}

// ============================================
// TEMPLATES VIEW
// ============================================

function TemplatesView({ onSelect, t }) {
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0 20px 12px' }}>
        <p style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:templates.selectHint')}</p>
      </div>
      <div className="overflow-y-auto flex-1 px-5" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ROUTINE_TEMPLATES.map(template => {
          const isSelected = selected?.id === template.id
          const daysCount = template.data.routine.days.length
          return (
            <button
              key={template.id}
              onClick={() => setSelected(template)}
              className="w-full text-left rounded-xl transition-all"
              style={{ padding: '14px 16px', backgroundColor: colors.bgSecondary, border: `1px solid ${isSelected ? colors.success : colors.border}` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ borderColor: isSelected ? colors.success : colors.border, backgroundColor: isSelected ? colors.success : 'transparent' }}>
                  {isSelected && <Check size={12} color={colors.bgPrimary} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, display: 'block' }}>{template.name}</span>
                  <span style={{ color: colors.textMuted, fontSize: 12, display: 'block', marginTop: 2 }}>{template.description}</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {template.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}>{tag}</span>
                    ))}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}>
                      {t('common:home.nDays', { count: daysCount })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <div style={{ padding: 20 }}>
        <button
          onClick={() => selected && onSelect(selected.data)}
          disabled={!selected}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}
        >
          {t('routine:templates.use')}
        </button>
      </div>
    </div>
  )
}

// ============================================
// CHATBOT VIEW
// ============================================

function ChatbotView({ onImport, step, setStep, t }) {
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [form, setForm] = useState({ objetivo: '', objetivoCustom: '', diasPorSemana: '', duracionSesion: 60, nivelExperiencia: '', notas: '' })

  const goal = form.objetivo === 'custom' ? form.objetivoCustom : form.objetivo
  const prompt = buildChatbotPrompt({ ...form, objetivo: goal })

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(prompt) }
    catch { getNotifier()?.show(t('common:errors.copyError'), 'error') }
  }

  const GOALS = [
    { value: 'Hipertrofia', label: t('routine:chatbot.goals.hypertrophy') },
    { value: 'Fuerza', label: t('routine:chatbot.goals.strength') },
    { value: 'Pérdida de grasa', label: t('routine:chatbot.goals.fatLoss') },
    { value: 'Resistencia', label: t('routine:chatbot.goals.endurance') },
    { value: 'Mantenimiento', label: t('routine:chatbot.goals.maintenance') },
    { value: 'Salud general', label: t('routine:chatbot.goals.general') },
  ]

  const LEVELS = [
    { value: 'Principiante (menos de 1 año)', label: t('routine:chatbot.levels.beginner'), desc: t('routine:chatbot.levelsDesc.beginner') },
    { value: 'Intermedio (1-3 años)', label: t('routine:chatbot.levels.intermediate'), desc: t('routine:chatbot.levelsDesc.intermediate') },
    { value: 'Avanzado (más de 3 años)', label: t('routine:chatbot.levels.advanced'), desc: t('routine:chatbot.levelsDesc.advanced') },
  ]

  const canNext = (step === 1 && goal) || (step === 2 && form.diasPorSemana) || step === 3 || step === 4

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 340 }}>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="w-2 h-2 rounded-full transition-colors" style={{ backgroundColor: i <= step ? colors.success : colors.border }} />
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {step === 1 && (
        <>
          <p style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>{t('routine:chatbot.goalQuestion')}</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button key={g.value} onClick={() => setForm(f => ({ ...f, objetivo: g.value, objetivoCustom: '' }))}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ backgroundColor: form.objetivo === g.value ? colors.successBg : colors.bgTertiary, border: `1px solid ${form.objetivo === g.value ? colors.success : colors.border}`, color: form.objetivo === g.value ? colors.success : colors.textPrimary }}>
                {g.label}
              </button>
            ))}
            <button onClick={() => setForm(f => ({ ...f, objetivo: 'custom' }))}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
              style={{ backgroundColor: form.objetivo === 'custom' ? colors.successBg : colors.bgTertiary, border: `1px solid ${form.objetivo === 'custom' ? colors.success : colors.border}`, color: form.objetivo === 'custom' ? colors.success : colors.textPrimary }}>
              <Pencil size={12} /> {t('common:labels.other')}
            </button>
          </div>
          {form.objetivo === 'custom' && (
            <input value={form.objetivoCustom} onChange={e => setForm(f => ({ ...f, objetivoCustom: e.target.value }))}
              placeholder={t('routine:chatbot.customGoal')} autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }} />
          )}
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <p style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 500, marginBottom: 10 }}>{t('routine:chatbot.daysPerWeek')}</p>
            <div className="flex gap-2">
              {[1,2,3,4,5,6,7].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, diasPorSemana: String(n) }))}
                  className="w-10 h-10 rounded-lg text-sm font-semibold transition-colors"
                  style={{ backgroundColor: form.diasPorSemana === String(n) ? colors.successBg : colors.bgTertiary, border: `1px solid ${form.diasPorSemana === String(n) ? colors.success : colors.border}`, color: form.diasPorSemana === String(n) ? colors.success : colors.textPrimary }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 500, marginBottom: 10 }}>{t('routine:chatbot.duration')}</p>
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setForm(f => ({ ...f, duracionSesion: Math.max(15, f.duracionSesion - 15) }))}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}>
                −
              </button>
              <span style={{ color: colors.textPrimary, fontSize: 28, fontWeight: 700, minWidth: 100, textAlign: 'center' }}>
                {form.duracionSesion} min
              </span>
              <button onClick={() => setForm(f => ({ ...f, duracionSesion: Math.min(180, f.duracionSesion + 15) }))}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}>
                +
              </button>
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>{t('routine:chatbot.experience')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {LEVELS.map(lvl => (
              <button key={lvl.value} onClick={() => setForm(f => ({ ...f, nivelExperiencia: lvl.value }))}
                className="w-full text-left rounded-xl transition-all"
                style={{ padding: '12px 16px', backgroundColor: colors.bgSecondary, border: `1px solid ${form.nivelExperiencia === lvl.value ? colors.success : colors.border}` }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: form.nivelExperiencia === lvl.value ? colors.success : colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{lvl.label}</span>
                  <span style={{ color: colors.textMuted, fontSize: 11 }}>{lvl.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <p style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 500 }}>{t('routine:chatbot.additionalNotes')} ({t('common:labels.optional')})</p>
          <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={6}
            placeholder={t('routine:chatbot.notesPlaceholder')}
            className="w-full p-3 rounded-xl text-sm resize-none flex-1"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${colors.border}`, minHeight: 140 }} />
        </>
      )}

      {step === 5 && (
        <>
          <p style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:chatbot.promptInstructions')}</p>
          <div className="p-3 rounded-xl text-xs font-mono whitespace-pre-wrap"
            style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary, maxHeight: 140, overflowY: 'auto', border: `1px solid ${colors.border}` }}>
            {prompt}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{ name: 'ChatGPT', url: 'https://chat.openai.com' }, { name: 'Claude', url: 'https://claude.ai' }, { name: 'Gemini', url: 'https://gemini.google.com' }].map(ai => (
              <a key={ai.name} href={ai.url} target="_blank" rel="noopener noreferrer"
                className="py-2.5 rounded-xl text-center text-xs font-medium hover:opacity-80"
                style={{ backgroundColor: colors.bgSecondary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}>
                {ai.name}
              </a>
            ))}
          </div>
        </>
      )}

      {step === 6 && (
        <>
          <p style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:chatbot.pasteInstructions')}</p>
          <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setJsonError('') }}
            placeholder={t('routine:import.resultPlaceholder')} rows={6}
            className="w-full p-3 rounded-xl text-sm font-mono resize-none flex-1"
            style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${jsonError ? colors.danger : colors.border}`, minHeight: 140 }} />
          {jsonError && <p className="text-xs" style={{ color: colors.danger }}>{jsonError}</p>}
        </>
      )}

      </div>

      {/* Action button — always at bottom */}
      {step <= 4 ? (
        <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
          className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
          {t('common:buttons.next')}
        </button>
      ) : step === 5 ? (
        <button onClick={() => { handleCopy(); setStep(6) }} className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
          <Copy size={16} /> {t('routine:chatbot.copyPrompt')}
        </button>
      ) : (
        <button onClick={() => {
          setJsonError('')
          try {
            const data = JSON.parse(jsonText)
            if (!data?.routine?.name) throw new Error('invalid')
            onImport(data)
          } catch { setJsonError(t('common:import.invalidFormat')) }
        }} disabled={!jsonText.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
          {t('common:buttons.import')}
        </button>
      )}
    </div>
  )
}

// ============================================
// IMPORT VIEW
// ============================================

function ImportView({ onImport, onNavigate, t }) {
  const [mode, setMode] = useState(null)
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState('')

  const handleTextImport = () => {
    setError('')
    try {
      const data = JSON.parse(jsonText)
      if (!data?.routine?.name) throw new Error('invalid')
      onImport(data)
    }
    catch { setError(t('common:import.invalidFormat')) }
  }

  if (mode === 'text') {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="text-sm" style={{ color: colors.textSecondary }}>{t('routine:import.pasteContent')}:</p>
        <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setError('') }}
          placeholder={t('routine:import.resultPlaceholder')} rows={8} autoFocus
          className="w-full p-3 rounded-lg text-sm font-mono resize-none"
          style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: `1px solid ${error ? colors.danger : colors.border}` }} />
        {error && <p className="text-xs" style={{ color: colors.danger }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => { setMode(null); setJsonText(''); setError('') }}
            className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}>
            {t('common:buttons.back')}
          </button>
          <button onClick={handleTextImport} disabled={!jsonText.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {t('common:buttons.import')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={() => onNavigate('importFile')}
        className="w-full p-3.5 rounded-xl flex items-center gap-3 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
        <Upload size={20} color={colors.success} />
        <div className="text-left flex-1">
          <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, display: 'block' }}>{t('routine:import.fromFile')}</span>
          <span style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:import.fromFileDesc')}</span>
        </div>
      </button>
      <button onClick={() => setMode('text')}
        className="w-full p-3.5 rounded-xl flex items-center gap-3 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
        <FileText size={20} color={colors.success} />
        <div className="text-left flex-1">
          <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, display: 'block' }}>{t('routine:import.pasteText')}</span>
          <span style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:import.pasteTextDesc')}</span>
        </div>
      </button>
      <button onClick={() => onNavigate('adapt')}
        className="w-full p-3.5 rounded-xl flex items-center gap-3 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
        <Sparkles size={20} color={colors.success} />
        <div className="text-left flex-1">
          <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600, display: 'block' }}>{t('routine:import.fromExternal')}</span>
          <span style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:import.fromExternalDesc')}</span>
        </div>
      </button>
    </div>
  )
}

// ============================================
// IMPORT FILE VIEW
// ============================================

function ImportFileView({ onImport, t }) {
  const [fileName, setFileName] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [error, setError] = useState('')
  const [isReading, setIsReading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsReading(true)
    setError('')
    setParsedData(null)
    setFileName(file.name)
    try {
      const data = await readJsonFile(file)
      if (!data?.routine?.name) throw new Error('invalid')
      setParsedData(data)
    } catch {
      setError(t('common:import.invalidFormat'))
    } finally {
      setIsReading(false)
    }
    e.target.value = ''
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 200 }}>
      <p style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:import.fileInstructions')}</p>

      {!fileName ? (
        <button onClick={() => fileInputRef.current?.click()} disabled={isReading}
          className="w-full py-10 rounded-xl flex flex-col items-center gap-3 hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{ border: `2px dashed ${colors.border}`, backgroundColor: 'transparent' }}>
          <Upload size={24} color={colors.textMuted} />
          <span style={{ color: colors.textMuted, fontSize: 13 }}>{isReading ? t('common:buttons.loading') : t('routine:import.tapToSelect')}</span>
        </button>
      ) : (
        <div className="rounded-xl flex flex-col items-center gap-3 py-8 px-4"
          style={{ border: `2px solid ${error ? colors.danger : parsedData ? colors.success : colors.border}`, backgroundColor: colors.bgSecondary }}>
          <FileText size={24} color={error ? colors.danger : parsedData ? colors.success : colors.textMuted} />
          <div className="text-center">
            <span className="block" style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 500 }}>{fileName}</span>
            {parsedData && <span className="block" style={{ color: colors.success, fontSize: 12, marginTop: 4 }}>{parsedData.routine.name} — {parsedData.routine.days?.length || 0} {t('routine:chatbot.days')}</span>}
            {error && <span className="block" style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</span>}
          </div>
          <button onClick={() => { setFileName(null); setParsedData(null); setError(''); fileInputRef.current?.click() }}
            className="hover:opacity-80 transition-opacity"
            style={{ color: colors.textMuted, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            {t('common:buttons.change')}
          </button>
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        <button onClick={() => parsedData && onImport(parsedData)} disabled={!parsedData}
          className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
          {t('common:buttons.import')}
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
    </div>
  )
}

// ============================================
// ADAPT VIEW
// ============================================

function AdaptView({ onImport, step, setStep, t }) {
  const adaptPrompt = buildAdaptRoutinePrompt()
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(adaptPrompt) }
    catch { getNotifier()?.show(t('common:errors.copyError'), 'error') }
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 380, justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="flex items-center justify-center gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i === step ? colors.success : colors.border }} />
          ))}
        </div>
        <h4 className="font-medium" style={{ color: colors.textPrimary }}>
          {t(`routine:adapt.step${step}Title`)}
        </h4>
        <div className="text-sm" style={{ color: colors.textSecondary }}>
          {step === 1 && (
            <div className="space-y-3">
              <p>{t('routine:adapt.step1Desc')}</p>
              <ul className="list-disc list-inside space-y-1">
                {t('routine:adapt.step1Sources', { returnObjects: true }).map((src, i) => <li key={i}>{src}</li>)}
              </ul>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <p>{t('routine:adapt.step2Desc')}</p>
              <div className="p-3 rounded-xl text-xs font-mono whitespace-pre-wrap"
                style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary, maxHeight: 200, overflowY: 'auto', border: `1px solid ${colors.border}` }}>
                {adaptPrompt}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['ChatGPT', 'Claude', 'Gemini'].map(name => (
                  <a key={name} href={name === 'ChatGPT' ? 'https://chat.openai.com' : name === 'Claude' ? 'https://claude.ai' : 'https://gemini.google.com'}
                    target="_blank" rel="noopener noreferrer"
                    className="py-2.5 rounded-xl text-center text-xs font-medium hover:opacity-80"
                    style={{ backgroundColor: colors.bgSecondary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}>
                    {name}
                  </a>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <p>{t('routine:adapt.step3Desc')}</p>
              <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setJsonError('') }}
                placeholder={t('routine:import.resultPlaceholder')} rows={6}
                className="w-full p-3 rounded-xl text-sm font-mono resize-none"
                style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: `1px solid ${jsonError ? colors.danger : colors.border}`, minHeight: 140 }} />
              {jsonError && <p className="text-xs" style={{ color: colors.danger }}>{jsonError}</p>}
            </div>
          )}
        </div>
      </div>
      {step === 1 ? (
        <button onClick={() => setStep(2)}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
          {t('common:buttons.next')} <ChevronRight size={16} />
        </button>
      ) : step === 2 ? (
        <button onClick={() => { handleCopy(); setStep(3) }} className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
          <Copy size={16} />
          {t('routine:chatbot.copyPrompt')}
        </button>
      ) : step === 3 ? (
        <button onClick={() => {
          setJsonError('')
          try {
            const data = JSON.parse(jsonText)
            if (!data?.routine?.name) throw new Error('invalid')
            onImport(data)
          } catch { setJsonError(t('common:import.invalidFormat')) }
        }} disabled={!jsonText.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
          {t('common:buttons.import')}
        </button>
      ) : null}
    </div>
  )
}

// ============================================
// SCREEN TITLES
// ============================================

const SCREEN_TITLES = {
  menu: null,
  templates: 'routine:templates.title',
  chatbot: 'routine:chatbot.title',
  import: 'routine:newFlow.import',
  importFile: 'routine:import.fromFile',
  adapt: 'routine:adapt.title',
}

// ============================================
// MAIN FLOW
// ============================================

function NewRoutineFlow({ isOpen, onClose }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const isPremium = useIsPremium()
  const queryClient = useQueryClient()
  const [stack, setStack] = useState(['menu'])
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [pendingImportData, setPendingImportData] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [chatbotStep, setChatbotStep] = useState(1)
  const [adaptStep, setAdaptStep] = useState(1)

  const currentScreen = stack[stack.length - 1]
  const screenIndex = stack.length - 1

  const push = (screen) => {
    if (screen === 'close') { handleClose(); return }
    setStack(s => [...s, screen])
  }

  const pop = () => {
    // If inside chatbot/adapt with step > 1, go back a step
    if (currentScreen === 'chatbot' && chatbotStep > 1) { setChatbotStep(s => s - 1); return }
    if (currentScreen === 'adapt' && adaptStep > 1) { setAdaptStep(s => s - 1); return }
    if (stack.length <= 1) { handleClose(); return }
    setStack(s => s.slice(0, -1))
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => { setStack(['menu']); setChatbotStep(1); setAdaptStep(1) }, 300)
  }

  const handleImport = (data) => {
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
      handleClose()
    } catch {
      getNotifier()?.show(t('common:import.importError'), 'error')
    } finally {
      setIsImporting(false)
      setPendingImportData(null)
    }
  }

  const handleTemplateSelect = async (templateData) => {
    setIsImporting(true)
    try {
      await importRoutine(templateData, userId, { updateExercises: false })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      handleClose()
    } catch {
      getNotifier()?.show(t('common:import.importError'), 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const titleKey = SCREEN_TITLES[currentScreen]

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} position="bottom" maxWidth="max-w-lg" noBorder>
        {/* Header with back + title (only when not on menu) */}
        {titleKey && (
          <div className="flex items-center shrink-0" style={{ padding: '16px 20px 8px' }}>
            <button onClick={pop} className="flex items-center gap-1 hover:opacity-80" style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500, minWidth: 70 }}>
              <ChevronLeft size={18} />
              {t('common:buttons.back')}
            </button>
            <span className="flex-1 text-center" style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700 }}>{t(titleKey)}</span>
            <div style={{ minWidth: 70 }} />
          </div>
        )}

        {/* Carousel — slides horizontally, height adapts to content */}
        <div style={{ overflowX: 'hidden', maxHeight: '75vh' }}>
          <div
            className="flex"
            style={{
              transform: `translateX(-${screenIndex * 100}%)`,
              transition: 'transform 0.3s ease',
            }}
          >
            {stack.map((screen, i) => (
              <div key={`${screen}-${i}`} style={{ minWidth: '100%', maxHeight: '75vh', overflowY: 'auto' }}>
                {screen === 'menu' && <MenuView onNavigate={push} isPremium={isPremium} t={t} />}
                {screen === 'templates' && <TemplatesView onSelect={handleTemplateSelect} t={t} />}
                {screen === 'chatbot' && <ChatbotView onImport={handleImport} step={chatbotStep} setStep={setChatbotStep} t={t} />}
                {screen === 'import' && <ImportView onImport={handleImport} onNavigate={push} t={t} />}
                {screen === 'importFile' && <ImportFileView onImport={handleImport} t={t} />}
                {screen === 'adapt' && <AdaptView onImport={handleImport} step={adaptStep} setStep={setAdaptStep} t={t} />}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ImportOptionsModal
        isOpen={showImportOptions}
        onConfirm={handleImportConfirm}
        onCancel={() => { setShowImportOptions(false); setPendingImportData(null) }}
      />

      {isImporting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: colors.overlay }}>
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner />
            <span style={{ color: colors.textPrimary }}>{t('common:import.importing')}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default NewRoutineFlow
