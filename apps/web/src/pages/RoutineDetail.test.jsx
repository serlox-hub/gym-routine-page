import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const { routineQuery, daysQuery, addRoutineDay, mutation, deleteRoutineMutation, deleteDayMutation, duplicateExerciseMutation } = vi.hoisted(() => ({
  routineQuery: { current: {} },
  daysQuery: { current: {} },
  addRoutineDay: { current: {} },
  mutation: () => ({ mutate: () => {}, mutateAsync: () => {}, isPending: false }),
  deleteRoutineMutation: { current: {} },
  deleteDayMutation: { current: {} },
  duplicateExerciseMutation: { current: {} },
}))

vi.mock('../hooks/useRoutines.js', () => ({
  useRoutine: () => routineQuery.current,
  useRoutineDays: () => daysQuery.current,
  useRoutineAllExercises: () => ({ data: [] }),
  useAddRoutineDay: () => addRoutineDay.current,
  useDeleteRoutine: () => deleteRoutineMutation.current,
  useAddExerciseToDay: mutation,
  useDeleteRoutineDay: () => deleteDayMutation.current,
  useReorderRoutineDays: mutation,
  useUpdateRoutineExercise: mutation,
  useDuplicateRoutineExercise: () => duplicateExerciseMutation.current,
  useDuplicateRoutineDay: mutation,
  useMoveRoutineExerciseToDay: mutation,
  useSetFavoriteRoutine: mutation,
}))

// The header, the day cards and the modals bring hooks of their own: these tests are about the
// screen's buttons and modals, so they render as nothing, or as a button for what they hand back.
vi.mock('../components/Routine/index.js', () => ({
  DayCard: ({ day, onDelete, onDuplicateExercise, duplicatingExerciseId }) => (
    <div>
      <button onClick={() => onDelete(day.id)}>{`delete ${day.name}`}</button>
      <button onClick={() => onDuplicateExercise({ id: 9 }, day.id)} data-duplicating-id={duplicatingExerciseId ?? ''}>
        {`duplicate exercise of ${day.name}`}
      </button>
    </div>
  ),
  AddExerciseModal: () => null,
  EditRoutineExerciseModal: () => null,
  RoutineHeader: ({ onDelete }) => <button onClick={onDelete}>delete routine</button>,
  MoveToDayModal: () => null,
  VolumeSummary: () => null,
}))

const idleMutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, isError: false })
deleteRoutineMutation.current = idleMutation()
deleteDayMutation.current = idleMutation()
duplicateExerciseMutation.current = idleMutation()

function deferred() {
  let resolve
  const promise = new Promise(res => { resolve = res })
  return { promise, resolve }
}

import RoutineDetail from './RoutineDetail.jsx'

