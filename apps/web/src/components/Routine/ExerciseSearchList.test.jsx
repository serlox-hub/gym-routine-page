import { describe, it, expect, vi, afterEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Without this the components paint the KEY instead of the text. See BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent, within, act } from '@testing-library/react'
import ExerciseSearchList from './ExerciseSearchList.jsx'

const CHEST = { id: 1, name: 'Pecho', name_en: 'Chest', category: 'Superior' }
const LEGS = { id: 2, name: 'Piernas', name_en: 'Legs', category: 'Inferior' }
const BACK = { id: 3, name: 'Espalda', name_en: 'Back', category: 'Superior' }
const MUSCLE_GROUPS = [CHEST, LEGS, BACK]

const BARBELL = { id: 10, name: 'Barra', name_en: 'Barbell' }
const TRX = { id: 30, name: 'TRX', name_en: 'TRX' }
const EQUIPMENT_TYPES = [BARBELL, TRX]

const exercise = (id, name, group, equipment, isSystem = true) => ({
  id, name_es: name, name_en: name, muscle_group_id: group.id, muscle_group: group,
  equipment_type: equipment, is_system: isSystem, gif_key: null,
})

const EXERCISES = [
  exercise(1, 'Press banca', CHEST, BARBELL),
  exercise(2, 'Press inclinado', CHEST, BARBELL, false),
  exercise(3, 'Sentadilla', LEGS, BARBELL),
  exercise(4, 'Remo TRX', BACK, TRX),
]

function renderList(props = {}) {
  return render(
    <ExerciseSearchList
      exercises={EXERCISES}
      muscleGroups={MUSCLE_GROUPS}
      equipmentTypes={EQUIPMENT_TYPES}
      isLoading={false}
      onSelect={vi.fn()}
      {...props}
    />,
  )
}

const listedNames = () => screen.queryAllByRole('heading', { level: 4 }).map(heading => heading.textContent)
const searchField = () => screen.getByPlaceholderText('Buscar ejercicio...')
// An open sheet is the block under its title (h3).
const sheet = title => screen.getByRole('heading', { level: 3, name: title }).parentElement
const pickMuscle = name => {
  fireEvent.click(screen.getByRole('button', { name: 'Músculo' }))
  fireEvent.click(within(sheet('Músculo')).getByRole('button', { name }))
}
const pickEquipment = name => {
  fireEvent.click(screen.getByRole('button', { name: 'Equipo' }))
  fireEvent.click(within(sheet('Equipo')).getByRole('button', { name }))
}

