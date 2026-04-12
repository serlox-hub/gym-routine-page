import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '../lib/styles.js'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { login, loginWithGoogle, isLoading, error, clearError, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!email || !password) {
      setLocalError(t('auth:login.fillAllFields'))
      return
    }

    const result = await login(email, password)
    if (result.success) {
      navigate(from, { replace: true })
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
      <div className="w-full max-w-sm" style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>

        {/* Logo + Welcome */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="rounded-2xl overflow-hidden" style={{ width: 64, height: 64, backgroundColor: colors.bgTertiary }}>
            <img src="/icon-192.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1" style={{ color: colors.textPrimary }}>{t('auth:login.welcome')}</h1>
            <p className="text-sm" style={{ color: colors.textMuted }}>{t('auth:login.subtitle')}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
              {t('auth:login.email')}
            </label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" autoComplete="email"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
              {t('auth:login.password')}
            </label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }}
            />
            <div className="text-right mt-1.5">
              <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: colors.success }}>
                {t('auth:login.forgotPassword')}
              </Link>
            </div>
          </div>

          {displayError && (
            <p className="text-xs text-center" style={{ color: colors.danger }}>{displayError}</p>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {isLoading ? t('common:buttons.loading') : t('auth:login.submit')}
          </button>
        </form>

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

        {/* Sign up link */}
        <p className="text-xs" style={{ color: colors.textMuted }}>
          {t('auth:login.noAccount')}{' '}
          <Link to="/signup" className="hover:underline font-semibold" style={{ color: colors.success }}>
            {t('auth:login.createAccount')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
