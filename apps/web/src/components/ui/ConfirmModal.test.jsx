import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver Modal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmModal from './ConfirmModal.jsx'

function renderConfirm(props) {
  return render(
    <ConfirmModal
      isOpen
      title="Título"
      message="Mensaje"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />
  )
}

describe('ConfirmModal — tocar el fondo (onDismiss)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin onDismiss, tocar el fondo llama a onCancel (comportamiento por defecto)', () => {
    const onCancel = vi.fn()
    renderConfirm({ onCancel })

    const overlay = screen.getByText('Mensaje').parentElement.parentElement
    fireEvent.mouseDown(overlay)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('con onDismiss, tocar el fondo llama a onDismiss y NO a onCancel', () => {
    const onCancel = vi.fn()
    const onDismiss = vi.fn()
    renderConfirm({ onCancel, onDismiss })

    const overlay = screen.getByText('Mensaje').parentElement.parentElement
    fireEvent.mouseDown(overlay)

    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('con onDismiss, isLoading sigue bloqueando el cierre por fondo', () => {
    const onDismiss = vi.fn()
    renderConfirm({ onDismiss, isLoading: true })

    const overlay = screen.getByText('Mensaje').parentElement.parentElement
    fireEvent.mouseDown(overlay)

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('el botón "Cancelar" sigue llamando a onCancel, no a onDismiss', () => {
    const onCancel = vi.fn()
    const onDismiss = vi.fn()
    renderConfirm({ onCancel, onDismiss })

    fireEvent.click(screen.getByText('Cancelar'))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
