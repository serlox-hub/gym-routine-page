import { useTranslation } from 'react-i18next'
import { Check, Smartphone, Share, MoreVertical } from 'lucide-react'
import { Card } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function InstallAppSection() {
  const { t } = useTranslation()
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true

  if (isStandalone) {
    return (
      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
          {t('common:preferences.app')}
        </h2>
        <div className="flex items-center gap-2">
          <Check size={16} style={{ color: colors.success }} />
          <p className="text-sm" style={{ color: colors.textPrimary }}>
            {t('common:preferences.appInstalled')}
          </p>
        </div>
      </Card>
    )
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
        {t('common:preferences.app')}
      </h2>
      <div className="flex items-start gap-3">
        <Smartphone size={20} style={{ color: colors.accent }} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            {t('common:preferences.addToHome')}
          </p>
          <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
            {t('common:preferences.addToHomeDesc')}
          </p>
          {isIOS ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Share size={14} style={{ color: colors.textSecondary }} />
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  {t('common:preferences.iosTap')} <strong>{t('common:buttons.share')}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: colors.textSecondary }}>→</span>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  {t('common:preferences.selectAddToHome')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MoreVertical size={14} style={{ color: colors.textSecondary }} />
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  {t('common:preferences.androidTap')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: colors.textSecondary }}>→</span>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  {t('common:preferences.androidInstall')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default InstallAppSection
