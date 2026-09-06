import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Sin esto los componentes pintan la CLAVE ("exercise:distanceUnitOverride") en vez del texto y
// cualquier búsqueda por texto visible falla. Ver BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'
import {
  useExercise,
  useUserExerciseOverride,
  useUserExerciseGymUnit,
  useUpsertUserExerciseOverride,
  useChangeWeightUnit,
  useSelectedGym,
  usePreference,
} from '@gym/shared'
import SystemExerciseDetailsPanel from './SystemExerciseDetailsPanel.jsx'

// Mockea solo los hooks con estado de red/servidor; deja resolveTrackedFields, tracksDistance,
// DISTANCE_UNITS, i18n, etc. reales para probar la lógica de payload de verdad.
vi.mock('@gym/shared', async () => {
  const actual = await vi.importActual('@gym/shared')
  return {
    ...actual,
    useExercise: vi.fn(),
    useUserExerciseOverride: vi.fn(),
    useUserExerciseGymUnit: vi.fn(),
    useUpsertUserExerciseOverride: vi.fn(),
    useChangeWeightUnit: vi.fn(),
    useSelectedGym: vi.fn(),
    usePreference: vi.fn(),
  }
})

const CARDIO_EXERCISE = {
  id: 1,
  tracked_fields: ['distance', 'time'],
  distance_unit: 'm',
}

describe('SystemExerciseDetailsPanel', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useSelectedGym.mockReturnValue({ gymId: '1', gyms: [{ id: '1', name: 'Gym' }], hasMultiple: false })
    useUserExerciseOverride.mockReturnValue({ data: undefined })
    useUserExerciseGymUnit.mockReturnValue({ data: undefined })
    useUpsertUserExerciseOverride.mockReturnValue({ mutate: mockMutate, isPending: false })
    useChangeWeightUnit.mockReturnValue({ mutate: vi.fn(), isPending: false })
    usePreference.mockReturnValue({ value: 'kg' })
    useExercise.mockReturnValue({ data: undefined })
  })

  it('omite distanceUnit del payload mientras el ejercicio no ha cargado (no borra el override al guardar solo notas)', () => {
    useExercise.mockReturnValue({ data: undefined })

    render(<SystemExerciseDetailsPanel exerciseId={1} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(mockMutate).toHaveBeenCalledTimes(1)
    const [payload] = mockMutate.mock.calls[0]
    expect(payload).toEqual({ exerciseId: 1, notes: '' })
    expect(payload).not.toHaveProperty('distanceUnit')
  })

  it('no muestra el selector de unidad de distancia mientras el ejercicio no ha cargado', () => {
    useExercise.mockReturnValue({ data: undefined })

    render(<SystemExerciseDetailsPanel exerciseId={1} onClose={vi.fn()} />)

    expect(screen.queryByText(/unidad de distancia/i)).not.toBeInTheDocument()
  })

  it('incluye distanceUnit: null cuando el ejercicio ya cargó y no hay override (coincide con el catálogo)', () => {
    useExercise.mockReturnValue({ data: CARDIO_EXERCISE })

    render(<SystemExerciseDetailsPanel exerciseId={1} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    const [payload] = mockMutate.mock.calls[0]
    expect(payload).toEqual({ exerciseId: 1, notes: '', distanceUnit: null })
  })

  it('incluye la unidad elegida cuando difiere de la del catálogo', () => {
    useExercise.mockReturnValue({ data: CARDIO_EXERCISE })

    render(<SystemExerciseDetailsPanel exerciseId={1} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'km' }))
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    const [payload] = mockMutate.mock.calls[0]
    expect(payload).toEqual({ exerciseId: 1, notes: '', distanceUnit: 'km' })
  })

  it('guarda distanceUnit: null si el usuario elige explícitamente la unidad del catálogo existiendo ya un override distinto', () => {
    useUserExerciseOverride.mockReturnValue({ data: { notes: '', distance_unit: 'km' } })
    useExercise.mockReturnValue({ data: CARDIO_EXERCISE })

    render(<SystemExerciseDetailsPanel exerciseId={1} onClose={vi.fn()} />)

    // Precondición: el override existente ('km') se refleja como seleccionado.
    expect(screen.getByRole('button', { name: 'km' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'm' }))
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    const [payload] = mockMutate.mock.calls[0]
    expect(payload).toEqual({ exerciseId: 1, notes: '', distanceUnit: null })
  })

  it('no muestra el selector de unidad de distancia si el ejercicio no mide distancia', () => {
    useExercise.mockReturnValue({ data: { id: 2, tracked_fields: ['weight', 'reps'] } })

    render(<SystemExerciseDetailsPanel exerciseId={2} onClose={vi.fn()} />)

    expect(screen.queryByText(/unidad de distancia/i)).not.toBeInTheDocument()
  })
})
