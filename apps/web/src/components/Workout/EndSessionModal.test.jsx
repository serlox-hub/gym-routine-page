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

    expect(onConfirm).toHaveBeenCalledWith({ overallFeeling: null, notes: null, completedAt: lastSetAt })
  })

  it('elegir "terminé ahora" y confirmar envía completedAt sin definir', () => {
    const onConfirm = vi.fn()
    renderModal({ lastSetAt: minutesAgo(90), isLastSetResolved: true, onConfirm })

    fireEvent.click(screen.getByRole('button', { name: 'Terminé ahora' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hecho' }))

    expect(onConfirm).toHaveBeenCalledWith({ overallFeeling: null, notes: null, completedAt: undefined })
  })

  it('sin aviso, confirmar siempre envía completedAt sin definir', () => {
    const onConfirm = vi.fn()
    renderModal({ lastSetAt: minutesAgo(5), isLastSetResolved: true, onConfirm })

    fireEvent.click(screen.getByRole('button', { name: 'Hecho' }))

    expect(onConfirm).toHaveBeenCalledWith({ overallFeeling: null, notes: null, completedAt: undefined })
  })

  it('cancelar reinicia la opción elegida a la de la última serie', () => {
    renderModal({ lastSetAt: minutesAgo(90), isLastSetResolved: true })

    fireEvent.click(screen.getByRole('button', { name: 'Terminé ahora' }))
    expect(screen.getByRole('button', { name: 'Terminé ahora', pressed: true })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('button', { name: /Terminé a las/, pressed: true })).toBeInTheDocument()
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
