import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Check, Sparkles, Info } from 'lucide-react'
import {
  ROUTINE_TEMPLATES,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  EQUIPMENT_OPTIONS,
  recommendTemplate,
  getTemplateDisplay,
  getNotifier,
} from '@gym/shared'
import { useCreateRoutineFromTemplate } from '../../hooks/useRoutines.js'
import { Modal, LoadingSpinner } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

const TOTAL_STEPS = 5

/**
 * Onboarding de primer uso: 4 preguntas → recomienda e instancia una plantilla,
 * la fija como favorita (para que aparezca en "Entrenamiento de hoy") y marca el flag.
 * Se monta solo cuando useOnboardingGate().shouldShow es true.
 */
function OnboardingWizard({ onComplete }) {
  const { t } = useTranslation()
  const createFromTemplate = useCreateRoutineFromTemplate()

  const [open, setOpen] = useState(true)
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState({ objetivo: '', diasPorSemana: '', nivelExperiencia: '', equipamiento: '' })
  const [selectedId, setSelectedId] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  const recommendedId = recommendTemplate(answers)
  const activeId = selectedId ?? recommendedId
  // La recomendada primero: es lo primero visible en el paso final, sin scroll.
  const orderedTemplates = [
    ...ROUTINE_TEMPLATES.filter(tpl => tpl.id === recommendedId),
    ...ROUTINE_TEMPLATES.filter(tpl => tpl.id !== recommendedId),
  ]
  const activeTemplate = ROUTINE_TEMPLATES.find(tpl => tpl.id === activeId)
  const requestedDays = Number(answers.diasPorSemana)
  const daysMismatch = activeTemplate && requestedDays > 0 && activeTemplate.daysPerWeek !== requestedDays

  const canNext =
    (step === 1 && answers.objetivo) ||
    (step === 2 && answers.diasPorSemana) ||
    (step === 3 && answers.nivelExperiencia) ||
    (step === 4 && answers.equipamiento)

  const finish = () => { onComplete(); setOpen(false) }

  const handleStart = async () => {
    const template = ROUTINE_TEMPLATES.find(tpl => tpl.id === activeId) || ROUTINE_TEMPLATES[0]
    setIsCreating(true)
    try {
      await createFromTemplate.mutateAsync({ template, t })
      finish()
    } catch {
      getNotifier()?.show(t('common:import.importError'), 'error')
      setIsCreating(false)
    }
  }

  const GOALS = GOAL_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))
  const LEVELS = LEVEL_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey), desc: t(o.descKey) }))
  const EQUIPMENTS = EQUIPMENT_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey), desc: t(o.descKey) }))

  return (
    <Modal isOpen={open} onClose={finish} position="bottom" maxWidth="max-w-lg" noBorder>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '85vh' }}>
        {/* Top row: back + skip */}
        <div className="flex items-center justify-between">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 hover:opacity-80"
              style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 500 }}>
              <ChevronLeft size={18} /> {t('common:buttons.back')}
            </button>
          ) : <span />}
          <button onClick={finish} className="hover:opacity-80"
            style={{ color: colors.textMuted, fontSize: 13, fontWeight: 500 }}>
            {t('routine:onboarding.skip')}
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(i => (
            <div key={i} className="w-2 h-2 rounded-full transition-colors"
              style={{ backgroundColor: i <= step ? colors.success : colors.border }} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
          {step === 1 && (
            <>
              <div>
                <h3 style={{ color: colors.textPrimary, fontSize: 20, fontWeight: 700 }}>{t('routine:onboarding.welcomeTitle')}</h3>
                <p style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{t('routine:onboarding.welcomeSubtitle')}</p>
              </div>
              <p style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600, marginTop: 4 }}>{t('routine:chatbot.goalQuestion')}</p>
              <div className="flex flex-wrap gap-2">
                {GOALS.map(g => (
                  <button key={g.value} onClick={() => setAnswers(a => ({ ...a, objetivo: g.value }))}
                    className="px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{ backgroundColor: answers.objetivo === g.value ? colors.successBg : colors.bgTertiary, border: `1px solid ${answers.objetivo === g.value ? colors.success : colors.border}`, color: answers.objetivo === g.value ? colors.success : colors.textPrimary }}>
                    {g.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>{t('routine:chatbot.daysPerWeek')}</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button key={n} onClick={() => setAnswers(a => ({ ...a, diasPorSemana: String(n) }))}
                    className="w-10 h-10 rounded-lg text-sm font-semibold transition-colors"
                    style={{ backgroundColor: answers.diasPorSemana === String(n) ? colors.successBg : colors.bgTertiary, border: `1px solid ${answers.diasPorSemana === String(n) ? colors.success : colors.border}`, color: answers.diasPorSemana === String(n) ? colors.success : colors.textPrimary }}>
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>{t('routine:chatbot.experience')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {LEVELS.map(lvl => (
                  <button key={lvl.value} onClick={() => setAnswers(a => ({ ...a, nivelExperiencia: lvl.value }))}
                    className="w-full text-left rounded-xl transition-all"
                    style={{ padding: '12px 16px', backgroundColor: colors.bgSecondary, border: `1px solid ${answers.nivelExperiencia === lvl.value ? colors.success : colors.border}` }}>
                    <div className="flex items-center justify-between">
                      <span style={{ color: answers.nivelExperiencia === lvl.value ? colors.success : colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{lvl.label}</span>
                      <span style={{ color: colors.textMuted, fontSize: 11 }}>{lvl.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 600 }}>{t('routine:onboarding.equipmentQuestion')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {EQUIPMENTS.map(eq => (
                  <button key={eq.value} onClick={() => setAnswers(a => ({ ...a, equipamiento: eq.value }))}
                    className="w-full text-left rounded-xl transition-all"
                    style={{ padding: '12px 16px', backgroundColor: colors.bgSecondary, border: `1px solid ${answers.equipamiento === eq.value ? colors.success : colors.border}` }}>
                    <div className="flex items-center justify-between">
                      <span style={{ color: answers.equipamiento === eq.value ? colors.success : colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{eq.label}</span>
                      <span style={{ color: colors.textMuted, fontSize: 11 }}>{eq.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div>
                <h3 style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700 }}>{t('routine:onboarding.recommendedTitle')}</h3>
                <p style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{t('routine:onboarding.recommendedSubtitle')}</p>
              </div>
              {daysMismatch && (
                <div className="flex items-start gap-2 rounded-lg" style={{ padding: '10px 12px', backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}>
                  <Info size={14} color={colors.textMuted} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {t('routine:onboarding.daysNote', { requested: requestedDays, actual: activeTemplate.daysPerWeek })}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orderedTemplates.map(template => {
                  const isSelected = activeId === template.id
                  const isRecommended = recommendedId === template.id
                  const { name, tags } = getTemplateDisplay(template, t)
                  return (
                    <button key={template.id} onClick={() => setSelectedId(template.id)}
                      className="w-full text-left rounded-xl transition-all"
                      style={{ padding: '14px 16px', backgroundColor: colors.bgSecondary, border: `1px solid ${isSelected ? colors.success : colors.border}` }}>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                          style={{ borderColor: isSelected ? colors.success : colors.border, backgroundColor: isSelected ? colors.success : 'transparent' }}>
                          {isSelected && <Check size={12} color={colors.bgPrimary} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{name}</span>
                            {isRecommended && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.successBg, color: colors.success, fontSize: 11, fontWeight: 600 }}>
                                <Sparkles size={10} /> {t('routine:onboarding.recommendedBadge')}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {tags.map(tag => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer action */}
        {step < TOTAL_STEPS ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {t('common:buttons.next')} <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleStart} disabled={isCreating}
            className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {t('routine:onboarding.start')}
          </button>
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ backgroundColor: colors.overlay }}>
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner />
            <span style={{ color: colors.textPrimary }}>{t('routine:onboarding.creating')}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default OnboardingWizard
