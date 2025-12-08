import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button } from '@/components/ui'

function ForgotPassword() {
  const { resetPassword, isLoading, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0d1117' }}>
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Revisa tu email</h1>
          <p className="mb-6" style={{ color: '#8b949e' }}>
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0d1117' }}>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center mb-2">Recuperar contraseña</h1>
        <p className="text-center mb-6" style={{ color: '#8b949e' }}>
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: '#c9d1d9' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                color: '#c9d1d9'
              }}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          {displayError && (
            <p className="text-sm text-center" style={{ color: '#f85149' }}>
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

        <p className="text-center mt-4 text-sm" style={{ color: '#8b949e' }}>
          <Link to="/login" className="hover:underline" style={{ color: '#58a6ff' }}>
            Volver al inicio de sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default ForgotPassword
