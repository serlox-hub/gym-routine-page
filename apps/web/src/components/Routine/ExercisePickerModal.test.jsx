import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Without this the components paint the KEY instead of the text. See BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

const { EXERCISES } = vi.hoisted(() => ({
  EXERCISES: [
    { id: 1, name_es: 'Press banca', name_en: 'Bench press', muscle_group_id: 1, muscle_group: { id: 1, name: 'Pecho' }, is_system: true, gif_key: null },
    { id: 2, name_es: 'Sentadilla', name_en: 'Squat', muscle_group_id: 2, muscle_group: { id: 2, name: 'Piernas' }, is_system: true, gif_key: null },
  ],
}))

vi.mock('../../hooks/useExercises.js', () => ({
  useExercisesWithMuscleGroup: () => ({ data: EXERCISES, isLoading: false }),
  useMuscleGroups: () => ({ data: [] }),
  useEquipmentTypes: () => ({ data: [] }),
  useCreateExercise: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import ExercisePickerModal from './ExercisePickerModal.jsx'

const onSelect = vi.fn()

function renderPicker() {
  render(<ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} />)
  const searchInput = screen.getByPlaceholderText('Buscar ejercicio...')
  searchInput.focus()
  return searchInput
}

describe('ExercisePickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('dragging closes the keyboard', () => {
    it('blurs the search field on a drag over a result', () => {
      const searchInput = renderPicker()
      expect(searchInput).toHaveFocus()

      fireEvent.touchMove(screen.getByText('Press banca'))

      expect(searchInput).not.toHaveFocus()
    })

    it('blurs the search field on a drag over the title', () => {
      const searchInput = renderPicker()

      fireEvent.touchMove(screen.getByText('Seleccionar ejercicio'))

      expect(searchInput).not.toHaveFocus()
    })

    it('blurs the search field on a drag over the footer', () => {
      const searchInput = renderPicker()

      fireEvent.touchMove(screen.getByRole('button', { name: 'Cancelar' }))

      expect(searchInput).not.toHaveFocus()
    })

    // The Modal's content box (p-6) and the overlay around it are not children of anything the
    // picker owns, so a listener on a wrapper inside Modal never saw a drag starting there.
    it('blurs the search field on a drag over the window padding', () => {
      const searchInput = renderPicker()
      const contentBox = screen.getByText('Seleccionar ejercicio').parentElement
      expect(contentBox).toHaveClass('p-6')

      fireEvent.touchMove(contentBox)

      expect(searchInput).not.toHaveFocus()
    })

    it('blurs the search field on a drag over the overlay around the window', () => {
      const searchInput = renderPicker()
      const overlay = screen.getByText('Seleccionar ejercicio').parentElement.parentElement
      expect(overlay).toHaveClass('fixed', 'inset-0')

      fireEvent.touchMove(overlay)

      expect(searchInput).not.toHaveFocus()
    })

    it('keeps the search field focused on a drag that starts on the field itself', () => {
      const searchInput = renderPicker()

      fireEvent.touchMove(searchInput)

      expect(searchInput).toHaveFocus()
    })

    it('keeps the search field focused when the list scrolls and the user keeps typing', () => {
      const searchInput = renderPicker()
      const resultsContainer = screen.getByText('Press banca').closest('button').parentElement

      // Stands in for the browser clamping scrollTop when filtering shortens a scrolled list.
      fireEvent.scroll(resultsContainer)
      fireEvent.change(searchInput, { target: { value: 'sen' } })

      expect(searchInput).toHaveFocus()
      expect(searchInput).toHaveValue('sen')
    })

    it('does nothing in create mode, where the search field is unmounted', () => {
      renderPicker()
      fireEvent.click(screen.getByRole('button', { name: 'Crear ejercicio' }))
      const nameInput = screen.getByPlaceholderText('Ej: Press banca con barra')
      nameInput.focus()

      expect(() => fireEvent.touchMove(nameInput.closest('form'))).not.toThrow()
      expect(nameInput).toHaveFocus()
    })
  })

  // After closing, the search field is unmounted, so a leaked listener would find no field to blur
  // and do nothing visible. The leak itself is what has to be checked: every touchmove handler the
  // picker put on document must be taken off again.
  describe('touchmove listener lifecycle', () => {
    let addSpy
    let removeSpy

    beforeEach(() => {
      addSpy = vi.spyOn(document, 'addEventListener')
      removeSpy = vi.spyOn(document, 'removeEventListener')
    })

    afterEach(() => {
      addSpy.mockRestore()
      removeSpy.mockRestore()
    })

    const touchMoveHandlers = (spy) => spy.mock.calls.filter(([type]) => type === 'touchmove').map(([, handler]) => handler)

    it('removes the document listener when the picker closes', () => {
      const { rerender } = render(<ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} />)
      const added = touchMoveHandlers(addSpy)
      expect(added).toHaveLength(1)

      rerender(<ExercisePickerModal isOpen={false} onClose={vi.fn()} onSelect={onSelect} />)

      expect(touchMoveHandlers(removeSpy)).toEqual(added)
    })

    it('removes the document listener when the picker unmounts while open', () => {
      const { unmount } = render(<ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} />)
      const added = touchMoveHandlers(addSpy)
      expect(added).toHaveLength(1)

      unmount()

      expect(touchMoveHandlers(removeSpy)).toEqual(added)
    })

    it('does not listen on document while the picker is closed', () => {
      render(<ExercisePickerModal isOpen={false} onClose={vi.fn()} onSelect={onSelect} />)

      expect(touchMoveHandlers(addSpy)).toHaveLength(0)
    })

    it('does not blur an unrelated focused input after the picker closes', () => {
      const { rerender } = render(
        <>
          <input data-testid="outside" />
          <ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} />
        </>,
      )
      rerender(
        <>
          <input data-testid="outside" />
          <ExercisePickerModal isOpen={false} onClose={vi.fn()} onSelect={onSelect} />
        </>,
      )
      const outside = screen.getByTestId('outside')
      outside.focus()

      fireEvent.touchMove(document.body)

      expect(outside).toHaveFocus()
    })
  })

  it('selects the tapped result', () => {
    renderPicker()

    fireEvent.click(screen.getByText('Sentadilla'))

    expect(onSelect).toHaveBeenCalledWith(EXERCISES[1])
  })
})
