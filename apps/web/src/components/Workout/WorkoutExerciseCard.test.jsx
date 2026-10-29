import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver SetDetailsModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent, act } from '@testing-library/react'

// The card's own remove mutation, varied per test.
const { removeMutation } = vi.hoisted(() => ({ removeMutation: { current: {} } }))

// Mockea solo los hooks con estado de red (useQuery/useMutation sin QueryClientProvider en el
// árbol de test explotaría con "No QueryClient set"), deja el resto de @gym/shared real:
// getExerciseName, hasExerciseNotes, resolveTrackedFields, canApplyToRoutine, useExpandedExercise...
vi.mock('@gym/shared', async () => {
  const actual = await vi.importActual('@gym/shared')
  return {
    ...actual,
    usePreference: () => ({ value: undefined }),
    useResolvedWeightUnit: () => 'kg',
    useResolvedDistanceUnit: () => 'm',
    // Reads the workout store, which these tests never inject.
    useExerciseSyncStatus: () => actual.SET_SYNC_STATUS.NONE,
  }
})

vi.mock('../../hooks/useWorkout.js', () => ({
  usePreviousWorkout: () => ({ data: undefined, isFetched: true }),
  useUpdateSessionExerciseFields: () => ({ mutate: vi.fn() }),
  useRemoveSessionExercise: () => removeMutation.current,
}))

vi.mock('../../hooks/useExercises.js', () => ({
  useUserExerciseOverride: () => ({ data: undefined }),
}))

// Modales pesados (hooks de red propios) que no participan en el flujo de reemplazo probado
// aquí: se stubean para que no exploten al montarse (isOpen solo controla su render interno,
// sus hooks se ejecutan igual). ExercisePickerModal expone un botón para simular la elección.
vi.mock('./ExerciseHistoryModal.jsx', () => ({ default: () => null }))
vi.mock('./EditSessionExerciseModal.jsx', () => ({ default: () => null }))
vi.mock('./SetsList.jsx', () => ({ default: () => null }))
vi.mock('../Routine/ExercisePickerModal.jsx', () => ({
  default: ({ isOpen, onSelect }) =>
    isOpen ? <button onClick={() => onSelect({ id: 99, name_es: 'Sentadilla' })}>elegir-sustituto</button> : null,
}))

import WorkoutExerciseCard from './WorkoutExerciseCard.jsx'

const EXERCISE = { id: 1, name_es: 'Press banca', tracked_fields: ['weight', 'reps'] }

function buildSessionExercise(overrides = {}) {
  return {
    id: 1,
    sessionExerciseId: 1,
    exercise: EXERCISE,
    series: 3,
    reps: '8-12',
    target_field: null,
    level: null,
    rir: null,
    notes: null,
    rest_seconds: 90,
    routine_exercise_id: 5,
    is_extra: false,
    ...overrides,
  }
}

function renderCard(sessionExerciseOverrides = {}, props = {}) {
  return render(
    <WorkoutExerciseCard
      sessionExercise={buildSessionExercise(sessionExerciseOverrides)}
      onCompleteSet={vi.fn()}
      onUncompleteSet={vi.fn()}
      onReplace={vi.fn()}
      {...props}
    />
  )
}

function openReplacePicker() {
  const menuTrigger = document.querySelector('svg.lucide-ellipsis-vertical').closest('button')
  fireEvent.click(menuTrigger)
  fireEvent.click(screen.getByText('Reemplazar ejercicio'))
}

