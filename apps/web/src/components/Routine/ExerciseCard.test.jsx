import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE en vez del texto. Ver BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

// Mockea solo el hook con estado de red (dispara useQuery vía @gym/shared); deja
// shouldClaimSwipe/clampSwipeOffset/formatEffortBadge/etc. reales, que es justo lo que
// prueban estos tests (issue #78).
vi.mock('@gym/shared', async () => {
  const actual = await vi.importActual('@gym/shared')
  return {
    ...actual,
    useResolvedDistanceUnit: () => 'm',
  }
})

import ExerciseCard from './ExerciseCard.jsx'

const EXERCISE = { id: 1, name_es: 'Press banca', tracked_fields: ['weight', 'reps'] }
const ROUTINE_EXERCISE = { exercise: EXERCISE, series: 3, reps: '8-12', level: null, rir: null, rest_seconds: 90 }

function renderCard(props) {
  return render(
    <ExerciseCard
      routineExercise={ROUTINE_EXERCISE}
      routineDayId={1}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onDuplicate={vi.fn()}
      onMoveToDay={vi.fn()}
      onReplace={vi.fn()}
      onReorderToPosition={vi.fn()}
      currentIndex={0}
      totalExercises={1}
      {...props}
    />
  )
}

// Simula un gesto completo sobre la fila: pointerdown en (0,0), un único pointermove a (dx, dy)
// y pointerup. Con pointerType 'touch' porque el guard de botón de ratón solo mira 'mouse'.
function swipe(row, { dx, dy = 0 }) {
  fireEvent.pointerDown(row, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
  fireEvent.pointerMove(row, { pointerId: 1, clientX: dx, clientY: dy, pointerType: 'touch' })
  fireEvent.pointerUp(row, { pointerId: 1, clientX: dx, clientY: dy, pointerType: 'touch' })
}

describe('ExerciseCard — swipe para borrar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('un click sin movimiento abre el menú de acciones, no borra', () => {
    const onDelete = vi.fn()
    renderCard({ onDelete })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')

    fireEvent.pointerDown(row, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    fireEvent.click(row)

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Eliminar')).toBeInTheDocument()
  })

  it('swipe a la izquierda que cruza el umbral de borrado llama a onDelete y no abre el menú', () => {
    const onDelete = vi.fn()
    renderCard({ onDelete })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')

    // swipeDeleteThreshold es 72 en design (web+native, ver designTokens.test.js)
    swipe(row, { dx: -100 })
    fireEvent.click(row)

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()
  })

  it('swipe que reclama el gesto pero no llega al umbral no borra, y suprime el click siguiente', () => {
    const onDelete = vi.fn()
    renderCard({ onDelete })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')

    // Por encima de la distancia de activación (5) pero por debajo del umbral de borrado (72):
    // el gesto SE reclama como swipe (abre la afordancia) y, al abandonarlo, el click que
    // sigue no debe colar y abrir el menú de seis entradas.
    swipe(row, { dx: -30 })
    fireEvent.click(row)

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()

    // El siguiente gesto, ya sin swipe de por medio, vuelve a abrir el menú con normalidad.
    fireEvent.click(row)
    expect(screen.getByText('Eliminar')).toBeInTheDocument()
  })

  it('un arrastre verticalmente dominante no reclama el swipe: el click siguiente sí abre el menú', () => {
    const onDelete = vi.fn()
    renderCard({ onDelete })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')

    // dy domina 2:1 sobre dx: es scroll de lista, no swipe (mismo criterio que shouldClaimSwipe).
    swipe(row, { dx: 10, dy: 40 })
    fireEvent.click(row)

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Eliminar')).toBeInTheDocument()
  })

  it('un swipe hacia la derecha (offset positivo) no llama a onDelete', () => {
    const onDelete = vi.fn()
    renderCard({ onDelete })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')

    swipe(row, { dx: 100 })

    expect(onDelete).not.toHaveBeenCalled()
  })
})

