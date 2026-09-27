import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver SetDetailsModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

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
  }
})

vi.mock('../../hooks/useWorkout.js', () => ({
  usePreviousWorkout: () => ({ data: undefined, isFetched: true }),
  useUpdateSessionExerciseFields: () => ({ mutate: vi.fn() }),
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
      onRemove={vi.fn()}
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
