import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button } from '@/components/ui'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: '#30363d' }} />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2" style={{ backgroundColor: '#161b22', color: '#8b949e' }}>
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
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>

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
