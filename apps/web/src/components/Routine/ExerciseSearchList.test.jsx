import { describe, it, expect, vi, afterEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n } from '@gym/shared'

// Without this the components paint the KEY instead of the text. See BodyWeightModal.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent, within, createEvent } from '@testing-library/react'
import ExerciseSearchList from './ExerciseSearchList.jsx'

const CHEST = { id: 1, name: 'Pecho', name_en: 'Chest' }
const LEGS = { id: 2, name: 'Piernas', name_en: 'Legs' }
const BACK = { id: 3, name: 'Espalda', name_en: 'Back' }
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
// The muscle row comes before the sheet, whose equipment chips also have an "All".
const muscleChip = name => screen.getAllByRole('button', { name })[0]
const filterButton = () => screen.getByRole('button', { name: 'Filtrar' })
const openSheet = () => fireEvent.click(filterButton())
// The sheet is the last dialog-like block: its title sits right above its content.
const sheet = () => screen.getByRole('heading', { name: 'Filtrar' }).parentElement.parentElement

describe('ExerciseSearchList filters', () => {
  describe('muscle group row', () => {
    it('picks a group with one tap and goes back to all with a second tap on it', () => {
      renderList()

      fireEvent.click(muscleChip('Pecho'))
      expect(listedNames()).toEqual(['Press banca', 'Press inclinado'])
      expect(muscleChip('Pecho')).toHaveAttribute('aria-pressed', 'true')
      expect(muscleChip('Todos')).toHaveAttribute('aria-pressed', 'false')

      fireEvent.click(muscleChip('Pecho'))
      expect(listedNames()).toEqual(['Press banca', 'Press inclinado', 'Sentadilla', 'Remo TRX'])
      expect(muscleChip('Todos')).toHaveAttribute('aria-pressed', 'true')
    })

    it('goes back to all from "All"', () => {
      renderList({ initialMuscleGroup: LEGS.id })

      fireEvent.click(muscleChip('Todos'))

      expect(listedNames()).toHaveLength(EXERCISES.length)
    })

    it('opens with the initial muscle group picked', () => {
      renderList({ initialMuscleGroup: CHEST.id })

      expect(muscleChip('Pecho')).toHaveAttribute('aria-pressed', 'true')
      expect(listedNames()).toEqual(['Press banca', 'Press inclinado'])
    })

    it('does not take the focus from the search field on a press, so the keyboard stays open', () => {
      renderList()
      const mouseDown = createEvent.mouseDown(muscleChip('Pecho'))

      fireEvent(muscleChip('Pecho'), mouseDown)

      expect(mouseDown.defaultPrevented).toBe(true)
    })

    it('does not count the muscle group in the filter button nor show it as an active chip', () => {
      renderList({ initialMuscleGroup: CHEST.id })

      expect(within(filterButton()).queryByText('1')).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Pecho' })).toHaveLength(1)
    })
  })

  describe('scroll to the initial muscle group', () => {
    const rect = (left, width) => ({ left, width, right: left + width, top: 0, bottom: 0, height: 0, x: left, y: 0 })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    // jsdom lays nothing out: every chip is 50 wide side by side, the row shows 120 of 400.
    function mockRowLayout() {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
        if (this.getAttribute('aria-pressed') !== null) {
          const index = [...this.parentElement.children].indexOf(this)
          return rect(index * 50 - this.parentElement.parentElement.scrollLeft, 50)
        }
        return rect(0, 120)
      })
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(120)
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(400)
    }

    const rowScroller = () => muscleChip('Todos').parentElement.parentElement

    it('brings a chip past the right edge into view, sideways', () => {
      mockRowLayout()
      renderList({ initialMuscleGroup: BACK.id })

      // "Espalda" is the 4th chip: 150 to 200, centred in 120.
      expect(rowScroller().scrollLeft).toBe(115)
    })

    it('leaves the row alone when the chip is already visible', () => {
      mockRowLayout()
      renderList({ initialMuscleGroup: CHEST.id })

      expect(rowScroller().scrollLeft).toBe(0)
    })

    it('waits for the groups to load', () => {
      mockRowLayout()
      const { rerender } = renderList({ initialMuscleGroup: BACK.id, muscleGroups: undefined })
      expect(rowScroller().scrollLeft).toBe(0)

      rerender(
        <ExerciseSearchList
          exercises={EXERCISES} muscleGroups={MUSCLE_GROUPS} equipmentTypes={EQUIPMENT_TYPES}
          isLoading={false} onSelect={vi.fn()} initialMuscleGroup={BACK.id}
        />,
      )

      expect(rowScroller().scrollLeft).toBe(115)
    })

    it('never scrolls on a tap', () => {
      mockRowLayout()
      renderList()

      fireEvent.click(muscleChip('Espalda'))

      expect(rowScroller().scrollLeft).toBe(0)
    })
  })

  describe('filter sheet', () => {
    it('holds equipment and the only mine switch, and no muscle group', () => {
      renderList()
      openSheet()

      expect(within(sheet()).getByText('Equipo')).toBeInTheDocument()
      expect(within(sheet()).getByRole('switch', { name: 'Solo mis ejercicios' })).toHaveAttribute('aria-checked', 'false')
      expect(within(sheet()).queryByText('Pecho')).not.toBeInTheDocument()
      expect(within(sheet()).queryByText('Músculo')).not.toBeInTheDocument()
    })

    it('shows on its button how many exercises the list has, without the Recent rows', () => {
      renderList({ recentExercises: [EXERCISES[0]] })
      openSheet()

      expect(within(sheet()).getByRole('button', { name: 'Ver 4 ejercicios' })).toBeInTheDocument()

      fireEvent.click(within(sheet()).getByRole('switch'))
      expect(within(sheet()).getByRole('button', { name: 'Ver 1 ejercicio' })).toBeInTheDocument()
    })

    it('says there are no results when nothing matches', () => {
      renderList({ initialMuscleGroup: CHEST.id })
      openSheet()

      fireEvent.click(within(sheet()).getByRole('button', { name: 'TRX' }))

      expect(within(sheet()).getByRole('button', { name: 'Sin resultados' })).toBeInTheDocument()
    })

    it('reads "Done" while the catalog loads', () => {
      renderList({ isLoading: true, exercises: undefined })
      openSheet()

      expect(within(sheet()).getByRole('button', { name: 'Hecho' })).toBeInTheDocument()
    })

    it('reads "Done", never "No results", when there is no catalog data and nothing is loading', () => {
      renderList({ isLoading: false, exercises: undefined })
      openSheet()

      expect(within(sheet()).getByRole('button', { name: 'Hecho' })).toBeInTheDocument()
      expect(within(sheet()).queryByRole('button', { name: 'Sin resultados' })).not.toBeInTheDocument()
    })

    it('reads "No results" for a catalog that loaded empty', () => {
      renderList({ isLoading: false, exercises: [] })
      openSheet()

      expect(within(sheet()).getByRole('button', { name: 'Sin resultados' })).toBeInTheDocument()
    })

    it('closes from its button', () => {
      renderList()
      openSheet()

      fireEvent.click(within(sheet()).getByRole('button', { name: 'Ver 4 ejercicios' }))

      expect(screen.queryByRole('heading', { name: 'Filtrar' })).not.toBeInTheDocument()
    })

    it('turns only mine on and off', () => {
      renderList()
      openSheet()

      fireEvent.click(within(sheet()).getByRole('switch'))
      expect(within(sheet()).getByRole('switch')).toHaveAttribute('aria-checked', 'true')
      expect(listedNames()).toEqual(['Press inclinado'])

      fireEvent.click(within(sheet()).getByRole('switch'))
      expect(listedNames()).toHaveLength(EXERCISES.length)
    })

    it('resets only its own filters, and offers to only when one is on', () => {
      renderList({ initialMuscleGroup: CHEST.id })
      openSheet()
      expect(within(sheet()).queryByRole('button', { name: 'Restablecer' })).not.toBeInTheDocument()

      fireEvent.click(within(sheet()).getByRole('button', { name: 'Barra' }))
      fireEvent.click(within(sheet()).getByRole('switch'))
      fireEvent.click(within(sheet()).getByRole('button', { name: 'Restablecer' }))

      expect(within(sheet()).getByRole('switch')).toHaveAttribute('aria-checked', 'false')
      expect(within(sheet()).getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
      expect(listedNames()).toEqual(['Press banca', 'Press inclinado'])
    })
  })

  describe('filter button and active chips', () => {
    function applyEquipmentAndOnlyMine() {
      openSheet()
      fireEvent.click(within(sheet()).getByRole('button', { name: 'Barra' }))
      fireEvent.click(within(sheet()).getByRole('switch'))
      fireEvent.click(within(sheet()).getByRole('button', { name: 'Ver 1 ejercicio' }))
    }

    it('counts equipment and only mine on the filter button', () => {
      renderList({ initialMuscleGroup: CHEST.id })

      applyEquipmentAndOnlyMine()

      expect(within(filterButton()).getByText('2')).toBeInTheDocument()
    })

    it('clears the equipment from a tap anywhere on its chip', () => {
      renderList()
      applyEquipmentAndOnlyMine()

      fireEvent.click(within(screen.getByRole('button', { name: 'Barra' })).getByText('Barra'))

      expect(screen.queryByRole('button', { name: 'Barra' })).not.toBeInTheDocument()
      expect(listedNames()).toEqual(['Press inclinado'])
    })

    it('clears only mine from a tap on its chip', () => {
      renderList()
      applyEquipmentAndOnlyMine()

      fireEvent.click(screen.getByRole('button', { name: 'Solo mis ejercicios' }))

      expect(screen.queryByRole('button', { name: 'Solo mis ejercicios' })).not.toBeInTheDocument()
      expect(listedNames()).toEqual(['Press banca', 'Press inclinado', 'Sentadilla'])
    })
  })

  describe('empty list', () => {
    it('offers to clear the filters when they are what hides the results, keeping the search', () => {
      renderList({ initialMuscleGroup: CHEST.id, search: 'remo', onSearchChange: vi.fn() })

      expect(screen.getByText('Ningún ejercicio con estos filtros')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

      expect(listedNames()).toEqual(['Remo TRX'])
      expect(screen.getByPlaceholderText('Buscar ejercicio...')).toHaveValue('remo')
      expect(muscleChip('Todos')).toHaveAttribute('aria-pressed', 'true')
    })

    it('gives the clear filters button a 44px tap target', () => {
      renderList({ initialMuscleGroup: CHEST.id, search: 'remo', onSearchChange: vi.fn() })

      expect(screen.getByRole('button', { name: 'Quitar filtros' })).toHaveClass('min-h-11')
    })

    it('clears muscle group, equipment and only mine together', () => {
      renderList({ initialMuscleGroup: CHEST.id })
      openSheet()
      fireEvent.click(within(sheet()).getByRole('button', { name: 'TRX' }))
      fireEvent.click(within(sheet()).getByRole('switch'))
      fireEvent.click(within(sheet()).getByRole('button', { name: 'Sin resultados' }))

      fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

      expect(listedNames()).toHaveLength(EXERCISES.length)
      expect(within(filterButton()).queryByText(/\d/)).not.toBeInTheDocument()
    })

    it('keeps the plain "not found" when the search finds nothing even without filters', () => {
      renderList({ initialMuscleGroup: CHEST.id, search: 'xyzq', onSearchChange: vi.fn() })

      expect(screen.getByText('No encontrado')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Quitar filtros' })).not.toBeInTheDocument()
    })
  })
})
