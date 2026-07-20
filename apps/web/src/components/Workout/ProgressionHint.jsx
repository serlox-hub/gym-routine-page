import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Info, X } from 'lucide-react'
import { Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

// Subfila de progresión por serie (issue #13): "↗ Sube el peso" (direccional, sin cifra —
// el salto depende del equipo) a la vista + el porqué a un tap (ⓘ → modal). Una línea para
// no cargar la fila; ver DECISIONS #13.
function ProgressionHint({ prevReps, repsTarget }) {
  const { t } = useTranslation()
  const [showWhy, setShowWhy] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1.5 mt-1 pl-1">
        <TrendingUp size={12} style={{ color: colors.orange }} />
        <span className="text-xs font-semibold" style={{ color: colors.orange }}>
          {t('workout:progression.increase')}
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
          {t('workout:progression.why', { reps: prevReps, range: repsTarget })}
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
