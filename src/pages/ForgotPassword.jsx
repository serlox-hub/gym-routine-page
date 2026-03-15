import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button, Input } from '@/components/ui'
import { colors } from '../lib/styles.js'

function ForgotPassword() {
  const { resetPassword, isLoading, error, clearError, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Enlace abierto en otra pestaña</h1>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            Continúa el proceso de cambio de contraseña en la pestaña que se abrió con el enlace del correo.
          </p>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Puedes cerrar esta pestaña.
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
      setLocalError('Por favor ingresa tu email')
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
          <h1 className="text-2xl font-bold mb-4">Revisa tu email</h1>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            Te hemos enviado un enlace para restablecer tu contraseña a <strong style={{ color: '#c9d1d9' }}>{email}</strong>
          </p>
          <Link to="/login">
            <Button className="w-full">Volver al inicio de sesión</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center mb-2">Recuperar contraseña</h1>
        <p className="text-center mb-6" style={{ color: colors.textSecondary }}>
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
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
            {isLoading ? 'Enviando...' : 'Enviar enlace'}
          </Button>
        </form>

        <p className="text-center mt-4 text-sm" style={{ color: colors.textSecondary }}>
          <Link to="/login" className="hover:underline" style={{ color: colors.accent }}>
            Volver al inicio de sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default ForgotPassword
