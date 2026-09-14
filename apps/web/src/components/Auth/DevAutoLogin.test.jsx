import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth.js'
import DevAutoLogin from './DevAutoLogin.jsx'

// Solo mockeamos el hook, no el módulo compartido entero: DevAutoLogin usa useAuth() directamente.
vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

const LOCAL_URL = 'http://127.0.0.1:54321'
const LAN_URL = 'http://192.168.1.134:54331'
const REMOTE_URL = 'https://eeaczfpmkahizwvaibyn.supabase.co'

describe('DevAutoLogin', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogin.mockResolvedValue({ success: true })
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, login: mockLogin })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('no llama a login cuando VITE_DEV_AUTOLOGIN no está definida, aunque el resto de condiciones se cumplan', () => {
    vi.stubEnv('VITE_DEV_AUTOLOGIN', '')
    vi.stubEnv('VITE_SUPABASE_URL', LOCAL_URL)

    render(<DevAutoLogin />)

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('no llama a login cuando VITE_DEV_AUTOLOGIN es "false", aunque el resto de condiciones se cumplan', () => {
    vi.stubEnv('VITE_DEV_AUTOLOGIN', 'false')
    vi.stubEnv('VITE_SUPABASE_URL', LOCAL_URL)

    render(<DevAutoLogin />)

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('llama a login con las credenciales de seed cuando el flag está activo y la URL es local', () => {
    vi.stubEnv('VITE_DEV_AUTOLOGIN', 'true')
    vi.stubEnv('VITE_SUPABASE_URL', LOCAL_URL)

    render(<DevAutoLogin />)

    expect(mockLogin).toHaveBeenCalledTimes(1)
    expect(mockLogin).toHaveBeenCalledWith('e2e@local.test', 'e2e-local-password')
  })

  it('llama a login con las credenciales de seed cuando el flag está activo y la URL es de LAN', () => {
    vi.stubEnv('VITE_DEV_AUTOLOGIN', 'true')
    vi.stubEnv('VITE_SUPABASE_URL', LAN_URL)

    render(<DevAutoLogin />)

    expect(mockLogin).toHaveBeenCalledTimes(1)
    expect(mockLogin).toHaveBeenCalledWith('e2e@local.test', 'e2e-local-password')
  })

  it('no llama a login cuando el flag está activo pero la URL no es local ni de LAN', () => {
    vi.stubEnv('VITE_DEV_AUTOLOGIN', 'true')
    vi.stubEnv('VITE_SUPABASE_URL', REMOTE_URL)

    render(<DevAutoLogin />)

    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('no llama a login si ya hay sesión, aunque el flag y la URL cumplan', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, login: mockLogin })
    vi.stubEnv('VITE_DEV_AUTOLOGIN', 'true')
    vi.stubEnv('VITE_SUPABASE_URL', LOCAL_URL)

    render(<DevAutoLogin />)

    expect(mockLogin).not.toHaveBeenCalled()
  })
})
