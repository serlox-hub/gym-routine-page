import { describe, it, expect, vi } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver Modal.test.jsx.
i18n.use(initReactI18next)
initI18n()
import { render, screen, fireEvent } from '@testing-library/react'
import ImportOptionsModal from './ImportOptionsModal.jsx'

function renderModal(props = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<ImportOptionsModal isOpen onConfirm={onConfirm} onCancel={onCancel} {...props} />)
  return { onConfirm, onCancel }
}

const updateSwitch = () => screen.getByRole('switch', { name: 'Actualizar ejercicios existentes' })

describe('ImportOptionsModal', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false })

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('starts with "update existing exercises" off', () => {
    renderModal()

    expect(updateSwitch()).toHaveAttribute('aria-checked', 'false')
  })

  it('confirms without updating exercises when the switch was left alone', () => {
    const { onConfirm } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Importar' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith({ updateExercises: false })
  })

  it('confirms updating exercises once the switch is turned on', () => {
    const { onConfirm } = renderModal()

    fireEvent.click(updateSwitch())
    expect(updateSwitch()).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }))

    expect(onConfirm).toHaveBeenCalledWith({ updateExercises: true })
  })

  it('confirms without updating after the switch is turned on and off again', () => {
    const { onConfirm } = renderModal()

    fireEvent.click(updateSwitch())
    fireEvent.click(updateSwitch())
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }))

    expect(onConfirm).toHaveBeenCalledWith({ updateExercises: false })
  })

  it('cancels without confirming', () => {
    const { onConfirm, onCancel } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
