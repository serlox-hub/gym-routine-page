import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { validateResetPasswordForm } from '@/lib/validation'
import { Card, Button } from '@/components/ui'

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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0d1117' }}>
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Contraseña actualizada</h1>
          <p className="mb-6" style={{ color: '#8b949e' }}>
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0d1117' }}>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center mb-2">Nueva contraseña</h1>
        <p className="text-center mb-6" style={{ color: '#8b949e' }}>
          Ingresa tu nueva contraseña
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: '#c9d1d9' }}>
              Nueva contraseña
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
              Confirmar contraseña
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
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: '#f85149' }}>
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
