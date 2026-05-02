import { useTranslation } from 'react-i18next'
import { BarChart3 } from 'lucide-react'
import { colors } from '../../lib/styles.js'

function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="py-8" style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} color={colors.success} />
          <span className="text-sm font-semibold" style={{ color: colors.textSecondary }}>{t('common:appName')}</span>
        </div>
        <p className="text-xs" style={{ color: colors.textMuted }}>
          © {new Date().getFullYear()} {t('common:appName')}. {t('landing:footer.rights')}
        </p>
      </div>
    </footer>
  )
}

export default Footer