describe('ExerciseCard — multitouch y reposo tras abandonar el swipe (rc-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('un segundo dedo sobre la fila no rompe el swipe en vuelo del primero, ni borra por su cuenta', () => {
    const onDelete = vi.fn()
    renderCard({ onDelete })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')

    // Dedo 1 arranca el swipe y lo lleva ya pasado el umbral de borrado (72).
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: -100, clientY: 0, pointerType: 'touch' })

    // Dedo 2 se apoya a mitad de gesto: `handlePointerDown` debe descartarlo (phase !== 'idle'),
    // no reclasificar el gesto en vuelo.
    fireEvent.pointerDown(row, { pointerId: 2, clientX: 50, clientY: 0, pointerType: 'touch' })

    // Sus propios move/up no pueden disparar el borrado ni interferir: `e.pointerId` no coincide
    // con el `pointerId` del gesto en vuelo (el del dedo 1), así que se ignoran.
    fireEvent.pointerMove(row, { pointerId: 2, clientX: 80, clientY: 0, pointerType: 'touch' })
    fireEvent.pointerUp(row, { pointerId: 2, clientX: 80, clientY: 0, pointerType: 'touch' })
    expect(onDelete).not.toHaveBeenCalled()

    // Al soltar el dedo original (pointerId 1) el gesto se completa con normalidad, una sola vez.
    fireEvent.pointerUp(row, { pointerId: 1, clientX: -100, clientY: 0, pointerType: 'touch' })
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('tras un swipe abandonado antes del umbral, la fila y la afordancia vuelven al reposo', () => {
    const onDelete = vi.fn()
    const { container } = renderCard({ onDelete })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')
    const affordance = container.querySelector('[aria-hidden="true"]')

    // Por debajo del umbral de borrado (72): se reclama como swipe (mueve la fila y descubre la
    // afordancia) pero se abandona antes de cruzarlo.
    swipe(row, { dx: -30 })

    expect(onDelete).not.toHaveBeenCalled()
    // `endGesture` repinta a 0 en TODA ruta con offset !== 0, no solo cuando el gesto se
    // convierte en borrado: antes de este fix la fila se quedaba encallada abierta. En reposo
    // no queda ningún transform (ver `paintRow` en hooks/useSwipeToDelete.js).
    expect(row.style.transform).toBe('')
    expect(affordance.style.opacity).toBe('0')
  })
})

describe('ExerciseCard — menú de acciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('"Ver historial" es la primera acción del menú', () => {
    renderCard()
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')

    fireEvent.click(row)

    const labels = screen.getAllByRole('button')
      .map(b => b.textContent.trim())
      .filter(Boolean)
    expect(labels[0]).toBe('Ver historial')
    expect(labels).toContain('Editar')
    expect(labels).toContain('Eliminar')
  })

  it('con un solo ejercicio en su ámbito el menú no ofrece "Reordenar"', () => {
    renderCard({ totalExercises: 1 })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')

    fireEvent.click(row)

    expect(screen.queryByRole('button', { name: 'Reordenar' })).not.toBeInTheDocument()
  })

  it('con más de un ejercicio en su ámbito "Reordenar" está deshabilitado mientras isReordering', () => {
    renderCard({ totalExercises: 2, isReordering: true })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')

    fireEvent.click(row)

    expect(screen.getByRole('button', { name: 'Reordenar' })).toBeDisabled()
  })
})

describe('ExerciseCard — asa de arrastre y swipe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin dragHandleProps no pinta asa', () => {
    const { container } = renderCard()
    expect(container.querySelector('svg.lucide-grip-vertical')).toBeNull()
  })

  it('un gesto que empieza en el asa no reclama el swipe, y al soltarlo la fila vuelve a reclamarlo', () => {
    const onDelete = vi.fn()
    const { container } = renderCard({ onDelete, dragHandleProps: {} })
    const row = screen.getByText('Press banca').closest('[class*="cursor-pointer"]')
    const handle = container.querySelector('svg.lucide-grip-vertical').closest('button')

    // El pointerdown del asa burbujea hasta la fila, así que el swipe sí empieza a clasificar:
    // lo que lo impide es la bandera que pone el asa ANTES, en ese mismo pointerdown.
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: -100, clientY: 0, pointerType: 'touch' })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: -100, clientY: 0, pointerType: 'touch' })

    expect(onDelete).not.toHaveBeenCalled()
    expect(row.style.transform).toBe('')

    // Soltar el asa quita el bloqueo: un swipe normal después sí borra.
    swipe(row, { dx: -100 })
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
