import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Without this the components paint the KEY instead of the text. See BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

const { EXERCISES, useRecentExerciseStats, createExerciseMutateAsync } = vi.hoisted(() => ({
  createExerciseMutateAsync: vi.fn(),
  EXERCISES: [
    { id: 1, name_es: 'Press banca', name_en: 'Bench press', muscle_group_id: 1, muscle_group: { id: 1, name: 'Pecho' }, is_system: true, gif_key: null },
    { id: 2, name_es: 'Sentadilla', name_en: 'Squat', muscle_group_id: 2, muscle_group: { id: 2, name: 'Piernas' }, is_system: true, gif_key: null },
    { id: 3, name_es: 'Zancadas', name_en: 'Lunges', muscle_group_id: 2, muscle_group: { id: 2, name: 'Piernas' }, is_system: true, gif_key: null },
  ],
  useRecentExerciseStats: vi.fn(),
}))

vi.mock('../../hooks/useExercises.js', () => ({
  useExercisesWithMuscleGroup: () => ({ data: EXERCISES, isLoading: false }),
  useMuscleGroups: () => ({ data: [] }),
  useEquipmentTypes: () => ({ data: [] }),
  useCreateExercise: () => ({ mutateAsync: createExerciseMutateAsync, isPending: false }),
  useRecentExerciseStats,
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
    useRecentExerciseStats.mockReturnValue({ data: undefined })
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

  describe('Recent section', () => {
    // Last session: Zancadas and Sentadilla. The one before: Press banca and Zancadas.
    const LAST = '2026-09-30T18:00:00+00:00'
    const BEFORE = '2026-09-27T18:00:00+00:00'
    const RECENT_STATS = [
      { exercise_id: 3, session_date: LAST },
      { exercise_id: 2, session_date: LAST },
      { exercise_id: 1, session_date: BEFORE },
      { exercise_id: 3, session_date: BEFORE },
    ]
    const FULL_LIST = ['Press banca', 'Sentadilla', 'Zancadas']

    // Every heading under the modal's title (h3): section titles and exercise names, top to bottom.
    const headings = () => screen.getAllByRole('heading')
      .filter(heading => heading.tagName !== 'H3')
      .map(heading => heading.textContent)
    const headingTexts = level => screen.queryAllByRole('heading', { level }).map(heading => heading.textContent)

    beforeEach(() => {
      useRecentExerciseStats.mockReturnValue({ data: RECENT_STATS })
    })

    it('shows the latest exercises above the full list, a session in catalog order', () => {
      renderPicker()

      expect(headings()).toEqual([
        'Recientes', 'Sentadilla', 'Zancadas', 'Press banca',
        'Todos los ejercicios', ...FULL_LIST,
      ])
    })

    it('hides on a non-space character, stays with only spaces and comes back when cleared', () => {
      const searchInput = renderPicker()

      fireEvent.change(searchInput, { target: { value: 's' } })
      expect(headings()).not.toContain('Recientes')
      expect(headings()).not.toContain('Todos los ejercicios')

      fireEvent.change(searchInput, { target: { value: '   ' } })
      expect(headings()).toEqual(['Recientes', 'Sentadilla', 'Zancadas', 'Press banca', 'Todos los ejercicios', ...FULL_LIST])

      fireEvent.change(searchInput, { target: { value: '' } })
      expect(headings()).toContain('Recientes')
    })

    it('shows only the recents of the muscle group the picker opens filtered to', () => {
      render(<ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} initialMuscleGroup={1} />)

      expect(headings()).toEqual(['Recientes', 'Press banca', 'Todos los ejercicios', 'Press banca'])
    })

    it('renders no section title when the filter leaves no recents', () => {
      useRecentExerciseStats.mockReturnValue({ data: [{ exercise_id: 2, session_date: LAST }] })
      render(<ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} initialMuscleGroup={1} />)

      expect(headings()).toEqual(['Press banca'])
    })

    it('shows today\'s picker with no recents (new user, or the query failed or is loading)', () => {
      useRecentExerciseStats.mockReturnValue({ data: undefined })
      renderPicker()

      expect(headings()).toEqual(FULL_LIST)
    })

    it('puts the names one level under the section titles, and back under the modal title without them', () => {
      const searchInput = renderPicker()

      expect(headingTexts(4)).toEqual(['Recientes', 'Todos los ejercicios'])
      expect(headingTexts(5)).toEqual(['Sentadilla', 'Zancadas', 'Press banca', ...FULL_LIST])

      fireEvent.change(searchInput, { target: { value: 'press' } })
      expect(headingTexts(4)).toEqual(['Press banca'])
      expect(headingTexts(5)).toEqual([])
    })

    it('selects an exercise tapped in the section', () => {
      renderPicker()

      fireEvent.click(screen.getAllByText('Zancadas')[0])

      expect(onSelect).toHaveBeenCalledWith(EXERCISES[2])
    })

    it('marks an exercise already in the routine in the section and in the list', () => {
      render(<ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} existingExerciseIds={new Set([3])} />)

      // Zancadas is a recent and also in the full list, so it carries the mark twice.
      expect(screen.getAllByText('En rutina')).toHaveLength(2)
      screen.getAllByText('Zancadas').forEach(name => {
        expect(name.closest('button')).toHaveTextContent('En rutina')
      })
      screen.getAllByText('Sentadilla').forEach(name => {
        expect(name.closest('button')).not.toHaveTextContent('En rutina')
      })
    })

    it('shows the not found message and no section title when the search matches nothing', () => {
      const searchInput = renderPicker()

      fireEvent.change(searchInput, { target: { value: 'xyzxyz' } })

      expect(screen.getByText('No encontrado')).toBeInTheDocument()
      expect(screen.queryByText('Recientes')).not.toBeInTheDocument()
      expect(screen.queryByText('Todos los ejercicios')).not.toBeInTheDocument()
    })

    it('only queries while the picker is open', () => {
      const { rerender } = render(<ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} />)
      expect(useRecentExerciseStats).toHaveBeenLastCalledWith({ enabled: true })

      rerender(<ExercisePickerModal isOpen={false} onClose={vi.fn()} onSelect={onSelect} />)
      expect(useRecentExerciseStats).toHaveBeenLastCalledWith({ enabled: false })
    })
  })

  describe('isExerciseAllowed (correcting a past session exercise, issue 168)', () => {
    const allowOnlyLegs = (exercise) => exercise.muscle_group_id === 2 && exercise.id !== 3

    const exerciseHeadings = () => screen.getAllByRole('heading')
      .filter(heading => heading.tagName !== 'H3')
      .map(heading => heading.textContent)

    it('lists only the allowed exercises, in "Recent" and in the full list', () => {
      useRecentExerciseStats.mockReturnValue({ data: [
        { exercise_id: 1, session_date: '2026-09-30T18:00:00+00:00' },
        { exercise_id: 2, session_date: '2026-09-30T18:00:00+00:00' },
      ] })
      render(<ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} isExerciseAllowed={allowOnlyLegs} />)

      expect(exerciseHeadings()).toEqual(['Recientes', 'Sentadilla', 'Todos los ejercicios', 'Sentadilla'])
    })

    it('never finds an excluded exercise through the search', () => {
      render(<ExercisePickerModal isOpen onClose={vi.fn()} onSelect={onSelect} isExerciseAllowed={allowOnlyLegs} />)

      fireEvent.change(screen.getByPlaceholderText('Buscar ejercicio...'), { target: { value: 'press' } })

      expect(screen.queryByText('Press banca')).not.toBeInTheDocument()
    })

    it('does not create an exercise the check rejects, and says why', () => {
      render(
        <ExercisePickerModal
          isOpen
          onClose={vi.fn()}
          onSelect={onSelect}
          isExerciseAllowed={() => false}
          newExerciseDefaults={{ tracked_fields: ['weight', 'reps'], muscle_group_id: 1 }}
          notAllowedMessage="Tiene que medir lo mismo"
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Crear ejercicio' }))
      fireEvent.change(screen.getByPlaceholderText('Ej: Press banca con barra'), { target: { value: 'Elevaciones' } })
      fireEvent.click(screen.getByRole('button', { name: 'Crear ejercicio' }))

      expect(screen.getByText('Tiene que medir lo mismo')).toBeInTheDocument()
      expect(createExerciseMutateAsync).not.toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('creates and selects an allowed exercise', async () => {
      const created = { id: 99, name: 'Elevaciones', tracked_fields: ['weight', 'reps'] }
      createExerciseMutateAsync.mockResolvedValue(created)
      render(
        <ExercisePickerModal
          isOpen
          onClose={vi.fn()}
          onSelect={onSelect}
          isExerciseAllowed={() => true}
          newExerciseDefaults={{ tracked_fields: ['weight', 'reps'], muscle_group_id: 1 }}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Crear ejercicio' }))
      fireEvent.change(screen.getByPlaceholderText('Ej: Press banca con barra'), { target: { value: 'Elevaciones' } })
      fireEvent.click(screen.getByRole('button', { name: 'Crear ejercicio' }))

      await vi.waitFor(() => expect(onSelect).toHaveBeenCalledWith(created))
      expect(createExerciseMutateAsync.mock.calls[0][0].exercise.tracked_fields).toEqual(['weight', 'reps'])
    })
  })
})
