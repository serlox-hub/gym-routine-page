import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '../lib/styles.js'
import { Check } from 'lucide-react'

function ForgotPassword() {
  const { t } = useTranslation()
  const { resetPassword, isLoading, error, clearError, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="w-full max-w-sm text-center" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>{t('auth:forgotPassword.openedInTab')}</h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>{t('auth:forgotPassword.continueInTab')}</p>
          <p className="text-xs" style={{ color: colors.textMuted }}>{t('auth:forgotPassword.canCloseTab')}</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!email) {
      setLocalError(t('auth:forgotPassword.enterEmail'))
      return
    }

    const result = await resetPassword(email)
    if (result.success) {
      setSuccess(true)
    }
  }

  const displayError = localError || error

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="w-full max-w-sm text-center" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.successBg }}>
            <Check size={24} color={colors.success} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>{t('auth:forgotPassword.checkEmail')}</h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>{t('auth:forgotPassword.success', { email })}</p>
          <Link to="/login" className="w-full">
            <button className="w-full py-3.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
              {t('auth:forgotPassword.backToLogin')}
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
      <div className="w-full max-w-sm" style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>

        {/* Logo + Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="rounded-2xl overflow-hidden" style={{ width: 64, height: 64, backgroundColor: colors.bgTertiary }}>
            <img src="/icon-192.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1" style={{ color: colors.textPrimary }}>{t('auth:forgotPassword.title')}</h1>
            <p className="text-sm" style={{ color: colors.textMuted }}>{t('auth:forgotPassword.description')}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t('auth:login.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" autoComplete="email"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }} />
          </div>

          {displayError && (
            <p className="text-xs text-center" style={{ color: colors.danger }}>{displayError}</p>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {isLoading ? t('common:buttons.loading') : t('auth:forgotPassword.submit')}
          </button>
        </form>

        <p className="text-xs">
          <Link to="/login" className="hover:underline" style={{ color: colors.success }}>
            {t('auth:forgotPassword.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
