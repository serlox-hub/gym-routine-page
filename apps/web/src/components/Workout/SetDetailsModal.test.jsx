import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto (ver BodyWeightModal.test.jsx).
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

// Vídeo desactivado (canUploadVideo false): evita renderizar VideoPlayer/getVideoUrl, que no
// hace falta para estas pruebas y llamaría a Supabase Storage.
vi.mock('../../hooks/useAuth.js', () => ({
  useCanUploadVideo: () => false,
}))
vi.mock('../../hooks/usePreferences.js', () => ({
  usePreference: (key) => ({ value: key === 'show_set_notes' }),
}))

import SetDetailsModal from './SetDetailsModal.jsx'

function renderModal(props) {
  return render(
    <SetDetailsModal
      isOpen
      onClose={vi.fn()}
      onSubmit={vi.fn()}
      setNumber={1}
      trackedFields={['weight', 'reps']}
      {...props}
    />
  )
}

describe('SetDetailsModal — sembrado de la nota solo en cerrado→abierto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('siembra la nota inicial al abrir', () => {
    renderModal({ initialNote: 'nota original' })
    expect(screen.getByPlaceholderText(/técnica, dolor, fatiga/i)).toHaveValue('nota original')
  })

  it('un cambio de initialNote/initialVideoUrl mientras sigue abierta NO pisa lo que el usuario está escribiendo', () => {
    const { rerender } = renderModal({ initialNote: 'nota original', initialVideoUrl: null })
    const textarea = screen.getByPlaceholderText(/técnica, dolor, fatiga/i)

    fireEvent.change(textarea, { target: { value: 'estoy escribiendo esto' } })
    expect(textarea).toHaveValue('estoy escribiendo esto')

    // Simula el refetch tras persistir el vídeo/RIR en vivo: la prop cambia con la hoja abierta.
    rerender(
      <SetDetailsModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        setNumber={1}
        trackedFields={['weight', 'reps']}
        initialNote="nota original"
        initialVideoUrl="video-key-nuevo"
      />
    )

    expect(screen.getByPlaceholderText(/técnica, dolor, fatiga/i)).toHaveValue('estoy escribiendo esto')
  })

  it('al cerrar y reabrir SÍ vuelve a sembrar con el `initialNote` más reciente', () => {
    const { rerender } = renderModal({ initialNote: 'primera' })
    expect(screen.getByPlaceholderText(/técnica, dolor, fatiga/i)).toHaveValue('primera')

    rerender(
      <SetDetailsModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        setNumber={1}
        trackedFields={['weight', 'reps']}
        initialNote="segunda"
      />
    )

    rerender(
      <SetDetailsModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        setNumber={1}
        trackedFields={['weight', 'reps']}
        initialNote="segunda"
      />
    )

    expect(screen.getByPlaceholderText(/técnica, dolor, fatiga/i)).toHaveValue('segunda')
  })

  it('handleClose autoguarda la nota editada al cerrar', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    renderModal({ initialNote: 'original', onSubmit, onClose })

    fireEvent.change(screen.getByPlaceholderText(/técnica, dolor, fatiga/i), { target: { value: 'nueva nota' } })
    fireEvent.click(screen.getByText('SERIE 1 · DETALLES').parentElement.querySelector('button'))

    expect(onSubmit).toHaveBeenCalledWith({ notes: 'nueva nota' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('handleClose sin cambios solo cierra, sin autoguardar', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    renderModal({ initialNote: 'original', onSubmit, onClose })

    fireEvent.click(screen.getByText('SERIE 1 · DETALLES').parentElement.querySelector('button'))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
