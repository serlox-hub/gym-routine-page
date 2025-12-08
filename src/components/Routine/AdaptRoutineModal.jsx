import { useState } from 'react'
import { Copy, Check, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '../ui/index.js'
import { buildAdaptRoutinePrompt } from '../../lib/routineIO.js'
import { colors } from '../../lib/styles.js'

function AdaptRoutineModal({ onClose, onImportClick }) {
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState(false)
  const adaptPrompt = buildAdaptRoutinePrompt()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(adaptPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Error al copiar')
    }
  }

  const steps = [
    {
      title: 'Paso 1: Prepara tu rutina',
      content: (
        <div className="space-y-3">
          <p style={{ color: colors.textSecondary }}>
            Copia tu rutina actual en formato texto. Puede ser desde:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: colors.textSecondary }}>
            <li>Una hoja de cálculo (Excel, Google Sheets)</li>
            <li>Un PDF o documento</li>
            <li>Notas de tu móvil</li>
            <li>Una app de entrenamiento</li>
            <li>Un mensaje o email de tu entrenador</li>
          </ul>
          <div
            className="p-3 rounded-lg text-sm"
            style={{ backgroundColor: colors.bgPrimary, border: `1px solid ${colors.border}` }}
          >
            <p className="font-medium mb-2" style={{ color: colors.textPrimary }}>Ejemplo de formato:</p>
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
      title: 'Paso 2: Copia el prompt',
      content: (
        <div className="space-y-3">
          <p style={{ color: colors.textSecondary }}>
            Este prompt le dice a la IA cómo convertir tu rutina al formato correcto:
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
            {copied ? 'Copiado' : 'Copiar prompt completo'}
          </Button>
          <div
            className="p-3 rounded-lg text-sm"
            style={{ backgroundColor: 'rgba(136, 87, 229, 0.1)', border: `1px solid #8957e5` }}
          >
            <p style={{ color: '#8957e5' }}>
              El prompt termina con "MI RUTINA A CONVERTIR:" — ahí es donde pegarás tu rutina en el siguiente paso
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Paso 3: Pega prompt + rutina en la IA',
      content: (
        <div className="space-y-3">
          <p style={{ color: colors.textSecondary }}>
            Abre tu chatbot favorito y pega:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm" style={{ color: colors.textSecondary }}>
            <li>Primero el <strong style={{ color: colors.textPrimary }}>prompt</strong> que copiaste</li>
            <li>Después <strong style={{ color: colors.textPrimary }}>tu rutina</strong> (del paso 1)</li>
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
              La IA te devolverá un JSON. Cópialo para pegarlo en el siguiente paso.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Paso 4: Pega el resultado',
      content: (
        <div className="space-y-3">
          <p style={{ color: colors.textSecondary }}>
            Una vez tengas el JSON generado por la IA:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: colors.textSecondary }}>
            <li>Copia el JSON que te devolvió la IA</li>
            <li>Pulsa el botón de abajo</li>
            <li>Pega el JSON en el campo de texto</li>
          </ol>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              onClose()
              onImportClick()
            }}
          >
            Pegar JSON
          </Button>
        </div>
      )
    }
  ]

  const currentStep = steps[step - 1]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] rounded-lg flex flex-col"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
          <h3 className="font-semibold" style={{ color: colors.textPrimary }}>
            Adaptar rutina existente
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
          {/* Progress indicator */}
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
            Anterior
          </Button>
          {step < 4 ? (
            <Button
              variant="primary"
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1"
            >
              Siguiente
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cerrar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdaptRoutineModal
