import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Without this the components paint the KEY instead of the text. See BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent, act } from '@testing-library/react'

const { mutation, pickerProps } = vi.hoisted(() => ({
  mutation: { mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false },
  pickerProps: { current: null },
}))

vi.mock('../../hooks/useWorkout.js', () => ({
  useCorrectSessionExercise: () => mutation,
}))
// The picker has its own test: here it only has to hand back what the user picks.
vi.mock('../Routine/ExercisePickerModal.jsx', () => ({
  default: (props) => {
    pickerProps.current = props
    return null
  },
}))

import CorrectSessionExerciseAction from './CorrectSessionExerciseAction.jsx'

const CABLE = { id: 10, name: 'Elevaciones en polea', tracked_fields: ['weight', 'reps'], muscle_group: { id: 4 } }
const DUMBBELL = { id: 20, name: 'Elevaciones con mancuernas', tracked_fields: ['reps', 'weight'] }
const TREADMILL = { id: 30, name: 'Cinta', tracked_fields: ['time'] }

function renderAction() {
  render(<CorrectSessionExerciseAction sessionId="s-1" sessionExerciseId={5} exercise={CABLE} gymId={3} />)
}

function pick(exercise) {
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar ejercicio' }))
  act(() => pickerProps.current.onSelect(exercise))
}

describe('CorrectSessionExerciseAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mutation, { isPending: false, isError: false })
    pickerProps.current = null
  })

  it('offers only exercises with the same fields, never the current one', () => {
    renderAction()
    const { isExerciseAllowed, newExerciseDefaults } = pickerProps.current

    expect(isExerciseAllowed(DUMBBELL)).toBe(true)
    expect(isExerciseAllowed(CABLE)).toBe(false)
    expect(isExerciseAllowed(TREADMILL)).toBe(false)
    expect(newExerciseDefaults.tracked_fields).toEqual(['weight', 'reps'])
  })

  it('asks for confirmation naming both exercises, and resets an earlier failure', () => {
    renderAction()
    pick(DUMBBELL)

    expect(screen.getByText(/Elevaciones en polea.*Elevaciones con mancuernas/)).toBeInTheDocument()
    expect(mutation.reset).toHaveBeenCalledTimes(1)
    expect(mutation.mutate).not.toHaveBeenCalled()
  })

  it('saves the correction with the session gym on confirm', () => {
    renderAction()
    pick(DUMBBELL)

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }))

    expect(mutation.mutate).toHaveBeenCalledWith(
      { sessionId: 's-1', sessionExerciseId: 5, oldExerciseId: 10, newExerciseId: 20, gymId: 3 },
      expect.any(Object),
    )
  })

  it('shows a failure inline in the modal', () => {
    mutation.isError = true
    renderAction()
    pick(DUMBBELL)

    expect(screen.getByText('No se pudo cambiar el ejercicio. Inténtalo de nuevo.')).toBeInTheDocument()
  })

  it('keeps naming and saving the original exercise if the exercise prop changes while confirming', () => {
    const { rerender } = render(<CorrectSessionExerciseAction sessionId="s-1" sessionExerciseId={5} exercise={CABLE} gymId={3} />)
    pick(DUMBBELL)

    rerender(<CorrectSessionExerciseAction sessionId="s-1" sessionExerciseId={5} exercise={DUMBBELL} gymId={3} />)

    expect(screen.getByText(/Elevaciones en polea.*Elevaciones con mancuernas/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }))
    expect(mutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ oldExerciseId: 10, newExerciseId: 20 }),
      expect.any(Object),
    )
  })
})
