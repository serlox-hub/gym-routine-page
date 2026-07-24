import { useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Check, Sparkles, Info } from 'lucide-react-native'
import {
  ROUTINE_TEMPLATES,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  EQUIPMENT_OPTIONS,
  recommendTemplate,
  getTemplateDisplay,
  getNotifier,
} from '@gym/shared'
import { useCreateRoutineFromTemplate } from '../../hooks/useRoutines'
import { Modal, LoadingSpinner } from '../ui'
import { colors } from '../../lib/styles'

const TOTAL_STEPS = 5

/**
 * Onboarding de primer uso (native): 4 preguntas → recomienda e instancia una plantilla,
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
    <Modal isOpen={open} onClose={finish} position="bottom">
      <View style={{ padding: 20, gap: 16, flexShrink: 1 }}>
        {/* Top row: back + skip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {step > 1 ? (
            <Pressable onPress={() => setStep(s => s - 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ChevronLeft size={18} color={colors.textPrimary} />
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>{t('common:buttons.back')}</Text>
            </Pressable>
          ) : <View />}
          <Pressable onPress={finish}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>{t('routine:onboarding.skip')}</Text>
          </Pressable>
        </View>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(i => (
            <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? colors.success : colors.border }} />
          ))}
        </View>

        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 12 }}>
          {step === 1 && (
            <>
              <View>
                <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>{t('routine:onboarding.welcomeTitle')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{t('routine:onboarding.welcomeSubtitle')}</Text>
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginTop: 4 }}>{t('routine:chatbot.goalQuestion')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GOALS.map(g => (
                  <Pressable key={g.value} onPress={() => setAnswers(a => ({ ...a, objetivo: g.value }))}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: answers.objetivo === g.value ? colors.successBg : colors.bgTertiary, borderWidth: 1, borderColor: answers.objetivo === g.value ? colors.success : colors.border }}>
                    <Text style={{ fontSize: 13, color: answers.objetivo === g.value ? colors.success : colors.textPrimary }}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{t('routine:chatbot.daysPerWeek')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <Pressable key={n} onPress={() => setAnswers(a => ({ ...a, diasPorSemana: String(n) }))}
                    style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: answers.diasPorSemana === String(n) ? colors.successBg : colors.bgTertiary, borderWidth: 1, borderColor: answers.diasPorSemana === String(n) ? colors.success : colors.border }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: answers.diasPorSemana === String(n) ? colors.success : colors.textPrimary }}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{t('routine:chatbot.experience')}</Text>
              <View style={{ gap: 8 }}>
                {LEVELS.map(lvl => (
                  <Pressable key={lvl.value} onPress={() => setAnswers(a => ({ ...a, nivelExperiencia: lvl.value }))}
                    style={{ padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: answers.nivelExperiencia === lvl.value ? colors.success : colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: answers.nivelExperiencia === lvl.value ? colors.success : colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{lvl.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{lvl.desc}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{t('routine:onboarding.equipmentQuestion')}</Text>
              <View style={{ gap: 8 }}>
                {EQUIPMENTS.map(eq => (
                  <Pressable key={eq.value} onPress={() => setAnswers(a => ({ ...a, equipamiento: eq.value }))}
                    style={{ padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: answers.equipamiento === eq.value ? colors.success : colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: answers.equipamiento === eq.value ? colors.success : colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{eq.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{eq.desc}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 5 && (
            <>
              <View>
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{t('routine:onboarding.recommendedTitle')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{t('routine:onboarding.recommendedSubtitle')}</Text>
              </View>
              {daysMismatch && (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}>
                  <Info size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>
                    {t('routine:onboarding.daysNote', { requested: requestedDays, actual: activeTemplate.daysPerWeek })}
                  </Text>
                </View>
              )}
              <View style={{ gap: 8 }}>
                {orderedTemplates.map(template => {
                  const isSelected = activeId === template.id
                  const isRecommended = recommendedId === template.id
                  const { name, tags } = getTemplateDisplay(template, t)
                  return (
                    <Pressable key={template.id} onPress={() => setSelectedId(template.id)}
                      style={{ padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: isSelected ? colors.success : colors.border }}>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginTop: 2, borderColor: isSelected ? colors.success : colors.border, backgroundColor: isSelected ? colors.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <Check size={12} color={colors.bgPrimary} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{name}</Text>
                            {isRecommended && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successBg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Sparkles size={10} color={colors.success} />
                                <Text style={{ color: colors.success, fontSize: 11, fontWeight: '600' }}>{t('routine:onboarding.recommendedBadge')}</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {tags.map(tag => (
                              <View key={tag} style={{ backgroundColor: colors.bgTertiary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer action */}
        {step < TOTAL_STEPS ? (
          <Pressable onPress={() => setStep(s => s + 1)} disabled={!canNext}
            style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: canNext ? 1 : 0.4 }}>
            <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.next')}</Text>
            <ChevronRight size={16} color={colors.bgPrimary} />
          </Pressable>
        ) : (
          <Pressable onPress={handleStart} disabled={isCreating}
            style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: isCreating ? 0.6 : 1 }}>
            <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:onboarding.start')}</Text>
          </Pressable>
        )}
      </View>

      {isCreating && (
        <View className="absolute inset-0 z-50 items-center justify-center" style={{ backgroundColor: colors.overlay }}>
          <LoadingSpinner fullScreen={false} />
          <Text style={{ color: colors.textPrimary, marginTop: 8 }}>{t('routine:onboarding.creating')}</Text>
        </View>
      )}
    </Modal>
  )
}

export default OnboardingWizard
