import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button } from '@/components/ui'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth()

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
      setLocalError('Por favor completa todos los campos')
      return
    }

    const result = await login(email, password)
    if (result.success) {
      navigate(from, { replace: true })
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0d1117' }}>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Iniciar Sesión</h1>

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
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <div className="text-right mt-1">
              <Link to="/forgot-password" className="text-sm hover:underline" style={{ color: '#58a6ff' }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
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
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center mt-4 text-sm" style={{ color: '#8b949e' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/signup" className="hover:underline" style={{ color: '#58a6ff' }}>
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default Login