function renderAt(entries) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/routines" element={<div>routines list</div>} />
        <Route path="/routine/:routineId" element={<RoutineDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RoutineDetail while loading or failed', () => {
  beforeEach(() => {
    routineQuery.current = {}
    daysQuery.current = {}
    addRoutineDay.current = { addDay: () => {}, isPending: false }
  })

  it('shows a back button next to the spinner while loading', () => {
    routineQuery.current = { isLoading: true }
    renderAt(['/routine/1'])
    expect(screen.getByRole('button', { name: i18n.t('common:buttons.back') })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the error and a back button that falls back to the routines list', () => {
    daysQuery.current = { error: new Error('boom') }
    renderAt(['/routine/1'])
    expect(screen.getByText('boom')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common:buttons.back') }))
    expect(screen.getByText('routines list')).toBeTruthy()
  })
})

describe('RoutineDetail add day button', () => {
  const addDayButton = () => screen.getByRole('button', { name: i18n.t('routine:day.add') })

  beforeEach(() => {
    routineQuery.current = { data: { id: 1, name: 'PPL', is_favorite: false } }
    daysQuery.current = { data: [] }
  })

  it('is disabled and shows a spinner while the day is being saved', () => {
    addRoutineDay.current = { addDay: vi.fn(), isPending: true }
    renderAt(['/routine/1'])
    expect(addDayButton().disabled).toBe(true)
    expect(addDayButton().querySelector('.animate-spin')).not.toBeNull()
  })

  // The double-tap guard and the day's number live in `useAddRoutineDay` (useRoutines.test.js).
  it('shows the plus icon and adds a day when nothing is being saved', () => {
    const addDay = vi.fn()
    addRoutineDay.current = { addDay, isPending: false }
    renderAt(['/routine/1'])
    expect(addDayButton().disabled).toBe(false)
    expect(addDayButton().querySelector('.animate-spin')).toBeNull()

    fireEvent.click(addDayButton())

    expect(addDay).toHaveBeenCalledTimes(1)
  })
})

// Issue #174: both delete modals wait for the write (open, disabled, loading) and show its failure.
describe('RoutineDetail delete modals', () => {
  const dayModalTitle = () => screen.queryByRole('heading', { name: i18n.t('routine:day.delete') })
  const routineModalTitle = () => screen.queryByRole('heading', { name: i18n.t('routine:delete') })
  const confirmButton = () => screen.getByRole('button', { name: i18n.t('common:buttons.delete') })

  beforeEach(() => {
    routineQuery.current = { data: { id: 1, name: 'PPL', is_favorite: false } }
    daysQuery.current = { data: [{ id: 11, name: 'Empuje', sort_order: 1 }] }
    addRoutineDay.current = { addDay: () => {}, isPending: false }
    deleteRoutineMutation.current = idleMutation()
    deleteDayMutation.current = idleMutation()
  })

  it('delete day: resets the last call on open and stays open until the day is deleted', async () => {
    const deletion = deferred()
    deleteDayMutation.current.mutateAsync.mockReturnValue(deletion.promise)
    renderAt(['/routine/1'])

    fireEvent.click(screen.getByText('delete Empuje'))
    expect(deleteDayMutation.current.reset).toHaveBeenCalledTimes(1)
    fireEvent.click(confirmButton())

    expect(deleteDayMutation.current.mutateAsync).toHaveBeenCalledWith({ dayId: 11, routineId: '1' })
    expect(dayModalTitle()).not.toBeNull()

    await act(async () => { deletion.resolve() })
    expect(dayModalTitle()).toBeNull()
  })

  it('delete day: while in flight both buttons are disabled and the confirm one says it is loading', () => {
    deleteDayMutation.current = { ...idleMutation(), isPending: true }
    renderAt(['/routine/1'])
    fireEvent.click(screen.getByText('delete Empuje'))

    expect(screen.getByRole('button', { name: i18n.t('common:buttons.loading') })).toBeDisabled()
    expect(screen.getByRole('button', { name: i18n.t('common:buttons.cancel') })).toBeDisabled()
  })

  it('delete day: a failure shows inside the modal, which stays open', async () => {
    deleteDayMutation.current = { ...idleMutation(), isError: true }
    deleteDayMutation.current.mutateAsync.mockRejectedValue(new Error('network down'))
    renderAt(['/routine/1'])
    fireEvent.click(screen.getByText('delete Empuje'))

    await act(async () => { fireEvent.click(confirmButton()) })

    expect(screen.getByText(i18n.t('routine:day.deleteError'))).toBeInTheDocument()
    expect(dayModalTitle()).not.toBeNull()
  })

  it('delete routine: resets the last call on open and leaves the screen once the routine is deleted', async () => {
    const deletion = deferred()
    deleteRoutineMutation.current.mutateAsync.mockReturnValue(deletion.promise)
    renderAt(['/routine/1'])

    fireEvent.click(screen.getByText('delete routine'))
    expect(deleteRoutineMutation.current.reset).toHaveBeenCalledTimes(1)
    fireEvent.click(confirmButton())

    expect(deleteRoutineMutation.current.mutateAsync).toHaveBeenCalledWith(1)
    expect(routineModalTitle()).not.toBeNull()

    await act(async () => { deletion.resolve() })
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('delete routine: a failure shows inside the modal, which stays open', async () => {
    deleteRoutineMutation.current = { ...idleMutation(), isError: true }
    deleteRoutineMutation.current.mutateAsync.mockRejectedValue(new Error('network down'))
    renderAt(['/routine/1'])
    fireEvent.click(screen.getByText('delete routine'))

    await act(async () => { fireEvent.click(confirmButton()) })

    expect(screen.getByText(i18n.t('routine:deleteError'))).toBeInTheDocument()
    expect(routineModalTitle()).not.toBeNull()
  })
})

describe('RoutineDetail duplicate exercise', () => {
  const duplicateButton = () => screen.getByText('duplicate exercise of Empuje')

  beforeEach(() => {
    routineQuery.current = { data: { id: 1, name: 'PPL', is_favorite: false } }
    daysQuery.current = { data: [{ id: 11, name: 'Empuje', sort_order: 1 }] }
    addRoutineDay.current = { addDay: () => {}, isPending: false }
    duplicateExerciseMutation.current = idleMutation()
  })

  it('makes a single copy when tapped again before the first one is back', async () => {
    duplicateExerciseMutation.current.mutateAsync.mockReturnValue(new Promise(() => {}))
    renderAt(['/routine/1'])

    await act(async () => {
      fireEvent.click(duplicateButton())
      fireEvent.click(duplicateButton())
    })

    expect(duplicateExerciseMutation.current.mutateAsync).toHaveBeenCalledTimes(1)
    expect(duplicateExerciseMutation.current.mutateAsync).toHaveBeenCalledWith({ routineExercise: { id: 9 }, dayId: 11 })
  })

  it('tells the day cards which exercise is being copied while the copy is in flight', () => {
    duplicateExerciseMutation.current = {
      ...idleMutation(),
      isPending: true,
      variables: { routineExercise: { id: 9 }, dayId: 11 },
    }
    renderAt(['/routine/1'])

    expect(duplicateButton().dataset.duplicatingId).toBe('9')
  })

  // `variables` keeps the last call after it settles: only `isPending` says the copy is still going.
  it('tells the day cards nothing is being copied once the copy has settled', () => {
    duplicateExerciseMutation.current = {
      ...idleMutation(),
      isPending: false,
      variables: { routineExercise: { id: 9 }, dayId: 11 },
    }
    renderAt(['/routine/1'])

    expect(duplicateButton().dataset.duplicatingId).toBe('')
  })
})
