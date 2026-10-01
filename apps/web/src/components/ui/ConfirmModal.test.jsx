import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n, SLOW_PENDING_MS } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver Modal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent, act } from '@testing-library/react'
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

describe('ConfirmModal — pending and failed save', () => {
  const SLOW_TEXT = 'Conexión lenta, sigo intentándolo...'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function overlay() {
    return screen.getByText('Mensaje').parentElement.parentElement
  }

  it('without any new prop, loading looks as it always did: confirm pending, no status line, closing blocked', () => {
    const onCancel = vi.fn()
    renderConfirm({ isLoading: true, onCancel, error: 'Ignorado sin saveStatus' })
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS) })

    expect(screen.getByRole('button', { name: 'Cargando...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.queryByText(SLOW_TEXT)).not.toBeInTheDocument()
    expect(screen.queryByText('Ignorado sin saveStatus')).not.toBeInTheDocument()

    fireEvent.mouseDown(overlay())
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('with loadingButton="cancel", the cancel button shows the loading label and confirm keeps its text', () => {
    renderConfirm({ isLoading: true, loadingButton: 'cancel', cancelText: 'Solo hoy', confirmText: 'También en la rutina' })

    expect(screen.getByRole('button', { name: 'Cargando...' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Solo hoy' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'También en la rutina' })).toBeDisabled()
  })

  it('with saveStatus, shows the slow-connection text after the threshold of isLoading', () => {
    renderConfirm({ isLoading: true, saveStatus: true })
    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS - 1) })
    expect(screen.queryByText(SLOW_TEXT)).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(1) })

    expect(screen.getByText(SLOW_TEXT)).toBeInTheDocument()
  })

  it('with saveStatus, shows the error inline', () => {
    renderConfirm({ saveStatus: true, error: 'No se pudo añadir el ejercicio.' })

    expect(screen.getByText('No se pudo añadir el ejercicio.')).toBeInTheDocument()
  })

  it('with dismissibleWhileLoading, tapping outside while loading calls onDismiss', () => {
    const onDismiss = vi.fn()
    renderConfirm({ isLoading: true, dismissibleWhileLoading: true, onDismiss })

    fireEvent.mouseDown(overlay())

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('without dismissibleWhileLoading, tapping outside while loading does not call onDismiss', () => {
    const onDismiss = vi.fn()
    renderConfirm({ isLoading: true, onDismiss })

    fireEvent.mouseDown(overlay())

    expect(onDismiss).not.toHaveBeenCalled()
  })
})
