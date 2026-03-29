import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button, Input } from '@/components/ui'
import { colors } from '../lib/styles.js'

function ForgotPassword() {
  const { t } = useTranslation()
  const { resetPassword, isLoading, error, clearError, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('auth:forgotPassword.openedInTab')}</h1>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            {t('auth:forgotPassword.continueInTab')}
          </p>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {t('auth:forgotPassword.canCloseTab')}
          </p>
        </Card>
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
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('auth:forgotPassword.checkEmail')}</h1>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            {t('auth:forgotPassword.success', { email })}
          </p>
          <Link to="/login">
            <Button className="w-full">{t('auth:forgotPassword.backToLogin')}</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center mb-2">{t('auth:forgotPassword.title')}</h1>
        <p className="text-center mb-6" style={{ color: colors.textSecondary }}>
          {t('auth:forgotPassword.description')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label={t('auth:login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
          />

          {displayError && (
            <p className="text-sm text-center" style={{ color: colors.danger }}>
              {displayError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? t('common:buttons.loading') : t('auth:forgotPassword.submit')}
          </Button>
        </form>

        <p className="text-center mt-4 text-sm" style={{ color: colors.textSecondary }}>
          <Link to="/login" className="hover:underline" style={{ color: colors.accent }}>
            {t('auth:forgotPassword.backToLogin')}
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default ForgotPassword
