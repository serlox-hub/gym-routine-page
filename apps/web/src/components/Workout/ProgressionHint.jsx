import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Info, X } from 'lucide-react'
import { getProgressionLabel, getProgressionReason } from '@gym/shared'
import { IconButton, Modal } from '../ui/index.js'
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
      {/* -my-2: the 44px box takes the subrow's padding (see SetRowMeta). */}
      <div className="flex items-center gap-1.5 -my-2">
        <TrendingUp size={12} style={{ color: colors.orange }} />
        <span className="text-xs font-semibold" style={{ color: colors.orange }}>
          {getProgressionLabel(trackedFields)}
        </span>
        {/* -ml-3: the box overlaps its own label, not a neighbour, so the icon stays next to the
            text. */}
        <IconButton
          icon={Info}
          iconSize={12}
          color={colors.textMuted}
          label={t('workout:progression.whyLabel')}
          onClick={() => setShowWhy(true)}
          className="-ml-3"
        />
      </div>

      <Modal isOpen={showWhy} onClose={() => setShowWhy(false)} className="rounded-xl p-4" noBorder>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold" style={{ color: colors.textPrimary }}>{t('workout:progression.title')}</h3>
          <IconButton icon={X} iconSize={16} label={t('common:buttons.close')} onClick={() => setShowWhy(false)} />
        </div>
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          {getProgressionReason({ previousSet, target, trackedFields, targetField, distanceUnit })}
        </p>
        <button
          onClick={() => setShowWhy(false)}
          className="w-full min-h-11 mt-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
        >
          {t('common:buttons.close')}
        </button>
      </Modal>
    </>
  )
}

export default ProgressionHint
