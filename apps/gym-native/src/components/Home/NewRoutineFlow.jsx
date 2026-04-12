import { useState, useRef, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, TextInput, Alert, Animated, Dimensions, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Sparkles, Pencil, LayoutGrid, Upload, ChevronRight, ChevronLeft, Lock, Check, Copy, FileText } from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as Clipboard from 'expo-clipboard'
import { File } from 'expo-file-system'
import { useUserId, useIsPremium } from '../../hooks/useAuth'
import { ImportOptionsModal, LoadingSpinner, Modal } from '../ui'
import { QUERY_KEYS, ROUTINE_TEMPLATES, importRoutine, buildChatbotPrompt, buildAdaptRoutinePrompt } from '@gym/shared'
import { useQueryClient } from '@tanstack/react-query'
import { colors } from '../../lib/styles'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ============================================
// MENU VIEW
// ============================================

function MenuView({ onNavigate, isPremium, navigation, t }) {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>{t('routine:new')}</Text>
      <View style={{ gap: 10 }}>
        <Pressable onPress={() => isPremium && onNavigate('chatbot')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: isPremium ? colors.success : colors.bgSecondary, borderWidth: 1, borderColor: isPremium ? colors.success : colors.border, opacity: isPremium ? 1 : 0.7 }}>
          <Sparkles size={20} color={isPremium ? colors.bgPrimary : colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: isPremium ? colors.bgPrimary : colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:newFlow.createWithAI')}</Text>
            <Text style={{ color: isPremium ? colors.bgPrimary : colors.textMuted, fontSize: 12, opacity: 0.8 }}>{t('routine:newFlow.createWithAIDesc')}</Text>
          </View>
          {!isPremium && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successBg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Lock size={10} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: 11, fontWeight: '600' }}>Premium</Text>
            </View>
          )}
          <ChevronRight size={18} color={isPremium ? colors.bgPrimary : colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => { onNavigate('close'); navigation.navigate('NewRoutine') }} className="active:opacity-70"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
          <Pencil size={20} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:newFlow.createManually')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:newFlow.createManuallyDesc')}</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => onNavigate('templates')} className="active:opacity-70"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
          <LayoutGrid size={20} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:newFlow.predefined')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:newFlow.predefinedDesc')}</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      <Pressable onPress={() => onNavigate('import')} className="active:opacity-70"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 8 }}>
        <Upload size={14} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('routine:newFlow.import')}</Text>
      </Pressable>
    </View>
  )
}

// ============================================
// TEMPLATES VIEW
// ============================================

