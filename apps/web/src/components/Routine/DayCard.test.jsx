import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

// `blocksRef` es mutable y compartida con el mock de abajo (vi.hoisted la saca del closure de
// la fábrica) para poder variar los bloques que devuelve `useRoutineBlocks` por test. `pendingRef`
// hace lo mismo con el `isPending` de las dos mutaciones que combina `isReorderingExercises`.
const { blocksRef, pendingRef, reorderMutate, supersetMutate } = vi.hoisted(() => ({
  blocksRef: { current: [] },
  pendingRef: { current: { reorder: false, superset: false } },
  reorderMutate: vi.fn(),
  supersetMutate: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Solo los hooks con estado de red: dejan pasar getRoutineDayLayout/getExistingSupersetIds/
// getRoutineDayAction reales, que es justo lo que ejercitan estos tests.
vi.mock('../../hooks/useRoutines.js', () => ({
  useRoutineBlocks: () => ({ data: blocksRef.current, isLoading: false }),
  useReorderRoutineExercises: () => ({ mutate: reorderMutate, isPending: pendingRef.current.reorder }),
  useSetRoutineExerciseSupersetGroup: () => ({ mutate: supersetMutate, isPending: pendingRef.current.superset }),
  useDeleteRoutineExercise: () => ({ mutate: vi.fn() }),
  useUpdateRoutineDay: () => ({ mutate: vi.fn() }),
}))

vi.mock('../../hooks/useWorkout.js', () => ({
  useStartSession: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@gym/shared', async () => {
  const actual = await vi.importActual('@gym/shared')
  return {
    ...actual,
    useSelectedGym: () => ({ gymId: 1 }),
    useResolvedDistanceUnit: () => 'm',
  }
})

import DayCard from './DayCard.jsx'

const main = (exercises) => ({ name: 'Principal', routine_exercises: exercises })
const warmup = (exercises) => ({ name: 'Calentamiento', is_warmup: true, routine_exercises: exercises })

const routineExercise = (id, sortOrder, supersetGroup, name, isWarmup = false) => ({
  id,
  sort_order: sortOrder,
  superset_group: supersetGroup,
  is_warmup: isWarmup,
  series: 3,
  reps: '8-12',
  rest_seconds: 90,
  exercise: { id: id * 10, name_es: name, tracked_fields: ['weight', 'reps'] },
})

function renderDay(props) {
  return render(
    <DayCard
      day={{ id: 1, name: 'Empuje' }}
      routineId="1"
      routineName="PPL"
      onAddExercise={vi.fn()}
      onAddWarmup={vi.fn()}
      onEditExercise={vi.fn()}
      onReplaceExercise={vi.fn()}
      onDuplicateExercise={vi.fn()}
      onMoveExerciseToDay={vi.fn()}
      onDelete={vi.fn()}
      onDuplicate={vi.fn()}
      onReorderToPosition={vi.fn()}
      hasActiveSession={false}
      activeRoutineDayId={null}
      activeSessionSynced
      {...props}
    />
  )
}

// Simula un gesto completo sobre la cabecera: pointerdown en (0,0), un único pointermove a
// (dx, dy) y pointerup. Con pointerType 'touch' porque el guard de botón de ratón solo mira
// 'mouse' (ver useSwipeToDelete.test.jsx).
function swipe(el, { dx, dy = 0 }) {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
  fireEvent.pointerMove(el, { pointerId: 1, clientX: dx, clientY: dy, pointerType: 'touch' })
  fireEvent.pointerUp(el, { pointerId: 1, clientX: dx, clientY: dy, pointerType: 'touch' })
}

describe('DayCard — cabecera: recuento de series', () => {
  beforeEach(() => {
    blocksRef.current = []
  })

  it('con ejercicios que llevan series, añade "· N series" al recuento', () => {
    blocksRef.current = [main([{ id: 1, series: 3 }, { id: 2, series: 2 }])]
    renderDay()

    expect(screen.getByText('2 ejercicios · 5 series')).toBeInTheDocument()
  })

  it('sin series (totalSets 0), el recuento no lleva el sufijo de series', () => {
    blocksRef.current = [main([{ id: 1 }])]
    renderDay()

    expect(screen.getByText('1 ejercicio')).toBeInTheDocument()
    expect(screen.queryByText(/series/)).not.toBeInTheDocument()
  })
})

describe('DayCard — swipe para borrar en la cabecera', () => {
  beforeEach(() => {
    blocksRef.current = []
  })

  it('un swipe que cruza el umbral borra el día y no lo despliega', () => {
    const onDelete = vi.fn()
    renderDay({ onDelete })
    const zone = screen.getByText('Empuje').closest('[class*="justify-between"]')

    swipe(zone, { dx: -100 })
    // El click que sigue al swipe (real en touch) no debe colar y desplegar el día de propina.
    fireEvent.click(zone)

    expect(onDelete).toHaveBeenCalledWith(1)
    expect(screen.queryByText('Añadir ejercicio')).not.toBeInTheDocument()
  })

  it('un click sin movimiento despliega el día en vez de borrarlo', () => {
    const onDelete = vi.fn()
    renderDay({ onDelete })
    const zone = screen.getByText('Empuje').closest('[class*="justify-between"]')

    fireEvent.pointerDown(zone, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    fireEvent.pointerUp(zone, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    fireEvent.click(zone)

    expect(onDelete).not.toHaveBeenCalled()
    // Día sin ejercicios: al desplegarse muestra el botón de añadir (fila vacía).
    expect(screen.getByText('Añadir ejercicio')).toBeInTheDocument()
  })
})

describe('DayCard — exercise order and membership writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pendingRef.current = { reorder: false, superset: false }
    // Warm-up: Movilidad. Main: Sentadilla · (Press + Remo in a superset).
    blocksRef.current = [
      warmup([routineExercise(5, 1, null, 'Movilidad', true)]),
      main([
        routineExercise(1, 2, null, 'Sentadilla'),
        routineExercise(2, 3, 1, 'Press'),
        routineExercise(3, 4, 1, 'Remo'),
      ]),
    ]
  })

  function expandDay() {
    fireEvent.click(screen.getByText('Empuje').closest('[class*="justify-between"]'))
  }

  it('reordering a block sends the whole day, warm-up first, with the other block as ids only', () => {
    renderDay()
    expandDay()

    fireEvent.click(screen.getByText('Sentadilla').closest('[class*="cursor-pointer"]'))
    fireEvent.click(screen.getByRole('button', { name: 'Reordenar' }))
    fireEvent.click(screen.getByRole('button', { name: /2\. Superset A/ }))

    expect(reorderMutate).toHaveBeenCalledWith({
      dayId: 1,
      exercises: [{ id: 5 }, { id: 2 }, { id: 3 }, { id: 1 }],
    })
  })

  it('«Sacar del superset» requests the write with the default placement', () => {
    renderDay()
    expandDay()

    fireEvent.click(screen.getByText('Press').closest('[class*="cursor-pointer"]'))
    fireEvent.click(screen.getByRole('button', { name: 'Sacar del superset' }))

    expect(supersetMutate).toHaveBeenCalledWith({ dayId: 1, routineExerciseId: 2, supersetGroup: null })
    expect(reorderMutate).not.toHaveBeenCalled()
  })

  it('while the superset write is in flight, the exercise menu disables its other actions too', () => {
    // isReorderingExercises is the OR of both mutations: a superset write alone must block the
    // same as a reorder, or a menu action could fire on top of a day-wide write already in flight.
    pendingRef.current = { reorder: false, superset: true }
    renderDay()
    expandDay()

    fireEvent.click(screen.getByText('Press').closest('[class*="cursor-pointer"]'))

    expect(screen.getByRole('button', { name: 'Reordenar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sacar del superset' })).toBeDisabled()
  })
})
