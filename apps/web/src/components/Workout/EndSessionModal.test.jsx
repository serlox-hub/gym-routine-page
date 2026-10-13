import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n, SLOW_PENDING_MS } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto (ver BodyWeightModal.test.jsx).
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent, act } from '@testing-library/react'

// show_session_notes en false: evita renderizar el textarea de notas, que no hace falta
// para estas pruebas (necesitaría contexto de React Query real).
vi.mock('../../hooks/usePreferences.js', () => ({
  usePreference: () => ({ value: false }),
}))

import EndSessionModal from './EndSessionModal.jsx'

function renderModal(props) {
  return render(
    <EndSessionModal
      isOpen
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      isPending={false}
      {...props}
    />
  )
}

const minutesAgo = minutes => new Date(Date.now() - minutes * 60000).toISOString()

describe('EndSessionModal — aviso de sesión inactiva', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mediodía local fijo: con el reloj real, "hace 90 minutos" cae en el día anterior si la
    // suite corre entre las 00:00 y las 01:30, y la opción pasa a nombrar la fecha.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no muestra el aviso si la última serie aún no está resuelta (aunque sea antigua)', () => {
    renderModal({ lastSetAt: minutesAgo(90), isLastSetResolved: false })
    expect(screen.queryByText(/Llevas más de/)).not.toBeInTheDocument()
  })

  it('no muestra el aviso si la última serie es reciente', () => {
    renderModal({ lastSetAt: minutesAgo(5), isLastSetResolved: true })
    expect(screen.queryByText(/Llevas más de/)).not.toBeInTheDocument()
  })

  it('no muestra el aviso sin lastSetAt (defaults)', () => {
    renderModal({})
    expect(screen.queryByText(/Llevas más de/)).not.toBeInTheDocument()
  })

  it('muestra el aviso con la opción "hora de la última serie" preseleccionada', () => {
    renderModal({ lastSetAt: minutesAgo(90), isLastSetResolved: true })

    expect(screen.getByText(/Llevas más de 60 minutos/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Terminé a las/, pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terminé ahora', pressed: false })).toBeInTheDocument()
  })

  it('la opción de la última serie nombra el día cuando no fue hoy', () => {
    renderModal({ lastSetAt: minutesAgo(33 * 60), isLastSetResolved: true })

    expect(screen.getByRole('button', { name: /^Terminé el .+ a las/ })).toBeInTheDocument()
  })

  it('confirmar sin tocar la opción envía completedAt con la hora de la última serie', () => {
    const onConfirm = vi.fn()
    const lastSetAt = minutesAgo(90)
    renderModal({ lastSetAt, isLastSetResolved: true, onConfirm })

    fireEvent.click(screen.getByRole('button', { name: 'Hecho' }))

    expect(onConfirm).toHaveBeenCalledWith({ overallFeeling: null, notes: null, completedAt: lastSetAt, discardUnsavedSets: false })
  })

  it('elegir "terminé ahora" y confirmar envía completedAt sin definir', () => {
    const onConfirm = vi.fn()
    renderModal({ lastSetAt: minutesAgo(90), isLastSetResolved: true, onConfirm })

    fireEvent.click(screen.getByRole('button', { name: 'Terminé ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hecho' }))

    expect(onConfirm).toHaveBeenCalledWith({ overallFeeling: null, notes: null, completedAt: undefined, discardUnsavedSets: false })
  })

  it('sin aviso, confirmar siempre envía completedAt sin definir', () => {
    const onConfirm = vi.fn()
    renderModal({ lastSetAt: minutesAgo(5), isLastSetResolved: true, onConfirm })

    fireEvent.click(screen.getByRole('button', { name: 'Hecho' }))

    expect(onConfirm).toHaveBeenCalledWith({ overallFeeling: null, notes: null, completedAt: undefined, discardUnsavedSets: false })
  })

  it('cancelar reinicia la opción elegida a la de la última serie', () => {
    renderModal({ lastSetAt: minutesAgo(90), isLastSetResolved: true })

    fireEvent.click(screen.getByRole('button', { name: 'Terminé ahora' }))
    expect(screen.getByRole('button', { name: 'Terminé ahora', pressed: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('button', { name: /Terminé a las/, pressed: true })).toBeInTheDocument()
  })
})

describe('EndSessionModal — terminar sin las series rechazadas', () => {
  const discardLabel = count => i18n.t('workout:session.unsavedSetsDiscard', { count })

  it('sin series rechazadas (por defecto) no pinta el botón', () => {
    renderModal({})

    expect(screen.queryByRole('button', { name: discardLabel(1) })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: discardLabel(2) })).not.toBeInTheDocument()
  })

  it('con series rechazadas pinta el botón y confirma con discardUnsavedSets en true', () => {
    const onConfirm = vi.fn()
    renderModal({ discardableSetsCount: 1, onConfirm })

    fireEvent.click(screen.getByRole('button', { name: discardLabel(1) }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith({ overallFeeling: null, notes: null, completedAt: undefined, discardUnsavedSets: true })
  })

  it('con varias series rechazadas el botón va en plural', () => {
    renderModal({ discardableSetsCount: 2 })

    expect(screen.getByRole('button', { name: discardLabel(2) })).toBeInTheDocument()
    expect(discardLabel(2)).not.toBe(discardLabel(1))
  })

  it('"Hecho" sigue confirmando sin descartar aunque el botón esté visible', () => {
    const onConfirm = vi.fn()
    renderModal({ discardableSetsCount: 1, onConfirm })

    fireEvent.click(screen.getByRole('button', { name: 'Hecho' }))

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ discardUnsavedSets: false }))
  })

  it('mientras se guarda el botón está desactivado y no confirma', () => {
    const onConfirm = vi.fn()
    renderModal({ discardableSetsCount: 1, onConfirm, isPending: true })

    const discard = screen.getByRole('button', { name: discardLabel(1) })
    fireEvent.click(discard)

    expect(discard).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('EndSessionModal — slow and failed end', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the slow-connection text after the threshold of isPending', () => {
    renderModal({ isPending: true })
    expect(screen.queryByText('Conexión lenta, sigo intentándolo...')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(SLOW_PENDING_MS) })

    expect(screen.getByText('Conexión lenta, sigo intentándolo...')).toBeInTheDocument()
  })

  it('shows the error inline', () => {
    renderModal({ error: 'No se pudo finalizar el entrenamiento. Inténtalo de nuevo.' })

    expect(screen.getByText('No se pudo finalizar el entrenamiento. Inténtalo de nuevo.')).toBeInTheDocument()
  })
})

describe('EndSessionModal — close button', () => {
  it('is a named 44px button that closes the modal', () => {
    const onClose = vi.fn()
    renderModal({ onClose })

    const close = screen.getByRole('button', { name: 'Cerrar' })
    expect(close).toHaveClass('w-11', 'h-11')
    fireEvent.click(close)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('while the session is being saved it is disabled and does not close', () => {
    const onClose = vi.fn()
    renderModal({ onClose, isPending: true })

    const close = screen.getByRole('button', { name: 'Cerrar' })
    fireEvent.click(close)

    expect(close).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
