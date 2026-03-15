import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { validateResetPasswordForm } from '@gym/shared'
import { Card, Button, Input } from '@/components/ui'
import { colors } from '../lib/styles.js'

function ResetPassword() {
  const navigate = useNavigate()
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
          <h1 className="text-2xl font-bold mb-4">Contraseña actualizada</h1>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            Tu contraseña ha sido actualizada correctamente.
          </p>
          <Button className="w-full" onClick={() => navigate('/')}>
            Ir al inicio
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center mb-2">Nueva contraseña</h1>
        <p className="text-center mb-6" style={{ color: colors.textSecondary }}>
          Ingresa tu nueva contraseña
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="password"
            label="Nueva contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />

          <Input
            id="confirmPassword"
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
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
            {isLoading ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default ResetPassword
