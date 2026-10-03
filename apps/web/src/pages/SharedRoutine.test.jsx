import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen } from '@testing-library/react'

const { authRef, sharedRef } = vi.hoisted(() => ({
  authRef: { current: { isAuthenticated: false, isLoading: false } },
  sharedRef: { current: { data: null, isLoading: false, isError: false } },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ token: 'tok' }),
}))

vi.mock('../hooks/useAuth.js', () => ({
  useAuth: () => authRef.current,
}))

vi.mock('@gym/shared', async () => {
  const actual = await vi.importActual('@gym/shared')
  return {
    ...actual,
    useSharedRoutine: () => ({ ...sharedRef.current, refetch: vi.fn(), isFetching: false }),
    useMuscleGroups: () => ({ data: [] }),
    useImportSharedRoutine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }
})

import SharedRoutine from './SharedRoutine.jsx'

const SHARED = {
  exercises: [{ name_es: 'Sentadilla', name_en: 'Squat', tracked_fields: ['weight', 'reps'], muscle_group_name: 'Cuádriceps' }],
  routine: {
    name: 'Rutina compartida',
    description: null,
    days: [{ name: 'Día 1', sort_order: 1, estimated_duration_min: null, blocks: [
      { name: 'Principal', exercises: [{ exercise_name: 'Sentadilla', series: 3, reps: '8', superset_group: null }] },
    ] }],
  },
}

beforeEach(() => {
  authRef.current = { isAuthenticated: false, isLoading: false }
  sharedRef.current = { data: SHARED, isLoading: false, isError: false }
})

describe('SharedRoutine', () => {
  it('shows no action button while the session is still unknown', () => {
    authRef.current = { isAuthenticated: false, isLoading: true }
    render(<SharedRoutine />)
    expect(screen.getByText('Rutina compartida')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('logged out: offers creating an account and logging in, never importing', () => {
    render(<SharedRoutine />)
    expect(screen.getByRole('button', { name: 'Crea una cuenta para importarla' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ya tengo cuenta' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Importar a mis rutinas' })).toBeNull()
  })

  it('logged in: offers importing only', () => {
    authRef.current = { isAuthenticated: true, isLoading: false }
    render(<SharedRoutine />)
    expect(screen.getByRole('button', { name: 'Importar a mis rutinas' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Crea una cuenta para importarla' })).toBeNull()
    // Plus the header's way home
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('shows the dead-link state when the link no longer works', () => {
    sharedRef.current = { data: null, isLoading: false, isError: false }
    render(<SharedRoutine />)
    expect(screen.getByText('Este enlace ya no funciona')).toBeTruthy()
  })
})
