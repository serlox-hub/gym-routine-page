import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button } from '@/components/ui'

function Signup() {
  const navigate = useNavigate()
  const { signup, isLoading, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!email || !password || !confirmPassword) {
      setLocalError('Por favor completa todos los campos')
      return
    }

    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden')
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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0d1117' }}>
        <Card className="w-full max-w-md p-6 text-center">
          <div className="mb-4 text-4xl">✓</div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#3fb950' }}>Registro exitoso</h1>
          <p className="mb-6" style={{ color: '#8b949e' }}>
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0d1117' }}>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Crear Cuenta</h1>

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

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: '#c9d1d9' }}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                color: '#c9d1d9'
              }}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1" style={{ color: '#c9d1d9' }}>
              Confirmar Contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                color: '#c9d1d9'
              }}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
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
            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </form>

        <p className="text-center mt-4 text-sm" style={{ color: '#8b949e' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="hover:underline" style={{ color: '#58a6ff' }}>
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default Signup
