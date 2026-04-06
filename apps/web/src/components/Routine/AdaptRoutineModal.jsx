import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '../ui/index.js'
import { buildAdaptRoutinePrompt, getNotifier } from '@gym/shared'
import { colors } from '../../lib/styles.js'

function AdaptRoutineModal({ onClose, onImportClick }) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState(false)
  const adaptPrompt = buildAdaptRoutinePrompt()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(adaptPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      getNotifier()?.show(t('common:errors.copyError'), 'error')
    }
  }

  const steps = [
    {
      title: t('routine:adapt.step1Title'),
      content: (
        <div className="space-y-3">
          <p style={{ color: colors.textSecondary }}>
            {t('routine:adapt.step1Desc')}
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: colors.textSecondary }}>
            {t('routine:adapt.step1Sources', { returnObjects: true }).map((src, i) => (
              <li key={i}>{src}</li>
            ))}
          </ul>
          <div
            className="p-3 rounded-lg text-sm"
            style={{ backgroundColor: colors.bgPrimary, border: `1px solid ${colors.border}` }}
          >
            <p className="font-medium mb-2" style={{ color: colors.textPrimary }}>{t('routine:adapt.step1ExampleTitle')}</p>
            <pre className="text-xs whitespace-pre-wrap" style={{ color: colors.textSecondary }}>
{`Día 1 - Push
- Press banca: 4x8-10, RIR 2
- Press inclinado: 3x10-12
- Aperturas: 3x12-15
...`}
            </pre>
          </div>
        </div>
      )
    },
    {
      title: t('routine:adapt.step2Title'),
      content: (
        <div className="space-y-3">
          <p style={{ color: colors.textSecondary }}>
            {t('routine:adapt.step2Desc')}
          </p>
          <div
            className="p-3 rounded-lg text-xs font-mono max-h-40 overflow-y-auto"
            style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}
          >
            {adaptPrompt.slice(0, 400)}...
          </div>
          <Button
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleCopy}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? t('common:errors.copySuccess') : t('routine:chatbot.copyPrompt')}
          </Button>
          <div
            className="p-3 rounded-lg text-sm"
            style={{ backgroundColor: colors.purpleAccentBg, border: `1px solid ${colors.purpleAccent}` }}
          >
            <p style={{ color: colors.purpleAccent }}>
              {t('routine:adapt.step2Hint')}
            </p>
          </div>
        </div>
      )
    },
    {
      title: t('routine:adapt.step3Title'),
      content: (
        <div className="space-y-3">
          <p style={{ color: colors.textSecondary }}>
            {t('routine:adapt.step3Desc')}
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm" style={{ color: colors.textSecondary }}>
            <li dangerouslySetInnerHTML={{ __html: t('routine:adapt.step3Instruction1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('routine:adapt.step3Instruction2') }} />
          </ol>
          <div className="grid grid-cols-3 gap-2">
            <a
              href="https://chat.openai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg text-center text-sm hover:opacity-80 transition-opacity"
              style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
            >
              ChatGPT
            </a>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg text-center text-sm hover:opacity-80 transition-opacity"
              style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
            >
              Claude
            </a>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg text-center text-sm hover:opacity-80 transition-opacity"
              style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
            >
              Gemini
            </a>
          </div>
          <div
            className="p-3 rounded-lg text-sm"
            style={{ backgroundColor: 'rgba(46, 160, 67, 0.1)', border: `1px solid ${colors.success}` }}
          >
            <p style={{ color: colors.success }}>
              {t('routine:adapt.step3Result')}
            </p>
          </div>
        </div>
      )
    },
    {
      title: t('routine:adapt.step4Title'),
      content: (
        <div className="space-y-3">
          <p style={{ color: colors.textSecondary }}>
            {t('routine:adapt.step4Desc')}
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: colors.textSecondary }}>
            {t('routine:adapt.step4Instructions', { returnObjects: true }).map((instr, i) => (
              <li key={i}>{instr}</li>
            ))}
          </ol>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              onClose()
              onImportClick()
            }}
          >
            {t('routine:adapt.pasteResult')}
          </Button>
        </div>
      )
    }
  ]

  const currentStep = steps[step - 1]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: colors.overlay }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] rounded-lg flex flex-col"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
          <h3 className="font-semibold" style={{ color: colors.textPrimary }}>
            {t('routine:adapt.title')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-80"
            style={{ color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  backgroundColor: i === step ? colors.accent : colors.border,
                }}
              />
            ))}
          </div>

          <h4 className="font-medium mb-3" style={{ color: colors.textPrimary }}>
            {currentStep.title}
          </h4>
          {currentStep.content}
        </div>

        <div className="p-4 border-t flex justify-between" style={{ borderColor: colors.border }}>
          <Button
            variant="secondary"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            {t('common:buttons.back')}
          </Button>
          {step < 4 ? (
            <Button
              variant="primary"
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1"
            >
              {t('common:buttons.next')}
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={onClose}
            >
              {t('common:buttons.close')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdaptRoutineModal
