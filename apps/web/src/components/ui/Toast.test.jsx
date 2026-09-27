import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Toast, { getShowToast } from './Toast.jsx'

// tabBarVisible decide dónde se pega el toast (issue: sin barra, el aviso quedaba flotando a
// media altura en el hueco que dejaba libre).
const { tabBarVisibleRef } = vi.hoisted(() => ({ tabBarVisibleRef: { current: true } }))

vi.mock('../../hooks/useTabBar.js', () => ({
  useIsTabBarVisible: () => tabBarVisibleRef.current,
}))

describe('Toast', () => {
  beforeEach(() => {
    tabBarVisibleRef.current = true
  })

  it('monta la región viva vacía sin ningún toast (para que los lectores de pantalla ya la conozcan)', () => {
    render(<Toast />)
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('al mostrar un toast, la región viva lleva el mensaje y el bloque visual queda aria-hidden', () => {
    const { container } = render(<Toast />)
    act(() => { getShowToast()('Guardado') })

    expect(screen.getByRole('status')).toHaveTextContent('Guardado')
    const visual = container.querySelector('[aria-hidden="true"]')
    expect(visual).not.toBeNull()
    expect(visual).toHaveTextContent('Guardado')
  })

  it('se separa del borde inferior con el hueco de safe-area cuando no hay barra de pestañas', () => {
    tabBarVisibleRef.current = false
    const { container } = render(<Toast />)
    act(() => { getShowToast()('Aviso') })

    const visual = container.querySelector('[aria-hidden="true"]')
    expect(visual.style.bottom).toBe('calc(16px + env(safe-area-inset-bottom))')
  })

  it('se posiciona sobre la barra de pestañas cuando está visible', () => {
    tabBarVisibleRef.current = true
    const { container } = render(<Toast />)
    act(() => { getShowToast()('Aviso') })

    const visual = container.querySelector('[aria-hidden="true"]')
    expect(visual.style.bottom).toBe('99px')
  })
})