function TemplatesView({ onSelect, t }) {
  const [selected, setSelected] = useState(null)
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, paddingHorizontal: 20, marginBottom: 12 }}>{t('routine:templates.selectHint')}</Text>
      <ScrollView style={{ flex: 1, maxHeight: 350 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {ROUTINE_TEMPLATES.map(template => {
          const isSelected = selected?.id === template.id
          const daysCount = template.data.routine.days.length
          return (
            <Pressable key={template.id} onPress={() => setSelected(template)}
              style={{ padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: isSelected ? colors.success : colors.border }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginTop: 2, borderColor: isSelected ? colors.success : colors.border, backgroundColor: isSelected ? colors.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {isSelected && <Check size={12} color={colors.bgPrimary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{template.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{template.description}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {template.tags.map(tag => (
                      <View key={tag} style={{ backgroundColor: colors.bgTertiary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{tag}</Text>
                      </View>
                    ))}
                    <View style={{ backgroundColor: colors.bgTertiary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{t('common:home.nDays', { count: daysCount })}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
      <View style={{ padding: 20 }}>
        <Pressable onPress={() => selected && onSelect(selected.data)} disabled={!selected}
          style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: selected ? 1 : 0.4 }}>
          <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:templates.use')}</Text>
        </Pressable>
      </View>
    </View>
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
    await Clipboard.setStringAsync(prompt)
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
    <View style={{ padding: 20, gap: 16 }}>

      {/* Progress dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {[1,2,3,4,5,6].map(i => (
          <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? colors.success : colors.border }} />
        ))}
      </View>

      <View style={{ gap: 12 }}>
      {step === 1 && (
        <>
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{t('routine:chatbot.goalQuestion')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GOALS.map(g => (
              <Pressable key={g.value} onPress={() => setForm(f => ({ ...f, objetivo: g.value, objetivoCustom: '' }))}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: form.objetivo === g.value ? colors.successBg : colors.bgTertiary, borderWidth: 1, borderColor: form.objetivo === g.value ? colors.success : colors.border }}>
                <Text style={{ fontSize: 13, color: form.objetivo === g.value ? colors.success : colors.textPrimary }}>{g.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setForm(f => ({ ...f, objetivo: 'custom' }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: form.objetivo === 'custom' ? colors.successBg : colors.bgTertiary, borderWidth: 1, borderColor: form.objetivo === 'custom' ? colors.success : colors.border }}>
              <Pencil size={12} color={form.objetivo === 'custom' ? colors.success : colors.textPrimary} />
              <Text style={{ fontSize: 13, color: form.objetivo === 'custom' ? colors.success : colors.textPrimary }}>{t('common:labels.other')}</Text>
            </Pressable>
          </View>
          {form.objetivo === 'custom' && (
            <TextInput value={form.objetivoCustom} onChangeText={text => setForm(f => ({ ...f, objetivoCustom: text }))}
              placeholder={t('routine:chatbot.customGoal')} placeholderTextColor={colors.textMuted} autoFocus
              style={{ color: colors.textPrimary, backgroundColor: colors.bgTertiary, borderRadius: 8, padding: 12, fontSize: 13, borderWidth: 1, borderColor: colors.border }} />
          )}
        </>
      )}

      {step === 2 && (
        <>
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 10 }}>{t('routine:chatbot.daysPerWeek')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1,2,3,4,5,6,7].map(n => (
                <Pressable key={n} onPress={() => setForm(f => ({ ...f, diasPorSemana: String(n) }))}
                  style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: form.diasPorSemana === String(n) ? colors.successBg : colors.bgTertiary, borderWidth: 1, borderColor: form.diasPorSemana === String(n) ? colors.success : colors.border }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: form.diasPorSemana === String(n) ? colors.success : colors.textPrimary }}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 10 }}>{t('routine:chatbot.duration')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <Pressable onPress={() => setForm(f => ({ ...f, duracionSesion: Math.max(15, f.duracionSesion - 15) }))}
                style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textPrimary, fontSize: 18 }}>−</Text>
              </Pressable>
              <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '700', minWidth: 100, textAlign: 'center' }}>{form.duracionSesion} min</Text>
              <Pressable onPress={() => setForm(f => ({ ...f, duracionSesion: Math.min(180, f.duracionSesion + 15) }))}
                style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textPrimary, fontSize: 18 }}>+</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{t('routine:chatbot.experience')}</Text>
          <View style={{ gap: 8 }}>
            {LEVELS.map(lvl => (
              <Pressable key={lvl.value} onPress={() => setForm(f => ({ ...f, nivelExperiencia: lvl.value }))}
                style={{ padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: form.nivelExperiencia === lvl.value ? colors.success : colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: form.nivelExperiencia === lvl.value ? colors.success : colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{lvl.label}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{lvl.desc}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {step === 4 && (
        <>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>{t('routine:chatbot.additionalNotes')} ({t('common:labels.optional')})</Text>
          <TextInput value={form.notas} onChangeText={text => setForm(f => ({ ...f, notas: text }))} multiline numberOfLines={3}
            placeholder={t('routine:chatbot.notesPlaceholder')} placeholderTextColor={colors.textMuted}
            style={{ color: colors.textPrimary, backgroundColor: colors.bgTertiary, borderRadius: 12, padding: 14, fontSize: 13, borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top', minHeight: 140 }} />
        </>
      )}

      {step === 5 && (
        <>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:chatbot.promptInstructions')}</Text>
          <TextInput value={prompt} editable={false} multiline scrollEnabled
            style={{ height: 200, backgroundColor: colors.bgPrimary, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, color: colors.textSecondary, fontSize: 11, fontFamily: 'monospace', textAlignVertical: 'top' }} />
        </>
      )}

      {step === 6 && (
        <>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:chatbot.pasteInstructions')}</Text>
          <TextInput value={jsonText} onChangeText={text => { setJsonText(text); setJsonError('') }}
            placeholder={t('routine:import.resultPlaceholder')} placeholderTextColor={colors.textMuted}
            multiline numberOfLines={6}
            style={{ color: colors.textPrimary, backgroundColor: colors.bgTertiary, borderRadius: 12, padding: 14, fontSize: 13, fontFamily: 'monospace', borderWidth: 1, borderColor: jsonError ? colors.danger : colors.border, textAlignVertical: 'top', minHeight: 140 }} />
          {jsonError ? <Text style={{ color: colors.danger, fontSize: 12 }}>{jsonError}</Text> : null}
        </>
      )}

      </View>

      {step === 5 && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[{ name: 'ChatGPT', url: 'https://chat.openai.com' }, { name: 'Claude', url: 'https://claude.ai' }, { name: 'Gemini', url: 'https://gemini.google.com' }].map(ai => (
            <Pressable key={ai.name} onPress={() => Linking.openURL(ai.url)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '500' }}>{ai.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Action button */}
      {step <= 4 ? (
        <Pressable onPress={() => setStep(s => s + 1)} disabled={!canNext}
          style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: canNext ? 1 : 0.4 }}>
          <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.next')}</Text>
        </Pressable>
      ) : step === 5 ? (
        <Pressable onPress={() => { handleCopy(); setStep(6) }}
          style={{ flexDirection: 'row', backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Copy size={16} color={colors.bgPrimary} />
          <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:chatbot.copyPrompt')}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => {
          setJsonError('')
          try {
            const data = JSON.parse(jsonText)
            if (!data?.routine?.name) throw new Error('invalid')
            onImport(data)
          } catch { setJsonError(t('common:import.invalidFormat')) }
        }} disabled={!jsonText.trim()}
          style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: jsonText.trim() ? 1 : 0.4 }}>
          <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.import')}</Text>
        </Pressable>
      )}
    </View>
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
    } catch { setError(t('common:import.invalidFormat')) }
  }

  if (mode === 'text') {
    return (
      <View style={{ padding: 20, gap: 12 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:import.pasteContent')}:</Text>
        <TextInput value={jsonText} onChangeText={text => { setJsonText(text); setError('') }}
          placeholder={t('routine:import.resultPlaceholder')} placeholderTextColor={colors.textMuted}
          multiline numberOfLines={8} autoFocus
          style={{ minHeight: 160, textAlignVertical: 'top', fontFamily: 'monospace', fontSize: 12, color: colors.textPrimary, backgroundColor: colors.bgPrimary, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: error ? colors.danger : colors.border }} />
        {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => { setMode(null); setJsonText(''); setError('') }}
            style={{ flex: 1, backgroundColor: colors.bgTertiary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '500' }}>{t('common:buttons.back')}</Text>
          </Pressable>
          <Pressable onPress={handleTextImport} disabled={!jsonText.trim()}
            style={{ flex: 1, backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: jsonText.trim() ? 1 : 0.4 }}>
            <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.import')}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={{ padding: 20, gap: 10 }}>
      <Pressable onPress={() => onNavigate('importFile')} className="active:opacity-70"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
        <Upload size={20} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:import.fromFile')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:import.fromFileDesc')}</Text>
        </View>
      </Pressable>
      <Pressable onPress={() => setMode('text')} className="active:opacity-70"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
        <FileText size={20} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:import.pasteText')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:import.pasteTextDesc')}</Text>
        </View>
      </Pressable>
      <Pressable onPress={() => onNavigate('adapt')} className="active:opacity-70"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
        <Sparkles size={20} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:import.fromExternal')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('routine:import.fromExternalDesc')}</Text>
        </View>
      </Pressable>
    </View>
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

  const handleFilePick = async () => {
    setIsReading(true)
    setError('')
    setParsedData(null)
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' })
      if (result.canceled) { setIsReading(false); return }
      const uri = result.assets[0].uri
      setFileName(result.assets[0].name)
      const file = new File(uri)
      const content = await file.text()
      const data = JSON.parse(content)
      if (!data?.routine?.name) throw new Error('invalid')
      setParsedData(data)
    } catch {
      setError(t('common:import.invalidFormat'))
    } finally {
      setIsReading(false)
    }
  }

  return (
    <View style={{ padding: 20, gap: 16, minHeight: 200 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:import.fileInstructions')}</Text>

      {!fileName ? (
        <Pressable onPress={handleFilePick} disabled={isReading}
          style={{ paddingVertical: 40, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', gap: 12, opacity: isReading ? 0.5 : 1 }}>
          <Upload size={24} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{isReading ? t('common:buttons.loading') : t('routine:import.tapToSelect')}</Text>
        </Pressable>
      ) : (
        <View style={{ borderRadius: 12, borderWidth: 2, borderColor: error ? colors.danger : parsedData ? colors.success : colors.border, backgroundColor: colors.bgSecondary, alignItems: 'center', gap: 12, paddingVertical: 32, paddingHorizontal: 16 }}>
          <FileText size={24} color={error ? colors.danger : parsedData ? colors.success : colors.textMuted} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>{fileName}</Text>
            {parsedData && <Text style={{ color: colors.success, fontSize: 12, marginTop: 4 }}>{parsedData.routine.name} — {parsedData.routine.days?.length || 0} {t('routine:chatbot.days')}</Text>}
            {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
          </View>
          <Pressable onPress={() => { setFileName(null); setParsedData(null); setError(''); handleFilePick() }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' }}>{t('common:buttons.change')}</Text>
          </Pressable>
        </View>
      )}

      <Pressable onPress={() => parsedData && onImport(parsedData)} disabled={!parsedData}
        style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: parsedData ? 1 : 0.4, marginTop: 'auto' }}>
        <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.import')}</Text>
      </Pressable>
    </View>
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
    await Clipboard.setStringAsync(adaptPrompt)
  }

  const MIN_HEIGHT = 380

  return (
    <View style={{ padding: 20, gap: 16, minHeight: MIN_HEIGHT, justifyContent: 'space-between' }}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {[1,2,3].map(i => (
            <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === step ? colors.success : colors.border }} />
          ))}
        </View>

        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '500' }}>
          {t(`routine:adapt.step${step}Title`)}
        </Text>

        {step === 1 && (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:adapt.step1Desc')}</Text>
            {t('routine:adapt.step1Sources', { returnObjects: true }).map((src, i) => (
              <Text key={i} style={{ color: colors.textSecondary, fontSize: 13 }}>{'\u2022'} {src}</Text>
            ))}
          </View>
        )}
        {step === 2 && (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:adapt.step2Desc')}</Text>
            <TextInput value={adaptPrompt} editable={false} multiline scrollEnabled
              style={{ height: 200, backgroundColor: colors.bgPrimary, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, color: colors.textSecondary, fontSize: 11, fontFamily: 'monospace', textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[{ label: 'ChatGPT', url: 'https://chat.openai.com' }, { label: 'Claude', url: 'https://claude.ai' }, { label: 'Gemini', url: 'https://gemini.google.com' }].map(link => (
                <Pressable key={link.label} onPress={() => Linking.openURL(link.url)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '500' }}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {step === 3 && (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('routine:adapt.step3Desc')}</Text>
            <TextInput value={jsonText} onChangeText={text => { setJsonText(text); setJsonError('') }}
              placeholder={t('routine:import.resultPlaceholder')} placeholderTextColor={colors.textMuted}
              multiline numberOfLines={6}
              style={{ minHeight: 140, textAlignVertical: 'top', fontFamily: 'monospace', fontSize: 12, color: colors.textPrimary, backgroundColor: colors.bgTertiary, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: jsonError ? colors.danger : colors.border }} />
            {jsonError ? <Text style={{ color: colors.danger, fontSize: 12 }}>{jsonError}</Text> : null}
          </View>
        )}
      </View>

      {step === 1 ? (
        <Pressable onPress={() => setStep(2)}
          style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.next')}</Text>
          <ChevronRight size={16} color={colors.bgPrimary} />
        </Pressable>
      ) : step === 2 ? (
        <Pressable onPress={() => { handleCopy(); setStep(3) }} style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('routine:chatbot.copyPrompt')}</Text>
        </Pressable>
      ) : step === 3 ? (
        <Pressable onPress={() => {
          setJsonError('')
          try {
            const data = JSON.parse(jsonText)
            if (!data?.routine?.name) throw new Error('invalid')
            onImport(data)
          } catch { setJsonError(t('common:import.invalidFormat')) }
        }} disabled={!jsonText.trim()}
          style={{ backgroundColor: colors.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: jsonText.trim() ? 1 : 0.4 }}>
          <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.import')}</Text>
        </Pressable>
      ) : null}
    </View>
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

function NewRoutineFlow({ isOpen, onClose, navigation }) {
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
  const slideAnim = useRef(new Animated.Value(0)).current

  const currentScreen = stack[stack.length - 1]
  const screenIndex = stack.length - 1

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: screenIndex, duration: 300, useNativeDriver: true }).start()
  }, [screenIndex, slideAnim])

  const push = (screen) => {
    if (screen === 'close') { handleClose(); return }
    setStack(s => [...s, screen])
  }

  const pop = () => {
    if (currentScreen === 'chatbot' && chatbotStep > 1) { setChatbotStep(s => s - 1); return }
    if (currentScreen === 'adapt' && adaptStep > 1) { setAdaptStep(s => s - 1); return }
    if (stack.length <= 1) { handleClose(); return }
    setStack(s => s.slice(0, -1))
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => { setStack(['menu']); slideAnim.setValue(0); setChatbotStep(1); setAdaptStep(1) }, 300)
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
      Alert.alert('Error', t('common:import.importError'))
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
      Alert.alert('Error', t('common:import.importError'))
    } finally {
      setIsImporting(false)
    }
  }

  const titleKey = SCREEN_TITLES[currentScreen]

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} position="bottom">
        {/* Header */}
        {titleKey && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <Pressable onPress={pop} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 }}>
              <ChevronLeft size={18} color={colors.textPrimary} />
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>{t('common:buttons.back')}</Text>
            </Pressable>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' }}>{t(titleKey)}</Text>
            <View style={{ minWidth: 70 }} />
          </View>
        )}

        {/* Carousel */}
        <View style={{ overflow: 'hidden' }}>
          <Animated.View style={{
            flexDirection: 'row',
            transform: [{ translateX: Animated.multiply(slideAnim, -SCREEN_WIDTH) }],
          }}>
            {stack.map((screen, i) => (
              <View key={`${screen}-${i}`} style={{ width: SCREEN_WIDTH }}>
                {screen === 'menu' && <MenuView onNavigate={push} isPremium={isPremium} navigation={navigation} t={t} />}
                {screen === 'templates' && <TemplatesView onSelect={handleTemplateSelect} t={t} />}
                {screen === 'chatbot' && <ChatbotView onImport={handleImport} step={chatbotStep} setStep={setChatbotStep} t={t} />}
                {screen === 'import' && <ImportView onImport={handleImport} onNavigate={push} t={t} />}
                {screen === 'importFile' && <ImportFileView onImport={handleImport} t={t} />}
                {screen === 'adapt' && <AdaptView onImport={handleImport} step={adaptStep} setStep={setAdaptStep} t={t} />}
              </View>
            ))}
          </Animated.View>
        </View>
      </Modal>

      <ImportOptionsModal
        isOpen={showImportOptions}
        onConfirm={handleImportConfirm}
        onCancel={() => { setShowImportOptions(false); setPendingImportData(null) }}
      />

      {isImporting && (
        <View className="absolute inset-0 z-50 items-center justify-center" style={{ backgroundColor: colors.overlay }}>
          <LoadingSpinner fullScreen={false} />
          <Text style={{ color: colors.textPrimary, marginTop: 8 }}>{t('common:import.importing')}</Text>
        </View>
      )}
    </>
  )
}

export default NewRoutineFlow