describe('ExerciseSearchList filters', () => {
  afterEach(() => vi.restoreAllMocks())

  describe('muscle group', () => {
    it('shows every group at once, by body area', () => {
      renderList()

      fireEvent.click(screen.getByRole('button', { name: 'Músculo' }))

      const muscleSheet = sheet('Músculo')
      expect(within(muscleSheet).getByRole('button', { name: 'Todos los músculos' })).toHaveAttribute('aria-pressed', 'true')
      expect(within(muscleSheet).getByText('Tren superior')).toBeInTheDocument()
      expect(within(muscleSheet).getByText('Tren inferior')).toBeInTheDocument()
      const options = within(muscleSheet).getAllByRole('button').map(button => button.textContent)
      expect(options).toEqual(['Todos los músculos', 'Espalda', 'Pecho', 'Piernas'])
    })

    it('filters by the picked group, closes the list and shows the pick on the button', () => {
      renderList()

      pickMuscle('Pecho')

      expect(listedNames()).toEqual(['Press banca', 'Press inclinado'])
      expect(screen.queryByRole('heading', { level: 3, name: 'Músculo' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pecho' })).toBeInTheDocument()
    })

    it('clears the pick from its "x"', () => {
      renderList({ initialMuscleGroup: CHEST.id })

      fireEvent.click(screen.getByRole('button', { name: 'Quitar Pecho' }))

      expect(listedNames()).toHaveLength(EXERCISES.length)
      expect(screen.getByRole('button', { name: 'Músculo' })).toBeInTheDocument()
    })

    it('goes back to all from "All muscles"', () => {
      renderList({ initialMuscleGroup: LEGS.id })

      fireEvent.click(screen.getByRole('button', { name: 'Piernas' }))
      fireEvent.click(within(sheet('Músculo')).getByRole('button', { name: 'Todos los músculos' }))

      expect(listedNames()).toHaveLength(EXERCISES.length)
    })

    it('opens with the initial muscle group picked', () => {
      renderList({ initialMuscleGroup: CHEST.id })

      expect(listedNames()).toEqual(['Press banca', 'Press inclinado'])
      fireEvent.click(screen.getByRole('button', { name: 'Pecho' }))
      expect(within(sheet('Músculo')).getByRole('button', { name: 'Pecho' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('takes the focus off the search field when the list opens, so the keyboard does not cover it', () => {
      renderList()
      searchField().focus()

      fireEvent.click(screen.getByRole('button', { name: 'Músculo' }))

      expect(searchField()).not.toHaveFocus()
    })
  })

  describe('equipment', () => {
    it('lists every type with "All equipment" first, untitled', () => {
      renderList()

      fireEvent.click(screen.getByRole('button', { name: 'Equipo' }))

      const options = within(sheet('Equipo')).getAllByRole('button').map(button => button.textContent)
      expect(options).toEqual(['Todo el equipo', 'Barra', 'TRX'])
    })

    it('filters by the picked type and clears it from its "x"', () => {
      renderList()

      pickEquipment('TRX')
      expect(listedNames()).toEqual(['Remo TRX'])

      fireEvent.click(screen.getByRole('button', { name: 'Quitar TRX' }))
      expect(listedNames()).toHaveLength(EXERCISES.length)
    })

    it('combines with the muscle group', () => {
      renderList()

      pickMuscle('Pecho')
      pickEquipment('Barra')

      expect(listedNames()).toEqual(['Press banca', 'Press inclinado'])
    })
  })

  describe('language change while mounted', () => {
    afterEach(async () => { await act(() => i18n.changeLanguage('es')) })

    it('re-labels and re-orders the open options', async () => {
      renderList()
      fireEvent.click(screen.getByRole('button', { name: 'Músculo' }))

      await act(() => i18n.changeLanguage('en'))

      const options = within(sheet('Muscle')).getAllByRole('button').map(button => button.textContent)
      expect(options).toEqual(['All muscles', 'Back', 'Chest', 'Legs'])
    })
  })

  describe('touch targets', () => {
    it('makes the filter buttons, their "x" and the options 44px tall', () => {
      renderList({ initialMuscleGroup: CHEST.id })

      expect(screen.getByRole('button', { name: 'Quitar Pecho' })).toHaveClass('w-11')
      expect(screen.getByRole('button', { name: 'Quitar Pecho' }).parentElement).toHaveClass('h-11')
      fireEvent.click(screen.getByRole('button', { name: 'Equipo' }))
      for (const option of within(sheet('Equipo')).getAllByRole('button')) expect(option).toHaveClass('min-h-11')
    })
  })

  describe('empty list', () => {
    it('offers to clear the filters when they are what hides the results, keeping the search', () => {
      renderList({ initialMuscleGroup: CHEST.id, search: 'remo', onSearchChange: vi.fn() })

      expect(screen.getByText('Ningún ejercicio con estos filtros')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

      expect(listedNames()).toEqual(['Remo TRX'])
      expect(searchField()).toHaveValue('remo')
      expect(screen.getByRole('button', { name: 'Músculo' })).toBeInTheDocument()
    })

    it('gives the clear filters button a 44px tap target', () => {
      renderList({ initialMuscleGroup: CHEST.id, search: 'remo', onSearchChange: vi.fn() })

      expect(screen.getByRole('button', { name: 'Quitar filtros' })).toHaveClass('min-h-11')
    })

    it('clears muscle group and equipment together', () => {
      renderList({ initialMuscleGroup: CHEST.id })
      pickEquipment('TRX')

      fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

      expect(listedNames()).toHaveLength(EXERCISES.length)
      expect(screen.getByRole('button', { name: 'Músculo' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Equipo' })).toBeInTheDocument()
    })

    it('keeps the plain "not found" when the search finds nothing even without filters', () => {
      renderList({ initialMuscleGroup: CHEST.id, search: 'xyzq', onSearchChange: vi.fn() })

      expect(screen.getByText('No encontrado')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Quitar filtros' })).not.toBeInTheDocument()
    })
  })
})
