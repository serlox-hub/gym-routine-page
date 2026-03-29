import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { validateResetPasswordForm } from '@gym/shared'
import { Card, Button, Input } from '@/components/ui'
import { colors } from '../lib/styles.js'

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
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('auth:resetPassword.success')}</h1>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            {t('auth:resetPassword.successDescription')}
          </p>
          <Button className="w-full" onClick={() => navigate('/')}>
            {t('common:nav.home')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center mb-2">{t('auth:resetPassword.title')}</h1>
        <p className="text-center mb-6" style={{ color: colors.textSecondary }}>
          {t('auth:resetPassword.description')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="password"
            label={t('auth:resetPassword.newPassword')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth:signup.minChars')}
            autoComplete="new-password"
          />

          <Input
            id="confirmPassword"
            label={t('auth:resetPassword.confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('auth:resetPassword.confirmPassword')}
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-center" style={{ color: colors.danger }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? t('common:buttons.loading') : t('auth:resetPassword.submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default ResetPassword
