import { useLocation } from 'react-router-dom'
import { useAuth } from './useAuth.js'

const HIDE_TAB_BAR_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/workout', '/preferences', '/gyms', '/admin', '/routine/', '/r/']

// Fuente única de "¿se ve la barra inferior?": la pintan App y la consulta Toast para no dejar
// libre el hueco de una barra que no está (el aviso flotaba a media altura en la sesión).
export function useIsTabBarVisible() {
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  return isAuthenticated && !HIDE_TAB_BAR_PATHS.some(p => pathname.startsWith(p))
}
