import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Without this the components render the KEY instead of the text. See DayCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent, act } from '@testing-library/react'

const { createMutation, navigate, premium } = vi.hoisted(() => ({
  createMutation: { current: {} },
  navigate: vi.fn(),
  premium: { current: false },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@tanstack/react-query', async () => ({
  ...(await vi.importActual('@tanstack/react-query')),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('../../hooks/useAuth.js', () => ({
  useUserId: () => 'user-1',
  useIsPremium: () => premium.current,
}))

vi.mock('../../hooks/useRoutines.js', () => ({
  useCreateRoutine: () => createMutation.current,
}))

vi.mock('../../hooks/useExercises.js', () => ({
  usePromptExerciseCatalog: () => ({ data: [] }),
}))

import NewRoutineFlow from './NewRoutineFlow.jsx'

const idleMutation = () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, isError: false })

function renderFlow(onClose = vi.fn()) {
  render(<NewRoutineFlow isOpen onClose={onClose} />)
  return onClose
}

const createButton = () => screen.getByText(i18n.t('routine:newFlow.createManually')).closest('button')

// Issue #174: "Create manually" used to give no sign while saving, swallow its failure, and create
// one routine per tap.
describe('NewRoutineFlow — create manually', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createMutation.current = idleMutation()
    premium.current = false
  })

  it('creates the routine with the default name, closes and opens it with its details form', async () => {
    createMutation.current.mutateAsync.mockResolvedValue({ id: 42 })
    const onClose = renderFlow()

    await act(async () => { fireEvent.click(createButton()) })

    expect(createMutation.current.mutateAsync).toHaveBeenCalledWith({ name: i18n.t('routine:defaultName') })
    expect(onClose).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/routine/42', { state: { openDetails: true } })
  })

  it('creates a single routine when tapped again before the first one is saved', async () => {
    createMutation.current.mutateAsync.mockReturnValue(new Promise(() => {}))
    renderFlow()

    await act(async () => {
      fireEvent.click(createButton())
      fireEvent.click(createButton())
    })

    expect(createMutation.current.mutateAsync).toHaveBeenCalledTimes(1)
  })

  it('while saving, the button is disabled and shows a spinner, and the sheet cannot be dismissed', () => {
    createMutation.current = { ...idleMutation(), isPending: true }
    const onClose = renderFlow()

    expect(createButton()).toBeDisabled()
    expect(createButton().querySelector('.animate-spin')).not.toBeNull()

    fireEvent.mouseDown(createButton().closest('.fixed'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows the failure in the sheet and does not leave it', async () => {
    createMutation.current = { ...idleMutation(), isError: true }
    createMutation.current.mutateAsync.mockRejectedValue(new Error('network down'))
    const onClose = renderFlow()

    await act(async () => { fireEvent.click(createButton()) })

    expect(screen.getByText(i18n.t('routine:createError'))).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  // The sheet stays mounted while closed: without the reset, the next opening would show the old failure.
  it('forgets the last call when the sheet is closed', () => {
    const onClose = renderFlow()

    fireEvent.mouseDown(createButton().closest('.fixed'))

    expect(onClose).toHaveBeenCalled()
    expect(createMutation.current.reset).toHaveBeenCalledTimes(1)
  })
})

// The other three entries end up in `handleClose()`, which `reset()`s the create in flight and so
// drops its result and its failure: while a routine is being created they wait too.
describe('NewRoutineFlow — the other entries while a routine is being created', () => {
  const ENTRIES = [
    ['Create with AI', 'routine:newFlow.createWithAI'],
    ['From templates', 'routine:newFlow.predefined'],
    ['Import from file', 'routine:newFlow.import'],
  ]

  const entryButton = (key) => screen.getByText(i18n.t(key)).closest('button')
  // The back button only exists once the flow has left the menu.
  const backButton = () => screen.queryByRole('button', { name: i18n.t('common:buttons.back') })

  beforeEach(() => {
    vi.clearAllMocks()
    createMutation.current = idleMutation()
    // Create with AI only opens its screen for premium users.
    premium.current = true
  })

  it.each(ENTRIES)('%s: leaves the menu when nothing is being created', (_name, key) => {
    renderFlow()
    expect(entryButton(key)).toBeEnabled()

    fireEvent.click(entryButton(key))

    expect(backButton()).not.toBeNull()
  })

  it.each(ENTRIES)('%s: is disabled and does not leave the menu while a routine is being created', (_name, key) => {
    createMutation.current = { ...idleMutation(), isPending: true }
    renderFlow()

    expect(entryButton(key)).toBeDisabled()
    fireEvent.click(entryButton(key))

    expect(backButton()).toBeNull()
    expect(createMutation.current.reset).not.toHaveBeenCalled()
  })
})
