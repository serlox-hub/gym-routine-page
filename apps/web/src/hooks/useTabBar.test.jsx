import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useIsTabBarVisible } from './useTabBar.js'

// Fuente única de "¿se ve la barra inferior?" (App la pinta, Toast la consulta para no dejar el
// aviso flotando en el hueco de una barra que no está): un cambio de ruta ocultada aquí las
// desincroniza a las dos a la vez sin que ningún test lo note.
const { authRef } = vi.hoisted(() => ({ authRef: { current: { isAuthenticated: true } } }))

vi.mock('./useAuth.js', () => ({
  useAuth: () => authRef.current,
}))

function renderAt(path) {
  return renderHook(() => useIsTabBarVisible(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
  })
}

describe('useIsTabBarVisible', () => {
  it('se ve en una ruta normal estando autenticado', () => {
    authRef.current = { isAuthenticated: true }
    const { result } = renderAt('/home')
    expect(result.current).toBe(true)
  })

  it('oculta sin autenticar, aunque la ruta no esté en la lista', () => {
    authRef.current = { isAuthenticated: false }
    const { result } = renderAt('/home')
    expect(result.current).toBe(false)
  })

  it.each([
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/workout',
    '/preferences',
    '/gyms',
    '/admin',
    '/routine/5',
  ])('oculta en %s', (path) => {
    authRef.current = { isAuthenticated: true }
    const { result } = renderAt(path)
    expect(result.current).toBe(false)
  })

  it('no oculta una ruta que solo comparte prefijo por casualidad', () => {
    authRef.current = { isAuthenticated: true }
    // "/routines" no es "/routine/": el prefijo exacto de la lista lleva la barra final.
    const { result } = renderAt('/routines')
    expect(result.current).toBe(true)
  })
})
