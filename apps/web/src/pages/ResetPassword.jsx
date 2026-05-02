import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { validateResetPasswordForm } from '@gym/shared'
import { colors } from '../lib/styles.js'
import { Check } from 'lucide-react'

function ResetPassword() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const validation = validateResetPasswordForm({ password, confirmPassword })
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="w-full max-w-sm text-center" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.successBg }}>
            <Check size={24} color={colors.success} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>{t('auth:resetPassword.success')}</h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>{t('auth:resetPassword.successDescription')}</p>
          <button onClick={() => navigate('/')}
            className="w-full py-3.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {t('common:nav.home')}
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
            <h1 className="text-2xl font-bold mb-1" style={{ color: colors.textPrimary }}>{t('auth:resetPassword.title')}</h1>
            <p className="text-sm" style={{ color: colors.textMuted }}>{t('auth:resetPassword.description')}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t('auth:resetPassword.newPassword')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth:signup.minChars')} autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t('auth:resetPassword.confirmPassword')}</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth:resetPassword.confirmPassword')} autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }} />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: colors.danger }}>{error}</p>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {isLoading ? t('common:buttons.loading') : t('auth:resetPassword.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
