import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { validateSignupForm } from '@gym/shared'
import { colors } from '../lib/styles.js'
import { Check } from 'lucide-react'

function Signup() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { signup, loginWithGoogle, isLoading, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    const validation = validateSignupForm({ email, password, confirmPassword })
    if (!validation.valid) {
      setLocalError(validation.error)
      return
    }

    const result = await signup(email, password)
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
          <h1 className="text-xl font-bold" style={{ color: colors.success }}>{t('auth:signup.success')}</h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>{t('auth:signup.checkEmail')}</p>
          <button onClick={() => navigate('/login')}
            className="w-full py-3.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {t('auth:login.title')}
          </button>
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
            <h1 className="text-2xl font-bold mb-1" style={{ color: colors.textPrimary }}>{t('auth:signup.title')}</h1>
            <p className="text-sm" style={{ color: colors.textMuted }}>{t('auth:signup.subtitle')}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t('auth:signup.email')}</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" autoComplete="email"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t('auth:signup.password')}</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth:signup.minChars')} autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t('auth:signup.confirmPassword')}</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth:signup.confirmPassword')} autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }} />
          </div>

          {displayError && (
            <p className="text-xs text-center" style={{ color: colors.danger }}>{displayError}</p>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {isLoading ? t('common:buttons.loading') : t('auth:signup.submit')}
          </button>
        </form>

        {/* Terms */}
        <p className="text-xs text-center" style={{ color: colors.textMuted }}>{t('auth:signup.terms')}</p>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
          <span className="text-xs" style={{ color: colors.textMuted }}>{t('auth:login.orContinueWith')}</span>
          <div className="flex-1 h-px" style={{ backgroundColor: colors.border }} />
        </div>

        {/* Google */}
        <button type="button" onClick={loginWithGoogle} disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }}>
          <span className="font-bold">G</span>
          {t('auth:login.google')}
        </button>

        {/* Login link */}
        <p className="text-xs" style={{ color: colors.textMuted }}>
          {t('auth:signup.hasAccount')}{' '}
          <Link to="/login" className="hover:underline font-semibold" style={{ color: colors.success }}>
            {t('auth:signup.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
