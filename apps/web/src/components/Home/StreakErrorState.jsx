import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { colors } from '../../lib/styles.js'

// Sustituye lo que la tarjeta de racha no puede afirmar tras un fallo de red (issue #98): unas
// barras vacías o el banner de configurar objetivo se leerían como datos reales.
function StreakErrorState({ onRetry }) {
  const { t } = useTranslation()

  return (
    <div
      className="flex items-center"
      style={{ backgroundColor: colors.bgTertiary, borderRadius: 12, padding: '12px 14px', gap: 12 }}
    >
      <AlertCircle size={20} style={{ color: colors.danger }} />
      <span className="flex-1" style={{ color: colors.textSecondary, fontSize: 13 }}>
        {t('common:home.streakLoadError')}
      </span>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-80"
        style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
      >
        {t('common:buttons.retry')}
      </button>
    </div>
  )
}

export default StreakErrorState
