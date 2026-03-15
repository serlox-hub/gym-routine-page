import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button, Input } from '@/components/ui'
import { validateSignupForm } from '../lib/validation.js'
import { colors } from '../lib/styles.js'

function Signup() {
  const navigate = useNavigate()
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
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-4 text-4xl">✓</div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: colors.success }}>Registro exitoso</h1>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Ir a Iniciar Sesión
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Crear Cuenta</h1>

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

          <Input
            id="password"
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />

          <Input
            id="confirmPassword"
            label="Confirmar Contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
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
            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: colors.border }} />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2" style={{ backgroundColor: colors.bgSecondary, color: colors.textSecondary }}>
              o continúa con
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full flex items-center justify-center gap-2"
          onClick={loginWithGoogle}
          disabled={isLoading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </Button>

        <p className="text-center mt-4 text-sm" style={{ color: colors.textSecondary }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="hover:underline" style={{ color: colors.accent }}>
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default Signup
