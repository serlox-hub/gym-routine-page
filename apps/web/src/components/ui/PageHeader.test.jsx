import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver ExerciseCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

import PageHeader from './PageHeader.jsx'

describe('PageHeader — back button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is a named 44px button', () => {
    render(<PageHeader title="Rutinas" backTo="/" />)

    expect(screen.getByRole('button', { name: 'Volver' })).toHaveClass('w-11', 'h-11')
  })

  it('goes to backTo', () => {
    render(<PageHeader title="Rutinas" backTo="/routines" />)

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(navigate).toHaveBeenCalledWith('/routines')
  })

  it('onBack wins over backTo and does not navigate by itself', () => {
    const onBack = vi.fn()
    render(<PageHeader title="Rutinas" backTo="/routines" onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('without backTo or onBack there is no back button', () => {
    render(<PageHeader title="Inicio" />)

    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument()
  })
})

describe('PageHeader — menu', () => {
  it('shows the options trigger only when there are menu items', () => {
    const { rerender } = render(<PageHeader title="Rutinas" menuItems={[]} />)
    expect(screen.queryByRole('button', { name: 'Más opciones' })).not.toBeInTheDocument()

    rerender(<PageHeader title="Rutinas" menuItems={[{ label: 'Editar', onClick: vi.fn() }]} />)
    expect(screen.getByRole('button', { name: 'Más opciones' })).toBeInTheDocument()
  })
})
