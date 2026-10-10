import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const { routineQuery, daysQuery, mutation } = vi.hoisted(() => ({
  routineQuery: { current: {} },
  daysQuery: { current: {} },
  mutation: () => ({ mutate: () => {}, mutateAsync: () => {}, isPending: false }),
}))

vi.mock('../hooks/useRoutines.js', () => ({
  useRoutine: () => routineQuery.current,
  useRoutineDays: () => daysQuery.current,
  useRoutineAllExercises: () => ({ data: [] }),
  useCreateRoutineDay: mutation,
  useDeleteRoutine: mutation,
  useAddExerciseToDay: mutation,
  useDeleteRoutineDay: mutation,
  useReorderRoutineDays: mutation,
  useUpdateRoutineExercise: mutation,
  useDuplicateRoutineExercise: mutation,
  useDuplicateRoutineDay: mutation,
  useMoveRoutineExerciseToDay: mutation,
  useSetFavoriteRoutine: mutation,
}))

import RoutineDetail from './RoutineDetail.jsx'

function renderAt(entries) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
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
