import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BodyWeightModal from './BodyWeightModal.jsx'

describe('BodyWeightModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no renderiza cuando isOpen es false', () => {
    render(
      <BodyWeightModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.queryByText(/registrar peso/i)).not.toBeInTheDocument()
  })

  it('renderiza campos de peso y notas cuando está abierto', () => {
    render(
      <BodyWeightModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    expect(screen.getByText(/peso \(kg\)/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/75\.5/i)).toBeInTheDocument()
    expect(screen.getByText(/notas/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/después de desayunar/i)).toBeInTheDocument()
  })

  it('botón registrar está deshabilitado sin peso', () => {
    render(
      <BodyWeightModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    const submitButton = screen.getByRole('button', { name: /registrar/i })
    expect(submitButton).toBeDisabled()
  })

  it('botón registrar se habilita con peso válido', () => {
    render(
      <BodyWeightModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    const weightInput = screen.getByPlaceholderText(/75\.5/i)
    fireEvent.change(weightInput, { target: { value: '80.5' } })

    const submitButton = screen.getByRole('button', { name: /registrar/i })
    expect(submitButton).toBeEnabled()
  })

  it('llama onSubmit con datos correctos', () => {
    render(
      <BodyWeightModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    const weightInput = screen.getByPlaceholderText(/75\.5/i)
    const notesInput = screen.getByPlaceholderText(/después de desayunar/i)

    fireEvent.change(weightInput, { target: { value: '80.5' } })
    fireEvent.change(notesInput, { target: { value: 'Test nota' } })

    const submitButton = screen.getByRole('button', { name: /registrar/i })
    fireEvent.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      id: undefined,
      weight: 80.5,
      notes: 'Test nota',
    })
  })

  it('muestra título "Editar peso" cuando hay record', () => {
    render(
      <BodyWeightModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        record={{ id: 1, weight: 75, notes: 'nota existente' }}
      />
    )

    expect(screen.getByText(/editar peso/i)).toBeInTheDocument()
  })

  it('precarga valores cuando hay record', () => {
    render(
      <BodyWeightModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        record={{ id: 1, weight: 75.5, notes: 'nota existente' }}
      />
    )

    expect(screen.getByPlaceholderText(/75\.5/i)).toHaveValue(75.5)
    expect(screen.getByPlaceholderText(/después de desayunar/i)).toHaveValue('nota existente')
  })

  it('muestra "Guardando..." cuando isPending', () => {
    render(
      <BodyWeightModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        isPending={true}
      />
    )

    expect(screen.getByRole('button', { name: /guardando/i })).toBeInTheDocument()
  })

  it('llama onClose al hacer clic en Cancelar', () => {
    render(
      <BodyWeightModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })
})
