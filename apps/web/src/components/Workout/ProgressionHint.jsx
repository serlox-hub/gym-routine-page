import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Info, X } from 'lucide-react'
import { getProgressionLabel, getProgressionReason } from '@gym/shared'
import { Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

// Aviso de progresión por serie (issue #13): "↗ Sube el peso" / "↗ Sube el nivel" (direccional,
// sin cifra — el salto depende del equipo) a la vista + el porqué a un tap (ⓘ → modal). Qué se
// sube lo decide el campo progresable del ejercicio (issue #28), así que el texto sale de
// `getProgressionLabel`, no de una cadena fija. Es un item de la subfila compartida (SetRowMeta),
// que ya pone el margen y el padding; ver DECISIONS #13.
function ProgressionHint({ previousSet, target, targetField, trackedFields, distanceUnit }) {
  const { t } = useTranslation()
  const [showWhy, setShowWhy] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1.5">
        <TrendingUp size={12} style={{ color: colors.orange }} />
        <span className="text-xs font-semibold" style={{ color: colors.orange }}>
          {getProgressionLabel(trackedFields)}
        </span>
        <button
          onClick={() => setShowWhy(true)}
          aria-label={t('workout:progression.whyLabel')}
          className="inline-flex hover:opacity-80"
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <Info size={12} style={{ color: colors.textMuted }} />
        </button>
      </div>

      <Modal isOpen={showWhy} onClose={() => setShowWhy(false)} className="rounded-xl p-4" noBorder>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold" style={{ color: colors.textPrimary }}>{t('workout:progression.title')}</h3>
          <button
            onClick={() => setShowWhy(false)}
            aria-label={t('common:buttons.close')}
            className="inline-flex hover:opacity-80"
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: colors.textSecondary }}
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          {getProgressionReason({ previousSet, target, trackedFields, targetField, distanceUnit })}
        </p>
        <button
          onClick={() => setShowWhy(false)}
          className="w-full mt-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
        >
          {t('common:buttons.close')}
        </button>
      </Modal>
    </>
  )
}

export default ProgressionHint
