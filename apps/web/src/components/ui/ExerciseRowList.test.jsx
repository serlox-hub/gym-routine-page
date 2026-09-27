import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import ExerciseRowList from './ExerciseRowList.jsx'

// Render props kept deliberately minimal: this file exercises `ExerciseRowList`'s own wiring
// (default "leave the superset" placement, header/exercise dispatch), not a specific card. The
// composed behaviour with real `ExerciseCard` (drag handles, menu-based reorder) is covered by
// `Routine/BlockSection.test.jsx`, which renders this same list through `BlockSection`.
function renderList(exercises, props = {}) {
  return render(
    <ExerciseRowList
      exercises={exercises}
      getSliceStyle={() => undefined}
      renderHeader={(row) => <div>Header {row.group}</div>}
      renderExercise={(exerciseId, { onRemoveFromSuperset }) => (
        <button onClick={onRemoveFromSuperset} disabled={!onRemoveFromSuperset}>
          ex-{exerciseId}
        </button>
      )}
      {...props}
    />
  )
}

describe('ExerciseRowList — sacar del superset (colocación por defecto)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const exercises = [
    { id: 1, sort_order: 1, superset_group: null },
    { id: 2, sort_order: 2, superset_group: 5 },
    { id: 3, sort_order: 3, superset_group: 5 },
  ]

  it('un individual no recibe onRemoveFromSuperset', () => {
    renderList(exercises)
    expect(screen.getByRole('button', { name: 'ex-1' })).toBeDisabled()
  })

  it('un miembro sí lo recibe, y sacarlo lo deja justo detrás de la tirada que abandona', () => {
    const onReorderBlock = vi.fn()
    renderList(exercises, { onReorderBlock })

    fireEvent.click(screen.getByRole('button', { name: 'ex-2' }))

    expect(onReorderBlock).toHaveBeenCalledWith([
      { id: 1 },
      { id: 3 },
      { id: 2, supersetGroup: null },
    ])
  })
})

describe('ExerciseRowList — despacho de filas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pinta una cabecera por tirada y una fila por ejercicio', () => {
    renderList([
      { id: 1, sort_order: 1, superset_group: null },
      { id: 2, sort_order: 2, superset_group: 7 },
      { id: 3, sort_order: 3, superset_group: 7 },
    ])

    expect(screen.getByText('Header 7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ex-1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ex-2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ex-3' })).toBeInTheDocument()
  })
})
