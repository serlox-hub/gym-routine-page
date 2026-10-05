import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Without this the components render the KEY instead of the text. See BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

// `countQuery` is what useGymSessionCount returns: data, isError and refetch, like a React Query result.
const { countQuery, notifier } = vi.hoisted(() => ({
  countQuery: { data: 0, isError: false, refetch: vi.fn() },
  notifier: { show: vi.fn() },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@gym/shared', async () => {
  const actual = await vi.importActual('@gym/shared')
  const mutation = () => ({ mutate: vi.fn(), isPending: false })
  return {
    ...actual,
    useGyms: () => ({ data: [{ id: 7, name: 'Centro', is_default: false }], isLoading: false }),
    useCreateGym: mutation,
    useRenameGym: mutation,
    useDeleteGym: mutation,
    useGymSessionCount: () => countQuery,
    getNotifier: () => notifier,
  }
})

import Gyms from './Gyms.jsx'

const DELETE_CONFIRM = '¿Eliminar "Centro"?'

beforeEach(() => {
  countQuery.data = 0
  countQuery.isError = false
  countQuery.refetch.mockClear()
  notifier.show.mockClear()
})

describe('Gyms: deleting a gym', () => {
  it('without sessions asks for confirmation', () => {
    render(<Gyms />)
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar gimnasio' }))
    expect(screen.getByText(DELETE_CONFIRM)).toBeTruthy()
    expect(notifier.show).not.toHaveBeenCalled()
  })

  // The "botón bloqueado" pattern: not available, but the tap still answers and says why.
  it('with sessions stays tappable and says why it cannot delete, without asking', () => {
    countQuery.data = 3
    render(<Gyms />)
    const deleteButton = screen.getByRole('button', { name: 'Eliminar gimnasio' })
    expect(deleteButton.disabled).toBe(false)

    fireEvent.click(deleteButton)

    expect(notifier.show).toHaveBeenCalledWith(
      'No puedes eliminar un gimnasio con sesiones. Renómbralo si lo necesitas.',
      'error',
    )
    expect(screen.queryByText(DELETE_CONFIRM)).toBeNull()
  })

  // "Todavía no sé cuántas sesiones tiene" no es "no tiene ninguna": deleting a gym with sessions
  // cannot be undone, so while the count loads the button ignores the tap.
  it('while the session count loads the button is disabled and nothing opens', () => {
    countQuery.data = undefined
    render(<Gyms />)
    const deleteButton = screen.getByRole('button', { name: 'Eliminar gimnasio' })
    expect(deleteButton.disabled).toBe(true)

    fireEvent.click(deleteButton)

    expect(screen.queryByText(DELETE_CONFIRM)).toBeNull()
    expect(notifier.show).not.toHaveBeenCalled()
    expect(countQuery.refetch).not.toHaveBeenCalled()
  })

  it('when the session count failed stays tappable, says it could not check, and retries', () => {
    countQuery.data = undefined
    countQuery.isError = true
    render(<Gyms />)
    const deleteButton = screen.getByRole('button', { name: 'Eliminar gimnasio' })
    expect(deleteButton.disabled).toBe(false)

    fireEvent.click(deleteButton)

    expect(notifier.show).toHaveBeenCalledWith(
      'No se ha podido comprobar si este gimnasio tiene sesiones. Inténtalo otra vez.',
      'error',
    )
    expect(countQuery.refetch).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(DELETE_CONFIRM)).toBeNull()
  })

  it('a stale error does not hide a known count: with 0 sessions it still asks for confirmation', () => {
    countQuery.data = 0
    countQuery.isError = true
    render(<Gyms />)

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar gimnasio' }))

    expect(screen.getByText(DELETE_CONFIRM)).toBeTruthy()
    expect(countQuery.refetch).not.toHaveBeenCalled()
  })
})
