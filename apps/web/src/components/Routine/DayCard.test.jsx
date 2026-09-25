import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

// `blocksRef` es mutable y compartida con el mock de abajo (vi.hoisted la saca del closure de
// la fábrica) para poder variar los bloques que devuelve `useRoutineBlocks` por test.
const { blocksRef } = vi.hoisted(() => ({ blocksRef: { current: [] } }))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

// Solo los hooks con estado de red: dejan pasar getRoutineDayLayout/getExistingSupersetIds/
// getRoutineDayAction reales, que es justo lo que ejercitan estos tests.
vi.mock('../../hooks/useRoutines.js', () => ({
  useRoutineBlocks: () => ({ data: blocksRef.current, isLoading: false }),
  useReorderRoutineExercises: () => ({ mutate: vi.fn(), isPending: false }),
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
  }
})

import DayCard from './DayCard.jsx'

const main = (exercises) => ({ name: 'Principal', routine_exercises: exercises })

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