describe('WorkoutExerciseCard — flujo de reemplazo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    removeMutation.current = { mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false }
  })

  it('con fila ligada a la rutina, elegir sustituto abre el diálogo de ámbito y NO llama a onReplace todavía', () => {
    const onReplace = vi.fn()
    renderCard({ routine_exercise_id: 5, is_extra: false }, { onReplace })

    openReplacePicker()
    fireEvent.click(screen.getByText('elegir-sustituto'))

    expect(screen.getByText('¿Solo hoy o también en la rutina?')).toBeInTheDocument()
    expect(onReplace).not.toHaveBeenCalled()
  })

  it('confirmar "también en la rutina" llama a onReplace con applyToRoutine=true', () => {
    const onReplace = vi.fn()
    renderCard({ routine_exercise_id: 5, is_extra: false }, { onReplace })

    openReplacePicker()
    fireEvent.click(screen.getByText('elegir-sustituto'))
    fireEvent.click(screen.getByText('También en la rutina'))

    expect(onReplace).toHaveBeenCalledTimes(1)
    expect(onReplace).toHaveBeenCalledWith(1, { id: 99, name_es: 'Sentadilla' }, true)
    expect(screen.queryByText('¿Solo hoy o también en la rutina?')).not.toBeInTheDocument()
  })

  it('elegir "solo hoy" llama a onReplace con applyToRoutine=false', () => {
    const onReplace = vi.fn()
    renderCard({ routine_exercise_id: 5, is_extra: false }, { onReplace })

    openReplacePicker()
    fireEvent.click(screen.getByText('elegir-sustituto'))
    fireEvent.click(screen.getByText('Solo hoy'))

    expect(onReplace).toHaveBeenCalledTimes(1)
    expect(onReplace).toHaveBeenCalledWith(1, { id: 99, name_es: 'Sentadilla' }, false)
  })

  it('descartar el diálogo de ámbito (tocar el fondo) NO llama a onReplace', () => {
    const onReplace = vi.fn()
    renderCard({ routine_exercise_id: 5, is_extra: false }, { onReplace })

    openReplacePicker()
    fireEvent.click(screen.getByText('elegir-sustituto'))
    const dialogOverlay = screen.getByText('¿Solo hoy o también en la rutina?').closest('.rounded-lg').parentElement
    fireEvent.mouseDown(dialogOverlay)

    expect(onReplace).not.toHaveBeenCalled()
    expect(screen.queryByText('¿Solo hoy o también en la rutina?')).not.toBeInTheDocument()
  })

  it('sin fila de rutina (extra), elegir sustituto llama a onReplace directamente, sin preguntar el ámbito', () => {
    const onReplace = vi.fn()
    renderCard({ routine_exercise_id: null, is_extra: true }, { onReplace })

    openReplacePicker()
    fireEvent.click(screen.getByText('elegir-sustituto'))

    expect(onReplace).toHaveBeenCalledTimes(1)
    expect(onReplace).toHaveBeenCalledWith(1, { id: 99, name_es: 'Sentadilla' }, false)
    expect(screen.queryByText('¿Solo hoy o también en la rutina?')).not.toBeInTheDocument()
  })
})

// Issue #174: the modal waits for the removal and shows its failure, instead of closing at once
// while the exercise stays on screen until the server answers.
describe('WorkoutExerciseCard — remove from session', () => {
  const REMOVE_TITLE = i18n.t('workout:exercise.removeFromSession')

  beforeEach(() => {
    vi.clearAllMocks()
    removeMutation.current = { mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false }
  })

  function openRemoveConfirm() {
    const menuTrigger = document.querySelector('svg.lucide-ellipsis-vertical').closest('button')
    fireEvent.click(menuTrigger)
    fireEvent.click(screen.getByText(REMOVE_TITLE))
  }

  const confirmButton = () => screen.getByRole('button', { name: i18n.t('common:buttons.delete') })
  const isModalOpen = () => screen.queryByText(i18n.t('workout:exercise.removeFromSessionConfirm', { name: 'Press banca' })) !== null

  it('resets the previous call on open, removes this card\'s exercise and closes once it succeeds', () => {
    renderCard()
    openRemoveConfirm()
    expect(removeMutation.current.reset).toHaveBeenCalledTimes(1)

    fireEvent.click(confirmButton())

    expect(removeMutation.current.mutate).toHaveBeenCalledWith(1, expect.any(Object))
    expect(isModalOpen()).toBe(true)

    const { onSuccess } = removeMutation.current.mutate.mock.calls[0][1]
    act(() => { onSuccess() })
    expect(isModalOpen()).toBe(false)
  })

  it('stays open while the removal is in flight, with both buttons disabled and no way to dismiss it', () => {
    removeMutation.current = { ...removeMutation.current, isPending: true }
    renderCard()
    openRemoveConfirm()

    const loadingButton = screen.getByRole('button', { name: i18n.t('common:buttons.loading') })
    expect(loadingButton.disabled).toBe(true)
    expect(screen.getByRole('button', { name: i18n.t('common:buttons.cancel') }).disabled).toBe(true)

    fireEvent.click(loadingButton)
    const overlay = screen.getByText(i18n.t('workout:exercise.removeFromSessionConfirm', { name: 'Press banca' })).closest('.rounded-lg').parentElement
    fireEvent.mouseDown(overlay)

    expect(removeMutation.current.mutate).not.toHaveBeenCalled()
    expect(isModalOpen()).toBe(true)
  })

  it('shows the failure inside the modal', () => {
    removeMutation.current = { ...removeMutation.current, isError: true }
    renderCard()
    openRemoveConfirm()

    expect(screen.getByText(i18n.t('workout:exercise.removeFailed'))).toBeInTheDocument()
    expect(isModalOpen()).toBe(true)
  })
})
